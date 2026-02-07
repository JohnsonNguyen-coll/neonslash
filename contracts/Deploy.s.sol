// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "./NeonSlashVault.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        NeonSlashVault vault = new NeonSlashVault(usdcAddress);

        vm.stopBroadcast();

        console.log("NeonSlashVault deployed at:", address(vault));
    }
}
