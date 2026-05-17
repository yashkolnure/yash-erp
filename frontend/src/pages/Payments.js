import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, TablePagination, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Grid, Alert, InputBase, Divider, MenuItem,
    Stack, Drawer, IconButton, CircularProgress, Tooltip, Select, FormControl,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import { useForm } from 'react-hook-form';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import { toNum } from '../utils/numbers';

const fmt = (n) => toNum(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

const METHOD_ICON = {
    'Bank Transfer': <AccountBalanceRoundedIcon sx={{ fontSize: 14 }} />,
    'Credit Card': <CreditCardRoundedIcon sx={{ fontSize: 14 }} />,
    Cash: <PaymentsRoundedIcon sx={{ fontSize: 14 }} />,
};

/* ── Payment Form ──────────────────────────────────────────────────────── */
const PaymentForm = ({ companyId, onSuccess, onCancel }) => {
    const { post, loading, error } = useApi();
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: { payment_date: new Date().toISOString().split('T')[0], currency: 'USD', payment_type: 'Customer Payment', payment_method: 'Bank Transfer' },
    });

    const onSubmit = async (data) => {
        try { await post(`/${companyId}/payments`, { ...data, amount: Number(data.amount) }); onSuccess(); } catch {}
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth required select label="Payment Type" defaultValue="Customer Payment" {...register('payment_type', { required: true })}>
                        <MenuItem value="Customer Payment">Customer Payment</MenuItem>
                        <MenuItem value="Vendor Payment">Vendor Payment</MenuItem>
                    </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth required select label="Payment Method" defaultValue="Bank Transfer" {...register('payment_method', { required: true })}>
                        {['Cash', 'Check', 'Bank Transfer', 'Credit Card', 'Wire Transfer'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth required label="Amount" type="number" inputProps={{ step: 0.01, min: 0.01 }}
                        {...register('amount', { required: true, min: 0.01 })} error={!!errors.amount} helperText={errors.amount && 'Required, > 0'} />
                </Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Currency" defaultValue="USD" {...register('currency')} /></Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth required label="Payment Date" type="date" InputLabelProps={{ shrink: true }} {...register('payment_date', { required: true })} />
                </Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Reference Number" {...register('reference_number')} /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Bank Account / Wallet" {...register('bank_account')} /></Grid>
                <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Notes" {...register('notes')} /></Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button onClick={onCancel} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 700 }}>
                    {loading ? 'Saving...' : 'Record Payment'}
                </Button>
            </Box>
        </Box>
    );
};

/* ── Apply Payment Dialog ──────────────────────────────────────────────── */
const ApplyPaymentDialog = ({ open, onClose, companyId, payment, onSuccess }) => {
    const { get, post, loading } = useApi();
    const [invoices, setInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState('');
    const [applyAmount, setApplyAmount] = useState('');
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (open && companyId) {
            get(`/${companyId}/ar/invoices?status=Posted&limit=50`).then(d => setInvoices(d.data || [])).catch(() => {});
        }
    }, [open, companyId, get]);

    const remaining = toNum(payment?.amount) - toNum(payment?.applied_amount);

    const handleApply = async () => {
        setErr(null);
        if (!selectedInvoice || !applyAmount) { setErr('Select an invoice and enter amount'); return; }
        if (Number(applyAmount) > remaining) { setErr(`Cannot apply more than remaining balance ($${fmt(remaining)})`); return; }
        try {
            await post(`/${companyId}/payments/apply`, {
                payment_id: payment._id,
                invoice_id: selectedInvoice,
                amount_applied: Number(applyAmount),
            });
            onSuccess();
            onClose();
        } catch (e) { setErr(e.response?.data?.error || 'Apply failed'); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>Apply Payment to Invoice</DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2.5 }}>
                {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{err}</Alert>}
                <Box sx={{ mb: 2.5, p: 2, bgcolor: '#EFF6FF', borderRadius: 2, border: '1px solid #DBEAFE' }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#1565C0', fontWeight: 600, mb: 0.3 }}>PAYMENT BALANCE REMAINING</Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#1565C0' }}>${fmt(remaining)}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#5F6B7C' }}>Ref: {payment?.reference_number || 'N/A'} · {payment?.payment_method}</Typography>
                </Box>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField fullWidth select label="Select Invoice" value={selectedInvoice} onChange={e => setSelectedInvoice(e.target.value)} SelectProps={{ native: false }}>
                            {invoices.map(inv => (
                                <MenuItem key={inv._id} value={inv._id}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                                        <Typography sx={{ fontSize: '0.813rem' }}>{inv.invoice_number} · {inv.customer_id?.customer_name}</Typography>
                                        <Typography sx={{ fontSize: '0.813rem', fontWeight: 700, color: '#B91C1C' }}>${fmt(inv.amount_due)}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Amount to Apply" type="number" inputProps={{ step: 0.01, min: 0.01, max: remaining }} value={applyAmount} onChange={e => setApplyAmount(e.target.value)} helperText={`Max: $${fmt(remaining)}`} />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={onClose} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                <Button variant="contained" onClick={handleApply} disabled={loading} sx={{ fontWeight: 700 }}>
                    {loading ? 'Applying...' : 'Apply Payment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Payment Detail Drawer ─────────────────────────────────────────────── */
const PaymentDetailDrawer = ({ open, onClose, payment, companyId, onApply }) => {
    const { get } = useApi();
    const [applications, setApplications] = useState([]);
    const [showApply, setShowApply] = useState(false);

    useEffect(() => {
        if (open && payment?._id) {
            get(`/${companyId}/payments/${payment._id}/applications`).then(d => setApplications(d.data || [])).catch(() => {});
        }
    }, [open, payment?._id, companyId, get]);

    if (!payment) return null;

    const remaining = toNum(payment.amount) - (applications.reduce((s, a) => s + toNum(a.amount_applied), 0));

    return (
        <>
            <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100vw', md: 520 }, bgcolor: '#FAFBFC' } }}>
                <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E8ECF0', p: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1A2332' }}>Payment Detail</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 0.3 }}>{payment.reference_number || 'No reference'} · {payment.payment_method}</Typography>
                    </Box>
                    <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
                </Box>

                <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F0F2F5', px: 2.5, py: 1.5 }}>
                    <Button size="small" variant="contained" startIcon={<LinkRoundedIcon sx={{ fontSize: 15 }} />} onClick={() => setShowApply(true)} disabled={remaining <= 0} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                        Apply to Invoice
                    </Button>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    {/* Payment info */}
                    <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', p: 2.5, mb: 2 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: '#1A2332' }}>Payment Information</Typography>
                        <Grid container spacing={1.5}>
                            {[
                                ['Type', payment.payment_type],
                                ['Method', payment.payment_method],
                                ['Date', new Date(payment.payment_date).toLocaleDateString()],
                                ['Reference', payment.reference_number || '—'],
                                ['Currency', payment.currency],
                                ['Bank Account', payment.bank_account || '—'],
                            ].map(([label, value]) => (
                                <Grid item xs={6} key={label}>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.2 }}>{label}</Typography>
                                    <Typography sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1A2332' }}>{value}</Typography>
                                </Grid>
                            ))}
                        </Grid>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, mb: 0.2 }}>TOTAL AMOUNT</Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#1A2332' }}>${fmt(payment.amount)}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, mb: 0.2 }}>REMAINING</Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: remaining > 0 ? '#B45309' : '#15803D' }}>${fmt(remaining)}</Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Applications */}
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332', mb: 1 }}>Applied to Invoices</Typography>
                    <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
                        {applications.length === 0 ? (
                            <Box sx={{ py: 3, textAlign: 'center', color: '#94A3B8', fontSize: '0.813rem' }}>
                                No applications yet. Use "Apply to Invoice" to link this payment.
                            </Box>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Invoice #</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell align="right">Applied</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {applications.map((a, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell sx={{ fontWeight: 600, color: '#1565C0', fontSize: '0.813rem' }}>{a.invoice_id?.invoice_number || '—'}</TableCell>
                                            <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{new Date(a.applied_date || a.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem', color: '#15803D' }}>${fmt(a.amount_applied)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Box>

                    {payment.notes && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E8ECF0' }}>
                            <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, mb: 0.5 }}>NOTES</Typography>
                            <Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{payment.notes}</Typography>
                        </Box>
                    )}
                </Box>
            </Drawer>

            <ApplyPaymentDialog
                open={showApply}
                onClose={() => setShowApply(false)}
                companyId={companyId}
                payment={payment}
                onSuccess={() => {
                    setShowApply(false);
                    get(`/${companyId}/payments/${payment._id}/applications`).then(d => setApplications(d.data || [])).catch(() => {});
                    onApply();
                }}
            />
        </>
    );
};

