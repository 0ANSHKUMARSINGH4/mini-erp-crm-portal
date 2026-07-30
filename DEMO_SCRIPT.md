# Continuous Screen Recording & Video Presentation Script

**Project**: Mini ERP + CRM Operations Portal  
**Live Frontend**: `https://mini-erp-crm-portal.vercel.app`  
**Live Backend API**: `https://mini-erp-crm-portal-api.onrender.com/api` (Local Dev: `http://localhost:5000/api`)  
**GitHub Repository**: `https://github.com/0ANSHKUMARSINGH4/mini-erp-crm-portal.git`

---

## Segment 1: Spoken Introduction (~30 seconds)

### On Screen:
Open the browser at `https://mini-erp-crm-portal.vercel.app/login` (or `http://localhost:5173/login`).

### Spoken Script:
> "Hello everyone. Today I'm presenting the **Mini ERP + CRM Operations Portal**, a full-stack enterprise web platform engineered specifically for wholesale and distribution companies. The application is built with a modern monorepo architecture: a **Node.js, Express, TypeScript, and Prisma ORM** backend connected to a **PostgreSQL** database, paired with a **React, Vite, and Tailwind CSS** frontend portal. It solves the critical business problem of managing B2B customer lead lifecycles, maintaining inventory SKU balances across warehouses, and processing sales order dispatches with atomic, transactional stock validation to prevent accidental over-selling."

---

## Segment 2: Architecture & System Design Overview (~30–45 seconds)

### On Screen:
Switch tab to VS Code / GitHub showing `ARCHITECTURE.md` with the Mermaid ER Diagram.

### Spoken Script:
> "Before diving into the live application, let's look at key architectural decisions documented in our `ARCHITECTURE.md`. As shown in our entity-relationship diagram, the system manages Users, Customers, Follow-up Call Histories, Products, Stock Audit Logs, and Sales Challans. 
> A fundamental design choice here is **Line Item Snapshotting**: when a Sales Challan is issued, product names, SKUs, and unit prices are snapshotted directly into the `ChallanItem` table. This guarantees historical integrity—so future price changes or product catalog edits never alter historical sales records retroactively. 
> Additionally, stock deduction during challan confirmation is executed inside an **atomic PostgreSQL database transaction** (`prisma.$transaction`) to enforce strict concurrency safety."

---

## Segment 3: Live Application Walkthrough (Click-by-Click Sequence)

### Step 1: Admin Dashboard & Overview
1. **Action**: On the login page, click the quick **"Admin"** button (populates `admin@minierp.com` / `Admin@123`), then click **"Sign In to Portal"**.
2. **Spoken Text**: 
   > "I'm signing in as an **Admin**. Notice the active role pill in the sidebar. The dashboard immediately displays key operational KPIs: Total Customers (CRM leads), Total Active SKUs, Low Stock Warning Alerts, Total Sales Volume, and Pending Draft Challans."

### Step 2: Customer CRM Management
1. **Action**: Click **"Customer CRM"** on the left sidebar.
2. **Spoken Text**: 
   > "Here in the Customer CRM module, we have a paginated table supporting multi-field search and status filters. Let's add a new B2B customer."
3. **Action**: Click **"+ Add Customer Lead"**. Fill out the form:
   - **Name**: `Vikram Malhotra`
   - **Business Name**: `Malhotra Wholesalers Ltd`
   - **Mobile**: `+919876500011`
   - **Email**: `vikram@malhotrawholesale.com`
   - **GST**: `27AAAAA9999A1Z9`
   - **Customer Type**: Select `DISTRIBUTOR`
   - **Address**: `Phase 3 Industrial Estate, Mumbai`
   - **Notes**: `Interested in quarterly computer peripheral stock`
   - Click **"Create Customer"**.
4. **Action**: Click **"View Details"** on `Vikram Malhotra`.
5. **Action**: Click **"+ Log Call"** (or use follow-up modal), enter:
   - **Note**: `Discussed 10% volume discount terms for initial order.`
   - **Date**: Select a date.
   - Click **"Save Note"**.
6. **Spoken Text**: 
   > "The new customer lead is created along with its initial interaction. Viewing the customer profile shows the full, structured timeline of follow-up call history."

### Step 3: Warehouse & Product Inventory Control
1. **Action**: Click the top-right user pill / Logout button, then log in using the quick **"Warehouse"** button (`warehouse@minierp.com` / `Warehouse@123`).
2. **Action**: Click **"Product Inventory"** on the left sidebar.
3. **Spoken Text**: 
   > "Logging in as the **Warehouse Manager**, notice how our sidebar menu adapts according to role permissions. Let's inspect our inventory. Look at `Mechanical RGB Keyboard`—it displays an amber **Low Stock Alert** badge because its stock of 15 is below the alert threshold of 25. Let's create a new SKU and log a manual stock intake."
