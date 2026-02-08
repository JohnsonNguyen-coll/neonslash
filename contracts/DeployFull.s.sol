// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./NeonSlashVault.sol";
import "./NeonSlashNFT.sol";

contract DeployProjectScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Vault
        NeonSlashVault vault = new NeonSlashVault(usdcAddress);
        console.log("Vault deployed at:", address(vault));

        // 2. Deploy NFT
        NeonSlashNFT nft = new NeonSlashNFT();
        console.log("NFT deployed at:", address(nft));

        // 3. Link them
        vault.setNFTContract(address(nft));
        nft.setVault(address(vault));
        console.log("Vault and NFT linked successfully!");

        vm.stopBroadcast();
    }
}
