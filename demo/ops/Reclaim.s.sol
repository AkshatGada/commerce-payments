// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";

import {AuthCaptureEscrow} from "../../src/AuthCaptureEscrow.sol";

contract ReclaimOp is Script {
    function run() external {
        address escrow = vm.envAddress("AUTH_CAPTURE_ESCROW");
        address token = vm.envAddress("DEMO_TOKEN");
        address payer = vm.envAddress("PAYER");
        address merchant = vm.envAddress("MERCHANT");
        uint256 saltNum = vm.envUint("PAYMENT_SALT");

        // Read the exact expiries used during authorization
        uint48 preApprovalExpiry = uint48(vm.envUint("PREAPPROVAL_EXPIRY"));
        uint48 authorizationExpiry = uint48(vm.envUint("AUTHORIZATION_EXPIRY"));
        uint48 refundExpiry = uint48(vm.envUint("REFUND_EXPIRY"));

        uint256 amount = 0.01 ether;
        AuthCaptureEscrow.PaymentInfo memory info = AuthCaptureEscrow.PaymentInfo({
            operator: payer,
            payer: payer,
            receiver: merchant,
            token: token,
            maxAmount: uint120(amount),
            preApprovalExpiry: preApprovalExpiry,
            authorizationExpiry: authorizationExpiry,
            refundExpiry: refundExpiry,
            minFeeBps: 0,
            maxFeeBps: 0,
            feeReceiver: address(0),
            salt: saltNum
        });

        vm.startBroadcast(payer);
        AuthCaptureEscrow(escrow).reclaim(info);
        vm.stopBroadcast();

        console2.log("Reclaimed payment");
    }
} 