4. **Action**: Click **"+ Add Product SKU"**. Fill out:
   - **Product Name**: `4K Ultra HD Monitor 27"`
   - **SKU**: `SKU-DISP-5005`
   - **Category**: `Displays`
   - **Unit Price**: `18999`
   - **Initial Stock**: `10`
   - **Min Alert Qty**: `5`
   - **Location**: `Rack C-04`
   - Click **"Create Product"**.
5. **Action**: Click **"Stock IN/OUT"** on `4K Ultra HD Monitor 27"`.
   - **Type**: `IN`
   - **Quantity**: `5`
   - **Reason**: `Restock container arrival batch #8001`
   - Click **"Execute Movement"**.
6. **Spoken Text**: 
   > "The product is registered and 5 units are added via a manual stock movement, bringing total stock to 15 units."

### Step 4: Sales Challan Creation & Stock Validation (Role: Sales)
1. **Action**: Log out and log in using the quick **"Sales"** button (`sales@minierp.com` / `Sales@123`).
2. **Action**: Click **"New Sales Challan"** in the sidebar.
3. **Action**: Select Customer: `Rajesh Kumar — Apex Wholesalers Pvt Ltd`.
4. **Action**: In Line Items, select Product: `Limited Stock Headphones (SKU-AUDIO-999)` (Current stock: 5 units).
5. **Action**: Set **Quantity**: `15` (Demanding 15 units when only 5 are in stock!).
6. **Spoken Text**: 
   > "Now I am logged in as a **Sales Representative**. I am creating a sales dispatch for `Apex Wholesalers`. Notice that `Limited Stock Headphones` currently has only **5 units** in stock. I am entering a quantity of **15 units**."
7. **Action**: Click **"Confirm & Deduct Stock"**.
8. **Spoken Text**: 
   > "Notice the **422 Unprocessable Entity** error banner immediately returned by our backend! The atomic transaction rejected the confirmation, stating: *'Insufficient stock for products: Limited Stock Headphones (Available: 5, Required: 15)'*."

### Step 5: Successful Challan Confirmation & Automatic Deduction
1. **Action**: Change **Quantity** to `3` (Valid: 3 <= stock 5).
2. **Action**: Click **"Confirm & Deduct Stock"**.
3. **Spoken Text**: 
   > "Now I adjust the quantity to **3 units** and click Confirm. The transaction commits successfully, generating sequential Challan number `CH-2026-0001`."
4. **Action**: Click **"Product Inventory"** in the sidebar.
5. **Spoken Text**: 
   > "Navigating to Product Inventory, we see `Limited Stock Headphones` remaining stock has dropped atomically from 5 to **2 units**."

### Step 6: Challan Cancellation & Stock Reversal
1. **Action**: Click **"Sales Challans"** in the sidebar. Click **"Cancel"** on Challan `CH-2026-0001` (confirm prompt).
2. **Spoken Text**: 
   > "Now let's cancel this confirmed challan."
3. **Action**: Click **"Product Inventory"** in the sidebar.
4. **Spoken Text**: 
   > "Returning to Product Inventory, `Limited Stock Headphones` stock has been automatically restored back to **5 units** through a compensating stock movement."

### Step 7: Stock Movement Audit Log
1. **Action**: Click **"Stock Movements"** on the left sidebar.
2. **Spoken Text**: 
   > "The Stock Movements ledger maintains an audit log of every stock intake, dispatch deduction, and cancellation reversal with timestamps, user tags, and reasons."

---

## Segment 4: API & Postman Independent Verification (~1 minute)

### On Screen:
Switch to Postman (or terminal running curl / node script against the backend API).

### Spoken Script & Actions:
1. **Request 1: Admin Login**
   - Execute `POST http://localhost:5000/api/auth/login` (or live URL) with `{ "email": "admin@minierp.com", "password": "Admin@123" }`.
   - *Point out*: `200 OK` response returning user object and signed JWT token.
2. **Request 2: Insufficient Stock 422 Error**
   - Execute `POST http://localhost:5000/api/challans` with quantity exceeding stock.
   - *Point out*: `422 Unprocessable Entity` status code and JSON error payload.
3. **Request 3: Valid Challan Confirmation**
   - Execute `POST http://localhost:5000/api/challans` with valid quantity.
   - *Point out*: `201 Created` status code with snapshotted line items.

---

## Segment 5: Wrap-up & Known Limitations (~30 seconds)

### On Screen:
Show live Vercel URL, live Render backend URL, and GitHub repository `https://github.com/0ANSHKUMARSINGH4/mini-erp-crm-portal.git`.

### Spoken Script:
> "To wrap up, here are the live URLs for our deployed frontend and backend, along with the full GitHub repository link. 
> In terms of known limitations and future enhancements: 
> 1. Multi-warehouse transfer routing can be added for enterprise scaling.
> 2. PDF invoice generation & automated email dispatch.
> 3. Real-time WebSocket notifications for low stock alerts.
> 
> Thank you for your time!"
