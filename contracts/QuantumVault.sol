// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title QuantumVault — pure custody vault. Only the authorized account may withdraw.
/// @notice authorizedAccount is set exactly once by the factory post CREATE2-deploy.
contract QuantumVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error UnauthorizedAccount();
    error UnauthorizedFactory();
    error ZeroRecipient();
    error ZeroAmount();
    error InsufficientBalance();
    error TransferFailed();
    error AlreadyAuthorized();

    event Deposited(address indexed sender, uint256 amount);
    event NativeWithdrawn(address indexed recipient, uint256 amount);
    event ERC20Withdrawn(address indexed token, address indexed recipient, uint256 amount);
    event AuthorizedAccountSet(address indexed account);

    address public immutable factory;
    address public authorizedAccount;

    constructor(address factory_) {
        if (factory_ == address(0)) revert UnauthorizedFactory();
        factory = factory_;
    }

    /// @notice Called exactly once by the factory immediately after deployment.
    function setAuthorizedAccount(address account) external {
        if (msg.sender != factory) revert UnauthorizedFactory();
        if (authorizedAccount != address(0)) revert AlreadyAuthorized();
        if (account == address(0)) revert ZeroRecipient();
        authorizedAccount = account;
        emit AuthorizedAccountSet(account);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    modifier onlyVaultAccount() {
        if (msg.sender != authorizedAccount) revert UnauthorizedAccount();
        _;
    }

    function withdrawNative(
        address payable recipient,
        uint256 amount
    ) external nonReentrant onlyVaultAccount {
        if (recipient == address(0)) revert ZeroRecipient();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();

        (bool ok, ) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit NativeWithdrawn(recipient, amount);
    }

    function withdrawERC20(
        IERC20 token,
        address recipient,
        uint256 amount
    ) external nonReentrant onlyVaultAccount {
        if (address(token) == address(0) || recipient == address(0)) revert ZeroRecipient();
        if (amount == 0) revert ZeroAmount();

        token.safeTransfer(recipient, amount);
        emit ERC20Withdrawn(address(token), recipient, amount);
    }
}
