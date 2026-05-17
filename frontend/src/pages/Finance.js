import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, Tabs, Tab, Stack, Divider, CircularProgress,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Grid, Alert, IconButton, Tooltip, InputBase,
} from '@mui/material';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';

const ACCOUNT_TYPE_STYLE = {
    Asset: { bg: '#EFF6FF', color: '#1565C0' },
    Liability: { bg: '#FEF2F2', color: '#B91C1C' },
    Equity: { bg: '#FAF5FF', color: '#7C3AED' },
    Revenue: { bg: '#F0FDF4', color: '#15803D' },
    Expense: { bg: '#FFFBEB', color: '#B45309' },
    'Cost of Goods Sold': { bg: '#FFF7ED', color: '#C2410C' },
};

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

const TypeBadge = ({ type }) => {
    const s = ACCOUNT_TYPE_STYLE[type] || { bg: '#F1F5F9', color: '#64748B' };
    return (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: s.bg }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: s.color }}>{type}</Typography>
        </Box>
    );
};

/* ── Chart of Accounts ─────────────────────────────────────────────────── */
const ChartOfAccounts = ({ companyId }) => {
    const { get, loading } = useApi();
    const [accounts, setAccounts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const { post } = useApi();
    const [form, setForm] = useState({ account_number: '', account_name: '', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true });
    const [err, setErr] = useState(null);

    const fetch = useCallback(() => {
        if (!companyId) return;
        get(`/${companyId}/finance/accounts`).then(d => setAccounts(d.data || [])).catch(() => {});
    }, [companyId, get]);

    useEffect(() => { fetch(); }, [fetch]);

    const grouped = accounts.reduce((acc, a) => { (acc[a.account_type] = acc[a.account_type] || []).push(a); return acc; }, {});

    const exportCSV = () => {
        const rows = [['Account #', 'Name', 'Type', 'Normal Balance', 'Posting'], ...accounts.map(a => [a.account_number, a.account_name, a.account_type, a.normal_balance, a.allow_posting ? 'Yes' : 'No'])];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'ChartOfAccounts.csv'; a.click();
    };

    const handleSave = async () => {
        try {
            await post(`/${companyId}/finance/accounts`, form);
            setShowForm(false);
            setForm({ account_number: '', account_name: '', account_type: 'Asset', normal_balance: 'Debit', allow_posting: true });
            fetch();
        } catch (e) { setErr(e.response?.data?.error || 'Failed'); }
    };

    if (loading && accounts.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>;

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5' }}>
                <Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{accounts.length} accounts</Typography>
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />} onClick={exportCSV} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#5F6B7C', borderColor: '#E8ECF0' }}>
                    Export CSV
                </Button>
                <Button size="small" variant="contained" startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />} onClick={() => setShowForm(true)} sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    New Account
                </Button>
            </Box>

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 100 }}>Account #</TableCell>
                        <TableCell>Account Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Normal Balance</TableCell>
                        <TableCell>Posting Allowed</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {accounts.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>No accounts. Run seed script to populate Chart of Accounts.</TableCell></TableRow>
                    ) : Object.entries(grouped).map(([type, rows]) => (
                        <React.Fragment key={type}>
                            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                <TableCell colSpan={5} sx={{ py: 0.75, px: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TypeBadge type={type} />
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>{rows.length} accounts</Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                            {rows.map(a => (
                                <TableRow key={a._id} hover>
                                    <TableCell sx={{ fontSize: '0.813rem', fontFamily: 'monospace', color: '#1565C0', fontWeight: 700 }}>{a.account_number}</TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1A2332' }}>{a.account_name}</TableCell>
                                    <TableCell><TypeBadge type={a.account_type} /></TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{a.normal_balance || '—'}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: a.allow_posting ? '#F0FDF4' : '#F1F5F9' }}>
                                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: a.allow_posting ? '#15803D' : '#64748B' }}>{a.allow_posting ? 'Yes' : 'No'}</Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>New Account</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                    <Grid container spacing={2}>
                        <Grid item xs={6}><TextField fullWidth label="Account Number" value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} /></Grid>
                        <Grid item xs={6}><TextField fullWidth label="Account Name" value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} /></Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth select label="Account Type" value={form.account_type} onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))} SelectProps={{ native: true }}>
                                {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Cost of Goods Sold'].map(t => <option key={t} value={t}>{t}</option>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth select label="Normal Balance" value={form.normal_balance} onChange={e => setForm(p => ({ ...p, normal_balance: e.target.value }))} SelectProps={{ native: true }}>
                                <option value="Debit">Debit</option>
                                <option value="Credit">Credit</option>
                            </TextField>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setShowForm(false)} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ fontWeight: 700 }}>Save Account</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

