import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Tabs, Tab, TextField, Drawer,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, IconButton, Tooltip, Alert, Card, CardContent, Grid, Pagination,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PostAddRoundedIcon from '@mui/icons-material/PostAddRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { toNum, fmtCurrency } from '../utils/numbers';
import ConfirmDialog from '../components/ConfirmDialog';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
const STATUS_COLORS = { Draft: 'default', Posted: 'success' };
const ADJ_TYPES = ['Physical Count', 'Write-Off', 'Write-Up', 'Damage', 'Theft', 'Other'];

const emptyForm = {
    adjustment_date: new Date().toISOString().slice(0, 10),
    adjustment_type: 'Physical Count',
    notes: '', reference: '',
    lines: [{ product_id: '', warehouse_id: '', adjustment_type: 'Set', quantity: 0, unit_cost: 0, reason: '' }],
};

export default function StockAdjustments() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [tab, setTab] = useState(0);
    const [adjustments, setAdjustments] = useState([]);
    const [valuation, setValuation] = useState([]);
    const [reorderAlerts, setReorderAlerts] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;
    const [total, setTotal] = useState(0);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams();
        params.set('skip', (page - 1) * limit);
        params.set('limit', limit);
        const [adjRes, prodRes, whRes] = await Promise.all([
            get(`/${selectedCompanyId}/inventory/adjustments?${params}`),
            get(`/${selectedCompanyId}/inventory/products`),
            get(`/${selectedCompanyId}/inventory/warehouses`),
        ]);
        if (adjRes?.data) { setAdjustments(adjRes.data); setTotal(adjRes.pagination?.total || 0); }
        if (prodRes?.data) setProducts(prodRes.data);
        if (whRes?.data) setWarehouses(whRes.data);
    }, [selectedCompanyId, page, get]);

    const loadValuation = useCallback(async () => {
        if (!selectedCompanyId) return;
        const res = await get(`/${selectedCompanyId}/inventory/valuation`);
        if (res?.data) setValuation(res.data);
    }, [selectedCompanyId, get]);

    const loadReorder = useCallback(async () => {
        if (!selectedCompanyId) return;
        const res = await get(`/${selectedCompanyId}/inventory/reorder-alerts`);
        if (res?.data) setReorderAlerts(res.data);
    }, [selectedCompanyId, get]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { if (tab === 1) loadValuation(); }, [tab, loadValuation]);
    useEffect(() => { if (tab === 2) loadReorder(); }, [tab, loadReorder]);

    const openDetail = async (adj) => {
        const res = await get(`/${selectedCompanyId}/inventory/adjustments/${adj._id}`);
        setSelected(res?.data || adj);
        setDrawerOpen(true);
    };

    const handleCreate = async () => {
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/inventory/adjustments`, form);
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); load(); }
    };

    const handlePost = async (id) => {
        await post(`/${selectedCompanyId}/inventory/adjustments/${id}/post`);
        load();
        if (selected?._id === id) {
            const res = await get(`/${selectedCompanyId}/inventory/adjustments/${id}`);
            setSelected(res?.data);
        }
    };

    const requestPost = (id) => {
        setPendingAction(() => () => handlePost(id));
        setConfirmOpen(true);
    };

    const setLineField = (idx, field, value) => {
        setForm(f => {
            const lines = [...f.lines];
            lines[idx] = { ...lines[idx], [field]: value };
            return { ...f, lines };
        });
    };

    const filtered = adjustments.filter(a =>
        !search || a.adjustment_number?.toLowerCase().includes(search.toLowerCase())
    );

    const totalStockValue = valuation.reduce((s, r) => s + toNum(r.total_value), 0);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Stock Management</Typography>
                    <Typography variant="body2" color="text.secondary">Adjustments, valuation and reorder alerts</Typography>
                </Box>
                {tab === 0 && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>New Adjustment</Button>}
            </Box>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Adjustments" />
                    <Tab label="Stock Valuation" />
                    <Tab label={`Reorder Alerts ${reorderAlerts.length > 0 ? `(${reorderAlerts.length})` : ''}`} />
                </Tabs>
            </Paper>

            {/* Adjustments Tab */}
            {tab === 0 && (
                <Stack spacing={2}>
                    <Paper sx={{ p: 2, display: 'flex', gap: 2 }}>
                        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ width: 220 }} />
                    </Paper>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Number</b></TableCell>
                                    <TableCell><b>Date</b></TableCell>
                                    <TableCell><b>Type</b></TableCell>
                                    <TableCell><b>Lines</b></TableCell>
                                    <TableCell><b>Reference</b></TableCell>
                                    <TableCell><b>Status</b></TableCell>
                                    <TableCell><b>Actions</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading && !adjustments.length ? (
                                    <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No adjustments found</TableCell></TableRow>
                                ) : filtered.map(adj => (
                                    <TableRow key={adj._id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(adj)}>
                                        <TableCell><Typography variant="body2" fontWeight={600} color="primary">{adj.adjustment_number}</Typography></TableCell>
                                        <TableCell>{fmtDate(adj.adjustment_date)}</TableCell>
                                        <TableCell>{adj.adjustment_type}</TableCell>
                                        <TableCell>{adj.lines?.length || 0} items</TableCell>
                                        <TableCell>{adj.reference || '—'}</TableCell>
                                        <TableCell><Chip label={adj.status} size="small" color={STATUS_COLORS[adj.status]} /></TableCell>
                                        <TableCell onClick={e => e.stopPropagation()}>
                                            {adj.status === 'Draft' && (
                                                <Tooltip title="Post Adjustment">
                                                    <IconButton size="small" color="success" onClick={() => requestPost(adj._id)}>
                                                        <PostAddRoundedIcon fontSize="small" />
                                                    </IconButton>
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
                </Stack>
            )}

            {/* Stock Valuation Tab */}
            {tab === 1 && (
                <Stack spacing={2}>
                    <Card sx={{ bgcolor: 'primary.lighter' }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">Total Inventory Value</Typography>
                            <Typography variant="h4" fontWeight={700} color="primary">{fmtCurrency(totalStockValue)}</Typography>
                        </CardContent>
                    </Card>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Product</b></TableCell>
                                    <TableCell><b>Code</b></TableCell>
                                    <TableCell><b>Warehouse</b></TableCell>
                                    <TableCell align="right"><b>Quantity</b></TableCell>
                                    <TableCell align="right"><b>Cost Price</b></TableCell>
                                    <TableCell align="right"><b>Total Value</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                                ) : valuation.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No stock data</TableCell></TableRow>
                                ) : valuation.map((row, i) => (
                                    <TableRow key={i} hover>
                                        <TableCell>{row.product?.product_name}</TableCell>
                                        <TableCell><Typography variant="caption">{row.product?.product_code}</Typography></TableCell>
                                        <TableCell>{row.warehouse?.warehouse_name}</TableCell>
                                        <TableCell align="right">{toNum(row.quantity)}</TableCell>
                                        <TableCell align="right">{fmtCurrency(row.cost_price)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>{fmtCurrency(row.total_value)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Stack>
            )}

            {/* Reorder Alerts Tab */}
            {tab === 2 && (
                <Stack spacing={2}>
                    {reorderAlerts.length === 0 ? (
                        <Alert severity="success">All products are above their reorder points.</Alert>
                    ) : (
                        <>
                            <Alert severity="warning" icon={<WarningAmberRoundedIcon />}>
                                {reorderAlerts.length} product{reorderAlerts.length !== 1 ? 's' : ''} below reorder point
                            </Alert>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell><b>Product</b></TableCell>
                                            <TableCell><b>Code</b></TableCell>
                                            <TableCell align="right"><b>Current Stock</b></TableCell>
                                            <TableCell align="right"><b>Reorder Point</b></TableCell>
                                            <TableCell align="right"><b>Shortage</b></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {reorderAlerts.map((alert, i) => (
                                            <TableRow key={i} hover sx={{ bgcolor: 'error.lighter' }}>
                                                <TableCell>{alert.product?.product_name}</TableCell>
                                                <TableCell><Typography variant="caption">{alert.product?.product_code}</Typography></TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>{alert.current_stock}</TableCell>
                                                <TableCell align="right">{alert.reorder_point}</TableCell>
                                                <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>-{alert.shortage}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Stack>
            )}

            {/* Detail Drawer */}
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: 600 } } }}>
                {selected && (
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" fontWeight={700}>{selected.adjustment_number}</Typography>
                                <Typography variant="body2" color="text.secondary">{selected.adjustment_type} · {fmtDate(selected.adjustment_date)}</Typography>
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={selected.status} color={STATUS_COLORS[selected.status]} />
                                {selected.status === 'Draft' && (
                                    <Button variant="contained" color="success" size="small" startIcon={<PostAddRoundedIcon />} onClick={() => requestPost(selected._id)}>
                                        Post
                                    </Button>
                                )}
                            </Stack>
                        </Box>
                        {selected.notes && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selected.notes}</Typography>}
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell><b>Product</b></TableCell>
                                        <TableCell><b>Warehouse</b></TableCell>
                                        <TableCell><b>Adj Type</b></TableCell>
                                        <TableCell align="right"><b>Current</b></TableCell>
                                        <TableCell align="right"><b>Qty</b></TableCell>
                                        <TableCell align="right"><b>New</b></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(selected.lines || []).map((line, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{line.product_id?.product_name || '—'}</TableCell>
                                            <TableCell>{line.warehouse_id?.warehouse_name || '—'}</TableCell>
                                            <TableCell><Chip label={line.adjustment_type} size="small" /></TableCell>
                                            <TableCell align="right">{toNum(line.current_quantity)}</TableCell>
                                            <TableCell align="right">{toNum(line.quantity)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: toNum(line.new_quantity) > toNum(line.current_quantity) ? 'success.main' : 'error.main' }}>{toNum(line.new_quantity)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Drawer>

            <ConfirmDialog
                open={confirmOpen}
                title="Post Stock Adjustment"
                message="Posting this adjustment will update stock quantities and is irreversible. Proceed?"
                confirmLabel="Post"
                confirmColor="success"
                onConfirm={() => { setConfirmOpen(false); pendingAction && pendingAction(); }}
                onCancel={() => setConfirmOpen(false)}
            />

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>New Stock Adjustment</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }}
                                value={form.adjustment_date} onChange={e => setForm(f => ({ ...f, adjustment_date: e.target.value }))} />
                            <FormControl size="small" fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select label="Type" value={form.adjustment_type} onChange={e => setForm(f => ({ ...f, adjustment_type: e.target.value }))}>
                                    {ADJ_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField size="small" label="Reference" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
                        </Box>
                        <TextField size="small" label="Notes" multiline rows={1} fullWidth value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

                        <Typography variant="subtitle2" fontWeight={600}>Lines</Typography>
                        {form.lines.map((line, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 1, alignItems: 'center' }}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Product</InputLabel>
                                    <Select label="Product" value={line.product_id} onChange={e => setLineField(i, 'product_id', e.target.value)}>
                                        {products.map(p => <MenuItem key={p._id} value={p._id}>{p.product_name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Warehouse</InputLabel>
                                    <Select label="Warehouse" value={line.warehouse_id} onChange={e => setLineField(i, 'warehouse_id', e.target.value)}>
                                        {warehouses.map(w => <MenuItem key={w._id} value={w._id}>{w.warehouse_name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Adj</InputLabel>
                                    <Select label="Adj" value={line.adjustment_type} onChange={e => setLineField(i, 'adjustment_type', e.target.value)}>
                                        {['Add', 'Remove', 'Set'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField size="small" label="Qty" type="number" value={line.quantity} onChange={e => setLineField(i, 'quantity', e.target.value)} />
                                <Button size="small" color="error" onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))}>✕</Button>
                            </Box>
                        ))}
                        <Button size="small" onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { product_id: '', warehouse_id: '', adjustment_type: 'Set', quantity: 0 }] }))}>
                            + Add Line
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : 'Create Adjustment'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
