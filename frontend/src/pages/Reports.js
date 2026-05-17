import React, { useState, useCallback } from 'react';
import {
    Box, Typography, Tabs, Tab, TextField, Button, Paper, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    CircularProgress, Chip, Divider, Grid, Card, CardContent,
} from '@mui/material';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';

const fmtCurrency = (v) => `$${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const StatCard = ({ label, value, color = 'primary.main', icon }) => (
    <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
            </Box>
            <Box sx={{ color, opacity: 0.4, fontSize: 36 }}>{icon}</Box>
        </CardContent>
    </Card>
);

function ProfitLoss({ companyId }) {
    const { get, loading } = useApi();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState(null);

    const run = useCallback(async () => {
        const params = new URLSearchParams();
        if (from) params.set('from_date', from);
        if (to) params.set('to_date', to);
        const res = await get(`/${companyId}/reports/profit-loss?${params}`);
        if (res?.data) setData(res.data);
    }, [companyId, from, to, get]);

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={e => setFrom(e.target.value)} />
                <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={e => setTo(e.target.value)} />
                <Button variant="contained" onClick={run} disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Run Report'}</Button>
            </Paper>

            {data && (
                <Stack spacing={3}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Total Income" value={fmtCurrency(data.total_income)} color="success.main" icon={<TrendingUpRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Total Expenses" value={fmtCurrency(data.total_expenses)} color="error.main" icon={<ReceiptLongRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Net Profit" value={fmtCurrency(data.net_profit)} color={data.net_profit >= 0 ? 'success.main' : 'error.main'} icon={<AssessmentRoundedIcon fontSize="inherit" />} />
                        </Grid>
                    </Grid>

                    <Paper>
                        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: '8px 8px 0 0' }}>
                            <Typography fontWeight={700} color="success.dark">Income</Typography>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Account</b></TableCell>
                                    <TableCell align="right"><b>Debit</b></TableCell>
                                    <TableCell align="right"><b>Credit</b></TableCell>
                                    <TableCell align="right"><b>Balance</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {data.income.map((b, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{b.account.account_name} <Typography variant="caption" color="text.secondary">({b.account.account_code})</Typography></TableCell>
                                            <TableCell align="right">{fmtCurrency(b.debit)}</TableCell>
                                            <TableCell align="right">{fmtCurrency(b.credit)}</TableCell>
                                            <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>{fmtCurrency(b.balance)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ bgcolor: 'success.lighter' }}>
                                        <TableCell colSpan={3}><b>Total Income</b></TableCell>
                                        <TableCell align="right"><b>{fmtCurrency(data.total_income)}</b></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Paper>
                        <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: '8px 8px 0 0' }}>
                            <Typography fontWeight={700} color="error.dark">Expenses</Typography>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Account</b></TableCell>
                                    <TableCell align="right"><b>Debit</b></TableCell>
                                    <TableCell align="right"><b>Credit</b></TableCell>
                                    <TableCell align="right"><b>Balance</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {data.expenses.map((b, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{b.account.account_name} <Typography variant="caption" color="text.secondary">({b.account.account_code})</Typography></TableCell>
                                            <TableCell align="right">{fmtCurrency(b.debit)}</TableCell>
                                            <TableCell align="right">{fmtCurrency(b.credit)}</TableCell>
                                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>{fmtCurrency(b.balance)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ bgcolor: 'error.lighter' }}>
                                        <TableCell colSpan={3}><b>Total Expenses</b></TableCell>
                                        <TableCell align="right"><b>{fmtCurrency(data.total_expenses)}</b></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Stack>
            )}
        </Box>
    );
}

function BalanceSheet({ companyId }) {
    const { get, loading } = useApi();
    const [asOf, setAsOf] = useState('');
    const [data, setData] = useState(null);

    const run = useCallback(async () => {
        const params = new URLSearchParams();
        if (asOf) params.set('as_of_date', asOf);
        const res = await get(`/${companyId}/reports/balance-sheet?${params}`);
        if (res?.data) setData(res.data);
    }, [companyId, asOf, get]);

    const Section = ({ title, items, total, color }) => (
        <Paper sx={{ mb: 2 }}>
            <Box sx={{ p: 2, bgcolor: `${color}.lighter`, borderRadius: '8px 8px 0 0' }}>
                <Typography fontWeight={700} color={`${color}.dark`}>{title}</Typography>
            </Box>
            <TableContainer>
                <Table size="small">
                    <TableBody>
                        {items.map((b, i) => (
                            <TableRow key={i} hover>
                                <TableCell>{b.account.account_name}</TableCell>
                                <TableCell align="right">{fmtCurrency(b.balance)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: `${color}.lighter` }}>
                            <TableCell><b>Total {title}</b></TableCell>
                            <TableCell align="right"><b>{fmtCurrency(total)}</b></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" type="date" label="As of Date" InputLabelProps={{ shrink: true }} value={asOf} onChange={e => setAsOf(e.target.value)} />
                <Button variant="contained" onClick={run} disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Run Report'}</Button>
            </Paper>

            {data && (
                <Stack spacing={2}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <StatCard label="Total Assets" value={fmtCurrency(data.total_assets)} color="primary.main" icon={<AccountBalanceRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <StatCard label="Total Liabilities" value={fmtCurrency(data.total_liabilities)} color="error.main" icon={<ReceiptLongRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <StatCard label="Total Equity" value={fmtCurrency(data.total_equity)} color="info.main" icon={<AssessmentRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <StatCard label="Retained Earnings" value={fmtCurrency(data.retained_earnings)} color={data.retained_earnings >= 0 ? 'success.main' : 'error.main'} icon={<TrendingUpRoundedIcon fontSize="inherit" />} />
                        </Grid>
                    </Grid>
                    <Section title="Assets" items={data.assets} total={data.total_assets} color="primary" />
                    <Section title="Liabilities" items={data.liabilities} total={data.total_liabilities} color="error" />
                    <Section title="Equity" items={data.equity} total={data.total_equity} color="info" />
                </Stack>
            )}
        </Box>
    );
}

function CashFlow({ companyId }) {
    const { get, loading } = useApi();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState(null);

    const run = useCallback(async () => {
        const params = new URLSearchParams();
        if (from) params.set('from_date', from);
        if (to) params.set('to_date', to);
        const res = await get(`/${companyId}/reports/cash-flow?${params}`);
        if (res?.data) setData(res.data);
    }, [companyId, from, to, get]);

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={e => setFrom(e.target.value)} />
                <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={e => setTo(e.target.value)} />
                <Button variant="contained" onClick={run} disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Run Report'}</Button>
            </Paper>

            {data && (
                <Stack spacing={3}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Total Inflow" value={fmtCurrency(data.total_inflow)} color="success.main" icon={<TrendingUpRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Total Outflow" value={fmtCurrency(data.total_outflow)} color="error.main" icon={<WaterDropRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Net Cash Flow" value={fmtCurrency(data.net_cash_flow)} color={data.net_cash_flow >= 0 ? 'success.main' : 'error.main'} icon={<AccountBalanceRoundedIcon fontSize="inherit" />} />
                        </Grid>
                    </Grid>

                    <Paper>
                        <Box sx={{ p: 2 }}><Typography fontWeight={700} color="success.dark">Cash Inflows (Receipts)</Typography></Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Reference</b></TableCell>
                                    <TableCell><b>Date</b></TableCell>
                                    <TableCell><b>Method</b></TableCell>
                                    <TableCell align="right"><b>Amount</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {data.inflows.map((p, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{p.payment_number || p.reference}</TableCell>
                                            <TableCell>{fmtDate(p.payment_date)}</TableCell>
                                            <TableCell>{p.payment_method}</TableCell>
                                            <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>{fmtCurrency(p.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Paper>
                        <Box sx={{ p: 2 }}><Typography fontWeight={700} color="error.dark">Cash Outflows (Payments)</Typography></Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Reference</b></TableCell>
                                    <TableCell><b>Date</b></TableCell>
                                    <TableCell><b>Method</b></TableCell>
                                    <TableCell align="right"><b>Amount</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {data.outflows.map((p, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{p.payment_number || p.reference}</TableCell>
                                            <TableCell>{fmtDate(p.payment_date)}</TableCell>
                                            <TableCell>{p.payment_method}</TableCell>
                                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>{fmtCurrency(p.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Stack>
            )}
        </Box>
    );
}

function TaxReport({ companyId }) {
    const { get, loading } = useApi();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState(null);

    const run = useCallback(async () => {
        const params = new URLSearchParams();
        if (from) params.set('from_date', from);
        if (to) params.set('to_date', to);
        const res = await get(`/${companyId}/reports/tax?${params}`);
        if (res?.data) setData(res.data);
    }, [companyId, from, to, get]);

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={e => setFrom(e.target.value)} />
                <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={e => setTo(e.target.value)} />
                <Button variant="contained" onClick={run} disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Run Report'}</Button>
            </Paper>

            {data && (
                <Stack spacing={3}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Output Tax (Sales)" value={fmtCurrency(data.output.total_tax)} color="error.main" icon={<ReceiptLongRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Input Tax (Purchases)" value={fmtCurrency(data.input.total_tax)} color="success.main" icon={<ReceiptLongRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Net Tax Payable" value={fmtCurrency(data.net_tax_payable)} color={data.net_tax_payable >= 0 ? 'error.main' : 'success.main'} icon={<AccountBalanceRoundedIcon fontSize="inherit" />} />
                        </Grid>
                    </Grid>

                    <Paper>
                        <Box sx={{ p: 2 }}><Typography fontWeight={700}>Output Tax — Sales Invoices</Typography></Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Invoice #</b></TableCell>
                                    <TableCell><b>Customer</b></TableCell>
                                    <TableCell><b>Date</b></TableCell>
                                    <TableCell align="right"><b>Taxable Amount</b></TableCell>
                                    <TableCell align="right"><b>Tax</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {data.output.invoices.map((inv, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{inv.number}</TableCell>
                                            <TableCell>{inv.customer}</TableCell>
                                            <TableCell>{fmtDate(inv.date)}</TableCell>
                                            <TableCell align="right">{fmtCurrency(inv.taxable)}</TableCell>
                                            <TableCell align="right" sx={{ color: 'error.main' }}>{fmtCurrency(inv.tax)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                                        <TableCell colSpan={3}><b>Totals</b></TableCell>
                                        <TableCell align="right"><b>{fmtCurrency(data.output.total_taxable)}</b></TableCell>
                                        <TableCell align="right"><b>{fmtCurrency(data.output.total_tax)}</b></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Paper>
                        <Box sx={{ p: 2 }}><Typography fontWeight={700}>Input Tax — Purchase Bills</Typography></Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Bill #</b></TableCell>
                                    <TableCell><b>Date</b></TableCell>
                                    <TableCell align="right"><b>Taxable Amount</b></TableCell>
                                    <TableCell align="right"><b>Tax</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {data.input.invoices.map((inv, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{inv.number}</TableCell>
                                            <TableCell>{fmtDate(inv.date)}</TableCell>
                                            <TableCell align="right">{fmtCurrency(inv.taxable)}</TableCell>
                                            <TableCell align="right" sx={{ color: 'success.main' }}>{fmtCurrency(inv.tax)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                                        <TableCell colSpan={2}><b>Totals</b></TableCell>
                                        <TableCell align="right"><b>{fmtCurrency(data.input.total_taxable)}</b></TableCell>
                                        <TableCell align="right"><b>{fmtCurrency(data.input.total_tax)}</b></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Stack>
            )}
        </Box>
    );
}

function SalesAnalytics({ companyId }) {
    const { get, loading } = useApi();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState(null);

    const run = useCallback(async () => {
        const params = new URLSearchParams();
        if (from) params.set('from_date', from);
        if (to) params.set('to_date', to);
        const res = await get(`/${companyId}/reports/sales-analytics?${params}`);
        if (res?.data) setData(res.data);
    }, [companyId, from, to, get]);

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={e => setFrom(e.target.value)} />
                <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={e => setTo(e.target.value)} />
                <Button variant="contained" onClick={run} disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Run Report'}</Button>
            </Paper>

            {data && (
                <Stack spacing={3}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Total Revenue" value={fmtCurrency(data.total_revenue)} color="primary.main" icon={<BarChartRoundedIcon fontSize="inherit" />} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <StatCard label="Invoices" value={data.invoice_count} color="info.main" icon={<ReceiptLongRoundedIcon fontSize="inherit" />} />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                        <Paper>
                            <Box sx={{ p: 2 }}><Typography fontWeight={700}>Top Customers</Typography></Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell><b>Customer</b></TableCell>
                                        <TableCell align="right"><b>Revenue</b></TableCell>
                                    </TableRow></TableHead>
                                    <TableBody>
                                        {data.top_customers.map((c, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{c.name}</TableCell>
                                                <TableCell align="right" fontWeight={600}>{fmtCurrency(c.value)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        <Paper>
                            <Box sx={{ p: 2 }}><Typography fontWeight={700}>Monthly Trend</Typography></Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell><b>Month</b></TableCell>
                                        <TableCell align="right"><b>Revenue</b></TableCell>
                                    </TableRow></TableHead>
                                    <TableBody>
                                        {data.monthly_trend.map((m, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{m.month}</TableCell>
                                                <TableCell align="right">{fmtCurrency(m.value)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Box>
                </Stack>
            )}
        </Box>
    );
}

const TABS = [
    { label: 'Profit & Loss', icon: <TrendingUpRoundedIcon fontSize="small" /> },
    { label: 'Balance Sheet', icon: <AccountBalanceRoundedIcon fontSize="small" /> },
    { label: 'Cash Flow', icon: <WaterDropRoundedIcon fontSize="small" /> },
    { label: 'Tax / GST', icon: <ReceiptLongRoundedIcon fontSize="small" /> },
    { label: 'Sales Analytics', icon: <BarChartRoundedIcon fontSize="small" /> },
];

export default function Reports() {
    const { selectedCompanyId } = useAuth();
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Financial Reports</Typography>
                <Typography variant="body2" color="text.secondary">Generate and view financial statements</Typography>
            </Box>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
                    {TABS.map((t, i) => (
                        <Tab key={i} label={t.label} icon={t.icon} iconPosition="start"
                            sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }} />
                    ))}
                </Tabs>
            </Paper>

            {tab === 0 && <ProfitLoss companyId={selectedCompanyId} />}
            {tab === 1 && <BalanceSheet companyId={selectedCompanyId} />}
            {tab === 2 && <CashFlow companyId={selectedCompanyId} />}
            {tab === 3 && <TaxReport companyId={selectedCompanyId} />}
            {tab === 4 && <SalesAnalytics companyId={selectedCompanyId} />}
        </Box>
    );
}
