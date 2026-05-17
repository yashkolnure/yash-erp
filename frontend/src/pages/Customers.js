import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, TablePagination, Stack, Avatar, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Grid, Alert, InputBase, Divider,
    Drawer, IconButton, Tabs, Tab, CircularProgress, Switch, FormControlLabel,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import { useForm, Controller } from 'react-hook-form';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import { toNum, fmtCurrency } from '../utils/numbers';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
const AVATAR_COLORS = ['#1565C0', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const STATUS_STYLE_INV = {
    Draft: { bg: '#F1F5F9', color: '#64748B' },
    Posted: { bg: '#EFF6FF', color: '#1565C0' },
    'Partially Paid': { bg: '#FFFBEB', color: '#B45309' },
    Paid: { bg: '#F0FDF4', color: '#15803D' },
    Overdue: { bg: '#FEF2F2', color: '#B91C1C' },
    Cancelled: { bg: '#F1F5F9', color: '#64748B' },
};

/* ── Customer Form ─────────────────────────────────────────────────────── */
const CustomerForm = ({ companyId, onSuccess, onCancel, defaultValues }) => {
    const { post, put, loading, error } = useApi();
    const { register, handleSubmit, control, formState: { errors } } = useForm({
        defaultValues: {
            ...defaultValues,
            credit_hold: defaultValues?.credit_hold || false,
        },
    });
    const isEdit = Boolean(defaultValues?._id);

    const onSubmit = async (data) => {
        try {
            if (isEdit) await put(`/${companyId}/sales/customers/${defaultValues._id}`, data);
            else await post(`/${companyId}/sales/customers`, data);
            onSuccess();
        } catch {}
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField fullWidth label="Customer Name" required {...register('customer_name', { required: true })} error={!!errors.customer_name} helperText={errors.customer_name && 'Required'} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Email" type="email" {...register('email')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Tax ID / VAT" {...register('tax_id')} /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Address" {...register('address')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="City" {...register('city')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="State" {...register('state')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Country" {...register('country')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Credit Limit ($)" type="number" {...register('credit_limit', { valueAsNumber: true })} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Payment Terms (days)" type="number" defaultValue={30} {...register('payment_terms_days', { valueAsNumber: true })} /></Grid>
                <Grid item xs={12}>
                    <Box sx={{ p: 2, border: '1px solid #E8ECF0', borderRadius: 2, bgcolor: '#FAFBFC' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.813rem', color: '#1A2332', mb: 1.5 }}>Credit Settings</Typography>
                        <Controller
                            name="credit_hold"
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={!!field.value}
                                            onChange={e => field.onChange(e.target.checked)}
                                            color="error"
                                            size="small"
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332' }}>Credit Hold</Typography>
                                            <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>Prevents new invoices from being created for this customer</Typography>
                                        </Box>
                                    }
                                />
                            )}
                        />
                    </Box>
                </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button onClick={onCancel} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 700 }}>
                    {loading ? 'Saving...' : isEdit ? 'Update Customer' : 'Save Customer'}
                </Button>
            </Box>
        </Box>
    );
};

