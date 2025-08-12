 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AuthCaptureEscrow} from "../../src/AuthCaptureEscrow.sol";
import {PreApprovalPaymentCollector} from "../../src/collectors/PreApprovalPaymentCollector.sol";

contract AuthorizeOp is Script {
    function run() external {
        address escrow = vm.envAddress("AUTH_CAPTURE_ESCROW");
        address preApprovalCollector = vm.envAddress("PREAPPROVAL_COLLECTOR");
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
        IERC20(token).approve(preApprovalCollector, amount);
        PreApprovalPaymentCollector(preApprovalCollector).preApprove(info);
        AuthCaptureEscrow(escrow).authorize(info, amount, preApprovalCollector, hex"");
        vm.stopBroadcast();

        console2.log("Authorized:", amount);
    }
}
