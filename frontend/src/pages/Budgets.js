import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, TextField,
    CircularProgress, Stack, Paper, Table, TableBody, TableCell,
    TableHead, TableRow, TableContainer, Dialog, DialogTitle,
    DialogContent, DialogActions, Alert,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { toNum } from '../utils/numbers';

const STATUS_COLORS = { Draft: 'default', Active: 'success', Closed: 'error' };

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const emptyForm = { name: '', fiscal_year: new Date().getFullYear(), notes: '' };

function computeLineTotal(line) {
    return MONTHS.reduce((sum, m) => sum + parseFloat(line[m] || 0), 0);
}

export default function Budgets() {
    const { selectedCompanyId } = useAuth();
    const { get, post, put, loading } = useApi();

    const [budgets, setBudgets] = useState([]);
    const [selected, setSelected] = useState(null); // full budget detail
    const [detailLines, setDetailLines] = useState([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const [varOpen, setVarOpen] = useState(false);
    const [varData, setVarData] = useState([]);
    const [varLoading, setVarLoading] = useState(false);

    const [actionLoading, setActionLoading] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const res = await get(`/${selectedCompanyId}/finance/budgets`);
        if (res?.data) setBudgets(res.data);
    }, [selectedCompanyId, get]);

    useEffect(() => { load(); }, [load]);

    const openBudget = async (budget) => {
        const res = await get(`/${selectedCompanyId}/finance/budgets/${budget._id}`);
        if (res?.data) {
            setSelected(res.data);
            // Deep-copy lines so we can edit them locally
            setDetailLines((res.data.lines || []).map(l => ({ ...l })));
        }
    };

    const handleCreate = async () => {
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/finance/budgets`, { ...form, lines: [] });
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); load(); }
    };

    const handleSaveBudget = async () => {
        if (!selected) return;
        setActionLoading(true);
        const res = await put(`/${selectedCompanyId}/finance/budgets/${selected._id}`, { lines: detailLines });
        setActionLoading(false);
        if (res?.data) {
            setSelected(res.data);
            setDetailLines((res.data.lines || []).map(l => ({ ...l })));
            setAlertMsg('Budget saved successfully.');
        }
    };

    const handleActivate = async () => {
        if (!selected) return;
        setActionLoading(true);
        const res = await post(`/${selectedCompanyId}/finance/budgets/${selected._id}/activate`, {});
        setActionLoading(false);
        if (res?.data) {
            setSelected(res.data);
            load();
        }
    };

    const handleVariance = async () => {
        if (!selected) return;
        setVarLoading(true);
        const res = await get(`/${selectedCompanyId}/finance/budgets/${selected._id}/variance`);
        setVarLoading(false);
        if (res?.data) { setVarData(res.data); setVarOpen(true); }
    };

    const addLine = () => {
        setDetailLines(l => [
            ...l,
            { account_name: '', ...Object.fromEntries(MONTHS.map(m => [m, '0'])), total: 0 },
        ]);
    };

    const setLineField = (idx, field, val) => {
        setDetailLines(lines => {
            const updated = [...lines];
            updated[idx] = { ...updated[idx], [field]: val };
            return updated;
        });
    };

    const removeLine = (idx) => setDetailLines(l => l.filter((_, i) => i !== idx));

    if (selected) {
        const isDraft = selected.status === 'Draft';
        return (
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => { setSelected(null); setAlertMsg(''); }}>
                        Back
                    </Button>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" fontWeight={700}>{selected.name}</Typography>
                        <Typography variant="body2" color="text.secondary">FY {selected.fiscal_year}</Typography>
                    </Box>
                    <Chip label={selected.status} color={STATUS_COLORS[selected.status] || 'default'} />
                    <Stack direction="row" spacing={1}>
                        {isDraft && (
                            <>
                                <Button variant="contained" size="small" onClick={handleSaveBudget} disabled={actionLoading}>
                                    {actionLoading ? <CircularProgress size={18} /> : 'Save Budget'}
                                </Button>
                                <Button variant="outlined" size="small" color="success" onClick={handleActivate} disabled={actionLoading}>
                                    Activate
                                </Button>
                            </>
                        )}
                        <Button variant="outlined" size="small" onClick={handleVariance} disabled={varLoading}>
                            {varLoading ? <CircularProgress size={18} /> : 'Variance Report'}
                        </Button>
                    </Stack>
                </Box>

                {alertMsg && <Alert severity="success" onClose={() => setAlertMsg('')} sx={{ mb: 2 }}>{alertMsg}</Alert>}

                <Paper sx={{ overflowX: 'auto' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell sx={{ minWidth: 180, position: 'sticky', left: 0, bgcolor: 'grey.50', zIndex: 1 }}>
                                    <b>Account</b>
                                </TableCell>
                                {MONTH_LABELS.map(m => (
                                    <TableCell key={m} align="right" sx={{ minWidth: 90 }}><b>{m}</b></TableCell>
                                ))}
                                <TableCell align="right" sx={{ minWidth: 100 }}><b>Total</b></TableCell>
                                {isDraft && <TableCell sx={{ minWidth: 50 }} />}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {detailLines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={15} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No budget lines. Add lines below.
                                    </TableCell>
                                </TableRow>
                            ) : detailLines.map((line, idx) => {
                                const lineTotal = computeLineTotal(line);
                                return (
                                    <TableRow key={idx} hover>
                                        <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                            {isDraft ? (
                                                <TextField
                                                    size="small"
                                                    variant="standard"
                                                    value={line.account_name || ''}
                                                    onChange={e => setLineField(idx, 'account_name', e.target.value)}
                                                    placeholder="Account name"
                                                    sx={{ width: 160 }}
                                                    inputProps={{ style: { fontSize: '0.8rem' } }}
                                                />
                                            ) : (
                                                <Typography variant="body2">{line.account_name || '—'}</Typography>
                                            )}
                                        </TableCell>
                                        {MONTHS.map(m => (
                                            <TableCell key={m} align="right">
                                                {isDraft ? (
                                                    <TextField
                                                        size="small"
                                                        variant="standard"
                                                        type="number"
                                                        value={line[m] ?? '0'}
                                                        onChange={e => setLineField(idx, m, e.target.value)}
                                                        sx={{ width: 70 }}
                                                        inputProps={{ style: { textAlign: 'right', fontSize: '0.8rem' } }}
                                                    />
                                                ) : (
                                                    <Typography variant="body2">{toNum(line[m]).toLocaleString()}</Typography>
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={600}>
                                                {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </Typography>
                                        </TableCell>
                                        {isDraft && (
                                            <TableCell>
                                                <Button size="small" color="error" onClick={() => removeLine(idx)} sx={{ minWidth: 'unset', p: 0.5 }}>✕</Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Paper>

                {isDraft && (
                    <Button size="small" sx={{ mt: 1 }} onClick={addLine}>+ Add Line</Button>
                )}

                {/* Variance Report Dialog */}
                <Dialog open={varOpen} onClose={() => setVarOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Variance Report — {selected.name} (FY {selected.fiscal_year})</DialogTitle>
                    <DialogContent dividers>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell><b>Account</b></TableCell>
                                        <TableCell align="right"><b>Budgeted</b></TableCell>
                                        <TableCell align="right"><b>Actual</b></TableCell>
                                        <TableCell align="right"><b>Variance</b></TableCell>
                                        <TableCell align="right"><b>Variance %</b></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {varData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                No variance data
                                            </TableCell>
                                        </TableRow>
                                    ) : varData.map((row, i) => {
                                        const varNum = parseFloat(row.variance);
                                        const isNeg = varNum < 0;
                                        return (
                                            <TableRow key={i}>
                                                <TableCell>{row.account_name || '—'}</TableCell>
                                                <TableCell align="right">{parseFloat(row.budgeted).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell align="right">{parseFloat(row.actual).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell align="right" sx={{ color: isNeg ? 'error.main' : 'success.main', fontWeight: 600 }}>
                                                    {varNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: isNeg ? 'error.main' : 'success.main' }}>
                                                    {row.variance_pct !== null ? `${row.variance_pct}%` : '—'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setVarOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Budgets</Typography>
                    <Typography variant="body2" color="text.secondary">Manage annual budgets and track variance against actuals</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>
                    New Budget
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>Name</b></TableCell>
                            <TableCell><b>Fiscal Year</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
                            <TableCell align="right"><b>Lines</b></TableCell>
                            <TableCell><b>Created</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !budgets.length ? (
                            <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : budgets.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No budgets found</TableCell></TableRow>
                        ) : budgets.map(b => (
                            <TableRow
                                key={b._id}
                                hover
                                sx={{ cursor: 'pointer' }}
                                onClick={() => openBudget(b)}
                            >
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600} color="primary">{b.name}</Typography>
                                </TableCell>
                                <TableCell>{b.fiscal_year}</TableCell>
                                <TableCell><Chip label={b.status} size="small" color={STATUS_COLORS[b.status] || 'default'} /></TableCell>
                                <TableCell align="right">{b.line_count}</TableCell>
                                <TableCell>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>New Budget</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            size="small"
                            label="Budget Name *"
                            fullWidth
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        />
                        <TextField
                            size="small"
                            type="number"
                            label="Fiscal Year *"
                            fullWidth
                            value={form.fiscal_year}
                            onChange={e => setForm(f => ({ ...f, fiscal_year: parseInt(e.target.value, 10) || '' }))}
                        />
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
                        disabled={saving || !form.name || !form.fiscal_year}
                    >
                        {saving ? <CircularProgress size={20} /> : 'Create Budget'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
