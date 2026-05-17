import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme';
import useAuth from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import { PermissionsProvider } from './contexts/PermissionsContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import SalesOrders from './pages/SalesOrders';
import PurchaseOrders from './pages/PurchaseOrders';
import Customers from './pages/Customers';
import Vendors from './pages/Vendors';
import Products from './pages/Products';
import Employees from './pages/Employees';
import Finance from './pages/Finance';
import Payments from './pages/Payments';
import Messages from './pages/Messages';
import AdminSettings from './pages/AdminSettings';
import Quotations from './pages/Quotations';
import CRM from './pages/CRM';
import Reports from './pages/Reports';
import LeaveManagement from './pages/LeaveManagement';
import Payroll from './pages/Payroll';
import StockAdjustments from './pages/StockAdjustments';
import Approvals from './pages/Approvals';
import AuditLogs from './pages/AuditLogs';
import CreditNotes from './pages/CreditNotes';
import DebitNotes from './pages/DebitNotes';
import PurchaseBills from './pages/PurchaseBills';
import GoodsReceiptNotes from './pages/GoodsReceiptNotes';
import Timesheets from './pages/Timesheets';
import ExpenseClaims from './pages/ExpenseClaims';
import BankReconciliation from './pages/BankReconciliation';
import FixedAssets from './pages/FixedAssets';
import Budgets from './pages/Budgets';
import APAging from './pages/APAging';
import ARAging from './pages/ARAging';
import SalaryStructures from './pages/SalaryStructures';
import StockTransfers from './pages/StockTransfers';
import PeriodManagement from './pages/PeriodManagement';
import RecurringTransactions from './pages/RecurringTransactions';
import MyProfile from './pages/MyProfile';

const AppRoutes = () => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    return (
        <PermissionsProvider>
        <Layout>
            <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                {/* Sales & CRM */}
                <Route path="/customers" element={<Customers />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/sales-orders" element={<SalesOrders />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/credit-notes" element={<CreditNotes />} />
                {/* Procurement */}
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/purchase-bills" element={<PurchaseBills />} />
                <Route path="/goods-receipts" element={<GoodsReceiptNotes />} />
                <Route path="/debit-notes" element={<DebitNotes />} />
                {/* Inventory */}
                <Route path="/products" element={<Products />} />
                <Route path="/stock-adjustments" element={<StockAdjustments />} />
                <Route path="/stock-transfers" element={<StockTransfers />} />
                {/* Finance */}
                <Route path="/finance" element={<Finance />} />
                <Route path="/accounts" element={<Finance />} />
                <Route path="/trial-balance" element={<Finance />} />
                <Route path="/reports" element={<Reports />} />
                {/* Payments */}
                <Route path="/payments" element={<Payments />} />
                <Route path="/bank-reconciliation" element={<BankReconciliation />} />
                {/* HR */}
                <Route path="/employees" element={<Employees />} />
                <Route path="/leave-management" element={<LeaveManagement />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/timesheets" element={<Timesheets />} />
                <Route path="/expense-claims" element={<ExpenseClaims />} />
                <Route path="/salary-structures" element={<SalaryStructures />} />
                {/* Finance - Fixed Assets & Budgets */}
                <Route path="/fixed-assets" element={<FixedAssets />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/ap-aging" element={<APAging />} />
                <Route path="/ar-aging" element={<ARAging />} />
                <Route path="/period-management" element={<PeriodManagement />} />
                <Route path="/recurring" element={<RecurringTransactions />} />
                {/* Self-Service */}
                <Route path="/my-profile" element={<MyProfile />} />
                {/* Workflow */}
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                {/* Misc */}
                <Route path="/messages" element={<Messages />} />
                <Route path="/admin-settings" element={<AdminSettings />} />
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Layout>
        </PermissionsProvider>
    );
};

const App = () => (
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
            <AppRoutes />
        </Router>
    </ThemeProvider>
);

export default App;
