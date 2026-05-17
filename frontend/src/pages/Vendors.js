import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, TablePagination, Stack, Avatar, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Grid, Alert, InputBase, Divider,
    Drawer, IconButton, CircularProgress,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import { useForm } from 'react-hook-form';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import { exportToCSV } from '../utils/export';
import { fmtCurrency } from '../utils/numbers';

const AVATAR_COLORS = ['#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#1565C0'];
const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const startOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const todayStr = () => new Date().toISOString().slice(0, 10);

/* ── Vendor Form ────────────────────────────────────────────────────────── */
const VendorForm = ({ companyId, onSuccess, onCancel }) => {
    const { post, loading, error } = useApi();
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        try { await post(`/${companyId}/procurement/vendors`, data); onSuccess(); } catch {}
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth required label="Vendor Name" {...register('vendor_name', { required: true })} error={!!errors.vendor_name} helperText={errors.vendor_name && 'Required'} />
                </Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Email" type="email" {...register('email')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Tax ID" {...register('tax_id')} /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Address" {...register('address')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="City" {...register('city')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="State" {...register('state')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Country" {...register('country')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Payment Terms (days)" type="number" defaultValue={30} {...register('payment_terms_days', { valueAsNumber: true })} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Currency" defaultValue="USD" {...register('currency')} /></Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button onClick={onCancel} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 700 }}>
                    {loading ? 'Saving...' : 'Save Vendor'}
                </Button>
            </Box>
        </Box>
    );
};

