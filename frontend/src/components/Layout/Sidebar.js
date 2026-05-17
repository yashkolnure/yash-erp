import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../../contexts/PermissionsContext';
import {
    Box, List, ListItemIcon, ListItemText, Tooltip,
    Collapse, Typography, Divider, ListItemButton,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import MessageRoundedIcon from '@mui/icons-material/MessageRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LocalAtmRoundedIcon from '@mui/icons-material/LocalAtmRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 60;

// module: maps to permission module names used in RBAC
const NAV_ITEMS = [
    { label: 'Dashboard', icon: <DashboardRoundedIcon />, path: '/dashboard', color: '#60A5FA' },
    {
        label: 'Sales & CRM',
        icon: <ReceiptRoundedIcon />,
        color: '#34D399',
        module: 'Sales',
        children: [
            { label: 'Customers', path: '/customers', icon: <PeopleRoundedIcon fontSize="small" /> },
            { label: 'Leads & Pipeline', path: '/crm', icon: <TrendingUpRoundedIcon fontSize="small" /> },
            { label: 'Quotations', path: '/quotations', icon: <RequestQuoteRoundedIcon fontSize="small" /> },
            { label: 'Sales Orders', path: '/sales-orders', icon: <ShoppingCartRoundedIcon fontSize="small" /> },
            { label: 'Invoices', path: '/invoices', icon: <ReceiptRoundedIcon fontSize="small" /> },
            { label: 'Credit Notes', path: '/credit-notes', icon: <CreditCardRoundedIcon fontSize="small" /> },
        ],
    },
    {
        label: 'Procurement',
        icon: <LocalShippingRoundedIcon />,
        color: '#FBBF24',
        module: 'Procurement',
        children: [
            { label: 'Vendors', path: '/vendors', icon: <BusinessRoundedIcon fontSize="small" /> },
            { label: 'Purchase Orders', path: '/purchase-orders', icon: <ShoppingCartRoundedIcon fontSize="small" /> },
            { label: 'Goods Receipts', path: '/goods-receipts', icon: <FactCheckRoundedIcon fontSize="small" /> },
            { label: 'Purchase Bills', path: '/purchase-bills', icon: <ReceiptLongRoundedIcon fontSize="small" /> },
            { label: 'Debit Notes', path: '/debit-notes', icon: <ReceiptLongRoundedIcon fontSize="small" /> },
        ],
    },
    {
        label: 'Inventory',
        icon: <Inventory2RoundedIcon />,
        color: '#F472B6',
        module: 'Inventory',
        children: [
            { label: 'Products', path: '/products', icon: <Inventory2RoundedIcon fontSize="small" /> },
            { label: 'Stock Adjustments', path: '/stock-adjustments', icon: <FactCheckRoundedIcon fontSize="small" /> },
            { label: 'Stock Transfers', path: '/stock-transfers', icon: <LocalShippingRoundedIcon fontSize="small" /> },
        ],
    },
    {
        label: 'Finance',
        icon: <AccountBalanceRoundedIcon />,
        color: '#A78BFA',
        module: 'Finance',
        children: [
            { label: 'Chart of Accounts', path: '/accounts', icon: <AccountBalanceRoundedIcon fontSize="small" /> },
            { label: 'Trial Balance', path: '/trial-balance', icon: <ReceiptRoundedIcon fontSize="small" /> },
            { label: 'Reports', path: '/reports', icon: <AssessmentRoundedIcon fontSize="small" /> },
            { label: 'Bank Reconciliation', path: '/bank-reconciliation', icon: <AccountBalanceRoundedIcon fontSize="small" /> },
            { label: 'Fixed Assets', path: '/fixed-assets', icon: <BusinessRoundedIcon fontSize="small" /> },
            { label: 'Budgets', path: '/budgets', icon: <LeaderboardRoundedIcon fontSize="small" /> },
            { label: 'AP Aging', path: '/ap-aging', icon: <AssessmentRoundedIcon fontSize="small" /> },
            { label: 'AR Aging', path: '/ar-aging', icon: <AssessmentRoundedIcon fontSize="small" /> },
            { label: 'Period Management', path: '/period-management', icon: <LockRoundedIcon fontSize="small" /> },
            { label: 'Recurring', path: '/recurring', icon: <AutorenewRoundedIcon fontSize="small" /> },
        ],
    },
    { label: 'Payments', icon: <PaymentsRoundedIcon />, path: '/payments', color: '#2DD4BF', module: 'Finance' },
    {
        label: 'HR & Payroll',
        icon: <BadgeRoundedIcon />,
        color: '#FB923C',
        module: 'HR',
        children: [
            { label: 'Employees', path: '/employees', icon: <BadgeRoundedIcon fontSize="small" /> },
            { label: 'Leave & Attendance', path: '/leave-management', icon: <EventNoteRoundedIcon fontSize="small" /> },
            { label: 'Timesheets', path: '/timesheets', icon: <AccessTimeRoundedIcon fontSize="small" /> },
            { label: 'Expense Claims', path: '/expense-claims', icon: <LocalAtmRoundedIcon fontSize="small" /> },
            { label: 'Payroll', path: '/payroll', icon: <PaymentsRoundedIcon fontSize="small" /> },
            { label: 'Salary Structures', path: '/salary-structures', icon: <RequestQuoteRoundedIcon fontSize="small" /> },
        ],
    },
    { label: 'My Profile', icon: <AccountCircleRoundedIcon />, path: '/my-profile', color: '#F59E0B' },
    {
        label: 'Workflow',
        icon: <ChecklistRoundedIcon />,
        color: '#818CF8',
        children: [
            { label: 'Approvals', path: '/approvals', icon: <ChecklistRoundedIcon fontSize="small" /> },
            { label: 'Audit Log', path: '/audit-logs', icon: <SecurityRoundedIcon fontSize="small" />, module: 'Admin' },
        ],
    },
    { label: 'Messages', icon: <MessageRoundedIcon />, path: '/messages', color: '#38BDF8' },
    { label: 'Admin Settings', icon: <SettingsRoundedIcon />, path: '/admin-settings', color: '#94A3B8', module: 'Admin' },
];

const Sidebar = ({ open }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { canModule, isAdmin } = usePermissions();
    const [expanded, setExpanded] = useState({ 'Sales & CRM': true });

    const isVisible = (item) => {
        if (isAdmin) return true;
        if (!item.module) return true; // no module restriction
        return canModule(item.module);
    };

    const toggle = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
    const isActive = (path) => location.pathname === path;
    const isGroupActive = (item) => item.children?.some(c => location.pathname === c.path);

    return (
        <Box
            sx={{
                width: open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
                flexShrink: 0,
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                bgcolor: '#1A2332',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.25s ease',
                overflow: 'hidden',
                zIndex: 1200,
                boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
            }}
        >
            {/* Logo */}
            <Box sx={{ height: 56, display: 'flex', alignItems: 'center', px: 2, gap: 1.5, flexShrink: 0 }}>
                <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BusinessRoundedIcon sx={{ color: '#fff', fontSize: 18 }} />
                </Box>
                {open && (
                    <Box>
                        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1 }}>ZohoERP</Typography>
                        <Typography sx={{ color: '#7B9EC7', fontSize: '0.65rem', lineHeight: 1.4 }}>Enterprise Suite</Typography>
                    </Box>
                )}
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            {/* Nav */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 } }}>
                <List dense disablePadding>
                    {NAV_ITEMS.filter(isVisible).map((item) => {
                        if (!item.children) {
                            const active = isActive(item.path);
                            return (
                                <Tooltip key={item.path} title={!open ? item.label : ''} placement="right" arrow>
                                    <ListItemButton
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            mx: 1, mb: 0.5, borderRadius: 1.5,
                                            bgcolor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
                                            minHeight: 40, px: 1.5,
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32, color: active ? '#fff' : item.color }}>
                                            {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                                        </ListItemIcon>
                                        {open && (
                                            <ListItemText
                                                primary={item.label}
                                                primaryTypographyProps={{ fontSize: '0.813rem', fontWeight: active ? 700 : 500, color: active ? '#fff' : '#B8C5D6' }}
                                            />
                                        )}
                                        {active && open && (
                                            <Box sx={{ width: 3, height: 20, bgcolor: item.color, borderRadius: 2, ml: 1 }} />
                                        )}
                                    </ListItemButton>
                                </Tooltip>
                            );
                        }

                        const groupActive = isGroupActive(item);
                        return (
                            <React.Fragment key={item.label}>
                                <Tooltip title={!open ? item.label : ''} placement="right" arrow>
                                    <ListItemButton
                                        onClick={() => open && toggle(item.label)}
                                        sx={{
                                            mx: 1, mb: 0.5, borderRadius: 1.5,
                                            bgcolor: groupActive && !open ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
                                            minHeight: 40, px: 1.5,
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32, color: groupActive ? '#fff' : item.color }}>
                                            {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                                        </ListItemIcon>
                                        {open && (
                                            <>
                                                <ListItemText
                                                    primary={item.label}
                                                    primaryTypographyProps={{ fontSize: '0.813rem', fontWeight: groupActive ? 700 : 500, color: groupActive ? '#fff' : '#B8C5D6' }}
                                                />
                                                <Box sx={{ color: '#7B9EC7' }}>
                                                    {expanded[item.label] ? <ExpandLessRounded sx={{ fontSize: 16 }} /> : <ExpandMoreRounded sx={{ fontSize: 16 }} />}
                                                </Box>
                                            </>
                                        )}
                                    </ListItemButton>
                                </Tooltip>

                                {open && (
                                    <Collapse in={!!expanded[item.label]} timeout="auto" unmountOnExit>
                                        <List component="div" disablePadding dense>
                                            {item.children.map((child) => {
                                                const childActive = isActive(child.path);
                                                return (
                                                    <ListItemButton
                                                        key={child.path}
                                                        onClick={() => navigate(child.path)}
                                                        sx={{
                                                            mx: 1, mb: 0.3, borderRadius: 1.5, pl: 4,
                                                            bgcolor: childActive ? `${item.color}22` : 'transparent',
                                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                                                            minHeight: 34,
                                                        }}
                                                    >
                                                        <ListItemIcon sx={{ minWidth: 26, color: childActive ? item.color : '#7B9EC7' }}>
                                                            {child.icon}
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={child.label}
                                                            primaryTypographyProps={{ fontSize: '0.788rem', fontWeight: childActive ? 700 : 400, color: childActive ? '#fff' : '#94A6B8' }}
                                                        />
                                                        {childActive && <Box sx={{ width: 3, height: 16, bgcolor: item.color, borderRadius: 2 }} />}
                                                    </ListItemButton>
                                                );
                                            })}
                                        </List>
                                    </Collapse>
                                )}
                            </React.Fragment>
                        );
                    })}
                </List>
            </Box>

            {/* Footer */}
            {open && (
                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Typography sx={{ color: '#4A5568', fontSize: '0.65rem', textAlign: 'center' }}>
                        ERP Suite v2.0 · All rights reserved
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default Sidebar;
