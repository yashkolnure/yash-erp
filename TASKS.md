# ERP Development Tasks

## Completed

### Session 1 — Core Infrastructure
- [x] RBAC enforcement middleware (`checkPermission.js`) with 5-min cache
- [x] Role-based sidebar (hide sections based on user permissions)
- [x] Dashboard with real API data (KPIs, monthly trend, invoice status pie)
- [x] PermissionsContext + `usePermissions()` hook

### Session 2 — New Pages
- [x] Credit Notes page (full CRUD, post/void, pagination)
- [x] Purchase Bills page (create, post to GL, pagination)
- [x] Goods Receipt Notes page (auto-populate from PO, pagination)
- [x] Timesheets page (weekly entry, submit/approve/reject)
- [x] Expense Claims page (line items, submit/approve/reject/pay)
- [x] Exchange Rates tab in Admin Settings
- [x] Pagination added to all list pages (Quotations, LeaveManagement, Payroll, StockAdjustments, Approvals)

### Session 3 — Gap Fixes
- [x] Global `$numberDecimal` fix — shared `utils/numbers.js` (`toNum`, `fmtCurrency`, `fmtNum`)
- [x] Applied to all 10 affected pages
- [x] Debit Notes — full stack (model, controller, routes, frontend page, sidebar)
- [x] Bank Reconciliation — full stack (statement import, line matching, suggestions engine)
- [x] Fixed Assets — model, depreciation controller, schedule, frontend tabbed UI
- [x] Budgeting — monthly budget lines, activate, variance vs actual GL
- [x] 3-way PO Matching — blocks bill posting if billed qty > received qty
- [x] In-app Notifications — model, service, controller, navbar bell with 60s polling
- [x] Customer Credit Limits — credit_limit, credit_used, credit_hold fields + invoice guard
- [x] Input Validation — PO, GRN, Invoice creation now validate required fields

---

## In Progress

_Nothing currently running._

---

## Pending Tasks

### Priority 1 — Daily Workflow Blockers

- [x] **SO → Invoice one-click convert**
  - Add "Create Invoice" button on Sales Order detail drawer
  - Pre-populate invoice with SO line items, customer, dates
  - Link invoice back to source SO (`sales_order_id` ref)
  - Update SO status to "Invoiced" when done

- [x] **Customer Statement PDF**
  - Backend: aggregate all invoices, payments, credit notes for a customer into a timeline
  - Frontend: "Statement" button on customer detail drawer
  - Generate a printable/downloadable PDF showing opening balance, transactions, closing balance

- [x] **AP Aging Report UI**
  - Backend endpoint already exists (`/reports/...` or build in procurement)
  - Frontend: aging buckets (Current, 1-30, 31-60, 61-90, 90+) per vendor
  - Drill-down to individual bills per bucket
  - Exportable to CSV

- [x] **Salary Structure / Components**
  - Backend: `SalaryStructure` model (basic, HRA, allowances, deductions, PF, tax)
  - Link employee to a salary structure
  - Payslip generation uses structure to calculate net pay automatically
  - Frontend: Salary Structures page in HR section

- [x] **Inter-warehouse Transfer UI**
  - Backend route already exists (`/inventory/transfer`)
  - Frontend: new "Stock Transfers" page under Inventory
  - Form: from_warehouse, to_warehouse, product, quantity, date, notes
  - Transfer history list with status

### Priority 2 — Major Friction

- [x] **File Attachments**
  - Backend: multer middleware for file upload, store path on document
  - Add `attachments[]` field to: ExpenseClaim, PurchaseInvoice, GoodsReceiptNote, Invoice
  - Frontend: file upload component in detail drawers (drag-drop or click)
  - Preview/download attached files

- [x] **Recurring Transactions**
  - Backend: `RecurringTemplate` model (type: invoice/bill/journal, frequency, next_run_date)
  - Scheduler (node-cron) to auto-generate documents on schedule
  - Frontend: "Recurring" tab on Invoices page, CRUD for templates

- [x] **Employee Self-Service Portal**
  - New `/my` routes — employee sees only their own data
  - My Payslips, My Leave Balance, My Leave Applications, My Timesheets, My Expenses
  - "Apply for Leave" form that creates a LeaveRequest without HR doing it
  - Sidebar section "My Profile" visible to all roles

- [x] **CSV Export on All List Pages**
  - Shared `exportToCSV(data, filename)` utility in `utils/export.js`
  - Add "Export CSV" button to: Invoices, Sales Orders, Purchase Orders, Bills, Vendors, Customers, Products, Employees, Payroll, Expense Claims, Timesheets, Quotations

- [x] **Period Locking**
  - Backend: `AccountingPeriod` model (year, month, status: Open/Closed)
  - Middleware check on all GL-posting routes — reject if period is closed
  - Frontend: Period Management tab in Finance/Admin Settings
  - "Close Period" button with confirmation

### Priority 3 — Polish & Completeness

- [x] **Document PDFs** for PO, GRN, Quotation (Invoice already has PDF)
- [x] **"Duplicate" button** on Invoices, POs, Quotations — clone with new number
- [x] **AR Aging Report UI** (backend `getAgingReport` exists, no page)
- [x] **Vendor Statement** — mirror of Customer Statement for AP
- [x] **"Create PO from Reorder Alert"** — one-click from dashboard reorder widget
- [x] **Payment Reminders** — "Send Reminder" button on overdue invoices, triggers email
- [x] **Dashboard date range picker** — filter all KPIs by custom date range
- [x] **Bulk Actions** — checkboxes + "Approve Selected" / "Export Selected" on list pages
- [x] **Unsaved changes warning** — prompt before closing a dialog with entered data
- [x] **Confirmation dialogs** on irreversible actions (Post, Void, Terminate employee)

---

## Known Bugs

- [ ] `Approvals.js` pagination shows for both tabs but `total` only tracks "All Approvals" tab
- [ ] Dashboard `monthlyTrend` chart shows empty if no invoices exist (no empty-state message)
- [x] `PurchaseBills` — "Post to GL" button in drawer doesn't refresh drawer state after posting

---

## Architecture Notes

- All monetary fields use `mongoose.Schema.Types.Decimal128` — always unwrap with `toNum()` from `utils/numbers.js` before rendering
- RBAC: `checkPermission(module, action)` middleware on all mutating routes; Admin/Super Admin bypass
- Pagination: all list APIs accept `skip` + `limit` query params, return `{ data, pagination: { total } }`
- Notifications: use `notificationService.notify({...})` from any controller to push in-app alerts
- 3-way matching: enforced at bill POST time — requires GRN with matching `quantity_accepted`
