// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AuthCaptureEscrow} from "../../src/AuthCaptureEscrow.sol";

contract RefundOp is Script {
    function run() external {
        address escrow = vm.envAddress("AUTH_CAPTURE_ESCROW");
        address refundCollector = vm.envAddress("OPERATOR_REFUND_COLLECTOR");
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
            refundExpiry: nowTs + 30 days,
            minFeeBps: 0,
            maxFeeBps: 0,
            feeReceiver: address(0),
            salt: saltNum
        });

        vm.startBroadcast();
        // Approve refund collector to pull from operator (demo uses payer as operator)
        IERC20(token).approve(refundCollector, amount);
        AuthCaptureEscrow(escrow).refund(info, amount, refundCollector, hex"");
        vm.stopBroadcast();

        console2.log("Refunded:", amount);
    }
} 