/* ── Vendor Statement Dialog ────────────────────────────────────────────── */
const VendorStatementDialog = ({ open, onClose, vendorId, companyId }) => {
    const { get } = useApi();
    const [fromDate, setFromDate] = useState(startOfMonth());
    const [toDate, setToDate] = useState(todayStr());
    const [statement, setStatement] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) { setStatement(null); setError(''); }
        else { setFromDate(startOfMonth()); setToDate(todayStr()); }
    }, [open]);

    const loadStatement = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (fromDate) params.append('date_from', fromDate);
            if (toDate) params.append('date_to', toDate);
            const data = await get(`/${companyId}/procurement/vendors/${vendorId}/statement?${params}`);
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

    const TYPE_STYLE = {
        Bill: { bg: '#EFF6FF', color: '#1565C0' },
        Payment: { bg: '#F0FDF4', color: '#15803D' },
        'Debit Note': { bg: '#FAF5FF', color: '#7C3AED' },
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssessmentRoundedIcon sx={{ fontSize: 20, color: '#7C3AED' }} />
                    Vendor Statement
                    {statement?.vendor && (
                        <Typography component="span" sx={{ fontSize: '0.813rem', color: '#94A3B8', fontWeight: 500 }}>
                            — {statement.vendor.vendor_name}
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
                    <Button variant="contained" onClick={loadStatement} disabled={loading} sx={{ fontWeight: 700, fontSize: '0.813rem', minWidth: 130 }}>
                        {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Load Statement'}
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
                        Select a date range and click Load Statement to view.
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
                                        {statement.transactions.map((t, i) => {
                                            const ts = TYPE_STYLE[t.type] || { bg: '#F1F5F9', color: '#5F6B7C' };
                                            return (
                                                <TableRow key={i} hover>
                                                    <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C', whiteSpace: 'nowrap' }}>{new Date(t.date).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'inline-flex', px: 1, py: 0.2, borderRadius: 1, bgcolor: ts.bg }}>
                                                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: ts.color }}>{t.type}</Typography>
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
                                            );
                                        })}
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

/* ── Vendor Detail Drawer ───────────────────────────────────────────────── */
const VendorDetailDrawer = ({ open, onClose, vendor, companyId }) => {
    const [showStatement, setShowStatement] = useState(false);

    useEffect(() => {
        if (!open) setShowStatement(false);
    }, [open]);

    if (!vendor) return null;

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100vw', md: 480 }, bgcolor: '#FAFBFC' } }}>
            {/* Header */}
            <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E8ECF0', p: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: getColor(vendor.vendor_name), fontWeight: 800, fontSize: '1rem' }}>
                        {vendor.vendor_name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1A2332' }}>{vendor.vendor_name}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{vendor.vendor_code} · Net {vendor.payment_terms_days}d</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<AssessmentRoundedIcon sx={{ fontSize: 14 }} />} onClick={() => setShowStatement(true)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#7C3AED', borderColor: '#E9D5FF' }}>
                        Statement
                    </Button>
                    <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
                </Box>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
                {/* Contact info */}
                <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', p: 2.5, mb: 2 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: '#1A2332' }}>Contact Information</Typography>
                    <Stack spacing={1.5}>
                        {vendor.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MailRoundedIcon sx={{ fontSize: 16, color: '#1565C0' }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>EMAIL</Typography>
                                    <Typography sx={{ fontSize: '0.813rem', color: '#1A2332' }}>{vendor.email}</Typography>
                                </Box>
                            </Box>
                        )}
                        {vendor.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <PhoneRoundedIcon sx={{ fontSize: 16, color: '#15803D' }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>PHONE</Typography>
                                    <Typography sx={{ fontSize: '0.813rem', color: '#1A2332' }}>{vendor.phone}</Typography>
                                </Box>
                            </Box>
                        )}
                        {(vendor.address || vendor.city) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <LocalShippingRoundedIcon sx={{ fontSize: 16, color: '#7C3AED' }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>ADDRESS</Typography>
                                    <Typography sx={{ fontSize: '0.813rem', color: '#1A2332' }}>
                                        {[vendor.address, vendor.city, vendor.state, vendor.country].filter(Boolean).join(', ')}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Stack>
                </Box>

                {/* Account details */}
                <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: '#1A2332' }}>Account Details</Typography>
                    <Grid container spacing={1.5}>
                        {[
                            ['Vendor Code', vendor.vendor_code],
                            ['Status', vendor.vendor_status],
                            ['Tax ID', vendor.tax_id || '—'],
                            ['Currency', vendor.currency || 'USD'],
                            ['Payment Terms', `Net ${vendor.payment_terms_days} days`],
                            ['Since', vendor.created_at ? new Date(vendor.created_at).toLocaleDateString() : '—'],
                        ].map(([label, value]) => (
                            <Grid item xs={6} key={label}>
                                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.2 }}>{label}</Typography>
                                <Typography sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1A2332' }}>{value}</Typography>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Box>

            <VendorStatementDialog
                open={showStatement}
                onClose={() => setShowStatement(false)}
                vendorId={vendor._id}
                companyId={companyId}
            />
        </Drawer>
    );
};

/* ── Main Vendors ───────────────────────────────────────────────────────── */
const Vendors = () => {
    const { selectedCompanyId } = useAuth();
    const { get } = useApi();
    const [vendors, setVendors] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [showForm, setShowForm] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);

    const fetchVendors = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const data = await get(`/${selectedCompanyId}/procurement/vendors?skip=${page * rowsPerPage}&limit=${rowsPerPage}`);
            setVendors(data.data || []);
            setTotal(data.pagination?.total || 0);
        } catch {}
    }, [selectedCompanyId, page, rowsPerPage, get]);

    useEffect(() => { fetchVendors(); }, [fetchVendors]);

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Vendors</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>Manage supplier accounts and procurement contacts</Typography>
            </Box>

            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: 2, px: 1.5, py: 0.75, flex: 1, maxWidth: 360 }}>
                            <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 18, mr: 1 }} />
                            <InputBase placeholder="Search vendors..." sx={{ fontSize: '0.813rem', color: '#1A2332', flex: 1 }} />
                        </Box>
                        <Box sx={{ flex: 1 }} />
                        <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => exportToCSV(vendors.map(v => ({ Name: v.vendor_name, Email: v.email, Phone: v.phone, City: v.city, Country: v.country, Status: v.vendor_status })), 'vendors.csv')} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>
                            Export CSV
                        </Button>
                        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setShowForm(true)} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>
                            New Vendor
                        </Button>
                    </Box>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Vendor</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell>Payment Terms</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vendors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>
                                        No vendors yet. Add your first vendor to get started.
                                    </TableCell>
                                </TableRow>
                            ) : vendors.map(v => (
                                <TableRow key={v._id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedVendor(v)}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: getColor(v.vendor_name), fontSize: '0.75rem', fontWeight: 700 }}>
                                                {v.vendor_name?.[0]?.toUpperCase()}
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332' }}>{v.vendor_name}</Typography>
                                                {v.city && <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>{v.city}{v.country ? `, ${v.country}` : ''}</Typography>}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C', fontFamily: 'monospace' }}>{v.vendor_code}</TableCell>
                                    <TableCell>
                                        <Stack spacing={0.3}>
                                            {v.email && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <MailRoundedIcon sx={{ fontSize: 12, color: '#94A3B8' }} />
                                                    <Typography sx={{ fontSize: '0.75rem', color: '#5F6B7C' }}>{v.email}</Typography>
                                                </Box>
                                            )}
                                            {v.phone && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <PhoneRoundedIcon sx={{ fontSize: 12, color: '#94A3B8' }} />
                                                    <Typography sx={{ fontSize: '0.75rem', color: '#5F6B7C' }}>{v.phone}</Typography>
                                                </Box>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: '#F0F2F5' }}>
                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#5F6B7C' }}>Net {v.payment_terms_days}d</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: v.vendor_status === 'Active' ? '#F0FDF4' : '#F1F5F9' }}>
                                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: v.vendor_status === 'Active' ? '#15803D' : '#64748B' }}>
                                                {v.vendor_status}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Divider />
                    <TablePagination
                        component="div" count={total} page={page}
                        onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
                        rowsPerPageOptions={[10, 20, 50]}
                    />
                </CardContent>
            </Card>

            {/* New Vendor Dialog */}
            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>New Vendor</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    <VendorForm companyId={selectedCompanyId} onSuccess={() => { setShowForm(false); fetchVendors(); }} onCancel={() => setShowForm(false)} />
                </DialogContent>
            </Dialog>

            {/* Vendor Detail Drawer */}
            <VendorDetailDrawer
                open={Boolean(selectedVendor)}
                onClose={() => setSelectedVendor(null)}
                vendor={selectedVendor}
                companyId={selectedCompanyId}
            />
        </Box>
    );
};

export default Vendors;