/* ── Journal Entries ───────────────────────────────────────────────────── */
const JournalEntries = ({ companyId }) => {
    const { get, post, loading } = useApi();
    const [journals, setJournals] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [lines, setLines] = useState([{ account_id: '', debit: '', credit: '', description: '' }, { account_id: '', debit: '', credit: '', description: '' }]);
    const [jDate, setJDate] = useState(new Date().toISOString().split('T')[0]);
    const [desc, setDesc] = useState('');
    const [err, setErr] = useState(null);
    const [expanded, setExpanded] = useState({});

    const fetch = useCallback(() => {
        if (!companyId) return;
        get(`/${companyId}/finance/journals`).then(d => setJournals(d.data || [])).catch(() => {});
    }, [companyId, get]);

    useEffect(() => { fetch(); }, [fetch]);

    useEffect(() => {
        if (companyId) get(`/${companyId}/finance/accounts`).then(d => setAccounts(d.data || [])).catch(() => {});
    }, [companyId, get]);

    const addLine = () => setLines(l => [...l, { account_id: '', debit: '', credit: '', description: '' }]);
    const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i));
    const updateLine = (i, field, val) => setLines(l => l.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

    const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    const handleSave = async () => {
        setErr(null);
        if (!isBalanced) { setErr('Journal entry must be balanced (debits must equal credits)'); return; }
        try {
            const entries = lines.filter(l => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0)).map(l => ({ account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description }));
            await post(`/${companyId}/finance/journals`, { journal_date: jDate, description: desc, entries });
            setShowForm(false);
            setLines([{ account_id: '', debit: '', credit: '', description: '' }, { account_id: '', debit: '', credit: '', description: '' }]);
            setDesc('');
            fetch();
        } catch (e) { setErr(e.response?.data?.error || 'Failed to save'); }
    };

    const handlePost = async (id) => {
        try { await post(`/${companyId}/finance/journals/${id}/post`); fetch(); } catch {}
    };

    if (loading && journals.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>;

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5' }}>
                <Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{journals.length} entries</Typography>
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="contained" startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />} onClick={() => setShowForm(true)} sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    New Journal Entry
                </Button>
            </Box>

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Reference</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Total Debit</TableCell>
                        <TableCell align="right">Total Credit</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {journals.length === 0 ? (
                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>No journal entries. Create your first entry above.</TableCell></TableRow>
                    ) : journals.map(j => {
                        const isOpen = expanded[j._id];
                        const tDebit = (j.entries || []).reduce((s, e) => s + e.debit, 0);
                        const tCredit = (j.entries || []).reduce((s, e) => s + e.credit, 0);
                        return (
                            <React.Fragment key={j._id}>
                                <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setExpanded(p => ({ ...p, [j._id]: !p[j._id] }))}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1565C0', fontSize: '0.813rem' }}>{j.journal_number || j._id?.slice(-6).toUpperCase()}</TableCell>
                                    <TableCell sx={{ color: '#5F6B7C', fontSize: '0.813rem' }}>{new Date(j.journal_date).toLocaleDateString()}</TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem', color: '#1A2332' }}>{j.description || '—'}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem' }}>{fmt(tDebit)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem' }}>{fmt(tCredit)}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: j.status === 'Posted' ? '#F0FDF4' : '#F1F5F9' }}>
                                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: j.status === 'Posted' ? '#15803D' : '#64748B' }}>{j.status}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                                        {j.status === 'Draft' && (
                                            <Tooltip title="Post to GL">
                                                <IconButton size="small" onClick={() => handlePost(j._id)} sx={{ color: '#1565C0', bgcolor: '#EFF6FF', borderRadius: 1.5 }}>
                                                    <CheckCircleRoundedIcon sx={{ fontSize: 15 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                                {isOpen && (j.entries || []).map((e, i) => (
                                    <TableRow key={i} sx={{ bgcolor: '#F8FAFC' }}>
                                        <TableCell />
                                        <TableCell colSpan={2} sx={{ fontSize: '0.75rem', color: '#5F6B7C', pl: 4 }}>{e.description || accounts.find(a => a._id === e.account_id)?.account_name || e.account_id}</TableCell>
                                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 600, color: e.debit > 0 ? '#1A2332' : '#D1D5DB' }}>{e.debit > 0 ? fmt(e.debit) : '—'}</TableCell>
                                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 600, color: e.credit > 0 ? '#1A2332' : '#D1D5DB' }}>{e.credit > 0 ? fmt(e.credit) : '—'}</TableCell>
                                        <TableCell colSpan={2} />
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>

            {/* Create Journal Entry Dialog */}
            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>New Journal Entry</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={6}><TextField fullWidth label="Journal Date" type="date" InputLabelProps={{ shrink: true }} value={jDate} onChange={e => setJDate(e.target.value)} /></Grid>
                        <Grid item xs={6}><TextField fullWidth label="Description / Memo" value={desc} onChange={e => setDesc(e.target.value)} /></Grid>
                    </Grid>

                    <Box sx={{ border: '1px solid #E8ECF0', borderRadius: 2, overflow: 'hidden' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ bgcolor: '#F7F9FC', fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase' }}>Account</TableCell>
                                    <TableCell sx={{ bgcolor: '#F7F9FC', fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase' }}>Description</TableCell>
                                    <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase', width: 110 }}>Debit</TableCell>
                                    <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase', width: 110 }}>Credit</TableCell>
                                    <TableCell sx={{ bgcolor: '#F7F9FC', width: 40 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lines.map((line, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <TextField select fullWidth size="small" value={line.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)} SelectProps={{ native: true }} sx={{ '& fieldset': { border: 'none' } }}>
                                                <option value="">Select account...</option>
                                                {accounts.filter(a => a.allow_posting).map(a => <option key={a._id} value={a._id}>{a.account_number} — {a.account_name}</option>)}
                                            </TextField>
                                        </TableCell>
                                        <TableCell>
                                            <TextField fullWidth size="small" placeholder="Line description" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} sx={{ '& fieldset': { border: 'none' } }} />
                                        </TableCell>
                                        <TableCell>
                                            <TextField fullWidth size="small" type="number" inputProps={{ step: 0.01, min: 0 }} placeholder="0.00" value={line.debit} onChange={e => updateLine(i, 'debit', e.target.value)} sx={{ '& fieldset': { border: 'none' }, '& input': { textAlign: 'right' } }} />
                                        </TableCell>
                                        <TableCell>
                                            <TextField fullWidth size="small" type="number" inputProps={{ step: 0.01, min: 0 }} placeholder="0.00" value={line.credit} onChange={e => updateLine(i, 'credit', e.target.value)} sx={{ '& fieldset': { border: 'none' }, '& input': { textAlign: 'right' } }} />
                                        </TableCell>
                                        <TableCell>
                                            {lines.length > 2 && (
                                                <IconButton size="small" onClick={() => removeLine(i)} sx={{ color: '#94A3B8' }}>
                                                    <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                    <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Totals</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.875rem', color: isBalanced ? '#15803D' : '#B91C1C' }}>{fmt(totalDebit)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.875rem', color: isBalanced ? '#15803D' : '#B91C1C' }}>{fmt(totalCredit)}</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>

                    {!isBalanced && totalDebit > 0 && (
                        <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2, fontSize: '0.813rem' }}>
                            Entry is not balanced. Difference: {fmt(Math.abs(totalDebit - totalCredit))}
                        </Alert>
                    )}

                    <Button size="small" startIcon={<AddRoundedIcon />} onClick={addLine} sx={{ mt: 1.5, fontSize: '0.75rem', color: '#1565C0' }}>
                        Add Line
                    </Button>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setShowForm(false)} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={!isBalanced} sx={{ fontWeight: 700 }}>Save Journal Entry</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

/* ── Trial Balance ─────────────────────────────────────────────────────── */
const TrialBalance = ({ companyId }) => {
    const { get, loading } = useApi();
    const [rows, setRows] = useState([]);
    const [totals, setTotals] = useState({});
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (!companyId) return;
        get(`/${companyId}/finance/trial-balance?fiscal_year=${year}`)
            .then(d => { setRows(d.data || []); setTotals(d.totals || {}); })
            .catch(() => {});
    }, [companyId, get, year]);

    const isBalanced = Math.abs((totals.total_debit || 0) - (totals.total_credit || 0)) < 0.01;

    const exportCSV = () => {
        const r = [['Account #', 'Account Name', 'Type', 'Debit', 'Credit'], ...rows.map(r => [r.account_number, r.account_name, r.account_type, Number(r.debit_balance).toFixed(2), Number(r.credit_balance).toFixed(2)])];
        const csv = r.map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `TrialBalance_${year}.csv`; a.click();
    };

    if (loading && rows.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>;

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>Fiscal Year:</Typography>
                    <TextField select size="small" value={year} onChange={e => setYear(Number(e.target.value))} SelectProps={{ native: true }} sx={{ '& select': { fontSize: '0.813rem', py: 0.5 }, '& fieldset': { borderColor: '#E8ECF0' } }}>
                        {[2022, 2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </TextField>
                </Box>
                {rows.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: isBalanced ? '#F0FDF4' : '#FEF2F2' }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: isBalanced ? '#15803D' : '#B91C1C' }} />
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: isBalanced ? '#15803D' : '#B91C1C' }}>
                            {isBalanced ? 'Balanced' : 'Out of balance'}
                        </Typography>
                    </Box>
                )}
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />} onClick={exportCSV} disabled={rows.length === 0} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#5F6B7C', borderColor: '#E8ECF0' }}>
                    Export CSV
                </Button>
            </Box>

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 100 }}>Account #</TableCell>
                        <TableCell>Account Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Debit</TableCell>
                        <TableCell align="right">Credit</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>No data — post transactions first to populate the trial balance.</TableCell></TableRow>
                    ) : (
                        <>
                            {rows.map((r, i) => (
                                <TableRow key={i} hover>
                                    <TableCell sx={{ fontSize: '0.813rem', fontFamily: 'monospace', color: '#1565C0', fontWeight: 700 }}>{r.account_number}</TableCell>
                                    <TableCell sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1A2332' }}>{r.account_name}</TableCell>
                                    <TableCell><TypeBadge type={r.account_type} /></TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.813rem', color: r.debit_balance > 0 ? '#1A2332' : '#D1D5DB' }}>{fmt(r.debit_balance)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.813rem', color: r.credit_balance > 0 ? '#1A2332' : '#D1D5DB' }}>{fmt(r.credit_balance)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                <TableCell colSpan={3} sx={{ fontWeight: 800, fontSize: '0.875rem', color: '#1A2332' }}>Totals</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem', color: isBalanced ? '#15803D' : '#B91C1C' }}>{fmt(totals.total_debit)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem', color: isBalanced ? '#15803D' : '#B91C1C' }}>{fmt(totals.total_credit)}</TableCell>
                            </TableRow>
                        </>
                    )}
                </TableBody>
            </Table>
        </>
    );
};

/* ── Finance Page ──────────────────────────────────────────────────────── */
const Finance = () => {
    const { selectedCompanyId } = useAuth();
    const [tab, setTab] = useState(0);

    const tabItems = [
        { label: 'Chart of Accounts', icon: <AccountBalanceRoundedIcon sx={{ fontSize: 16 }} /> },
        { label: 'Journal Entries', icon: <LibraryBooksRoundedIcon sx={{ fontSize: 16 }} /> },
        { label: 'Trial Balance', icon: <ReceiptLongRoundedIcon sx={{ fontSize: 16 }} /> },
    ];

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Finance</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>General ledger, journal entries, chart of accounts and reporting</Typography>
            </Box>

            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ borderBottom: '1px solid #F0F2F5', px: 2 }}>
                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            sx={{ '& .MuiTab-root': { fontSize: '0.813rem', fontWeight: 600, minHeight: 48, textTransform: 'none', color: '#5F6B7C', gap: 0.5 }, '& .Mui-selected': { color: '#1565C0' }, '& .MuiTabs-indicator': { bgcolor: '#1565C0', height: 2.5, borderRadius: 2 } }}
                        >
                            {tabItems.map((t, i) => <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />)}
                        </Tabs>
                    </Box>
                    {tab === 0 && <ChartOfAccounts companyId={selectedCompanyId} />}
                    {tab === 1 && <JournalEntries companyId={selectedCompanyId} />}
                    {tab === 2 && <TrialBalance companyId={selectedCompanyId} />}
                </CardContent>
            </Card>
        </Box>
    );
};

export default Finance;
