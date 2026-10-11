// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {QuantumVaultAccount} from "./QuantumVaultAccount.sol";

/// @title QuantumVaultAccountFactory V3
/// @notice Deploys a single QuantumVaultAccount per user slot via CREATE2.
///         Assets live directly in the account — no separate vault contract.
///
/// @dev Address determinism: salt = keccak256(creator, accountIndex) — no password params.
///      Constructor takes only IEntryPoint so bytecode is identical on every chain.
///      Deploy via Nick's factory (0x4e59b44847b379578588920cA78FbF26c0B4956C) with
///      the same salt to get the same factory address everywhere.
///
///      Fee lookup: chainFee[block.chainid] if set, otherwise defaultFee.
///      Owner sets per-chain fees post-deploy; unrecognized chains pay defaultFee.
///
///      Suggested fees:
///        56   BNB Chain  → 0.003 ether
///        1    Ethereum   → 0.001 ether
///        8453 Base       → 0.001 ether
///        42161 Arbitrum  → 0.001 ether
contract QuantumVaultAccountFactory is Ownable {
    using SafeERC20 for IERC20;

    error InsufficientFee();
    error ZeroRecipient();
    error TransferFailed();
    error ZeroFee();

    event AccountCreated(
        address indexed account,
        bytes32 indexed merkleRoot
    );
    event ChainFeeSet(uint256 indexed chainId, uint256 fee);
    event ChainFeeRemoved(uint256 indexed chainId);
    event DefaultFeeUpdated(uint256 fee);

    IEntryPoint public entryPoint;

    /// @notice Fallback fee for chains without a specific entry. 0.001 ether default.
    uint256 public defaultFee = 0.001 ether;

    /// @notice Per-chain fee override. Zero means "use defaultFee".
    mapping(uint256 => uint256) public chainFee;

    mapping(address => bool)      public isAccount;
    mapping(address => address[]) private _userAccounts;
    mapping(address => uint32)    public nextAccountIndex;

    constructor(IEntryPoint entryPoint_, address initialOwner_) Ownable(initialOwner_) {
        entryPoint = entryPoint_;
    }

    // ── Fee view ──────────────────────────────────────────────────────────────

    /// @notice Fee for the current chain. Uses per-chain override if set, else defaultFee.
    function getCreateFee() public view returns (uint256) {
        uint256 f = chainFee[block.chainid];
        return f != 0 ? f : defaultFee;
    }

    // ── Core ──────────────────────────────────────────────────────────────────

    /// @notice Deploy a QuantumVaultAccount. If already deployed at this index, refunds fee and returns it.
    function createAccount(
        bytes32 merkleRoot,
        bytes32 pubSeed,
        bytes32 passwordCommit
    ) external payable returns (QuantumVaultAccount account, uint32 accountIndex) {
        if (msg.value < getCreateFee()) revert InsufficientFee();

        accountIndex             = nextAccountIndex[msg.sender];
        bytes32 salt             = keccak256(abi.encode(msg.sender, accountIndex));
        address predictedAccount = getAddress(msg.sender, accountIndex);

        if (predictedAccount.code.length == 0) {
            account = new QuantumVaultAccount{salt: salt}(
                entryPoint,
                address(this)
            );

            // Password params set post-deploy — does not affect CREATE2 address.
            account.initialize(merkleRoot, pubSeed, passwordCommit, msg.sender);

            isAccount[address(account)] = true;
            _userAccounts[msg.sender].push(address(account));

            unchecked { nextAccountIndex[msg.sender]++; }

            emit AccountCreated(address(account), merkleRoot);
        } else {
            // Already exists — refund and return existing account.
            if (msg.value > 0) {
                (bool ok, ) = msg.sender.call{value: msg.value}("");
                if (!ok) revert TransferFailed();
            }
            account = QuantumVaultAccount(payable(predictedAccount));
        }
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getUserAccounts(address user) external view returns (address[] memory) {
        return _userAccounts[user];
    }

    function getUserAccountCount(address user) external view returns (uint256) {
        return _userAccounts[user].length;
    }

    /// @notice Predict the account address from (creator, accountIndex) — no password needed.
    function getAddress(
        address creator,
        uint32  accountIndex
    ) public view returns (address predicted) {
        bytes32 salt = keccak256(abi.encode(creator, accountIndex));

        bytes memory initCode = abi.encodePacked(
            type(QuantumVaultAccount).creationCode,
            abi.encode(entryPoint, address(this))
        );

        predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(
                bytes1(0xff), address(this), salt, keccak256(initCode)
            ))))
        );
    }

    // ── Owner ─────────────────────────────────────────────────────────────────

    /// @notice Set fee for a specific chain. Must be > 0 (use removeChainFee to revert to default).
    function setChainFee(uint256 chainId, uint256 fee) external onlyOwner {
        if (fee == 0) revert ZeroFee();
        chainFee[chainId] = fee;
        emit ChainFeeSet(chainId, fee);
    }

    /// @notice Remove per-chain override; that chain will use defaultFee again.
    function removeChainFee(uint256 chainId) external onlyOwner {
        delete chainFee[chainId];
        emit ChainFeeRemoved(chainId);
    }

    /// @notice Update the fallback fee for chains with no specific entry.
    function setDefaultFee(uint256 fee) external onlyOwner {
        if (fee == 0) revert ZeroFee();
        defaultFee = fee;
        emit DefaultFeeUpdated(fee);
    }

    function withdrawFees(
        address token,
        address payable recipient,
        uint256 amount
    ) external onlyOwner {
        if (recipient == address(0)) revert ZeroRecipient();
        if (token == address(0)) {
            (bool ok, ) = recipient.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
    }

    receive() external payable {}
}
