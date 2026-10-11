// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {QuantumVaultAccountFactory} from "../contracts/QuantumVaultAccountFactory.sol";

contract Deploy is Script {
    // Fixed salt for deterministic address across chains
    bytes32 constant SALT = keccak256("QuantumVaultAccountFactoryV6");

    function run() external returns (QuantumVaultAccountFactory factory) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address entryPoint  = vm.envAddress("ENTRY_POINT");
        address owner       = vm.envAddress("OWNER");

        vm.startBroadcast(deployerKey);

        factory = new QuantumVaultAccountFactory{salt: SALT}(
            IEntryPoint(entryPoint),
            owner
        );

        console2.log("QuantumVaultAccountFactory:", address(factory));
        console2.log("EntryPoint:                ", entryPoint);
        console2.log("Owner:                     ", owner);

        vm.stopBroadcast();
    }
}
