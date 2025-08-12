// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";

import {AuthCaptureEscrow} from "../../src/AuthCaptureEscrow.sol";

contract CaptureOp is Script {
    function run() external {
        address escrow = vm.envAddress("AUTH_CAPTURE_ESCROW");
        address token = vm.envAddress("DEMO_TOKEN");
        address payer = vm.envAddress("PAYER");
        address merchant = vm.envAddress("MERCHANT");
        uint256 saltNum = vm.envUint("PAYMENT_SALT");

        uint256 amount = 0.01 ether;
        uint48 nowTs = uint48(block.timestamp);
        AuthCaptureEscrow.PaymentInfo memory info = AuthCaptureEscrow.PaymentInfo({
            operator: payer,
            payer: payer,
            receiver: merchant,
            token: token,
            maxAmount: uint120(amount),
            preApprovalExpiry: nowTs + 1 days,
            authorizationExpiry: nowTs + 2 days,
            refundExpiry: nowTs + 3 days,
            minFeeBps: 0,
            maxFeeBps: 0,
            feeReceiver: address(0),
            salt: saltNum
        });

        vm.startBroadcast();
        AuthCaptureEscrow(escrow).capture(info, amount, 0, address(0));
        vm.stopBroadcast();

        console2.log("Captured:", amount);
    }
} 