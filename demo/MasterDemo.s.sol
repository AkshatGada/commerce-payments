// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AuthCaptureEscrow} from "../src/AuthCaptureEscrow.sol";
import {PreApprovalPaymentCollector} from "../src/collectors/PreApprovalPaymentCollector.sol";

contract MasterDemo is Script {
    function run() external {
        // Read core addresses
        address escrow = vm.envAddress("AUTH_CAPTURE_ESCROW");
        address preApprovalCollector = vm.envAddress("PREAPPROVAL_COLLECTOR");
        address token = vm.envAddress("DEMO_TOKEN");

        // Participants
        address payer = vm.envAddress("ADDRESS_1");
        address merchant = vm.envAddress("ADDRESS_2");
        uint256 saltNum = vm.envUint("PAYMENT_SALT");

        // Amount: 1 DMO (18 decimals)
        uint256 amount = 1 ether;

        // Configure expiries
        uint48 nowTs = uint48(block.timestamp);
        uint48 preApprovalExpiry = nowTs + 1 days;
        uint48 authorizationExpiry = nowTs + 2 days;
        uint48 refundExpiry = nowTs + 3 days;

        // Construct PaymentInfo
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

        // Resolve TokenStore for CLI display
        address tokenStore = AuthCaptureEscrow(escrow).getTokenStore(payer);

        // CLI banners
        _banner("Commerce Payments Protocol Demo");
        _kv("Payer", payer);
        _kv("Merchant", merchant);
        _kv("Token", token);
        _kv("Escrow", escrow);
        _kv("Collector", preApprovalCollector);
        _kv("TokenStore (operator vault)", tokenStore);
        console2.log("\n--- Balances BEFORE ---");
        _balances(token, payer, merchant, tokenStore);

        vm.startBroadcast();

        _step("1/4 Approve collector to spend 1 DMO from payer");
        IERC20(token).approve(preApprovalCollector, amount);

        _step("2/4 Pre-approve payment (binds PaymentInfo)");
        PreApprovalPaymentCollector(preApprovalCollector).preApprove(info);

        _step("3/4 Authorize: payer -> escrow vault (TokenStore)");
        AuthCaptureEscrow(escrow).authorize(info, amount, preApprovalCollector, hex"");
        console2.log("Authorized:", amount);
        console2.log("\n--- Balances AFTER AUTHORIZE ---");
        _balances(token, payer, merchant, tokenStore);

        _step("4/4 Capture: escrow vault -> merchant (fee = 0)");
        AuthCaptureEscrow(escrow).capture(info, amount, 0, address(0));
        console2.log("Captured:", amount);

        vm.stopBroadcast();

        console2.log("\n=== Demo Complete ===");
        console2.log("\n--- Balances AFTER CAPTURE ---");
        _balances(token, payer, merchant, tokenStore);

        // Display expiries for reference
        console2.log("\nPayment expiries (unix):");
        _kvU("preApprovalExpiry", preApprovalExpiry);
        _kvU("authorizationExpiry", authorizationExpiry);
        _kvU("refundExpiry", refundExpiry);
    }

    function _banner(string memory title) internal view {
        console2.log("========================================");
        console2.log(title);
        console2.log("========================================\n");
    }

    function _step(string memory label) internal view {
        console2.log("\n> ", label);
    }

    function _kv(string memory k, address v) internal view { console2.log(string.concat(k, ": "), v); }
    function _kvU(string memory k, uint256 v) internal view { console2.log(string.concat(k, ": "), v); }

    function _balances(address token, address payer, address merchant, address tokenStore) internal view {
        console2.log("payer:", IERC20(token).balanceOf(payer));
        console2.log("merchant:", IERC20(token).balanceOf(merchant));
        console2.log("tokenStore:", IERC20(token).balanceOf(tokenStore));
    }
} 