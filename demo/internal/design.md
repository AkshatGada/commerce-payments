Of course. Here is a comprehensive `design.md` file that details all the features of the feature-rich merchant dashboard, providing a complete guide for development.

***

# **design.md**
## **Feature-Rich Merchant Dashboard: UI/UX Specification**

This document provides a detailed design and component specification for the modern merchant dashboard. It serves as the single source of truth for the frontend development team, outlining the visual language, layout, features, and interactive elements of the application.

### **1. High-Level Design Philosophy**

*   **Clarity and Control**: The primary goal is to empower merchants with a clear, real-time view of their payment ecosystem and provide them with direct control over operations like refunds and disputes.
*   **Actionable Intelligence**: The dashboard should not just display data; it must surface insights and highlight items that require action, transforming raw data into business intelligence.
*   **Efficiency and Speed**: Workflows for critical, time-sensitive tasks must be streamlined to minimize clicks and reduce operational overhead.
*   **Trust and Professionalism**: The aesthetic must be clean, modern, and professional to build user confidence in managing sensitive financial operations.

### **2. Visual Identity: Color Palette & Typography**

*   **Primary Font**: `Inter` (Sans-serif) for all text. Use a full range of weights (Regular, Medium, Semi-Bold, Bold) to establish a clear visual hierarchy.
*   **Color Palette**:
    *   **Background**: `#FFFFFF` (White) for primary content areas. `#F7F8FC` (Off-White/Light Gray) for side panels, headers, and to create subtle depth.
    *   **Primary Accent**: `#4A90E2` (Professional Blue) - Used for primary buttons, active navigation states, links, and key metric highlights.
    *   **Text**: `#2C3E50` (Dark Slate) - For all body copy and headers for maximum readability.
    *   **Success**: `#2ECC71` (Vibrant Green) - Used for completed transactions, positive trends, and successful action confirmations.
    *   **Warning/Attention**: `#F39C12` (Amber/Orange) - For items nearing expiry, items needing review, and pending states.
    *   **Error/Critical**: `#E74C3C` (Vibrant Red) - For active disputes, failed transactions, and critical system alerts.
    *   **Borders & Dividers**: `#EAEBF0` (Light Gray) - To create subtle separation between UI elements.

### **3. Global UI Components**

#### **3.1. Global Header**
A fixed horizontal bar at the top of the viewport.
*   **Left Section**: Contains the merchant's logo and name (e.g., "Nexus Commerce").
*   **Center Section**: Navigation tabs: **Dashboard**, **Payments**, **Refunds**, **Disputes**, **Analytics**. The active tab is styled with the primary accent color (`#4A90E2`).
*   **Right Section**:
    *   **Global Search**: An input field with the placeholder "Search by Payment ID, Payer Address...".
    *   **Notifications**: A bell icon that displays a red dot (`#E74C3C`) when there are unread, critical alerts.
    *   **User Profile**: A circular avatar that opens a dropdown with "Settings" and "Logout" options on click.

#### **3.2. KPI Summary Bar**
A responsive grid of 4 cards located directly below the header.
*   **Card Style**: Rounded corners (8px radius), white background, subtle drop shadow.
*   **Card 1: "Live Payments"**: Shows total authorized value (e.g., "$845,210") with a green percentage change indicator below ("+12% vs last week").
*   **Card 2: "Refundable Now"**: Shows total value available for refund (e.g., "$42,150") and the number of transactions.
*   **Card 3: "Active Disputes"**: Shows the count of open disputes (e.g., "14") with the number colored in red (`#E74C3C`).
*   **Card 4: "Operator Balance"**: Shows the combined balance of the `TokenStore` to indicate available liquidity for operations.

### **4. Feature-Specific Tabs**

#### **4.1. The `Payments` Tab**
This is the default view, designed for real-time operational awareness.
*   **Layout**: A two-column design with filters on the left and a dynamic Kanban board on the right.
*   **Filters Panel (Left)**:
    *   **Status**: Checkboxes for `Authorized`, `Captured`, `Refundable`, `Completed`, etc.
    *   **Token**: Toggles for different token types (USDC, ETH, DAI).
    *   **Date Range**: A calendar picker for custom date ranges.
    *   **Quick Filters**: A highlighted section with toggles for **"Needs Attention"** (expiring soon, high-value) and **"Disputed"**.
