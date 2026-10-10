// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title WOTSVerifier — on-chain WOTS+ signature and Merkle proof verifier
library WOTSVerifier {

    uint256 internal constant W  = 16;
    uint256 internal constant L1 = 64;
    uint256 internal constant L2 = 3;
    uint256 internal constant L  = 67; // L1 + L2

    /// @dev One step of the WOTS+ hash chain: mask with PRF(pubSeed, i, j), then hash.
    function _step(
        bytes32 val,
        bytes32 pubSeed,
        uint32  i,
        uint8   j
    ) internal pure returns (bytes32) {
        bytes32 bm = keccak256(abi.encodePacked(pubSeed, i, j));
        return keccak256(abi.encodePacked(val ^ bm));
    }

    /// @notice Verify a WOTS+ OTS signature against a public key.
    function verifyOTS(
        bytes32        msgHash,
        bytes32        pubSeed,
        bytes32[67] memory sig,
        bytes32[67] memory pubKey
    ) internal pure returns (bool) {
        uint8[67] memory b;

        for (uint256 k = 0; k < 32; k++) {
            uint8 byt    = uint8(msgHash[k]);
            b[2 * k]     = byt >> 4;
            b[2 * k + 1] = byt & 0xF;
        }

        uint256 checksum;
        unchecked {
            for (uint256 k = 0; k < L1; k++) {
                checksum += (W - 1) - b[k];
            }
        }
        b[64] = uint8((checksum >> 8) & 0xF);
        b[65] = uint8((checksum >> 4) & 0xF);
        b[66] = uint8( checksum        & 0xF);

        for (uint256 k = 0; k < L; k++) {
            bytes32 val  = sig[k];
            uint8   base = b[k];
            uint8   rem  = uint8(W - 1) - base;
            for (uint8 s = 0; s < rem; ) {
                val = _step(val, pubSeed, uint32(k), base + s);
                unchecked { s++; }
            }
            if (val != pubKey[k]) return false;
        }
        return true;
    }

    /// @notice Hash an OTS public key into a Merkle leaf (domain prefix 0x00).
    function leafHash(bytes32[67] memory pubKey) internal pure returns (bytes32 result) {
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore8(ptr, 0x00)
            let src := pubKey
            let dst := add(ptr, 1)
            for { let i := 0 } lt(i, 2144) { i := add(i, 32) } {
                mstore(add(dst, i), mload(add(src, i)))
            }
            result := keccak256(ptr, 2145)
        }
    }

    /// @notice Verify a binary Merkle inclusion proof.
    /// @dev Domain prefix 0x01 prevents second-preimage attacks between leaf and inner nodes.
    function verifyMerkle(
        bytes32   root,
        bytes32   leaf,
        bytes32[] memory proof,
        uint32    index
    ) internal pure returns (bool) {
        bytes32 node = leaf;
        uint256 len  = proof.length;
        for (uint256 i = 0; i < len; ) {
            bytes32 sibling = proof[i];
            if (index & 1 == 0) {
                node = keccak256(abi.encodePacked(uint8(0x01), node, sibling));
            } else {
                node = keccak256(abi.encodePacked(uint8(0x01), sibling, node));
            }
            index >>= 1;
            unchecked { i++; }
        }
        return node == root;
    }
}
