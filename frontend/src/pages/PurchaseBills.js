import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Drawer, TextField,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, IconButton, Tooltip, Pagination, Divider,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PostAddRoundedIcon from '@mui/icons-material/PostAddRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { toNum, fmtCurrency } from '../utils/numbers';
import FileAttachments from '../components/FileAttachments';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_COLORS = { Draft: 'default', Posted: 'info', Paid: 'success', 'Partially Paid': 'warning', Cancelled: 'error' };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const emptyForm = { vendor_id: '', purchase_order_id: '', invoice_number: '', invoice_date: '', due_date: '', line_items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }], notes: '' };

export default function PurchaseBills() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [bills, setBills] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 20;
    const [vendors, setVendors] = useState([]);
    const [pos, setPOs] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams({ skip: (page - 1) * limit, limit });
        if (statusFilter) params.set('status', statusFilter);
        const [billRes, vendRes] = await Promise.all([
            get(`/${selectedCompanyId}/procurement/bills?${params}`),
            get(`/${selectedCompanyId}/procurement/vendors`),
        ]);
        if (billRes?.data) { setBills(billRes.data); setTotal(billRes.pagination?.total || 0); }
        if (vendRes?.data) setVendors(vendRes.data);
    }, [selectedCompanyId, page, statusFilter, get]);

    useEffect(() => { load(); }, [load]);

    const loadPOs = useCallback(async (vendorId) => {
        if (!vendorId) return;
        const res = await get(`/${selectedCompanyId}/procurement/po?vendor_id=${vendorId}`);
        if (res?.data) setPOs(res.data);
    }, [selectedCompanyId, get]);

    const filtered = bills.filter(b =>
        !search || b.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        b.vendor_id?.vendor_name?.toLowerCase().includes(search.toLowerCase())
    );

    const calcSubtotal = (lines) => lines.reduce((s, l) => s + (parseFloat(l.quantity || 0) * parseFloat(l.unit_price || 0)), 0);
    const calcTax = (lines) => lines.reduce((s, l) => s + ((parseFloat(l.quantity || 0) * parseFloat(l.unit_price || 0)) * (parseFloat(l.tax_rate || 0) / 100)), 0);

    const handleCreate = async () => {
        setSaving(true);
        const subtotal = calcSubtotal(form.line_items);
        const tax_amount = calcTax(form.line_items);
        const res = await post(`/${selectedCompanyId}/procurement/bills`, { ...form, subtotal, tax_amount });
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); load(); }
    };

    const handlePost = async (id) => {
        await post(`/${selectedCompanyId}/procurement/bills/${id}/post`);
        load();
        const updated = await get(`/${selectedCompanyId}/procurement/bills/${id}`);
        if (updated?.data) setSelected(updated.data);
    };

    const requestPost = (id) => {
        setPendingAction(() => () => handlePost(id));
        setConfirmOpen(true);
    };

    const setLineField = (idx, field, val) => setForm(f => {
        const lines = [...f.line_items];
        lines[idx] = { ...lines[idx], [field]: val };
        return { ...f, line_items: lines };
    });

    const subtotal = calcSubtotal(form.line_items);
    const tax = calcTax(form.line_items);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Purchase Bills</Typography>
                    <Typography variant="body2" color="text.secondary">Track and post vendor invoices / bills</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>New Bill</Button>
            </Box>

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ width: 240 }} />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                        <MenuItem value="">All</MenuItem>
                        {['Draft', 'Posted', 'Partially Paid', 'Paid'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{total} records</Typography>
            </Paper>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>Bill #</b></TableCell>
                            <TableCell><b>Vendor</b></TableCell>
                            <TableCell><b>Invoice Date</b></TableCell>
                            <TableCell><b>Due Date</b></TableCell>
                            <TableCell align="right"><b>Total</b></TableCell>
                            <TableCell align="right"><b>Amount Due</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
                            <TableCell><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !bills.length ? (
                            <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No bills found</TableCell></TableRow>
                        ) : filtered.map(b => (
                            <TableRow key={b._id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelected(b); setDrawerOpen(true); }}>
                                <TableCell><Typography variant="body2" fontWeight={600} color="primary">{b.bill_number || b.invoice_number}</Typography></TableCell>
                                <TableCell>{b.vendor_id?.vendor_name}</TableCell>
                                <TableCell>{fmtDate(b.bill_date || b.invoice_date)}</TableCell>
                                <TableCell>{fmtDate(b.due_date)}</TableCell>
                                <TableCell align="right">{fmtCurrency(b.total_amount)}</TableCell>
                                <TableCell align="right" sx={{ color: toNum(b.amount_due) > 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                                    {fmtCurrency(b.amount_due)}
                                </TableCell>
                                <TableCell><Chip label={b.status} size="small" color={STATUS_COLORS[b.status]} /></TableCell>
                                <TableCell onClick={e => e.stopPropagation()}>
                                    {b.status === 'Draft' && (
                                        <Tooltip title="Post to GL">
                                            <IconButton size="small" color="primary" onClick={() => requestPost(b._id)}><PostAddRoundedIcon fontSize="small" /></IconButton>
                                        </Tooltip>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {total > limit && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination count={Math.ceil(total / limit)} page={page} onChange={(_, v) => setPage(v)} color="primary" />
                </Box>
            )}

            {/* Detail Drawer */}
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: 520 } } }}>
                {selected && (
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" fontWeight={700}>{selected.bill_number || selected.invoice_number}</Typography>
                                <Typography variant="body2" color="text.secondary">{selected.vendor_id?.vendor_name}</Typography>
                            </Box>
                            <Chip label={selected.status} color={STATUS_COLORS[selected.status]} />
                        </Box>
                        <Stack spacing={1.5}>
                            {[
                                ['Invoice Date', fmtDate(selected.bill_date || selected.invoice_date)],
                                ['Due Date', fmtDate(selected.due_date)],
                                ['Subtotal', fmtCurrency(selected.subtotal)],
                                ['Tax', fmtCurrency(selected.tax_amount)],
                                ['Total', fmtCurrency(selected.total_amount)],
                                ['Amount Due', fmtCurrency(selected.amount_due)],
                            ].map(([l, v]) => (
                                <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">{l}</Typography>
                                    <Typography variant="body2" fontWeight={500}>{v}</Typography>
                                </Box>
                            ))}
                        </Stack>
                        <Box sx={{ mt: 2 }}>
                            <FileAttachments attachments={selected.attachments || []} readonly />
                        </Box>
                        {selected.status === 'Draft' && (
                            <Button sx={{ mt: 3 }} variant="contained" startIcon={<PostAddRoundedIcon />} onClick={() => requestPost(selected._id)}>Post to GL</Button>
                        )}
                    </Box>
                )}
            </Drawer>

            <ConfirmDialog
                open={confirmOpen}
                title="Post Bill to GL"
                message="Posting to GL is irreversible. The bill will be locked and journal entries will be created. Proceed?"
                confirmLabel="Post to GL"
                confirmColor="primary"
                onConfirm={() => { setConfirmOpen(false); pendingAction && pendingAction(); }}
                onCancel={() => setConfirmOpen(false)}
            />

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>New Purchase Bill</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Vendor *</InputLabel>
                                <Select label="Vendor *" value={form.vendor_id} onChange={e => { setForm(f => ({ ...f, vendor_id: e.target.value })); loadPOs(e.target.value); }}>
                                    {vendors.map(v => <MenuItem key={v._id} value={v._id}>{v.vendor_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Linked PO (optional)</InputLabel>
                                <Select label="Linked PO (optional)" value={form.purchase_order_id} onChange={e => setForm(f => ({ ...f, purchase_order_id: e.target.value }))}>
                                    <MenuItem value="">None</MenuItem>
                                    {pos.map(p => <MenuItem key={p._id} value={p._id}>{p.po_number}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField size="small" label="Vendor Invoice #" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
                            <TextField size="small" type="date" label="Invoice Date" InputLabelProps={{ shrink: true }} value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
                            <TextField size="small" type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                        </Box>

                        <Typography variant="subtitle2" fontWeight={600}>Line Items</Typography>
                        {form.line_items.map((line, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: 1 }}>
                                <TextField size="small" label="Description" value={line.description} onChange={e => setLineField(i, 'description', e.target.value)} />
                                <TextField size="small" label="Qty" type="number" value={line.quantity} onChange={e => setLineField(i, 'quantity', e.target.value)} />
                                <TextField size="small" label="Unit Price" type="number" value={line.unit_price} onChange={e => setLineField(i, 'unit_price', e.target.value)} />
                                <TextField size="small" label="Tax %" type="number" value={line.tax_rate} onChange={e => setLineField(i, 'tax_rate', e.target.value)} />
                                <Button size="small" color="error" onClick={() => setForm(f => ({ ...f, line_items: f.line_items.filter((_, j) => j !== i) }))}>✕</Button>
                            </Box>
                        ))}
                        <Button size="small" onClick={() => setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }))}>+ Add Line</Button>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2">Subtotal: {fmtCurrency(subtotal)} | Tax: {fmtCurrency(tax)}</Typography>
                            <Typography variant="h6">Total: {fmtCurrency(subtotal + tax)}</Typography>
                        </Box>
                        <TextField size="small" label="Notes" multiline rows={2} fullWidth value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                        <Box>
                            <FileAttachments attachments={form.attachments || []}
                                onAdd={att => setForm(f => ({ ...f, attachments: [...(f.attachments || []), att] }))}
                                onRemove={i => setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }))}
                            />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving || !form.vendor_id}>
                        {saving ? <CircularProgress size={20} /> : 'Create Bill'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