/* ── Main Payments ─────────────────────────────────────────────────────── */
const Payments = () => {
    const { selectedCompanyId } = useAuth();
    const { get } = useApi();
    const [payments, setPayments] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState(null);
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');

    const fetchPayments = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const data = await get(`/${selectedCompanyId}/payments?skip=${page * rowsPerPage}&limit=${rowsPerPage}`);
            setPayments(data.data || []);
            setTotal(data.pagination?.total || 0);
        } catch {}
    }, [selectedCompanyId, page, rowsPerPage, get]);

    useEffect(() => { fetchPayments(); }, [fetchPayments]);

    const exportCSV = () => {
        const rows = [['Date', 'Type', 'Method', 'Reference', 'Currency', 'Amount', 'Applied'], ...payments.map(p => [new Date(p.payment_date).toLocaleDateString(), p.payment_type, p.payment_method, p.reference_number || '', p.currency, Number(p.amount).toFixed(2), p.is_applied ? 'Yes' : 'No'])];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `Payments_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    const totalIn = payments.filter(p => p.payment_type === 'Customer Payment').reduce((s, p) => s + toNum(p.amount), 0);
    const totalOut = payments.filter(p => p.payment_type === 'Vendor Payment').reduce((s, p) => s + toNum(p.amount), 0);
    const unapplied = payments.filter(p => !p.is_applied).reduce((s, p) => s + toNum(p.amount), 0);

    const displayed = payments.filter(p => {
        const matchType = !typeFilter || p.payment_type === typeFilter;
        const matchSearch = !search || p.reference_number?.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
    });

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Payments</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>Record, track and apply customer and vendor payments</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={exportCSV} sx={{ fontWeight: 600, fontSize: '0.813rem', color: '#5F6B7C', borderColor: '#E8ECF0' }}>Export CSV</Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setShowForm(true)} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Record Payment</Button>
                </Stack>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                {[
                    { label: 'Cash In (Customer)', value: `$${fmt(totalIn)}`, color: '#15803D', bg: '#F0FDF4' },
                    { label: 'Cash Out (Vendor)', value: `$${fmt(totalOut)}`, color: '#B91C1C', bg: '#FEF2F2' },
                    { label: 'Unapplied Balance', value: `$${fmt(unapplied)}`, color: '#B45309', bg: '#FFFBEB' },
                    { label: 'Total Records', value: total, color: '#1565C0', bg: '#EFF6FF' },
                ].map(s => (
                    <Grid item xs={12} sm={6} lg={3} key={s.label}>
                        <Card sx={{ border: 'none' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Box sx={{ bgcolor: s.bg, borderRadius: 1.5, p: 0.5 }}>
                                        <PaymentsRoundedIcon sx={{ fontSize: 16, color: s.color }} />
                                    </Box>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>{s.label}</Typography>
                                </Box>
                                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.value}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5', flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: 2, px: 1.5, py: 0.75, flex: 1, minWidth: 180, maxWidth: 320 }}>
                            <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 18, mr: 1 }} />
                            <InputBase placeholder="Search by reference..." value={search} onChange={e => setSearch(e.target.value)} sx={{ fontSize: '0.813rem', color: '#1A2332', flex: 1 }} />
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <Select value={typeFilter} displayEmpty onChange={e => setTypeFilter(e.target.value)} renderValue={v => v || 'All Types'} sx={{ fontSize: '0.813rem', bgcolor: '#F0F2F5', '& fieldset': { border: 'none' }, borderRadius: 2 }} startAdornment={<FilterListRoundedIcon sx={{ fontSize: 16, mr: 0.5, color: '#94A3B8' }} />}>
                                <MenuItem value="" sx={{ fontSize: '0.813rem' }}>All Types</MenuItem>
                                <MenuItem value="Customer Payment" sx={{ fontSize: '0.813rem' }}>Customer Payment</MenuItem>
                                <MenuItem value="Vendor Payment" sx={{ fontSize: '0.813rem' }}>Vendor Payment</MenuItem>
                            </Select>
                        </FormControl>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', ml: 'auto' }}>{total} total records</Typography>
                    </Box>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Method</TableCell>
                                <TableCell>Reference</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayed.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>No payments recorded yet.</TableCell></TableRow>
                            ) : displayed.map(p => (
                                <TableRow key={p._id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(p)}>
                                    <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: p.payment_type === 'Customer Payment' ? '#EFF6FF' : '#FAF5FF' }}>
                                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: p.payment_type === 'Customer Payment' ? '#1565C0' : '#7C3AED' }}>{p.payment_type}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <Box sx={{ color: '#94A3B8' }}>{METHOD_ICON[p.payment_method] || <PaymentsRoundedIcon sx={{ fontSize: 14 }} />}</Box>
                                            <Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{p.payment_method}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C', fontFamily: 'monospace' }}>{p.reference_number || '—'}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332' }}>
                                        {p.currency} {fmt(p.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: p.is_applied ? '#F0FDF4' : '#FFFBEB' }}>
                                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: p.is_applied ? '#15803D' : '#B45309' }}>{p.is_applied ? 'Applied' : 'Unapplied'}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                                        <Tooltip title="View & Apply">
                                            <IconButton size="small" onClick={() => setSelected(p)} sx={{ color: '#1565C0', bgcolor: '#EFF6FF', '&:hover': { bgcolor: '#DBEAFE' }, borderRadius: 1.5 }}>
                                                <ReceiptLongRoundedIcon sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Divider />
                    <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }} rowsPerPageOptions={[10, 20, 50]} />
                </CardContent>
            </Card>

            {/* Record Payment Dialog */}
            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>Record Payment</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    <PaymentForm companyId={selectedCompanyId} onSuccess={() => { setShowForm(false); fetchPayments(); }} onCancel={() => setShowForm(false)} />
                </DialogContent>
            </Dialog>

            {/* Payment Detail Drawer */}
            <PaymentDetailDrawer
                open={Boolean(selected)}
                onClose={() => setSelected(null)}
                payment={selected}
                companyId={selectedCompanyId}
                onApply={fetchPayments}
            />
        </Box>
    );
};

export default Payments;
