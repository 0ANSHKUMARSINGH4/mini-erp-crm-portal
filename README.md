# Mini ERP + CRM Operations Portal

A complete, production-quality Mini ERP & CRM Operations Portal built for wholesale and distribution businesses.

---

## 🌐 Live URLs & Links

- **Live Frontend App**: `https://mini-erp-crm-portal.vercel.app`
- **Live Backend API**: `https://mini-erp-crm-portal-api.onrender.com/api`
- **GitHub Repository**: `https://github.com/0ANSHKUMARSINGH4/mini-erp-crm-portal.git`

---

## 🔑 Live Demo Credentials

The database is seeded with four role accounts for testing role-based access control (RBAC):

| Role | Email | Password | Allowed Access Summary |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@minierp.com` | `Admin@123` | Full administrative access across CRM, Inventory, & Sales Challans |
| **Sales** | `sales@minierp.com` | `Sales@123` | Customer CRM lead creation, Follow-ups, & Sales Challan issuing |
| **Warehouse** | `warehouse@minierp.com` | `Warehouse@123` | Product SKU cataloging, Stock Movements logging (IN/OUT), & Stock audit |
| **Accounts** | `accounts@minierp.com` | `Accounts@123` | Financial sales challan processing & Customer profile viewing |

---

## Technical Stack & Architecture

- **Backend**: Node.js, Express.js, TypeScript, PostgreSQL, Prisma ORM, JWT Authentication, Zod validation
- **Frontend**: React, Vite, TypeScript, Lucide Icons, Tailwind CSS
- **Database**: PostgreSQL (`minierp_db` / Supabase Cloud PostgreSQL)
- **API Architecture**: RESTful API with consistent error shape `{ error: { message, code, details? } }`

---

## Environment Variables (.env)

### Backend (`/backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/minierp_db?schema=public"
JWT_SECRET="minierp_super_secret_jwt_key_2026_spec"
JWT_EXPIRES_IN="24h"
NODE_ENV="development"
CORS_ORIGIN="https://mini-erp-crm-portal.vercel.app"
```

### Frontend (`/frontend/.env`)
```env
VITE_API_URL="https://mini-erp-crm-portal-api.onrender.com/api"
```

---

## How to Run Locally

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL running locally (e.g. on `localhost:5432` with database `minierp_db`)

### 2. Setup & Seed Backend
```bash
cd backend
npm install

# Apply database migrations to local PostgreSQL
npx prisma migrate deploy

# Seed 4 role users, sample CRM leads, products, and inventory logs
npm run db:seed

# Start backend server in dev mode (runs on http://localhost:5000)
npm run dev
```

### 3. Setup & Start Frontend
```bash
cd frontend
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

### 4. Run Automated Integration Test Suite
To execute full integration tests covering all 4 modules and deliberate failure cases:
```bash
cd backend
npx tsx test-suite.ts
```

---

## Deployment Walkthrough & Architecture Notes

### Step 1: Database Provisioning (Supabase / Cloud PostgreSQL)
1. Provisioned a managed PostgreSQL database instance on **Supabase**.
2. Ran `npx prisma migrate deploy` against the database connection string to create all tables (`User`, `Customer`, `FollowUpNote`, `Product`, `StockMovement`, `SalesChallan`, `ChallanItem`).
3. Executed `npm run db:seed` against the cloud database to populate the initial role accounts and operational catalog.

### Step 2: Backend Deployment (Render)
1. Connected the GitHub repository `https://github.com/0ANSHKUMARSINGH4/mini-erp-crm-portal.git` to **Render** Web Service.
2. Configured Root Directory: `backend`.
3. Set Build Command: `npm install && npm run build` (runs `prisma generate && tsc`).
4. Set Start Command: `npm start` (runs compiled `node dist/server.js`).
5. Configured Production Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=5000`, and `CORS_ORIGIN=https://mini-erp-crm-portal.vercel.app`.

### Step 3: Frontend Deployment (Vercel)
1. Connected the repository to **Vercel**.
2. Configured Root Directory: `frontend`.
3. Set Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Configured Environment Variable: `VITE_API_URL=https://mini-erp-crm-portal-api.onrender.com/api`.

---

## Key Business Logic & Technical Guarantees

1. **Atomic Stock Deduction**: When confirming a Sales Challan, stock availability for every line item is validated inside a database transaction (`prisma.$transaction`). If any product is short, the transaction is rejected with a `422` error detailing exact short items.
2. **Snapshotting Line Items**: Line item prices, names, and SKUs are snapshotted into `ChallanItem` at the time of sale so future product edits do not modify historical sales documents.
3. **Prohibiting Direct Stock Edits**: `PUT /api/products/:id` rejects direct updates to `currentStock`. Stock can only be changed via logged `StockMovements` or Confirmed Sales Challans.
4. **Stock Reversals**: Cancelling a confirmed sales challan automatically generates compensating `StockMovement` (IN) logs and restores product stock.

---

## Postman Collection

The exported Postman collection is saved under `/postman/Mini_ERP_CRM.postman_collection.json`. Import this file into Postman to test all REST endpoints.
