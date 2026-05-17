import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Drawer, TextField,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, Tabs, Tab, Divider, Alert,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { toNum, fmtCurrency } from '../utils/numbers';

const STATUS_COLORS = {
    Active: 'success',
    Disposed: 'error',
    'Under Maintenance': 'warning',
    'Fully Depreciated': 'default',
};

const CATEGORIES = ['Land', 'Building', 'Machinery', 'Vehicle', 'Furniture', 'Computer', 'Other'];
const DEPRECIATION_METHODS = ['Straight Line', 'Declining Balance', 'Units of Production'];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const emptyForm = {
    asset_name: '',
    category: 'Other',
    purchase_date: new Date().toISOString().slice(0, 10),
    purchase_cost: '',
    salvage_value: '0',
    useful_life_years: '',
    depreciation_method: 'Straight Line',
    location: '',
    serial_number: '',
    notes: '',
};

const emptyDisposeForm = {
    disposal_date: new Date().toISOString().slice(0, 10),
    disposal_proceeds: '0',
    notes: '',
};

export default function FixedAssets() {
    const { selectedCompanyId } = useAuth();
    const { get, post, put, loading } = useApi();

    const [assets, setAssets] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const limit = 20;

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const [selected, setSelected] = useState(null);
    const [depEntries, setDepEntries] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const [disposeOpen, setDisposeOpen] = useState(false);
    const [disposeForm, setDisposeForm] = useState(emptyDisposeForm);
    const [actionLoading, setActionLoading] = useState(false);

    const [scheduleData, setScheduleData] = useState([]);
    const [scheduleOpen, setScheduleOpen] = useState(false);

    const [alertMsg, setAlertMsg] = useState('');

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams({ skip: page * limit, limit });
        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('category', categoryFilter);
        const res = await get(`/${selectedCompanyId}/assets?${params}`);
        if (res?.data) { setAssets(res.data); setTotal(res.pagination?.total || 0); }
    }, [selectedCompanyId, page, statusFilter, categoryFilter, get]);

    useEffect(() => { load(); }, [load]);

    const openDetail = async (asset) => {
        const res = await get(`/${selectedCompanyId}/assets/${asset._id}`);
        if (res?.data) {
            setSelected(res.data);
            setDepEntries(res.depreciation_entries || []);
        } else {
            setSelected(asset);
            setDepEntries([]);
        }
        setDrawerOpen(true);
    };

    const handleCreate = async () => {
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/assets`, form);
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); load(); }
    };

    const handleRunDepreciation = async () => {
        if (!selected) return;
        setActionLoading(true);
        const res = await post(`/${selectedCompanyId}/assets/${selected._id}/depreciate`, {});
        setActionLoading(false);
        if (res?.data) {
            setAlertMsg('Depreciation entry recorded successfully.');
            openDetail(selected);
            load();
        } else {
            setAlertMsg(res?.error || 'Failed to run depreciation.');
        }
    };

    const handleDispose = async () => {
        if (!selected) return;
        setActionLoading(true);
        const res = await post(`/${selectedCompanyId}/assets/${selected._id}/dispose`, disposeForm);
        setActionLoading(false);
        if (res?.data) {
            setDisposeOpen(false);
            setDisposeForm(emptyDisposeForm);
            setDrawerOpen(false);
            load();
        }
    };

    const handleViewSchedule = async () => {
        if (!selected) return;
        const res = await get(`/${selectedCompanyId}/assets/${selected._id}/schedule`);
        if (res?.data) { setScheduleData(res.data); setScheduleOpen(true); }
    };

    const filtered = assets.filter(a => {
        if (!search) return true;
        return (
            a.asset_code?.toLowerCase().includes(search.toLowerCase()) ||
            a.asset_name?.toLowerCase().includes(search.toLowerCase())
        );
    });

    // Collect all depreciation entries for the "Depreciation" tab
    const allDepEntries = activeTab === 1 ? depEntries : [];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Fixed Assets</Typography>
                    <Typography variant="body2" color="text.secondary">Track and depreciate company fixed assets</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>
                    New Asset
                </Button>
            </Box>

            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Asset Register" />
                <Tab label="Depreciation Entries" />
            </Tabs>

            {activeTab === 0 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            placeholder="Search code / name…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                            sx={{ width: 220 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Status</InputLabel>
                            <Select label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                                <MenuItem value="">All</MenuItem>
                                {['Active', 'Disposed', 'Under Maintenance', 'Fully Depreciated'].map(s => (
                                    <MenuItem key={s} value={s}>{s}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Category</InputLabel>
                            <Select label="Category" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}>
                                <MenuItem value="">All</MenuItem>
                                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{total} records</Typography>
                    </Paper>

                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Asset Code</b></TableCell>
                                    <TableCell><b>Name</b></TableCell>
                                    <TableCell><b>Category</b></TableCell>
                                    <TableCell><b>Purchase Date</b></TableCell>
                                    <TableCell align="right"><b>Cost</b></TableCell>
                                    <TableCell align="right"><b>Accum. Depreciation</b></TableCell>
                                    <TableCell align="right"><b>Net Book Value</b></TableCell>
                                    <TableCell><b>Status</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading && !assets.length ? (
                                    <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No fixed assets found</TableCell></TableRow>
                                ) : filtered.map(a => (
                                    <TableRow
                                        key={a._id}
                                        hover
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => openDetail(a)}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600} color="primary">{a.asset_code}</Typography>
                                        </TableCell>
                                        <TableCell>{a.asset_name}</TableCell>
                                        <TableCell>
                                            <Chip label={a.category} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>{fmtDate(a.purchase_date)}</TableCell>
                                        <TableCell align="right">{fmtCurrency(a.purchase_cost)}</TableCell>
                                        <TableCell align="right">{fmtCurrency(a.accumulated_depreciation)}</TableCell>
                                        <TableCell align="right"><b>{fmtCurrency(a.net_book_value)}</b></TableCell>
                                        <TableCell><Chip label={a.status} size="small" color={STATUS_COLORS[a.status] || 'default'} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {total > limit && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 1 }}>
                            <Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                            <Typography variant="body2" sx={{ alignSelf: 'center' }}>Page {page + 1} of {Math.ceil(total / limit)}</Typography>
                            <Button size="small" disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
                        </Box>
                    )}
                </>
            )}

            {activeTab === 1 && (
                <Paper>
                    <Box sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Click an asset row in the Asset Register tab and open its detail drawer to view depreciation entries.
                        </Typography>
                    </Box>
                    {depEntries.length > 0 && (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell><b>Period Start</b></TableCell>
                                        <TableCell><b>Period End</b></TableCell>
                                        <TableCell><b>Method</b></TableCell>
                                        <TableCell align="right"><b>Depreciation Amount</b></TableCell>
                                        <TableCell align="right"><b>Accumulated Before</b></TableCell>
                                        <TableCell align="right"><b>NBV After</b></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {depEntries.map(e => (
                                        <TableRow key={e._id}>
                                            <TableCell>{fmtDate(e.period_start)}</TableCell>
                                            <TableCell>{fmtDate(e.period_end)}</TableCell>
                                            <TableCell>{e.method}</TableCell>
                                            <TableCell align="right">{fmtCurrency(e.depreciation_amount)}</TableCell>
                                            <TableCell align="right">{fmtCurrency(e.accumulated_before)}</TableCell>
                                            <TableCell align="right">{fmtCurrency(e.net_book_value_after)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* Detail Drawer */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setAlertMsg(''); }}
                PaperProps={{ sx: { width: { xs: '100%', md: 600 } } }}
            >
                {selected && (
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="h6" fontWeight={700}>{selected.asset_code} — {selected.asset_name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selected.category} · {fmtDate(selected.purchase_date)}
                                </Typography>
                            </Box>
                            <Chip label={selected.status} color={STATUS_COLORS[selected.status] || 'default'} />
                        </Box>

                        {alertMsg && (
                            <Alert severity="info" onClose={() => setAlertMsg('')} sx={{ mb: 2 }}>{alertMsg}</Alert>
                        )}

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                            {[
                                ['Purchase Cost', fmtCurrency(selected.purchase_cost)],
                                ['Salvage Value', fmtCurrency(selected.salvage_value)],
                                ['Useful Life', `${selected.useful_life_years} years`],
                                ['Depreciation Method', selected.depreciation_method],
                                ['Accum. Depreciation', fmtCurrency(selected.accumulated_depreciation)],
                                ['Net Book Value', fmtCurrency(selected.net_book_value)],
                                ['Location', selected.location || '—'],
                                ['Serial Number', selected.serial_number || '—'],
                                ['Vendor', selected.vendor_id?.vendor_name || '—'],
                                ['Disposal Date', selected.disposal_date ? fmtDate(selected.disposal_date) : '—'],
                                ['Disposal Proceeds', fmtCurrency(selected.disposal_proceeds)],
                            ].map(([label, value]) => (
                                <Box key={label}>
                                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                                    <Typography variant="body2" fontWeight={500}>{value}</Typography>
                                </Box>
                            ))}
                        </Box>

                        {selected.notes && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selected.notes}</Typography>
                        )}

                        <Divider sx={{ my: 2 }} />

                        {/* Action Buttons */}
                        {selected.status === 'Active' && (
                            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleRunDepreciation}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <CircularProgress size={18} /> : 'Run Depreciation'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    color="warning"
                                    onClick={() => { setDisposeForm(emptyDisposeForm); setDisposeOpen(true); }}
                                >
                                    Dispose Asset
                                </Button>
                                <Button variant="outlined" size="small" onClick={handleViewSchedule}>
                                    View Schedule
                                </Button>
                            </Stack>
                        )}

                        {/* Depreciation Entries */}
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Depreciation Entries</Typography>
                        {depEntries.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No depreciation entries yet.</Typography>
                        ) : (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell><b>Period</b></TableCell>
                                            <TableCell align="right"><b>Amount</b></TableCell>
                                            <TableCell align="right"><b>NBV After</b></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {depEntries.map(e => (
                                            <TableRow key={e._id}>
                                                <TableCell>
                                                    {fmtDate(e.period_start)} – {fmtDate(e.period_end)}
                                                </TableCell>
                                                <TableCell align="right">{fmtCurrency(e.depreciation_amount)}</TableCell>
                                                <TableCell align="right">{fmtCurrency(e.net_book_value_after)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}
            </Drawer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>New Fixed Asset</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            size="small"
                            label="Asset Name *"
                            fullWidth
                            value={form.asset_name}
                            onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))}
                        />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                    {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField
                                size="small"
                                type="date"
                                label="Purchase Date *"
                                InputLabelProps={{ shrink: true }}
                                value={form.purchase_date}
                                onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                            />
                            <TextField
                                size="small"
                                type="number"
                                label="Purchase Cost *"
                                value={form.purchase_cost}
                                onChange={e => setForm(f => ({ ...f, purchase_cost: e.target.value }))}
                            />
                            <TextField
                                size="small"
                                type="number"
                                label="Salvage Value"
                                value={form.salvage_value}
                                onChange={e => setForm(f => ({ ...f, salvage_value: e.target.value }))}
                            />
                            <TextField
                                size="small"
                                type="number"
                                label="Useful Life (years) *"
                                value={form.useful_life_years}
                                onChange={e => setForm(f => ({ ...f, useful_life_years: e.target.value }))}
                            />
                            <FormControl size="small" fullWidth>
                                <InputLabel>Depreciation Method</InputLabel>
                                <Select
                                    label="Depreciation Method"
                                    value={form.depreciation_method}
                                    onChange={e => setForm(f => ({ ...f, depreciation_method: e.target.value }))}
                                >
                                    {DEPRECIATION_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField
                                size="small"
                                label="Location"
                                value={form.location}
                                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                            />
                            <TextField
                                size="small"
                                label="Serial Number"
                                value={form.serial_number}
                                onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                            />
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
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={saving || !form.asset_name || !form.purchase_cost || !form.useful_life_years}
                    >
                        {saving ? <CircularProgress size={20} /> : 'Create Asset'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dispose Dialog */}
            <Dialog open={disposeOpen} onClose={() => setDisposeOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Dispose Asset</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            size="small"
                            type="date"
                            label="Disposal Date"
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            value={disposeForm.disposal_date}
                            onChange={e => setDisposeForm(f => ({ ...f, disposal_date: e.target.value }))}
                        />
                        <TextField
                            size="small"
                            type="number"
                            label="Disposal Proceeds"
                            fullWidth
                            value={disposeForm.disposal_proceeds}
                            onChange={e => setDisposeForm(f => ({ ...f, disposal_proceeds: e.target.value }))}
                        />
                        <TextField
                            size="small"
                            label="Notes"
                            multiline
                            rows={2}
                            fullWidth
                            value={disposeForm.notes}
                            onChange={e => setDisposeForm(f => ({ ...f, notes: e.target.value }))}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDisposeOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="warning" onClick={handleDispose} disabled={actionLoading}>
                        {actionLoading ? <CircularProgress size={20} /> : 'Dispose'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Depreciation Schedule Dialog */}
            <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Depreciation Schedule</DialogTitle>
                <DialogContent dividers>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Period #</b></TableCell>
                                    <TableCell><b>Start</b></TableCell>
                                    <TableCell><b>End</b></TableCell>
                                    <TableCell align="right"><b>Depreciation</b></TableCell>
                                    <TableCell align="right"><b>Accumulated</b></TableCell>
                                    <TableCell align="right"><b>Net Book Value</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {scheduleData.map(row => (
                                    <TableRow key={row.period}>
                                        <TableCell>{row.period}</TableCell>
                                        <TableCell>{fmtDate(row.period_start)}</TableCell>
                                        <TableCell>{fmtDate(row.period_end)}</TableCell>
                                        <TableCell align="right">{fmtCurrency(row.depreciation_amount)}</TableCell>
                                        <TableCell align="right">{fmtCurrency(row.accumulated_depreciation)}</TableCell>
                                        <TableCell align="right">{fmtCurrency(row.net_book_value)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setScheduleOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
