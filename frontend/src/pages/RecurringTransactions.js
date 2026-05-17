import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Drawer, TextField,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Divider, Alert, Tabs, Tab, Tooltip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayCircleRoundedIcon from '@mui/icons-material/PlayCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { toNum, fmtCurrency } from '../utils/numbers';

const TYPE_COLORS = { Invoice: 'primary', Bill: 'warning', Journal: 'secondary' };
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
const TYPES = ['Invoice', 'Bill', 'Journal'];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const emptyLineItem = { description: '', quantity: 1, unit_price: '', tax_rate: '' };

const emptyForm = {
    name: '',
    type: 'Invoice',
    frequency: 'Monthly',
    next_run_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    customer_id: '',
    vendor_id: '',
    line_items: [{ ...emptyLineItem }],
    notes: '',
};

export default function RecurringTransactions() {
    const { selectedCompanyId } = useAuth();
    const { get, post, put, del, loading } = useApi();

    const [templates, setTemplates] = useState([]);
    const [typeTab, setTypeTab] = useState('All');
    const [selected, setSelected] = useState(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success');

    const [customers, setCustomers] = useState([]);
    const [vendors, setVendors] = useState([]);

    const showAlert = (msg, severity = 'success') => {
        setAlertMsg(msg);
        setAlertSeverity(severity);
        setTimeout(() => setAlertMsg(''), 4000);
    };

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = typeTab !== 'All' ? `?type=${typeTab}` : '';
        const res = await get(`/${selectedCompanyId}/recurring${params}`);
        if (res?.data) setTemplates(res.data);
    }, [selectedCompanyId, get, typeTab]);

    const loadCustomers = useCallback(async () => {
        if (!selectedCompanyId) return;
        const res = await get(`/${selectedCompanyId}/customers?limit=200`);
        if (res?.data) setCustomers(res.data);
    }, [selectedCompanyId, get]);

    const loadVendors = useCallback(async () => {
        if (!selectedCompanyId) return;
        const res = await get(`/${selectedCompanyId}/vendors?limit=200`);
        if (res?.data) setVendors(res.data);
    }, [selectedCompanyId, get]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadCustomers(); loadVendors(); }, [loadCustomers, loadVendors]);

    const openDetail = async (tmpl) => {
        const res = await get(`/${selectedCompanyId}/recurring/${tmpl._id}`);
        if (res?.data) setSelected(res.data);
    };

    const handleCreate = async () => {
        setSaving(true);
        try {
            const payload = { ...form };
            if (!payload.end_date) delete payload.end_date;
            if (payload.type !== 'Invoice') delete payload.customer_id;
            if (payload.type !== 'Bill') delete payload.vendor_id;
            payload.line_items = payload.line_items.map(li => ({
                ...li,
                quantity: Number(li.quantity) || 1,
                unit_price: Number(li.unit_price) || 0,
                tax_rate: Number(li.tax_rate) || 0,
            }));
            await post(`/${selectedCompanyId}/recurring`, payload);
            setCreateOpen(false);
            setForm(emptyForm);
            showAlert('Template created successfully.');
            load();
        } catch {
            showAlert('Failed to create template.', 'error');
        }
        setSaving(false);
    };

    const handleToggle = async (tmpl) => {
        setActionLoading(true);
        try {
            await post(`/${selectedCompanyId}/recurring/${tmpl._id}/toggle`);
            showAlert(`Template ${tmpl.is_active ? 'paused' : 'resumed'}.`);
            load();
            if (selected?._id === tmpl._id) {
                const res = await get(`/${selectedCompanyId}/recurring/${tmpl._id}`);
                if (res?.data) setSelected(res.data);
            }
        } catch {
            showAlert('Action failed.', 'error');
        }
        setActionLoading(false);
    };

    const handleRun = async (tmpl) => {
        setActionLoading(true);
        try {
            await post(`/${selectedCompanyId}/recurring/${tmpl._id}/run`);
            showAlert('Template run recorded. Next run date updated.');
            load();
            if (selected?._id === tmpl._id) {
                const res = await get(`/${selectedCompanyId}/recurring/${tmpl._id}`);
                if (res?.data) setSelected(res.data);
            }
        } catch {
            showAlert('Run failed.', 'error');
        }
        setActionLoading(false);
    };

    const handleDelete = async (tmpl) => {
        if (!window.confirm(`Delete template "${tmpl.name}"?`)) return;
        setActionLoading(true);
        try {
            await del(`/${selectedCompanyId}/recurring/${tmpl._id}`);
            showAlert('Template deleted.');
            if (selected?._id === tmpl._id) setSelected(null);
            load();
        } catch {
            showAlert('Delete failed.', 'error');
        }
        setActionLoading(false);
    };

    // Line items helpers
    const addLineItem = () => setForm(f => ({ ...f, line_items: [...f.line_items, { ...emptyLineItem }] }));
    const removeLineItem = (idx) => setForm(f => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }));
    const updateLineItem = (idx, field, value) => setForm(f => ({
        ...f,
        line_items: f.line_items.map((li, i) => i === idx ? { ...li, [field]: value } : li),
    }));

    const lineTotal = (li) => (Number(li.quantity) || 0) * (Number(li.unit_price) || 0) * (1 + (Number(li.tax_rate) || 0) / 100);
    const formTotal = form.line_items.reduce((s, li) => s + lineTotal(li), 0);

    return (
        <Box sx={{ p: 3 }}>
            {alertMsg && (
                <Alert severity={alertSeverity} sx={{ mb: 2 }} onClose={() => setAlertMsg('')}>
                    {alertMsg}
                </Alert>
            )}

            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <AutorenewRoundedIcon sx={{ color: '#A78BFA', fontSize: 28 }} />
                        <Typography variant="h5" fontWeight={700}>Recurring Transactions</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Automate repeating invoices, bills, and journals
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => { setForm(emptyForm); setCreateOpen(true); }}
                >
                    New Template
                </Button>
            </Stack>

            {/* Filter Tabs */}
            <Tabs
                value={typeTab}
                onChange={(_, v) => setTypeTab(v)}
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
                {['All', 'Invoice', 'Bill', 'Journal'].map(t => (
                    <Tab key={t} label={t} value={t} />
                ))}
            </Tabs>

            {/* Table */}
            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Frequency</TableCell>
                                <TableCell>Next Run</TableCell>
                                <TableCell>Customer / Vendor</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && templates.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No recurring templates found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                            {templates.map(tmpl => (
                                <TableRow
                                    key={tmpl._id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => openDetail(tmpl)}
                                >
                                    <TableCell sx={{ fontWeight: 600 }}>{tmpl.name}</TableCell>
                                    <TableCell>
                                        <Chip label={tmpl.type} color={TYPE_COLORS[tmpl.type] || 'default'} size="small" />
                                    </TableCell>
                                    <TableCell>{tmpl.frequency}</TableCell>
                                    <TableCell>{fmtDate(tmpl.next_run_date)}</TableCell>
                                    <TableCell>
                                        {tmpl.customer_id?.customer_name || tmpl.vendor_id?.vendor_name || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={tmpl.is_active ? 'Active' : 'Paused'}
                                            color={tmpl.is_active ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            <Tooltip title="Run Now">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        disabled={!tmpl.is_active || actionLoading}
                                                        onClick={() => handleRun(tmpl)}
                                                    >
                                                        <PlayArrowRoundedIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title={tmpl.is_active ? 'Pause' : 'Resume'}>
                                                <IconButton
                                                    size="small"
                                                    color={tmpl.is_active ? 'warning' : 'success'}
                                                    disabled={actionLoading}
                                                    onClick={() => handleToggle(tmpl)}
                                                >
                                                    {tmpl.is_active ? <PauseRoundedIcon fontSize="small" /> : <PlayCircleRoundedIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    disabled={actionLoading}
                                                    onClick={() => handleDelete(tmpl)}
                                                >
                                                    <DeleteRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Detail Drawer */}
            <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)} PaperProps={{ sx: { width: 480, p: 3 } }}>
                {selected && (
                    <>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                            <Typography variant="h6" fontWeight={700}>{selected.name}</Typography>
                            <IconButton onClick={() => setSelected(null)}><CloseRoundedIcon /></IconButton>
                        </Stack>

                        <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip label={selected.type} color={TYPE_COLORS[selected.type] || 'default'} size="small" />
                                <Chip label={selected.is_active ? 'Active' : 'Paused'} color={selected.is_active ? 'success' : 'default'} size="small" />
                                <Chip label={selected.frequency} variant="outlined" size="small" />
                            </Stack>

                            <Divider />

                            <Box>
                                <Typography variant="caption" color="text.secondary">Next Run Date</Typography>
                                <Typography fontWeight={600}>{fmtDate(selected.next_run_date)}</Typography>
                            </Box>
                            {selected.end_date && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">End Date</Typography>
                                    <Typography>{fmtDate(selected.end_date)}</Typography>
                                </Box>
                            )}
                            {selected.customer_id && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Customer</Typography>
                                    <Typography>{selected.customer_id.customer_name}</Typography>
                                </Box>
                            )}
                            {selected.vendor_id && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Vendor</Typography>
                                    <Typography>{selected.vendor_id.vendor_name}</Typography>
                                </Box>
                            )}
                            {selected.notes && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                                    <Typography variant="body2">{selected.notes}</Typography>
                                </Box>
                            )}

                            <Divider />

                            <Typography variant="subtitle2" fontWeight={700}>Line Items</Typography>
                            {selected.line_items?.length === 0 && (
                                <Typography variant="body2" color="text.secondary">No line items.</Typography>
                            )}
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Description</TableCell>
                                            <TableCell align="right">Qty</TableCell>
                                            <TableCell align="right">Unit Price</TableCell>
                                            <TableCell align="right">Tax %</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selected.line_items?.map((li, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{li.description || '—'}</TableCell>
                                                <TableCell align="right">{li.quantity}</TableCell>
                                                <TableCell align="right">{fmtCurrency(li.unit_price)}</TableCell>
                                                <TableCell align="right">{toNum(li.tax_rate)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Divider />

                            <Typography variant="subtitle2" fontWeight={700}>Run History</Typography>
                            <Stack spacing={0.5}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Times Run</Typography>
                                    <Typography variant="body2" fontWeight={600}>{selected.run_count ?? 0}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Last Run</Typography>
                                    <Typography variant="body2">{selected.last_run_date ? fmtDate(selected.last_run_date) : 'Never'}</Typography>
                                </Stack>
                            </Stack>

                            <Divider />

                            <Stack direction="row" spacing={1} pt={1}>
                                <Button
                                    variant="contained"
                                    startIcon={<PlayArrowRoundedIcon />}
                                    disabled={!selected.is_active || actionLoading}
                                    onClick={() => handleRun(selected)}
                                    size="small"
                                >
                                    Run Now
                                </Button>
                                <Button
                                    variant="outlined"
                                    color={selected.is_active ? 'warning' : 'success'}
                                    startIcon={selected.is_active ? <PauseRoundedIcon /> : <PlayCircleRoundedIcon />}
                                    disabled={actionLoading}
                                    onClick={() => handleToggle(selected)}
                                    size="small"
                                >
                                    {selected.is_active ? 'Pause' : 'Resume'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteRoundedIcon />}
                                    disabled={actionLoading}
                                    onClick={() => { handleDelete(selected); }}
                                    size="small"
                                >
                                    Delete
                                </Button>
                            </Stack>
                        </Stack>
                    </>
                )}
            </Drawer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>New Recurring Template</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} pt={1}>
                        {/* Basic Info */}
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Template Name"
                                required
                                fullWidth
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            />
                            <FormControl fullWidth required>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    label="Type"
                                    value={form.type}
                                    onChange={e => setForm(f => ({ ...f, type: e.target.value, customer_id: '', vendor_id: '' }))}
                                >
                                    {TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth required>
                                <InputLabel>Frequency</InputLabel>
                                <Select
                                    label="Frequency"
                                    value={form.frequency}
                                    onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                                >
                                    {FREQUENCIES.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Next Run Date"
                                type="date"
                                required
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={form.next_run_date}
                                onChange={e => setForm(f => ({ ...f, next_run_date: e.target.value }))}
                            />
                            <TextField
                                label="End Date (optional)"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={form.end_date}
                                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                            />
                        </Stack>

                        {/* Conditional Customer / Vendor */}
                        {form.type === 'Invoice' && (
                            <FormControl fullWidth>
                                <InputLabel>Customer</InputLabel>
                                <Select
                                    label="Customer"
                                    value={form.customer_id}
                                    onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {customers.map(c => (
                                        <MenuItem key={c._id} value={c._id}>{c.customer_name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {form.type === 'Bill' && (
                            <FormControl fullWidth>
                                <InputLabel>Vendor</InputLabel>
                                <Select
                                    label="Vendor"
                                    value={form.vendor_id}
                                    onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {vendors.map(v => (
                                        <MenuItem key={v._id} value={v._id}>{v.vendor_name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <Divider />

                        {/* Line Items */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={700}>Line Items</Typography>
                            <Button size="small" startIcon={<AddRoundedIcon />} onClick={addLineItem}>Add Row</Button>
                        </Stack>

                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Description</TableCell>
                                        <TableCell width={80}>Qty</TableCell>
                                        <TableCell width={120}>Unit Price</TableCell>
                                        <TableCell width={100}>Tax %</TableCell>
                                        <TableCell width={40}></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {form.line_items.map((li, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <TextField
                                                    variant="standard"
                                                    fullWidth
                                                    placeholder="Description"
                                                    value={li.description}
                                                    onChange={e => updateLineItem(idx, 'description', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    variant="standard"
                                                    type="number"
                                                    value={li.quantity}
                                                    onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                                                    inputProps={{ min: 1 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    variant="standard"
                                                    type="number"
                                                    value={li.unit_price}
                                                    onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                                                    inputProps={{ min: 0 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    variant="standard"
                                                    type="number"
                                                    value={li.tax_rate}
                                                    onChange={e => updateLineItem(idx, 'tax_rate', e.target.value)}
                                                    inputProps={{ min: 0, max: 100 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => removeLineItem(idx)}
                                                    disabled={form.line_items.length === 1}
                                                >
                                                    <DeleteRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={3} />
                                        <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{fmtCurrency(formTotal)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TextField
                            label="Notes"
                            multiline
                            rows={3}
                            fullWidth
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={saving || !form.name || !form.next_run_date}
                    >
                        {saving ? <CircularProgress size={18} /> : 'Create Template'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