/* ── Customer Statement Dialog ─────────────────────────────────────────── */
const CustomerStatementDialog = ({ open, onClose, customerId, companyId }) => {
    const { get } = useApi();
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [statement, setStatement] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) { setStatement(null); setError(''); setFromDate(''); setToDate(''); }
    }, [open]);

    const loadStatement = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (fromDate) params.append('from_date', fromDate);
            if (toDate) params.append('to_date', toDate);
            const data = await get(`/${companyId}/sales/customers/${customerId}/statement?${params}`);
            setStatement(data.data);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to load statement');
        } finally {
            setLoading(false);
        }
    };

    const totalDebit = statement?.transactions.reduce((s, t) => s + t.debit, 0) || 0;
    const totalCredit = statement?.transactions.reduce((s, t) => s + t.credit, 0) || 0;
    const closingBalance = statement?.closing_balance || 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssessmentRoundedIcon sx={{ fontSize: 20, color: '#1565C0' }} />
                    Customer Statement
                    {statement?.customer && (
                        <Typography component="span" sx={{ fontSize: '0.813rem', color: '#94A3B8', fontWeight: 500 }}>
                            — {statement.customer.customer_name}
                        </Typography>
                    )}
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
                {/* Date range filters */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        label="From Date"
                        type="date"
                        size="small"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 160 }}
                    />
                    <TextField
                        label="To Date"
                        type="date"
                        size="small"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 160 }}
                    />
                    <Button variant="contained" onClick={loadStatement} disabled={loading} sx={{ fontWeight: 700, fontSize: '0.813rem', minWidth: 90 }}>
                        {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Load'}
                    </Button>
                    {statement && (
                        <Button variant="outlined" startIcon={<PrintRoundedIcon sx={{ fontSize: 16 }} />} onClick={() => window.print()} sx={{ fontWeight: 600, fontSize: '0.813rem', color: '#5F6B7C', borderColor: '#E8ECF0', ml: 'auto' }}>
                            Print
                        </Button>
                    )}
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                {!statement && !loading && (
                    <Box sx={{ py: 5, textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>
                        Select a date range and click Load to view the statement.
                    </Box>
                )}

                {statement && (
                    <Box className="print-area">
                        {statement.transactions.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>
                                No transactions found for the selected period.
                            </Box>
                        ) : (
                            <Box sx={{ border: '1px solid #E8ECF0', borderRadius: 2, overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#F7F9FC' }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase' }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase' }}>Type</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase' }}>Reference</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase' }}>Description</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'error.main', textTransform: 'uppercase' }}>Debit</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'success.main', textTransform: 'uppercase' }}>Credit</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase' }}>Balance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {statement.transactions.map((t, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C', whiteSpace: 'nowrap' }}>{new Date(t.date).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'inline-flex', px: 1, py: 0.2, borderRadius: 1, bgcolor: t.type === 'Invoice' ? '#EFF6FF' : t.type === 'Payment' ? '#F0FDF4' : '#FAF5FF' }}>
                                                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: t.type === 'Invoice' ? '#1565C0' : t.type === 'Payment' ? '#15803D' : '#7C3AED' }}>{t.type}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332', fontFamily: 'monospace' }}>{t.reference || '—'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{t.description}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', fontWeight: t.debit > 0 ? 700 : 400, color: t.debit > 0 ? 'error.main' : '#CBD5E1' }}>
                                                    {t.debit > 0 ? fmtCurrency(t.debit) : '—'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', fontWeight: t.credit > 0 ? 700 : 400, color: t.credit > 0 ? 'success.main' : '#CBD5E1' }}>
                                                    {t.credit > 0 ? fmtCurrency(t.credit) : '—'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', fontWeight: 700, color: t.balance > 0 ? 'error.main' : 'success.main' }}>
                                                    {fmtCurrency(Math.abs(t.balance))}{t.balance < 0 ? ' CR' : ''}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {/* Footer totals */}
                                <Box sx={{ p: 2, borderTop: '2px solid #E8ECF0', bgcolor: '#F7F9FC', display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, mb: 0.2 }}>TOTAL DEBIT</Typography>
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'error.main' }}>{fmtCurrency(totalDebit)}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, mb: 0.2 }}>TOTAL CREDIT</Typography>
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'success.main' }}>{fmtCurrency(totalCredit)}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right', pl: 2, borderLeft: '1px solid #E8ECF0' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, mb: 0.2 }}>CLOSING BALANCE</Typography>
                                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: closingBalance > 0 ? 'error.main' : 'success.main' }}>
                                            {fmtCurrency(Math.abs(closingBalance))}{closingBalance < 0 ? ' CR' : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ color: '#5F6B7C', fontWeight: 600 }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Customer Detail Drawer ────────────────────────────────────────────── */
