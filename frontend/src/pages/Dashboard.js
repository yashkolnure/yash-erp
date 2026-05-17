import React, { useEffect, useState, useCallback } from 'react';
import {
    Grid, Card, CardContent, Typography, Box, CircularProgress,
    Table, TableBody, TableCell, TableHead, TableRow, Paper,
    Chip, LinearProgress, Avatar, Stack, Divider, TextField, Button, IconButton, Tooltip,
} from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';

const STATUS_PIE_COLORS = { Paid: '#2E7D32', Posted: '#1565C0', 'Partially Paid': '#E65100', Overdue: '#C62828', Draft: '#94A3B8' };

// Helpers for default date range
const toISODate = (d) => d.toISOString().slice(0, 10);
const defaultDateTo = () => toISODate(new Date());
const defaultDateFrom = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    d.setDate(1);
    return toISODate(d);
};

const fmtRangeLabel = (from, to) => {
    const fmt = (s) => {
        const d = new Date(s + 'T00:00:00');
        return d.toLocaleString('default', { month: 'short', year: 'numeric' });
    };
    return `${fmt(from)} — ${fmt(to)}`;
};

const StatCard = ({ title, value, subtitle, icon, color, trend, trendValue }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ bgcolor: `${color}18`, borderRadius: 2, p: 1 }}>
                    {React.cloneElement(icon, { sx: { color, fontSize: 22 } })}
                </Box>
                <Chip
                    icon={trend === 'up' ? <TrendingUpRoundedIcon sx={{ fontSize: '14px !important' }} /> : <TrendingDownRoundedIcon sx={{ fontSize: '14px !important' }} />}
                    label={trendValue}
                    size="small"
                    sx={{
                        bgcolor: trend === 'up' ? '#F0FDF4' : '#FEF2F2',
                        color: trend === 'up' ? '#2E7D32' : '#C62828',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        height: 22,
                        border: 'none',
                    }}
                />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332', mb: 0.3 }}>{value}</Typography>
            <Typography sx={{ fontSize: '0.788rem', fontWeight: 600, color: '#5F6B7C' }}>{title}</Typography>
            {subtitle && <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 0.3 }}>{subtitle}</Typography>}
        </CardContent>
    </Card>
);