*   **Payment Status Board (Right)**:
    *   **Kanban Columns**: Titled `Authorized`, `Captured`, `Refundable`, and `Completed`.
    *   **Payment Cards**: Draggable cards representing each payment. Each card displays:
        *   The payment amount and token icon.
        *   The shortened `salt` (Payment ID).
        *   A prominent **countdown timer** ("Expires in: 4d 11h") that turns orange when under 24 hours.
        *   A colored vertical bar on the left edge indicates status (Blue for Authorized, Green for Captured).
    *   **Payment Detail Panel**: Clicking a card slides out a detailed panel from the right, showing:
        *   All `PaymentInfo` fields cleanly formatted.
        *   A visual **transaction timeline** with timestamps for each event (`Authorized`, `Captured`, etc.).
        *   Action buttons: `Capture Payment`, `Initiate Refund`, `View on PolygonScan`.

#### **4.2. The `Refunds` Tab**
Dedicated to managing all aspects of refunds.
*   **Layout**: A main table view with an analytics sidebar.
*   **Refunds List (Main View)**:
    *   A searchable and sortable table of all refundable transactions.
    *   **Columns**: Payment ID, Payer, Amount, Token, **Refund Deadline (with countdown)**, Status.
    *   **Actions**: Each row has buttons for **"Full Refund"** and **"Partial Refund"**. A checkbox allows for bulk selection.
    *   **Bulk Action Bar**: Appears when items are selected, with a "Process Bulk Refund" button.
*   **Refund Analytics (Sidebar)**:
    *   Charts showing:
        *   Total refund amount vs. total revenue.
        *   Refund rate over time (weekly/monthly trend line).
        *   A bar chart of top refund reasons (requires merchants to categorize refunds).

#### **4.3. The `Disputes` Tab**
A centralized command center for handling payment disputes.
*   **Layout**: A two-column layout with a list of disputes on the left and a detailed view on the right.
*   **Disputes List (Left)**:
    *   A list of all disputes, sortable by status (`Open`, `Pending`, `Resolved`), urgency, or age.
    *   Each list item shows the payment ID, dispute reason, and an urgency flag (red for new/unattended).
*   **Dispute Detail View (Right)**:
    *   **Payment Context**: Displays the full details of the disputed payment.
    *   **Evidence Section**: An interface to upload and view documents (hashes stored on-chain).
    *   **Communication Log**: A chat-style log to record communications with the customer or operator.
    *   **Action Panel**: Buttons to `Approve Refund`, `Provide Evidence`, or `Escalate Dispute`.

#### **4.4. The `Analytics` Tab**
Provides high-level business intelligence derived from payment data.
*   **Layout**: A customizable grid of analytics widgets.
*   **Widgets**:
    *   **Revenue Trends**: Line chart showing revenue over time, filterable by token.
    *   **Payment Lifecycle Funnel**: Visualizes the flow from `Authorized` -> `Captured` -> `Completed`, showing drop-off rates at each stage.
    *   **Dispute & Refund Impact**: A stacked bar chart showing total revenue, with segments indicating losses from refunds and disputes.
    *   **Customer Insights**: A table of top customers by volume and transaction count.
    *   **Operator Performance**: Compares operators based on success rates and average capture times.

### **5. Interaction and States**

*   **Hover States**: All interactive elements (buttons, links, cards) must have a clear hover state (e.g., color change, underline, or shadow increase).
*   **Loading States**: Use skeleton screens that mimic the final layout while data is being fetched to prevent layout shifts and provide a smooth experience.
*   **Empty States**: When a filter yields no results or a list is empty, display a helpful message with a clean illustration and a call-to-action (e.g., "No refundable payments found.").
*   **Notifications (Toasts)**: Use non-intrusive "toast" notifications at the top-right of the screen to confirm actions ("Refund for payment 0x... has been processed."). Use color to indicate status: green for success, blue for info, red for error.