const CustomerDetailDrawer = ({ open, onClose, customerId, companyId, onEdit }) => {
    const { get, loading } = useApi();
    const [customer, setCustomer] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [tab, setTab] = useState(0);
    const [showStatement, setShowStatement] = useState(false);

    useEffect(() => {
        if (open && customerId) {
            setCustomer(null);
            setInvoices([]);
            setTab(0);
            get(`/${companyId}/sales/customers/${customerId}`).then(d => setCustomer(d.data)).catch(() => {});
            get(`/${companyId}/ar/invoices?customer_id=${customerId}&limit=20`).then(d => setInvoices(d.data || [])).catch(() => {});
        }
    }, [open, customerId, companyId, get]);

    const outstanding = invoices.filter(i => ['Posted', 'Partially Paid', 'Overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount_due || 0), 0);
    const totalBilled = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const overdue = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + Number(i.amount_due || 0), 0);

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100vw', md: 640 }, bgcolor: '#FAFBFC' } }}>
            {/* Header */}
            <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E8ECF0', p: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {customer && (
                        <Avatar sx={{ width: 44, height: 44, bgcolor: getColor(customer.customer_name), fontWeight: 800, fontSize: '1rem' }}>
                            {customer.customer_name?.[0]?.toUpperCase()}
                        </Avatar>
                    )}
                    <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1A2332' }}>{customer?.customer_name || 'Loading...'}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{customer?.customer_code} · Net {customer?.payment_terms_days}d</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<AssessmentRoundedIcon sx={{ fontSize: 14 }} />} onClick={() => setShowStatement(true)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#1565C0', borderColor: '#BFDBFE' }}>
                        Statement
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<EditRoundedIcon sx={{ fontSize: 14 }} />} onClick={() => onEdit(customer)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#5F6B7C', borderColor: '#E8ECF0' }}>
                        Edit
                    </Button>
                    <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
                </Box>
            </Box>

            {!customer ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress size={28} /></Box>
            ) : (
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {/* Financial KPIs */}
                    <Box sx={{ display: 'flex', gap: 0, borderBottom: '1px solid #F0F2F5' }}>
                        {[
                            { label: 'Total Billed', value: `$${fmt(totalBilled)}`, color: '#1565C0', bg: '#EFF6FF' },
                            { label: 'Outstanding', value: `$${fmt(outstanding)}`, color: '#B45309', bg: '#FFFBEB' },
                            { label: 'Overdue', value: `$${fmt(overdue)}`, color: '#B91C1C', bg: '#FEF2F2' },
                        ].map((kpi, i) => (
                            <Box key={kpi.label} sx={{ flex: 1, p: 2, bgcolor: '#fff', borderRight: i < 2 ? '1px solid #F0F2F5' : 'none', textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', mb: 0.3 }}>{kpi.label}</Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: kpi.color }}>{kpi.value}</Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Tabs */}
                    <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F0F2F5', px: 2 }}>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontSize: '0.788rem', fontWeight: 600, minHeight: 44, textTransform: 'none', color: '#5F6B7C' }, '& .Mui-selected': { color: '#1565C0' }, '& .MuiTabs-indicator': { bgcolor: '#1565C0' } }}>
                            <Tab label="Contact & Info" />
                            <Tab label={`Invoices (${invoices.length})`} />
                        </Tabs>
                    </Box>

                    {/* Tab 0: Contact */}
                    {tab === 0 && (
                        <Box sx={{ p: 2.5 }}>
                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', p: 2.5, mb: 2 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: '#1A2332' }}>Contact Information</Typography>
                                <Stack spacing={1.5}>
                                    {customer.email && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <MailRoundedIcon sx={{ fontSize: 16, color: '#1565C0' }} />
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>EMAIL</Typography>
                                                <Typography sx={{ fontSize: '0.813rem', color: '#1A2332' }}>{customer.email}</Typography>
                                            </Box>
                                        </Box>
                                    )}
                                    {customer.phone && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <PhoneRoundedIcon sx={{ fontSize: 16, color: '#15803D' }} />
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>PHONE</Typography>
                                                <Typography sx={{ fontSize: '0.813rem', color: '#1A2332' }}>{customer.phone}</Typography>
                                            </Box>
                                        </Box>
                                    )}
                                    {(customer.address || customer.city) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <LocationOnRoundedIcon sx={{ fontSize: 16, color: '#7C3AED' }} />
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>ADDRESS</Typography>
                                                <Typography sx={{ fontSize: '0.813rem', color: '#1A2332' }}>
                                                    {[customer.address, customer.city, customer.state, customer.country].filter(Boolean).join(', ')}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
                                </Stack>
                            </Box>

                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', p: 2.5 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: '#1A2332' }}>Account Details</Typography>
                                <Grid container spacing={1.5}>
                                    {[
                                        ['Customer Code', customer.customer_code],
                                        ['Status', customer.customer_status],
                                        ['Tax ID', customer.tax_id || '—'],
                                        ['Credit Limit', customer.credit_limit ? `$${fmt(customer.credit_limit)}` : '—'],
                                        ['Payment Terms', `Net ${customer.payment_terms_days} days`],
                                        ['Since', new Date(customer.createdAt).toLocaleDateString()],
                                    ].map(([label, value]) => (
                                        <Grid item xs={6} key={label}>
                                            <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.2 }}>{label}</Typography>
                                            <Typography sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1A2332' }}>{value}</Typography>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        </Box>
                    )}

                    {/* Tab 1: Invoices */}
                    {tab === 1 && (
                        <Box sx={{ p: 2.5 }}>
                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
                                {invoices.length === 0 ? (
                                    <Box sx={{ py: 4, textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>No invoices for this customer yet.</Box>
                                ) : (
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Invoice #</TableCell>
                                                <TableCell>Date</TableCell>
                                                <TableCell align="right">Total</TableCell>
                                                <TableCell align="right">Balance</TableCell>
                                                <TableCell>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {invoices.map(inv => {
                                                const s = STATUS_STYLE_INV[inv.status] || STATUS_STYLE_INV.Draft;
                                                return (
                                                    <TableRow key={inv._id} hover>
                                                        <TableCell sx={{ fontWeight: 700, color: '#1565C0', fontSize: '0.813rem' }}>{inv.invoice_number}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.813rem' }}>{inv.currency} {fmt(inv.total_amount)}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem', color: Number(inv.amount_due) > 0 ? '#B91C1C' : '#15803D' }}>{inv.currency} {fmt(inv.amount_due)}</TableCell>
                                                        <TableCell>
                                                            <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: s.bg }}>
                                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: s.color }}>{inv.status}</Typography>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            )}

            <CustomerStatementDialog
                open={showStatement}
                onClose={() => setShowStatement(false)}
                customerId={customerId}
                companyId={companyId}
            />
        </Drawer>
    );
};

/* ── Main Customers ────────────────────────────────────────────────────── */
const Customers = () => {
    const { selectedCompanyId } = useAuth();
    const { get } = useApi();
    const [customers, setCustomers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [showForm, setShowForm] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');

    const fetchCustomers = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const data = await get(`/${selectedCompanyId}/sales/customers?skip=${page * rowsPerPage}&limit=${rowsPerPage}`);
            setCustomers(data.data || []);
            setTotal(data.pagination?.total || 0);
        } catch {}
    }, [selectedCompanyId, page, rowsPerPage, get]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const exportCSV = () => {
        const rows = [['Code', 'Name', 'Email', 'Phone', 'City', 'Country', 'Payment Terms', 'Status'], ...customers.map(c => [c.customer_code, c.customer_name, c.email || '', c.phone || '', c.city || '', c.country || '', `${c.payment_terms_days}d`, c.customer_status])];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `Customers_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    const displayed = search ? customers.filter(c => c.customer_name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())) : customers;

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Customers</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>Manage customer accounts, contacts and billing history</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={exportCSV} sx={{ fontWeight: 600, fontSize: '0.813rem', color: '#5F6B7C', borderColor: '#E8ECF0' }}>Export CSV</Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setEditCustomer(null); setShowForm(true); }} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>New Customer</Button>
                </Stack>
            </Box>

            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: 2, px: 1.5, py: 0.75, flex: 1, maxWidth: 360 }}>
                            <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 18, mr: 1 }} />
                            <InputBase placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} sx={{ fontSize: '0.813rem', color: '#1A2332', flex: 1 }} />
                        </Box>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', ml: 'auto' }}>{total} total customers</Typography>
                    </Box>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Customer</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Payment Terms</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayed.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>No customers yet. Add your first customer.</TableCell></TableRow>
                            ) : displayed.map(c => (
                                <TableRow key={c._id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedId(c._id)}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 34, height: 34, bgcolor: getColor(c.customer_name), fontSize: '0.813rem', fontWeight: 700 }}>
                                                {c.customer_name?.[0]?.toUpperCase()}
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332' }}>{c.customer_name}</Typography>
                                                {c.tax_id && <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>TIN: {c.tax_id}</Typography>}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C', fontFamily: 'monospace' }}>{c.customer_code}</TableCell>
                                    <TableCell>
                                        <Stack spacing={0.3}>
                                            {c.email && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><MailRoundedIcon sx={{ fontSize: 12, color: '#94A3B8' }} /><Typography sx={{ fontSize: '0.75rem', color: '#5F6B7C' }}>{c.email}</Typography></Box>}
                                            {c.phone && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PhoneRoundedIcon sx={{ fontSize: 12, color: '#94A3B8' }} /><Typography sx={{ fontSize: '0.75rem', color: '#5F6B7C' }}>{c.phone}</Typography></Box>}
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>
                                        {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: '#F0F2F5' }}>
                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#5F6B7C' }}>Net {c.payment_terms_days}d</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: c.customer_status === 'Active' ? '#F0FDF4' : '#F1F5F9' }}>
                                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: c.customer_status === 'Active' ? '#15803D' : '#64748B' }}>{c.customer_status}</Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Divider />
                    <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }} rowsPerPageOptions={[10, 20, 50]} />
                </CardContent>
            </Card>

            {/* New / Edit Customer Dialog */}
            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>{editCustomer ? 'Edit Customer' : 'New Customer'}</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    <CustomerForm
                        companyId={selectedCompanyId}
                        defaultValues={editCustomer}
                        onSuccess={() => { setShowForm(false); setEditCustomer(null); fetchCustomers(); }}
                        onCancel={() => { setShowForm(false); setEditCustomer(null); }}
                    />
                </DialogContent>
            </Dialog>

            {/* Customer Detail Drawer */}
            <CustomerDetailDrawer
                open={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                customerId={selectedId}
                companyId={selectedCompanyId}
                onEdit={(c) => { setSelectedId(null); setEditCustomer(c); setShowForm(true); }}
            />
        </Box>
    );
};

export default Customers;