const INV_STATUS_COLORS = {
    Draft: 'default', Posted: 'primary', 'Partially Paid': 'warning',
    Paid: 'success', Overdue: 'error', Cancelled: 'default',
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <Box sx={{ bgcolor: '#1A2332', borderRadius: 2, p: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <Typography sx={{ color: '#94A3B8', fontSize: '0.7rem', mb: 0.5 }}>{label}</Typography>
            {payload.map(p => (
                <Typography key={p.name} sx={{ color: p.color, fontSize: '0.788rem', fontWeight: 600 }}>
                    {p.name}: ${p.value.toLocaleString()}
                </Typography>
            ))}
        </Box>
    );
};

const Dashboard = () => {
    const { selectedCompanyId } = useAuth();
    const { get, loading } = useApi();
    const navigate = useNavigate();

    const [dateFrom, setDateFrom] = useState(defaultDateFrom());
    const [dateTo, setDateTo] = useState(defaultDateTo());
    // Draft values — only applied on Apply click
    const [draftFrom, setDraftFrom] = useState(defaultDateFrom());
    const [draftTo, setDraftTo] = useState(defaultDateTo());

    const [kpis, setKpis] = useState({ totalRevenue: 0, pendingInvoices: 0, overdueInvoices: 0, outstanding: 0, customerCount: 0, productCount: 0, reorderAlerts: 0, pendingApprovals: 0, openSalesOrders: 0, openPurchaseOrders: 0 });
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [byStatus, setByStatus] = useState([]);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [reorderAlerts, setReorderAlerts] = useState([]);

    const fetchDashboard = useCallback(() => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
        get(`/${selectedCompanyId}/dashboard?${params}`).then(res => {
            if (!res?.data) return;
            const { kpis: k, monthlyTrend: mt, byStatus: bs, recentInvoices: ri } = res.data;
            if (k) setKpis(k);
            if (mt?.length) setMonthlyTrend(mt);
            if (bs?.length) setByStatus(bs);
            if (ri?.length) setRecentInvoices(ri);
        }).catch(() => {});
    }, [selectedCompanyId, dateFrom, dateTo, get]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    useEffect(() => {
        if (!selectedCompanyId) return;
        get(`/${selectedCompanyId}/inventory/reorder-alerts`).then(d => setReorderAlerts(d?.data || [])).catch(() => {});
    }, [selectedCompanyId, get]);

    const handleApply = () => {
        setDateFrom(draftFrom);
        setDateTo(draftTo);
    };

    return (
        <Box>
            {/* Page header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Dashboard</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>
                        {fmtRangeLabel(dateFrom, dateTo)}
                    </Typography>
                </Box>

                {/* Date Range Picker */}
                <Paper sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, border: '1px solid #E8ECF0', borderRadius: 2, bgcolor: '#FAFBFC' }}>
                    <CalendarTodayRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                    <TextField
                        label="From"
                        type="date"
                        size="small"
                        value={draftFrom}
                        onChange={e => setDraftFrom(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 150, '& .MuiOutlinedInput-root': { fontSize: '0.813rem' } }}
                    />
                    <Typography sx={{ color: '#CBD5E1', fontWeight: 600 }}>—</Typography>
                    <TextField
                        label="To"
                        type="date"
                        size="small"
                        value={draftTo}
                        onChange={e => setDraftTo(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 150, '& .MuiOutlinedInput-root': { fontSize: '0.813rem' } }}
                    />
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleApply}
                        sx={{ fontWeight: 700, fontSize: '0.788rem', px: 2, height: 36 }}
                    >
                        Apply
                    </Button>
                </Paper>
            </Box>

            <Grid container spacing={2.5}>
                {/* KPI Cards */}
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard title="Total Revenue" value={`$${Number(kpis.totalRevenue || 0).toLocaleString()}`} subtitle="In selected period" icon={<AccountBalanceWalletRoundedIcon />} color="#1565C0" trend="up" trendValue={`${kpis.openSalesOrders} SOs`} />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard title="Pending Invoices" value={kpis.pendingInvoices} subtitle="Awaiting payment" icon={<ReceiptRoundedIcon />} color="#E65100" trend="up" trendValue={`$${Number(kpis.outstanding || 0).toLocaleString()}`} />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard title="Overdue Invoices" value={kpis.overdueInvoices} subtitle="Requires attention" icon={<WarningAmberRoundedIcon />} color="#C62828" trend={kpis.overdueInvoices > 0 ? 'down' : 'up'} trendValue={kpis.reorderAlerts > 0 ? `${kpis.reorderAlerts} reorder` : 'On track'} />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard title="Customers" value={kpis.customerCount} subtitle={`${kpis.productCount} products`} icon={<PeopleRoundedIcon />} color="#2E7D32" trend="up" trendValue={`${kpis.pendingApprovals} pending`} />
                </Grid>

                {/* Revenue Chart */}
                <Grid item xs={12} lg={8}>
                    <Card>
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                                <Box>
                                    <Typography variant="h6">Revenue vs Expenses</Typography>
                                    <Typography sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>{fmtRangeLabel(dateFrom, dateTo)}</Typography>
                                </Box>
                                <Stack direction="row" spacing={2}>
                                    {[{ color: '#1565C0', label: 'Revenue' }, { color: '#E53935', label: 'Expenses' }].map(l => (
                                        <Stack key={l.label} direction="row" spacing={0.7} alignItems="center">
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: l.color }} />
                                            <Typography sx={{ fontSize: '0.75rem', color: '#5F6B7C' }}>{l.label}</Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>
                            {monthlyTrend.length === 0 ? (
                                <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" color="text.secondary">No invoice data for this period</Typography>
                                    <Typography variant="caption" color="text.disabled">Try adjusting the date range or create invoices</Typography>
                                </Box>
                            ) : (
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={monthlyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1565C0" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="revenue" stroke="#1565C0" strokeWidth={2.5} fill="url(#colorRevenue)" name="Revenue" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Invoice Status Donut */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="h6" sx={{ mb: 0.5 }}>Invoice Status</Typography>
                            <Typography sx={{ color: '#94A3B8', fontSize: '0.75rem', mb: 2 }}>Distribution in selected period</Typography>
                            {(() => {
                                const pieTotal = byStatus.reduce((s, b) => s + (b.count || 0), 0) || 1;
                                const pieData = byStatus.map(b => ({ name: b._id, value: b.count, color: STATUS_PIE_COLORS[b._id] || '#94A3B8' }));
                                return (
                                    <>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                                                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                                </Pie>
                                                <Tooltip formatter={(v) => `${v} invoices`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <Stack spacing={1} sx={{ mt: 1 }}>
                                            {pieData.map(item => {
                                                const pct = Math.round((item.value / pieTotal) * 100);
                                                return (
                                                    <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                                                            <Typography sx={{ fontSize: '0.75rem', color: '#5F6B7C' }}>{item.name}</Typography>
                                                        </Stack>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <LinearProgress variant="determinate" value={pct} sx={{ width: 60, bgcolor: `${item.color}22`, '& .MuiLinearProgress-bar': { bgcolor: item.color } }} />
                                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#1A2332', minWidth: 28, textAlign: 'right' }}>{item.value}</Typography>
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    </>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Invoices */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent sx={{ p: 2.5, pb: '16px !important' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box>
                                    <Typography variant="h6">Recent Invoices</Typography>
                                    <Typography sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>Latest transactions</Typography>
                                </Box>
                            </Box>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
                            ) : (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Invoice</TableCell>
                                            <TableCell>Customer</TableCell>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Due</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell align="right">Balance</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recentInvoices.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94A3B8' }}>
                                                    No invoices yet. Create your first invoice to get started.
                                                </TableCell>
                                            </TableRow>
                                        ) : recentInvoices.map((inv) => (
                                            <TableRow key={inv._id}>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1565C0' }}>
                                                        {inv.invoice_number}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar sx={{ width: 26, height: 26, bgcolor: '#EEF2FF', color: '#1565C0', fontSize: '0.65rem', fontWeight: 700 }}>
                                                            {inv.customer_id?.customer_name?.[0] || 'C'}
                                                        </Avatar>
                                                        <Typography sx={{ fontSize: '0.813rem' }}>{inv.customer_id?.customer_name || '—'}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ color: '#5F6B7C' }}>{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                                                <TableCell sx={{ color: '#5F6B7C' }}>{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                    {inv.currency} {Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, color: Number(inv.amount_due) > 0 ? '#C62828' : '#2E7D32' }}>
                                                    {inv.currency} {Number(inv.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={inv.status} size="small" color={INV_STATUS_COLORS[inv.status] || 'default'} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Reorder Alerts */}
                {reorderAlerts.length > 0 && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent sx={{ p: 2.5, pb: '16px !important' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6">Reorder Alerts</Typography>
                                        <Typography sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>{reorderAlerts.length} product{reorderAlerts.length !== 1 ? 's' : ''} below reorder point</Typography>
                                    </Box>
                                    <Chip icon={<WarningAmberRoundedIcon sx={{ fontSize: '14px !important' }} />} label={`${reorderAlerts.length} Alert${reorderAlerts.length !== 1 ? 's' : ''}`} size="small" color="warning" sx={{ fontWeight: 700 }} />
                                </Box>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell>Product Code</TableCell>
                                            <TableCell align="right">Current Stock</TableCell>
                                            <TableCell align="right">Reorder Point</TableCell>
                                            <TableCell align="right">Shortage</TableCell>
                                            <TableCell align="center">Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {reorderAlerts.map((alert, i) => (
                                            <TableRow key={alert.product?._id || i} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar sx={{ width: 26, height: 26, bgcolor: '#FEF3C7', color: '#B45309', fontSize: '0.65rem', fontWeight: 700 }}>
                                                            {alert.product?.product_name?.[0]?.toUpperCase() || 'P'}
                                                        </Avatar>
                                                        <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332' }}>{alert.product?.product_name || '—'}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{alert.product?.product_code || '—'}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', fontWeight: 600, color: alert.current_stock <= 0 ? '#B91C1C' : '#B45309' }}>{alert.current_stock}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{alert.reorder_point}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', fontWeight: 700, color: '#B91C1C' }}>{alert.shortage}</TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="Create Purchase Order for this product">
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="primary"
                                                            startIcon={<ShoppingCartRoundedIcon sx={{ fontSize: 14 }} />}
                                                            onClick={() => navigate(`/purchase-orders?product_id=${alert.product?._id}&product_name=${encodeURIComponent(alert.product?.product_name || '')}&qty=${alert.product?.reorder_quantity || alert.reorder_point}`)}
                                                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                                                        >
                                                            Create PO
                                                        </Button>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default Dashboard;
