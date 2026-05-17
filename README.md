<div align="center">

# 🏢 Yash ERP — Full-Stack Enterprise Resource Planning System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MUI](https://img.shields.io/badge/MUI-v5-007FFF?logo=mui&logoColor=white)](https://mui.com)

**A production-ready, open-source ERP built with the MERN stack.**  
Manage sales, procurement, inventory, finance, HR, payroll, and approvals — all in one place.

[Portfolio](https://avenirya.com) · [User Manual](./ERP_User_Manual.html) · [Report a Bug](https://github.com/yashkolnure/yash-erp/issues) · [Request Feature](https://github.com/yashkolnure/yash-erp/issues)

---

### 👨‍💻 Built by Yash Kolnure

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Yash_Kolnure-0A66C2?logo=linkedin&logoColor=white)](https://linkedin.com/in/yashkolnure)
[![Portfolio](https://img.shields.io/badge/Portfolio-avenirya.com-6366F1?logo=vercel&logoColor=white)](https://avenirya.com)
[![Email](https://img.shields.io/badge/Email-yashkolnure58@gmail.com-EA4335?logo=gmail&logoColor=white)](mailto:yashkolnure58@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-yashkolnure-181717?logo=github&logoColor=white)](https://github.com/yashkolnure)
[![Open to Work](https://img.shields.io/badge/Open_to_Work-✅_Actively_Looking-brightgreen)](https://linkedin.com/in/yashkolnure)

</div>

---

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [About Me](#about-me)

---

## About the Project

Yash ERP is a **full-featured, open-source ERP system** designed to handle the complete operations of a small-to-medium business. It covers the end-to-end lifecycle of sales, procurement, inventory, finance, and human resources with a clean, modern UI and a robust RESTful API.

This project was built as a **showcase of full-stack engineering skills** — from database modelling and REST API design to React state management and complex business logic.

> **Status:** ✅ Production-ready · Actively maintained

---

## Features

### 🛒 Sales & CRM
- **Lead Pipeline** — Kanban-style CRM with stage tracking, activity log, and lead-to-customer conversion
- **Quotations** — Create, send, accept/reject, and convert quotes to Sales Orders
- **Sales Orders** — Full SO lifecycle with confirmation and one-click invoice generation
- **AR Invoices** — Post to GL, email to customer, print PDF, send payment reminders, bulk export
- **Credit Notes** — Issue credits with automatic reversing journal entries
- **Customer Statements** — Full transaction history per customer, CSV export

### 🏭 Procurement
- **Vendors** — Supplier management with statements and payment terms
- **Purchase Orders** — Create POs with auto-fill from reorder alerts, duplicate, and confirm
- **Goods Receipt Notes (GRN)** — Receive goods against POs, auto-update stock
- **Purchase Bills (AP)** — 3-way match (PO → GRN → Bill), GL posting
- **Debit Notes** — Return goods to vendors with reversing entries

### 📦 Inventory
- **Product Catalogue** — SKU, reorder levels, cost/sale price, tax rate
- **Multi-Warehouse Stock** — Track stock levels per warehouse with valuation
- **Stock Adjustments** — Increase, decrease, or recount with GL impact
- **Stock Transfers** — Move stock between warehouses with full transfer history
- **Reorder Alerts** — Dashboard alerts when stock drops below reorder level, one-click PO creation

### 💰 Finance & Accounting
- **Chart of Accounts** — Hierarchical COA (Asset, Liability, Equity, Revenue, Expense)
- **Journal Entries** — Manual double-entry journals with validation
- **General Ledger** — Automatic GL postings from all modules
- **Trial Balance** — Real-time debit/credit balance by account
- **Financial Reports** — P&L, Balance Sheet, Cash Flow, Tax Report, Sales Analytics
- **Bank Reconciliation** — Import bank statements, auto-match, reconcile
- **Fixed Assets** — Straight-line & declining-balance depreciation, disposal with gain/loss
- **Budgets** — Monthly/quarterly budgets with actual vs. variance reporting
- **AP Aging & AR Aging** — Outstanding balances by age bucket (0–30, 31–60, 61–90, 90+)
- **Period Management** — Open/close accounting periods to prevent backdated entries
- **Recurring Transactions** — Automate repeating journal entries (rent, subscriptions)

### 👥 HR & Payroll
- **Employees** — Full employee records, departments, hire/terminate, bank details
- **Leave Management** — Apply, approve/reject, track balances across leave types
- **Attendance** — Daily mark with monthly summary reports
- **Timesheets** — Weekly time entry per project/task, submit and approve workflow
- **Expense Claims** — Employee expense submission with receipt attachments
- **Salary Structures** — Configurable earnings and deduction components
- **Payroll** — Auto-calculate payslips from salary structures, bulk payroll runs, print payslips
- **Employee Self-Service** — My Payslips, My Leave, My Timesheets, My Expenses

### ⚙️ System & Workflow
- **Multi-step Approvals** — Configurable approval chains for any document type
- **Bulk Actions** — Bulk approve, bulk export, bulk post across all modules
- **File Attachments** — Upload supporting documents to any record
- **Unsaved Changes Guard** — Browser warning before leaving a form with unsaved changes
- **Confirmation Dialogs** — Safe delete/cancel confirmation on all destructive actions
- **Audit Log** — Tamper-proof log of every system action (who, what, when)
- **Messages** — Internal messaging between users
- **RBAC** — Role-based access control with per-module, per-action permissions
- **Multi-company** — Single deployment supports multiple companies, fully isolated data
- **Multi-currency** — Configurable exchange rates for foreign currency transactions
- **PDF Export** — Print-formatted PDFs for invoices, payslips, and purchase orders
- **CSV Export** — Export any list to CSV from every module

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6, Material UI v5 |
| **State** | React Context + custom hooks (`useApi`, `useAuth`) |
| **Charts** | Recharts |
| **Backend** | Node.js, Express.js 4 |
| **Database** | MongoDB (Mongoose ODM) |
| **Auth** | JWT (JSON Web Tokens) |
| **File Upload** | Multer |
| **Email** | Nodemailer (with console fallback for dev) |
| **Dev Tools** | ESLint, nodemon, concurrently |

---

## Architecture

```
yash-erp/
├── backend/                    # Express.js REST API
│   └── src/
│       ├── controllers/        # Business logic per module
│       ├── models/             # Mongoose schemas
│       ├── routes/             # Express routers (23 route modules)
│       ├── middleware/         # Auth, RBAC, period-lock, upload
│       └── services/          # Email service
│
├── frontend/                   # React 18 SPA
│   └── src/
│       ├── pages/              # 37 page components
│       ├── components/         # Shared UI components
│       │   └── Layout/         # Sidebar, Header, Layout wrapper
│       ├── hooks/              # useApi, useAuth, useUnsavedChanges
│       └── utils/              # exportToCSV, helpers
│
└── ERP_User_Manual.html        # Complete user documentation (open in browser)
```

### Key Design Decisions

- **Double-entry accounting** — Every financial transaction creates balanced debit/credit journal entries automatically
- **Period locking** — GL routes check if the accounting period is open before allowing any posting
- **Decimal128** — MongoDB Decimal128 is used for all monetary values to avoid floating-point errors
- **Auto-numbering** — POs, GRNs, Transfers, and Invoices are auto-numbered with year-based sequences
- **Optimistic UI** — Forms show loading states and handle errors gracefully without page reloads

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local or MongoDB Atlas)
- npm 9+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yashkolnure/yash-erp.git
cd yash-erp

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install
```

### Running in Development

```bash
# Terminal 1 — Start the backend API (port 5000)
cd backend
npm run dev

# Terminal 2 — Start the React frontend (port 3000)
cd frontend
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running with a single command (from root)

```bash
# From the project root (requires concurrently)
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/erp

# JWT secret key (use a long random string in production)
JWT_SECRET=your_super_secret_jwt_key_here

# Server port
PORT=5000

# Optional: Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Optional: File upload directory
UPLOAD_DIR=./uploads
```

> **Note:** If email env vars are not set, the system uses a console log stub for development — no emails are actually sent.

---

## Project Structure

<details>
<summary>Click to expand full file tree</summary>

```
backend/src/
├── controllers/
│   ├── salesController.js          # Customers, quotations, SO, AR invoices, credit notes
│   ├── procurementController.js    # Vendors, PO, GRN, bills, debit notes
│   ├── inventoryController.js      # Products, warehouses, stock, adjustments, transfers
│   ├── financeController.js        # COA, journals, trial balance, dashboard
│   ├── paymentController.js        # Payments, applications
│   ├── hrController.js             # Employees, leave, attendance, timesheets, expenses, payroll
│   ├── crmController.js            # Leads, pipeline, activities
│   ├── adminController.js          # Company, bank accounts, users, roles, permissions, FX
│   ├── approvalController.js       # Approval workflows
│   ├── reconciliationController.js # Bank reconciliation
│   ├── fixedAssetController.js     # Fixed assets, depreciation, disposal
│   ├── budgetController.js         # Budgets, variance
│   ├── reportsController.js        # P&L, BS, CF, tax, aging, audit
│   ├── accountingPeriodController.js
│   ├── recurringController.js
│   ├── selfServiceController.js
│   └── uploadController.js
│
├── models/
│   ├── User.js                     # Auth users + company assignments
│   ├── Company.js                  # Multi-company support
│   ├── Customer.js / Vendor.js
│   ├── Invoice.js / Bill.js
│   ├── SalesOrder.js / PurchaseOrder.js
│   ├── Product.js / Warehouse.js / StockTransfer.js
│   ├── JournalEntry.js / Account.js
│   ├── Payment.js / BankStatement.js
│   ├── FixedAsset.js / Budget.js
│   ├── Employee.js / Payslip.js / Leave.js / Timesheet.js
│   ├── ExpenseClaim.js / SalaryStructure.js
│   ├── Approval.js / AuditLog.js / Message.js
│   ├── AccountingPeriod.js / RecurringTemplate.js
│   └── Attachment.js
│
└── middleware/
    ├── auth.js                     # JWT verification
    ├── checkPermission.js          # RBAC: module + action
    ├── checkPeriodOpen.js          # Block GL routes when period is closed
    └── upload.js                   # Multer file upload config
```

</details>

---

## API Reference

The backend exposes **200+ REST endpoints** organized by module. All endpoints require a valid JWT Bearer token in the `Authorization` header.

**Base URL:** `http://localhost:5000/api`

| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/auth` | POST /login, POST /register |
| Sales | `/:companyId/ar` | Invoices CRUD + post/cancel/email/pdf |
| Procurement | `/:companyId/procurement` | PO, GRN, Bills, Debit Notes |
| Inventory | `/:companyId/inventory` | Products, Stock, Adjustments, Transfers |
| Finance | `/:companyId/finance` | COA, Journals, Trial Balance |
| Payments | `/:companyId/payments` | Record + apply payments |
| HR | `/:companyId/hr` | Employees, Leave, Timesheets, Expenses |
| Payroll | `/:companyId/payroll` | Payslips, bulk generate |
| Reports | `/:companyId/reports` | P&L, BS, CF, Tax, Aging |
| Admin | `/:companyId/admin` | Company, Users, Roles, Permissions, FX |
| Approvals | `/:companyId/approvals` | List, action |
| Recurring | `/:companyId/recurring` | Templates, run |
| Periods | `/:companyId/finance/periods` | Open/close periods |

---

## Screenshots

> Screenshots coming soon. Run the project locally to see it in action.

---

## Roadmap

- [ ] Email notifications for approval workflows
- [ ] Mobile-responsive layout improvements
- [ ] Multi-language (i18n) support
- [ ] Webhook support for external integrations
- [ ] Docker Compose setup for one-command deployment
- [ ] Automated test suite (Jest + Supertest)
- [ ] Dark mode

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please make sure your PR includes:
- A clear description of the change
- Any relevant tests or manual testing steps

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## About Me

<div align="center">

### 👋 Hi, I'm Yash Kolnure

I'm a full-stack developer passionate about building clean, scalable web applications.  
This ERP project is a showcase of my skills across the entire stack — from database design and REST APIs to complex React UIs and business logic.

**I'm actively looking for new opportunities!**

| | |
|--|--|
| 💼 **LinkedIn** | [linkedin.com/in/yashkolnure](https://linkedin.com/in/yashkolnure) |
| 🌐 **Portfolio** | [avenirya.com](https://avenirya.com) |
| 📧 **Email** | [yashkolnure58@gmail.com](mailto:yashkolnure58@gmail.com) |
| 🐙 **GitHub** | [github.com/yashkolnure](https://github.com/yashkolnure) |
| 🟢 **Status** | **Open to Work** — Full-Stack / Backend / Frontend roles |

**Skills demonstrated in this project:**
`Node.js` `Express.js` `MongoDB` `Mongoose` `React 18` `Material UI` `JWT Auth` `REST APIs` `RBAC` `Double-entry Accounting` `Multi-tenant Architecture` `File Upload (Multer)` `Nodemailer` `Recharts` `React Router v6`

---

*If you found this project useful, please consider giving it a ⭐ — it really helps!*

</div>
