import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, TextField, Drawer, Tabs, Tab,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, IconButton, Tooltip, Pagination,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PostAddRoundedIcon from '@mui/icons-material/PostAddRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { toNum, fmtCurrency } from '../utils/numbers';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_COLORS = { Draft: 'default', Posted: 'info', Applied: 'success', Void: 'error' };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const emptyForm = {
    vendor_id: '',
    bill_id: '',
    reason: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }],
    notes: '',
};

export default function DebitNotes() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [notes, setNotes] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 20;
    const [vendors, setVendors] = useState([]);
    const [bills, setBills] = useState([]);
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
        const [dnRes, vendorRes] = await Promise.all([
            get(`/${selectedCompanyId}/procurement/debit-notes?${params}`),
            get(`/${selectedCompanyId}/procurement/vendors`),
        ]);
        if (dnRes?.data) { setNotes(dnRes.data); setTotal(dnRes.pagination?.total || 0); }
        if (vendorRes?.data) setVendors(vendorRes.data);
    }, [selectedCompanyId, page, statusFilter, get]);

    useEffect(() => { load(); }, [load]);

    const loadBills = useCallback(async (vendorId) => {
        if (!vendorId) { setBills([]); return; }
        const res = await get(`/${selectedCompanyId}/procurement/bills?vendor_id=${vendorId}`);
        if (res?.data) setBills(res.data);
    }, [selectedCompanyId, get]);

    const filtered = notes.filter(n =>
        !search || n.debit_note_number?.toLowerCase().includes(search.toLowerCase())
    );

    const calcTotals = (lines) => {
        const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity || 0) * parseFloat(l.unit_price || 0)), 0);
        const tax = lines.reduce((s, l) => s + ((parseFloat(l.quantity || 0) * parseFloat(l.unit_price || 0)) * (parseFloat(l.tax_rate || 0) / 100)), 0);
        return { subtotal, tax, total: subtotal + tax };
    };

    const handleCreate = async () => {
        setSaving(true);
        const { subtotal, tax, total } = calcTotals(form.line_items);
        const res = await post(`/${selectedCompanyId}/procurement/debit-notes`, {
            ...form,
            subtotal,
            tax_amount: tax,
            total_amount: total,
        });
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); setBills([]); load(); }
    };

    const handlePost = async (id) => {
        await post(`/${selectedCompanyId}/procurement/debit-notes/${id}/post`);
        load();
    };

    const handleVoid = async (id) => {
        await post(`/${selectedCompanyId}/procurement/debit-notes/${id}/void`);
        load();
    };

    const requestVoid = (id) => {
        setPendingAction(() => () => handleVoid(id));
        setConfirmOpen(true);
    };

    const setLineField = (idx, field, val) => setForm(f => {
        const lines = [...f.line_items];
        lines[idx] = { ...lines[idx], [field]: val };
        return { ...f, line_items: lines };
    });

    const { subtotal, tax, total: formTotal } = calcTotals(form.line_items);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Debit Notes</Typography>
                    <Typography variant="body2" color="text.secondary">Manage vendor debit notes and purchase returns</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>New Debit Note</Button>
            </Box>

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Search…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                    sx={{ width: 240 }}
                />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                        <MenuItem value="">All</MenuItem>
                        {['Draft', 'Posted', 'Applied', 'Void'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{total} records</Typography>
            </Paper>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>Number</b></TableCell>
                            <TableCell><b>Vendor</b></TableCell>
                            <TableCell><b>Date</b></TableCell>
                            <TableCell><b>Reason</b></TableCell>
                            <TableCell align="right"><b>Total</b></TableCell>
                            <TableCell align="right"><b>Remaining</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
                            <TableCell><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !notes.length ? (
                            <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No debit notes found</TableCell></TableRow>
                        ) : filtered.map(dn => (
                            <TableRow key={dn._id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelected(dn); setDrawerOpen(true); }}>
                                <TableCell><Typography variant="body2" fontWeight={600} color="primary">{dn.debit_note_number}</Typography></TableCell>
                                <TableCell>{dn.vendor_id?.vendor_name || '—'}</TableCell>
                                <TableCell>{fmtDate(dn.debit_note_date || dn.created_at)}</TableCell>
                                <TableCell sx={{ maxWidth: 200 }}><Typography variant="caption" noWrap>{dn.reason}</Typography></TableCell>
                                <TableCell align="right">{fmtCurrency(dn.total_amount)}</TableCell>
                                <TableCell align="right" sx={{ color: toNum(dn.amount_remaining) > 0 ? 'success.main' : 'text.secondary' }}>
                                    {fmtCurrency(dn.amount_remaining)}
                                </TableCell>
                                <TableCell><Chip label={dn.status} size="small" color={STATUS_COLORS[dn.status]} /></TableCell>
                                <TableCell onClick={e => e.stopPropagation()}>
                                    <Stack direction="row" spacing={0.5}>
                                        {dn.status === 'Draft' && (
                                            <Tooltip title="Post">
                                                <IconButton size="small" color="primary" onClick={() => handlePost(dn._id)}>
                                                    <PostAddRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {dn.status === 'Posted' && (
                                            <Tooltip title="Void">
                                                <IconButton size="small" color="error" onClick={() => requestVoid(dn._id)}>
                                                    <BlockRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
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
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: 560 } } }}>
                {selected && (
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" fontWeight={700}>{selected.debit_note_number}</Typography>
                                <Typography variant="body2" color="text.secondary">{selected.vendor_id?.vendor_name}</Typography>
                            </Box>
                            <Chip label={selected.status} color={STATUS_COLORS[selected.status]} />
                        </Box>
                        <Stack spacing={1.5}>
                            {[
                                ['Date', fmtDate(selected.debit_note_date || selected.created_at)],
                                ['Reason', selected.reason],
                                ['Linked Bill', selected.bill_id?.invoice_number || '—'],
                                ['Subtotal', fmtCurrency(selected.subtotal)],
                                ['Tax', fmtCurrency(selected.tax_amount)],
                                ['Total', fmtCurrency(selected.total_amount)],
                                ['Applied', fmtCurrency(selected.amount_applied)],
                                ['Remaining', fmtCurrency(selected.amount_remaining)],
                            ].map(([l, v]) => (
                                <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">{l}</Typography>
                                    <Typography variant="body2" fontWeight={500}>{v}</Typography>
                                </Box>
                            ))}
                        </Stack>
                        {selected.notes && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>Notes</Typography>
                                <Typography variant="body2">{selected.notes}</Typography>
                            </Box>
                        )}
                        {selected.status === 'Draft' && (
                            <Button sx={{ mt: 3 }} variant="contained" startIcon={<PostAddRoundedIcon />} onClick={() => handlePost(selected._id)}>
                                Post Debit Note
                            </Button>
                        )}
                    </Box>
                )}
            </Drawer>

            <ConfirmDialog
                open={confirmOpen}
                title="Void Debit Note"
                message="Voiding this debit note is irreversible. Are you sure?"
                confirmLabel="Void"
                confirmColor="error"
                onConfirm={() => { setConfirmOpen(false); pendingAction && pendingAction(); }}
                onCancel={() => setConfirmOpen(false)}
            />

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setForm(emptyForm); setBills([]); }} maxWidth="md" fullWidth>
                <DialogTitle>New Debit Note</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Vendor *</InputLabel>
                                <Select
                                    label="Vendor *"
                                    value={form.vendor_id}
                                    onChange={e => {
                                        setForm(f => ({ ...f, vendor_id: e.target.value, bill_id: '' }));
                                        loadBills(e.target.value);
                                    }}
                                >
                                    {vendors.map(v => <MenuItem key={v._id} value={v._id}>{v.vendor_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Linked Bill (optional)</InputLabel>
                                <Select
                                    label="Linked Bill (optional)"
                                    value={form.bill_id}
                                    onChange={e => setForm(f => ({ ...f, bill_id: e.target.value }))}
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {bills.map(b => (
                                        <MenuItem key={b._id} value={b._id}>
                                            {b.invoice_number} — {fmtCurrency(b.total_amount)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <TextField
                            size="small"
                            label="Reason *"
                            fullWidth
                            value={form.reason}
                            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                        />

                        <Typography variant="subtitle2" fontWeight={600}>Line Items</Typography>
                        {form.line_items.map((line, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: 1 }}>
                                <TextField size="small" label="Description" value={line.description} onChange={e => setLineField(i, 'description', e.target.value)} />
                                <TextField size="small" label="Qty" type="number" value={line.quantity} onChange={e => setLineField(i, 'quantity', e.target.value)} />
                                <TextField size="small" label="Price" type="number" value={line.unit_price} onChange={e => setLineField(i, 'unit_price', e.target.value)} />
                                <TextField size="small" label="Tax %" type="number" value={line.tax_rate} onChange={e => setLineField(i, 'tax_rate', e.target.value)} />
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={() => setForm(f => ({ ...f, line_items: f.line_items.filter((_, j) => j !== i) }))}
                                    disabled={form.line_items.length === 1}
                                >
                                    ✕
                                </Button>
                            </Box>
                        ))}
                        <Button
                            size="small"
                            onClick={() => setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }))}
                        >
                            + Add Line
                        </Button>

                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2">Subtotal: {fmtCurrency(subtotal)} | Tax: {fmtCurrency(tax)}</Typography>
                            <Typography variant="h6">Total: {fmtCurrency(formTotal)}</Typography>
                        </Box>

                        <TextField
                            size="small"
                            label="Notes"
                            multiline
                            rows={2}
                            fullWidth
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCreateOpen(false); setForm(emptyForm); setBills([]); }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={saving || !form.vendor_id || !form.reason}
                    >
                        {saving ? <CircularProgress size={20} /> : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
