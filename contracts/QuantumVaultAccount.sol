// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseAccount} from "@account-abstraction/core/BaseAccount.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {IAccountExecute} from "@account-abstraction/interfaces/IAccountExecute.sol";
import {PackedUserOperation} from "@account-abstraction/interfaces/PackedUserOperation.sol";
import {
    SIG_VALIDATION_FAILED,
    SIG_VALIDATION_SUCCESS,
    _packValidationData
} from "@account-abstraction/core/Helpers.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {WOTSVerifier} from "./WOTSVerifier.sol";

/// @title QuantumVaultAccount — WOTS+ post-quantum ERC-4337 smart account
/// @notice Dual-factor auth: WOTS+ password proof (Factor 1) + wallet ECDSA sig (Factor 2).
///         Assets are held directly by this account — no separate vault contract.
///
/// @dev Gas-separation: the authorized wallet signs opHash via personal_sign (no gas),
///      then any address submits directExecute with that sig. Allows authorized wallets
///      with zero ETH to control the account.
///
///      Key rotation: when inbandNewRoot is non-zero, new root is registered and old
///      non-primary root is removed atomically within the same operation.
///      Client triggers rotation automatically when < 5% of leaves remain.
contract QuantumVaultAccount is BaseAccount, IAccountExecute, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error OnlyEntryPoint();
    error ZeroRoot();
    error ZeroAddress();
    error AlreadyAdmin();
    error NotAdmin();
    error CannotRemoveLastAdmin();
    error CannotRemovePrimary();
    error LeafAlreadySpent();
    error InvalidPasswordProof();
    error TransferFailed();
    error InsufficientBalance();
    error Unauthorized();
    error AlreadyWalletAdmin();
    error NotWalletAdmin();
    error CannotRemoveLastWalletAdmin();
    error InvalidMerkleProofLength();
    error InvalidLeafIndex();
    error InvalidPasswordCommit();
    error InvalidActionCalldata();

    event AccountInitialized(address indexed account, bytes32 indexed primaryMerkleRoot);
    event AdminAdded(bytes32 indexed merkleRoot, bytes32 pubSeed);
    event AdminRemoved(bytes32 indexed merkleRoot);
    event MerkleRootRotated(bytes32 indexed oldRoot, bytes32 indexed newRoot, bytes32 newPubSeed);
    event LeafSpent(bytes32 indexed merkleRoot, uint32 indexed leafIndex);
    event ExecutionFailed(bytes returnData);
    event PasswordCommitUpdated();
    event DirectExecuted(bytes32 indexed signerMerkleRoot, uint32 indexed leafIndex, address indexed relayer);
    event WalletAdminAdded(address indexed wallet);
    event WalletAdminRemoved(address indexed wallet);

    uint256 internal constant TREE_DEPTH = 8;
    uint256 internal constant TREE_SIZE  = 1 << TREE_DEPTH; // 256 leaves

    IEntryPoint private immutable _entryPoint;
    /// @notice Factory that deployed this account — used to gate initialize().
    address     public  immutable factory;

    bytes32 public primaryMerkleRoot;
    bytes32 public passwordDomain; // keccak256(primaryMerkleRoot, primaryPubSeed) — fixed at init

    // WOTS+ merkle root admins (Factor 1 — password)
    mapping(bytes32 => bool)    public isAdmin;
    mapping(bytes32 => bytes32) public pubSeedOf;
    uint256 public adminCount;

    // Wallet address admins (Factor 2 — ECDSA). Wallets sign ops; need not be msg.sender.
    mapping(address => bool) public isWalletAdmin;
    address[] private _walletAdminList;
    uint256 public walletAdminCount;
    mapping(address => uint256) private _walletAdminListIndex;

    mapping(bytes32 => mapping(uint32 => bool)) public isLeafSpent;

    bytes32 public passwordCommit;

    // Per-root nonce for directExecute — prevents replay across operations using the same root.
    mapping(bytes32 => uint64) public directNonce;

    bytes32[] private _adminList;
    mapping(bytes32 => uint256) private _adminListIndex;

    bool private _initialized;

    constructor(IEntryPoint entryPoint_, address factory_) {
        if (factory_ == address(0)) revert ZeroAddress();
        _entryPoint = entryPoint_;
        factory     = factory_;
    }

    /// @notice One-time init called by the factory post-deploy.
    ///         Separated from constructor so initCode (and CREATE2 address) is
    ///         independent of password parameters.
    function initialize(
        bytes32 primaryMerkleRoot_,
        bytes32 primaryPubSeed_,
        bytes32 passwordCommit_,
        address initialWalletAdmin_
    ) external {
        if (_initialized) revert AlreadyAdmin();
        if (primaryMerkleRoot_ == bytes32(0)) revert ZeroRoot();
        if (initialWalletAdmin_ == address(0)) revert ZeroAddress();
        // passwordCommit_ == bytes32(0) is valid — disables password check.
        if (msg.sender != factory) revert Unauthorized();

        _initialized = true;

        primaryMerkleRoot = primaryMerkleRoot_;
        passwordDomain    = keccak256(abi.encode(primaryMerkleRoot_, primaryPubSeed_));
        passwordCommit    = passwordCommit_;

        _addAdmin(primaryMerkleRoot_, primaryPubSeed_);
        _addWalletAdmin(initialWalletAdmin_);

        emit AccountInitialized(address(this), primaryMerkleRoot_);
    }

    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    modifier onlyEntryPoint() {
        if (msg.sender != address(_entryPoint)) revert OnlyEntryPoint();
        _;
    }

    modifier onlyEntryPointOrSelf() {
        if (msg.sender != address(_entryPoint) && msg.sender != address(this))
            revert OnlyEntryPoint();
        _;
    }

    /// @dev Pay EntryPoint prefund directly from account balance.
    function _payPrefund(uint256 missingAccountFunds) internal override {
        if (missingAccountFunds > 0) {
            (bool ok, ) = payable(address(entryPoint())).call{value: missingAccountFunds}("");
            if (!ok) revert TransferFailed();
        }
    }

    // ── WOTS+ root admin management ───────────────────────────────────────────

    function addAdmin(bytes32 newMerkleRoot, bytes32 newPubSeed) external onlyEntryPointOrSelf {
        if (newMerkleRoot == bytes32(0)) revert ZeroRoot();
        if (isAdmin[newMerkleRoot]) revert AlreadyAdmin();
        _addAdmin(newMerkleRoot, newPubSeed);
    }

    function removeAdmin(bytes32 merkleRoot) external onlyEntryPointOrSelf {
        if (!isAdmin[merkleRoot]) revert NotAdmin();
        if (adminCount == 1) revert CannotRemoveLastAdmin();
        if (merkleRoot == primaryMerkleRoot) revert CannotRemovePrimary();
        _removeAdmin(merkleRoot);
    }

    function rotateMerkleRoot(bytes32 oldRoot, bytes32 newRoot, bytes32 newPubSeed)
        external onlyEntryPointOrSelf
    {
        if (newRoot == bytes32(0)) revert ZeroRoot();
        if (!isAdmin[oldRoot]) revert NotAdmin();
        if (isAdmin[newRoot]) revert AlreadyAdmin();
        _removeAdmin(oldRoot);
        _addAdmin(newRoot, newPubSeed);
        emit MerkleRootRotated(oldRoot, newRoot, newPubSeed);
    }

    function setPasswordCommit(bytes32 newCommit) external onlyEntryPointOrSelf {
        if (newCommit == bytes32(0)) revert InvalidPasswordCommit();
        passwordCommit = newCommit;
        emit PasswordCommitUpdated();
    }

    function getAdmins() external view returns (bytes32[] memory) {
        uint256 count = adminCount;
        bytes32[] memory result = new bytes32[](count);
        uint256 idx;
        uint256 len = _adminList.length;
        for (uint256 i = 0; i < len && idx < count; i++) {
            if (isAdmin[_adminList[i]]) result[idx++] = _adminList[i];
        }
        return result;
    }

    // ── Wallet admin management (Factor 2) ────────────────────────────────────

    function addWalletAdmin(address wallet) external onlyEntryPointOrSelf {
        if (wallet == address(0)) revert ZeroAddress();
        if (isWalletAdmin[wallet]) revert AlreadyWalletAdmin();
        _addWalletAdmin(wallet);
    }

    function removeWalletAdmin(address wallet) external onlyEntryPointOrSelf {
        if (!isWalletAdmin[wallet]) revert NotWalletAdmin();
        if (walletAdminCount == 1) revert CannotRemoveLastWalletAdmin();
        _removeWalletAdmin(wallet);
    }

    function getWalletAdmins() external view returns (address[] memory) {
        uint256 count = walletAdminCount;
        address[] memory result = new address[](count);
        uint256 idx;
        uint256 len = _walletAdminList.length;
        for (uint256 i = 0; i < len && idx < count; i++) {
            if (isWalletAdmin[_walletAdminList[i]]) result[idx++] = _walletAdminList[i];
        }
        return result;
    }

    // ── Asset operations ──────────────────────────────────────────────────────

    /// @notice Withdraw native ETH/gas token to recipient.
    function executeNativeWithdrawal(address payable recipient, uint256 amount)
        external onlyEntryPointOrSelf nonReentrant
    {
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool ok, ) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Withdraw ERC-20 token to recipient.
    function executeERC20Withdrawal(IERC20 token, address recipient, uint256 amount)
        external onlyEntryPointOrSelf nonReentrant
    {
        token.safeTransfer(recipient, amount);
    }

    /// @notice Call an external contract (e.g. Relay depository) forwarding native value.
    ///         Funds come directly from account balance — no vault roundtrip.
    function executeExternalCall(
        address to,
        uint256 nativeAmount,
        bytes calldata data
    ) external onlyEntryPointOrSelf nonReentrant {
        if (nativeAmount > 0 && address(this).balance < nativeAmount) revert InsufficientBalance();
        (bool ok, bytes memory ret) = to.call{value: nativeAmount}(data);
        if (!ok) assembly { revert(add(ret, 0x20), mload(ret)) }
    }

    /// @notice Approve + call external contract for ERC-20 swap/bridge flows.
    ///         Clears residual allowance after the call.
    function executeERC20ExternalCall(
        address token,
        uint256 tokenAmount,
        address spender,
        address to,
        bytes calldata data
    ) external onlyEntryPointOrSelf nonReentrant {
        // Use forceApprove to handle USDT-style tokens that revert on non-zero→non-zero approve
        IERC20(token).forceApprove(spender, tokenAmount);
        (bool ok, bytes memory ret) = to.call(data);
        if (!ok) assembly { revert(add(ret, 0x20), mload(ret)) }
        IERC20(token).forceApprove(spender, 0);
    }

    // ── directExecute (gas-separated flow) ───────────────────────────────────
    //
    // 1. Frontend calls buildDirectOpHash() (view, free) to get opHash.
    // 2. Authorized wallet signs: personal_sign(opHash).
    // 3. Any address submits directExecute(..., walletSig).
    //
    // If walletSig is empty, msg.sender is used as the wallet factor directly.

    function directExecute(
        bytes32          signerMerkleRoot,
        uint32           leafIndex,
        bytes32[67] calldata otsPubKey,
        bytes32[67] calldata otsSig,
        bytes32[]   calldata merkleProof,
        bytes32          inbandNewRoot,
        bytes32          inbandNewPubSeed,
        bytes32          passwordPreimage,
        bytes calldata   actionCalldata,
        bytes calldata   walletSig
    ) external {
        _validateTreeProof(signerMerkleRoot, leafIndex, merkleProof);
        if (actionCalldata.length < 4) revert InvalidActionCalldata();
        if (!isAdmin[signerMerkleRoot]) revert NotAdmin();
        if (isLeafSpent[signerMerkleRoot][leafIndex]) revert LeafAlreadySpent();

        _verifyPassword(passwordPreimage);

        bytes32 opHash = keccak256(abi.encode(
            keccak256("QuantumVault:Direct:v1"),
            address(this),
            block.chainid,
            directNonce[signerMerkleRoot],
            actionCalldata,
            inbandNewRoot,
            inbandNewPubSeed,
            passwordPreimage
        ));

        // Factor 2: empty walletSig → msg.sender is the wallet factor.
        address walletSigner = walletSig.length == 0
            ? msg.sender
            : ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(opHash), walletSig);
        if (!isWalletAdmin[walletSigner]) revert Unauthorized();

        // Factor 1: WOTS+ OTS + Merkle proof.
        bytes32[67] memory pkMem  = _toMemory67(otsPubKey);
        bytes32[67] memory sigMem = _toMemory67(otsSig);

        if (!WOTSVerifier.verifyOTS(opHash, pubSeedOf[signerMerkleRoot], sigMem, pkMem))
            revert InvalidPasswordProof();

        bytes32 leaf = WOTSVerifier.leafHash(pkMem);
        if (!WOTSVerifier.verifyMerkle(signerMerkleRoot, leaf, merkleProof, leafIndex))
            revert InvalidPasswordProof();

        isLeafSpent[signerMerkleRoot][leafIndex] = true;
        emit LeafSpent(signerMerkleRoot, leafIndex);
        unchecked { directNonce[signerMerkleRoot]++; }

        // Inline key rotation: atomically add new root, remove old non-primary root.
        if (inbandNewRoot != bytes32(0) && !isAdmin[inbandNewRoot]) {
            _addAdmin(inbandNewRoot, inbandNewPubSeed);
            if (signerMerkleRoot != primaryMerkleRoot && isAdmin[signerMerkleRoot]) {
                _removeAdmin(signerMerkleRoot);
            }
            emit MerkleRootRotated(signerMerkleRoot, inbandNewRoot, inbandNewPubSeed);
        }

        emit DirectExecuted(signerMerkleRoot, leafIndex, msg.sender);

        // CRITICAL: must revert on action failure — leaf is already spent; a silent failure
        // would consume a one-time key without executing the intended operation.
        (bool ok, bytes memory ret) = address(this).call(actionCalldata);
        if (!ok) {
            assembly { revert(add(ret, 0x20), mload(ret)) }
        }
    }

    /// @notice View helper — compute opHash for directExecute. Frontend signs this.
    function buildDirectOpHash(
        bytes32 signerMerkleRoot,
        bytes32 inbandNewRoot,
        bytes32 inbandNewPubSeed,
        bytes32 passwordPreimage,
        bytes calldata actionCalldata
    ) external view returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("QuantumVault:Direct:v1"),
            address(this),
            block.chainid,
            directNonce[signerMerkleRoot],
            actionCalldata,
            inbandNewRoot,
            inbandNewPubSeed,
            passwordPreimage
        ));
    }

    // ── ERC-4337 signature validation ─────────────────────────────────────────
    // UserOp.signature ABI layout:
    //   (bytes32 signerMerkleRoot, uint32 leafIndex, bytes32[67] otsPubKey,
    //    bytes32[67] otsSig, bytes32[] merkleProof, bytes32 inbandNewRoot,
    //    bytes32 inbandNewPubSeed, bytes32 passwordPreimage, bytes walletSig)
    //
    // walletSig covers userOpHash via personal_sign.

    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        (
            bytes32     signerMerkleRoot,
            uint32      leafIndex,
            bytes32[67] memory otsPubKey,
            bytes32[67] memory otsSig,
            bytes32[]   memory merkleProof,
            bytes32     inbandNewRoot,
            bytes32     inbandNewPubSeed,
            bytes32     passwordPreimage,
            bytes       memory walletSig
        ) = abi.decode(
            userOp.signature,
            (bytes32, uint32, bytes32[67], bytes32[67], bytes32[], bytes32, bytes32, bytes32, bytes)
        );

        if (!isAdmin[signerMerkleRoot]) return SIG_VALIDATION_FAILED;
        if (isLeafSpent[signerMerkleRoot][leafIndex]) return SIG_VALIDATION_FAILED;
        if (leafIndex >= TREE_SIZE || merkleProof.length != TREE_DEPTH) return SIG_VALIDATION_FAILED;

        address walletSigner = ECDSA.recover(
            MessageHashUtils.toEthSignedMessageHash(userOpHash),
            walletSig
        );
        if (!isWalletAdmin[walletSigner]) return SIG_VALIDATION_FAILED;

        if (passwordCommit != bytes32(0)) {
            if (keccak256(abi.encode(passwordPreimage, passwordDomain)) != passwordCommit)
                return SIG_VALIDATION_FAILED;
        }

        bytes32 sigHash = keccak256(abi.encode(
            userOpHash, inbandNewRoot, inbandNewPubSeed, passwordPreimage
        ));

        if (!WOTSVerifier.verifyOTS(sigHash, pubSeedOf[signerMerkleRoot], otsSig, otsPubKey))
            return SIG_VALIDATION_FAILED;

        bytes32 leafHash = WOTSVerifier.leafHash(otsPubKey);
        if (!WOTSVerifier.verifyMerkle(signerMerkleRoot, leafHash, merkleProof, leafIndex))
            return SIG_VALIDATION_FAILED;

        return _packValidationData(false, 0, 0);
    }

    // ── ERC-4337 execution ────────────────────────────────────────────────────

    function executeUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /*userOpHash*/
    ) external override onlyEntryPoint {
        (
            bytes32 signerMerkleRoot,
            uint32  leafIndex,
            /*otsPubKey*/,
            /*otsSig*/,
            bytes32[] memory merkleProof,
            bytes32 inbandNewRoot,
            bytes32 inbandNewPubSeed,
            /*passwordPreimage*/,
            /*walletSig*/
        ) = abi.decode(
            userOp.signature,
            (bytes32, uint32, bytes32[67], bytes32[67], bytes32[], bytes32, bytes32, bytes32, bytes)
        );

        _validateTreeProof(signerMerkleRoot, leafIndex, merkleProof);
        if (userOp.callData.length <= 4) revert InvalidActionCalldata();

        isLeafSpent[signerMerkleRoot][leafIndex] = true;
        emit LeafSpent(signerMerkleRoot, leafIndex);

        if (inbandNewRoot != bytes32(0) && !isAdmin[inbandNewRoot]) {
            _addAdmin(inbandNewRoot, inbandNewPubSeed);
            if (signerMerkleRoot != primaryMerkleRoot && isAdmin[signerMerkleRoot]) {
                _removeAdmin(signerMerkleRoot);
            }
            emit MerkleRootRotated(signerMerkleRoot, inbandNewRoot, inbandNewPubSeed);
        }

        bytes memory inner;
        if (userOp.callData.length >= 4) inner = userOp.callData[4:];

        // CRITICAL: revert on failure. ERC-4337 v0.7 EntryPoint catches the revert,
        // pays bundler from prefund, and rolls back all state (including isLeafSpent).
        // Without this revert, a failing action permanently consumes a WOTS+ leaf,
        // enabling 256-leaf exhaustion DoS via always-failing calldata.
        (bool ok, bytes memory ret) = address(this).call(inner);
        if (!ok) {
            assembly { revert(add(ret, 0x20), mload(ret)) }
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _validateTreeProof(bytes32, uint32 leafIndex, bytes32[] memory merkleProof)
        internal pure
    {
        if (leafIndex >= TREE_SIZE) revert InvalidLeafIndex();
        if (merkleProof.length != TREE_DEPTH) revert InvalidMerkleProofLength();
    }

    function _addAdmin(bytes32 root, bytes32 pubSeed) internal {
        isAdmin[root]   = true;
        pubSeedOf[root] = pubSeed;
        adminCount++;
        _adminListIndex[root] = _adminList.length;
        _adminList.push(root);
        emit AdminAdded(root, pubSeed);
    }

    function _removeAdmin(bytes32 root) internal {
        isAdmin[root] = false;
        delete pubSeedOf[root];
        adminCount--;

        uint256 idx  = _adminListIndex[root];
        uint256 last = _adminList.length - 1;
        if (idx != last) {
            bytes32 tail = _adminList[last];
            _adminList[idx]       = tail;
            _adminListIndex[tail] = idx;
        }
        _adminList.pop();
        delete _adminListIndex[root];

        emit AdminRemoved(root);
    }

    function _addWalletAdmin(address wallet) internal {
        isWalletAdmin[wallet] = true;
        walletAdminCount++;
        _walletAdminListIndex[wallet] = _walletAdminList.length;
        _walletAdminList.push(wallet);
        emit WalletAdminAdded(wallet);
    }

    function _removeWalletAdmin(address wallet) internal {
        isWalletAdmin[wallet] = false;
        walletAdminCount--;

        uint256 idx  = _walletAdminListIndex[wallet];
        uint256 last = _walletAdminList.length - 1;
        if (idx != last) {
            address tail = _walletAdminList[last];
            _walletAdminList[idx]       = tail;
            _walletAdminListIndex[tail] = idx;
        }
        _walletAdminList.pop();
        delete _walletAdminListIndex[wallet];

        emit WalletAdminRemoved(wallet);
    }

    function _verifyPassword(bytes32 passwordPreimage) internal view {
        if (passwordCommit != bytes32(0)) {
            if (keccak256(abi.encode(passwordPreimage, passwordDomain)) != passwordCommit)
                revert InvalidPasswordProof();
        }
    }

    function _toMemory67(bytes32[67] calldata src)
        internal pure returns (bytes32[67] memory dst)
    {
        for (uint256 i = 0; i < 67; ) {
            dst[i] = src[i];
            unchecked { i++; }
        }
    }

    /// @dev Accept ETH/gas token deposits directly.
    receive() external payable {}
}
