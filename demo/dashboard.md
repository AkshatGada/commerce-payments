### **Commerce Dashboard**

Welcome to the Commerce Payments Protocol demo. This interactive dashboard showcases how blockchains can power the complex, real-world needs of modern commerce—far beyond simple wallet-to-wallet transfers.

Discover how businesses can reserve funds, settle payments after fulfillment, manage refunds, and resolve disputes with transparency and control.

***

### **Why This Matters: Solving Real Commerce Challenges**

Modern commerce isn't just about getting paid. Businesses need sophisticated tools to:

*   **Reserve Funds** and settle them later to align with shipping and fulfillment timelines.
*   **Safely Return Money** through voids, reclaims, and full or partial refunds.
*   **Resolve Disputes** with a clear, documented process that links evidence to specific transactions.

The dashboard brings these essential commerce patterns onchain, combining the flexibility businesses need with the security and transparency of the blockchain.

***

### **Dashboard Capabilities: Your Control Center**

This demo provides a hands-on experience with a powerful, operator-facing dashboard. Here’s what you can do:

*   **📊 At-a-Glance KPIs:** Instantly view live payment volume, total refundable value, active disputes, and available operator liquidity.
*   **🔍 Real-Time Payment Tracking:** Follow every payment through its entire lifecycle with a clear, auditable timeline. Every step links directly to the blockchain explorer for independent verification.
*   **↩️ Effortless Refunds:** See which payments are eligible for a refund and process full or partial returns with a single click.
*   **⚖️ Streamlined Dispute Resolution:** A central hub to log disputes, attach evidence, update status, and approve refunds, creating a clear audit trail.

***

### **Understanding the Payment Lifecycle**

Our protocol mirrors real-world commerce with clear, defined payment states. As you use the demo, you'll see payments move through these statuses:

*   **Authorized:** Funds are successfully reserved for a purchase, like a hold on a credit card.
*   **Captured:** The reserved funds are settled and transferred to the merchant after fulfillment.
*   **Charged:** A single-step transaction where authorization and capture happen instantly.
*   **Refunded:** Funds are returned to the original payer.
*   **Voided / Reclaimed:** The authorization is canceled, and the reserved funds are returned to the payer before capture.

***

### **See It in Action: A 3-Step Guide**

Experience the end-to-end flow in just a few minutes:

1.  **Simulate a Purchase:** Use the **"Payment Ops"** tab to create a payment. Choose between an instant settlement (`Charge`) or a two-step flow (`Authorize` then `Capture`).
2.  **Track the Payment in Real-Time:** Navigate to the **"Payments"** tab to see your transaction appear on the status board. Click to view its detailed timeline and onchain record.
3.  **Handle Post-Purchase Events:** Move to the **"Refunds"** or **"Disputes"** tabs to see how easily you can manage returns and resolve issues for the payment you just created.

***

### **The Technology Powering Our Demo**

This demo is built on the audited, open-source components of the Base Commerce Protocol.

*   **AuthCaptureEscrow:** The core smart contract that manages the payment state and executes all operations (`authorize`, `capture`, `refund`, etc.).
*   **TokenStore:** A per-operator vault that safely segments escrowed funds.
*   **Token Collectors:** Pluggable modules for sourcing funds for payments and refunds.
*   **PaymentInfo & Time Windows:** The immutable terms of each payment, with built-in expiry deadlines (`authorizationExpiry`, `refundExpiry`) that provide safety and prevent funds from being locked indefinitely.
*   **Fee Framework:** A flexible system for defining fee constraints.

***

### **Learn More**

For a deeper dive into the protocol's architecture and security, please refer to our internal documentation. If you encounter any unexpected results, simply refresh the dashboard or follow the transaction links to confirm the onchain status.