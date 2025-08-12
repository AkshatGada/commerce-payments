// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AuthCaptureEscrow} from "../src/AuthCaptureEscrow.sol";
import {PreApprovalPaymentCollector} from "../src/collectors/PreApprovalPaymentCollector.sol";

contract DemoFlow is Script {
    function run() external {
        // Load addresses from env
        address escrow = vm.envAddress("AUTH_CAPTURE_ESCROW");
        address preApprovalCollector = vm.envAddress("PREAPPROVAL_COLLECTOR");
        address token = vm.envAddress("DEMO_TOKEN");
        address payer = vm.envAddress("PAYER");
        address merchant = vm.envAddress("MERCHANT");

        // Configure amounts and expiries
        uint256 amount = 0.01 ether; // 0.01 with 18 decimals
        uint256 maxAmount = amount;  // keep equal for simplicity
        uint48 nowTs = uint48(block.timestamp);
        uint48 preApprovalExpiry = nowTs + 1 days;
        uint48 authorizationExpiry = nowTs + 2 days;
        uint48 refundExpiry = nowTs + 3 days;

        // Build PaymentInfo
        AuthCaptureEscrow.PaymentInfo memory info = AuthCaptureEscrow.PaymentInfo({
            operator: payer, // operator runs the flow in this demo
            payer: payer,
            receiver: merchant,
            token: token,
            maxAmount: uint120(maxAmount),
            preApprovalExpiry: preApprovalExpiry,
            authorizationExpiry: authorizationExpiry,
            refundExpiry: refundExpiry,
            minFeeBps: 0,
            maxFeeBps: 0,
            feeReceiver: address(0),
            salt: uint256(keccak256(abi.encode(block.chainid, payer, merchant, block.timestamp)))
        });

        vm.startBroadcast();

        // 1) Payer approves collector
        IERC20(token).approve(preApprovalCollector, maxAmount);
        console2.log("Approved collector for:", maxAmount);

        // 2) Payer pre-approves this specific payment
        PreApprovalPaymentCollector(preApprovalCollector).preApprove(info);
        console2.log("Pre-approved payment");

        // 3) Operator (same as payer in this demo) authorizes into escrow
        AuthCaptureEscrow(escrow).authorize(info, amount, preApprovalCollector, hex"");
        console2.log("Authorized amount:", amount);

        // 4) Operator captures to merchant (fee = 0)
        AuthCaptureEscrow(escrow).capture(info, amount, 0, address(0));
        console2.log("Captured amount:", amount);

        vm.stopBroadcast();
    }
} 