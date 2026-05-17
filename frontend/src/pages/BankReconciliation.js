import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, Card, Grid, Table, TableBody, TableCell,
    TableHead, TableRow, TablePagination, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Alert, MenuItem, Chip, IconButton, Divider,
    CircularProgress, Tooltip, Stack, Paper,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import { toNum, fmtCurrency } from '../utils/numbers';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
const statusColor = { Draft: 'default', Partial: 'warning', Reconciled: 'success' };

/* ── New Statement Dialog ─────────────────────────────────────────────────── */
const NewStatementDialog = ({ open, onClose, companyId, onCreated }) => {
    const { post, loading, error } = useApi();
    const { get } = useApi();
    const [bankAccounts, setBankAccounts] = useState([]);
    const [form, setForm] = useState({
        bank_account_id: '', statement_date: new Date().toISOString().split('T')[0],
        opening_balance: '', closing_balance: '', currency: 'USD',
    });
    const [lines, setLines] = useState([]);
    const [lineError, setLineError] = useState('');

    useEffect(() => {
        if (!open) return;
        get(`/${companyId}/admin/bank-accounts`).then(r => setBankAccounts(r.data || [])).catch(() => {});
    }, [open, companyId, get]);

    const handleForm = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const addLine = () => setLines(ls => [
        ...ls,
        { date: new Date().toISOString().split('T')[0], description: '', reference: '', debit: '', credit: '', balance: '' },
    ]);

    const updateLine = (idx, field, value) =>
        setLines(ls => ls.map((l, i) => i === idx ? { ...l, [field]: value } : l));

    const removeLine = (idx) => setLines(ls => ls.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        setLineError('');
        if (!form.bank_account_id) { setLineError('Please select a bank account.'); return; }
        if (!form.statement_date) { setLineError('Statement date is required.'); return; }
        try {
            const payload = {
                ...form,
                opening_balance: parseFloat(form.opening_balance) || 0,
                closing_balance: parseFloat(form.closing_balance) || 0,
                lines: lines.map(l => ({
                    ...l,
                    debit: parseFloat(l.debit) || 0,
                    credit: parseFloat(l.credit) || 0,
                    balance: parseFloat(l.balance) || 0,
                })),
            };
            const res = await post(`/${companyId}/finance/reconciliation`, payload);
            onCreated(res.data);
            onClose();
            setForm({ bank_account_id: '', statement_date: new Date().toISOString().split('T')[0], opening_balance: '', closing_balance: '', currency: 'USD' });
            setLines([]);
        } catch {}
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>New Bank Statement</DialogTitle>
            <DialogContent dividers>
                {(error || lineError) && <Alert severity="error" sx={{ mb: 2 }}>{lineError || error}</Alert>}
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField select fullWidth required label="Bank Account" name="bank_account_id"
                            value={form.bank_account_id} onChange={handleForm}>
                            {bankAccounts.map(a => (
                                <MenuItem key={a._id} value={a._id}>
                                    {a.account_name} {a.account_number ? `(${a.account_number})` : ''}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth required label="Statement Date" type="date"
                            InputLabelProps={{ shrink: true }} name="statement_date"
                            value={form.statement_date} onChange={handleForm} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth label="Opening Balance" type="number" name="opening_balance"
                            value={form.opening_balance} onChange={handleForm} inputProps={{ step: 0.01 }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth label="Closing Balance" type="number" name="closing_balance"
                            value={form.closing_balance} onChange={handleForm} inputProps={{ step: 0.01 }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth label="Currency" name="currency"
                            value={form.currency} onChange={handleForm} />
                    </Grid>
                </Grid>

                {/* Lines */}
                <Box sx={{ mt: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Statement Lines</Typography>
                        <Button size="small" startIcon={<AddRoundedIcon />} onClick={addLine} variant="outlined">
                            Add Line
                        </Button>
                    </Stack>
                    {lines.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            No lines added yet. Click "Add Line" to begin.
                        </Typography>
                    )}
                    {lines.map((line, idx) => (
                        <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2 }}>
                            <Grid container spacing={1} alignItems="center">
                                <Grid item xs={6} sm={2}>
                                    <TextField fullWidth size="small" label="Date" type="date"
                                        InputLabelProps={{ shrink: true }}
                                        value={line.date} onChange={e => updateLine(idx, 'date', e.target.value)} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <TextField fullWidth size="small" label="Description"
                                        value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
                                </Grid>
                                <Grid item xs={6} sm={2}>
                                    <TextField fullWidth size="small" label="Reference"
                                        value={line.reference} onChange={e => updateLine(idx, 'reference', e.target.value)} />
                                </Grid>
                                <Grid item xs={4} sm={1.5}>
                                    <TextField fullWidth size="small" label="Debit" type="number"
                                        value={line.debit} onChange={e => updateLine(idx, 'debit', e.target.value)} inputProps={{ step: 0.01, min: 0 }} />
                                </Grid>
                                <Grid item xs={4} sm={1.5}>
                                    <TextField fullWidth size="small" label="Credit" type="number"
                                        value={line.credit} onChange={e => updateLine(idx, 'credit', e.target.value)} inputProps={{ step: 0.01, min: 0 }} />
                                </Grid>
                                <Grid item xs={4} sm={1.5}>
                                    <TextField fullWidth size="small" label="Balance" type="number"
                                        value={line.balance} onChange={e => updateLine(idx, 'balance', e.target.value)} inputProps={{ step: 0.01 }} />
                                </Grid>
                                <Grid item xs={1} sm={0.5} sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <IconButton size="small" color="error" onClick={() => removeLine(idx)}>
                                        <DeleteOutlineRoundedIcon fontSize="small" />
                                    </IconButton>
                                </Grid>
                            </Grid>
                        </Paper>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading} sx={{ fontWeight: 700 }}>
                    {loading ? 'Creating...' : 'Create Statement'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Match Payment Dialog ─────────────────────────────────────────────────── */
const MatchDialog = ({ open, onClose, companyId, statementId, lineIndex, line, onMatched }) => {
    const { get, post, loading, error } = useApi();
    const [payments, setPayments] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    useEffect(() => {
        if (!open) { setSelectedPayment(null); return; }
        setFetching(true);
        // Fetch suggestions first; fall back to all payments
        get(`/${companyId}/finance/reconciliation/${statementId}/suggestions`)
            .then(r => setPayments(r.data?.available_payments || []))
            .catch(() => get(`/${companyId}/payments`).then(r => setPayments(r.data || [])).catch(() => {}))
            .finally(() => setFetching(false));
    }, [open, companyId, statementId, get]);

    const handleMatch = async () => {
        if (!selectedPayment) return;
        try {
            const res = await post(`/${companyId}/finance/reconciliation/${statementId}/match/${lineIndex}`, { payment_id: selectedPayment._id });
            onMatched(res.data);
            onClose();
        } catch {}
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>
                Match Line to Payment
                {line && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {line.description} — {fmtDate(line.date)}
                        {toNum(line.debit) > 0 ? ` | Debit: ${fmtCurrency(line.debit)}` : ''}
                        {toNum(line.credit) > 0 ? ` | Credit: ${fmtCurrency(line.credit)}` : ''}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {fetching ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : payments.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        No available payments found for this date range.
                    </Typography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Method</TableCell>
                                <TableCell>Reference</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payments.map(p => (
                                <TableRow
                                    key={p._id}
                                    hover
                                    selected={selectedPayment?._id === p._id}
                                    onClick={() => setSelectedPayment(p)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell>{fmtDate(p.payment_date)}</TableCell>
                                    <TableCell>{p.payment_type}</TableCell>
                                    <TableCell>{p.payment_method}</TableCell>
                                    <TableCell>{p.reference_number || '—'}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                        {fmtCurrency(p.amount, p.currency)}
                                    </TableCell>
                                    <TableCell>
                                        {selectedPayment?._id === p._id && (
                                            <CheckCircleRoundedIcon color="success" fontSize="small" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                <Button variant="contained" onClick={handleMatch} disabled={!selectedPayment || loading}
                    startIcon={<LinkRoundedIcon />} sx={{ fontWeight: 700 }}>
                    {loading ? 'Matching...' : 'Match Payment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Statement Lines Table ────────────────────────────────────────────────── */
const StatementLines = ({ statement, companyId, onUpdated }) => {
    const { post, loading } = useApi();
    const [matchDialog, setMatchDialog] = useState({ open: false, lineIndex: null, line: null });
    const [reconcileLoading, setReconcileLoading] = useState(false);
    const [reconcileError, setReconcileError] = useState('');

    const handleUnmatch = async (lineIndex) => {
        try {
            const res = await post(`/${companyId}/finance/reconciliation/${statement._id}/unmatch/${lineIndex}`, {});
            onUpdated(res.data);
        } catch {}
    };

    const handleReconcile = async (allowPartial = false) => {
        setReconcileError('');
        setReconcileLoading(true);
        try {
            const res = await post(`/${companyId}/finance/reconciliation/${statement._id}/reconcile`, { allow_partial: allowPartial });
            onUpdated(res.data);
        } catch (err) {
            const msg = err.response?.data?.error || 'Reconcile failed';
            if (msg.includes('allow_partial')) {
                // prompt to allow partial
                if (window.confirm(`Not all lines are matched.\n\nReconcile as Partial?`)) {
                    setReconcileLoading(false);
                    await handleReconcile(true);
                    return;
                }
            } else {
                setReconcileError(msg);
            }
        } finally {
            setReconcileLoading(false);
        }
    };

    const currency = statement.currency || 'USD';
    const allMatched = statement.lines.every(l => l.matched);
    const anyMatched = statement.lines.some(l => l.matched);
    const isReconciled = statement.status === 'Reconciled';

    return (
        <Box>
            {/* Statement header */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary">Bank Account</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {statement.bank_account_id?.account_name || '—'}
                        {statement.bank_account_id?.account_number ? ` · ${statement.bank_account_id.account_number}` : ''}
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">Statement Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtDate(statement.statement_date)}</Typography>
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">Opening Balance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtCurrency(statement.opening_balance, currency)}</Typography>
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">Closing Balance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtCurrency(statement.closing_balance, currency)}</Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                    <Chip
                        label={statement.status}
                        color={statusColor[statement.status] || 'default'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                    />
                </Box>
            </Box>

            {reconcileError && <Alert severity="error" sx={{ mb: 2 }}>{reconcileError}</Alert>}

            {/* Lines table */}
            {statement.lines.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    This statement has no lines.
                </Typography>
            ) : (
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Debit</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Credit</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {statement.lines.map((line, idx) => (
                                <TableRow key={idx} hover sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>{idx + 1}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(line.date)}</TableCell>
                                    <TableCell sx={{ maxWidth: 200 }}>
                                        <Tooltip title={line.description || ''} arrow>
                                            <Typography variant="body2" noWrap>{line.description || '—'}</Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ color: '#64748B', fontSize: '0.8rem' }}>{line.reference || '—'}</TableCell>
                                    <TableCell align="right" sx={{ color: toNum(line.debit) > 0 ? '#EF4444' : '#94A3B8', fontWeight: toNum(line.debit) > 0 ? 600 : 400 }}>
                                        {toNum(line.debit) > 0 ? fmtCurrency(line.debit) : '—'}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: toNum(line.credit) > 0 ? '#10B981' : '#94A3B8', fontWeight: toNum(line.credit) > 0 ? 600 : 400 }}>
                                        {toNum(line.credit) > 0 ? fmtCurrency(line.credit) : '—'}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 500 }}>{fmtCurrency(line.balance)}</TableCell>
                                    <TableCell align="center">
                                        {line.matched ? (
                                            <Chip
                                                label="Matched"
                                                color="success"
                                                size="small"
                                                icon={<CheckCircleRoundedIcon />}
                                                sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                                            />
                                        ) : (
                                            <Chip label="Unmatched" size="small" sx={{ fontWeight: 500, fontSize: '0.72rem' }} />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        {line.matched ? (
                                            <Tooltip title={`Matched to payment on ${fmtDate(line.matched_at)}`} arrow>
                                                <span>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        startIcon={<LinkOffRoundedIcon />}
                                                        onClick={() => handleUnmatch(idx)}
                                                        disabled={loading || isReconciled}
                                                        sx={{ fontSize: '0.72rem', py: 0.3 }}
                                                    >
                                                        Unmatch
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                        ) : (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<LinkRoundedIcon />}
                                                onClick={() => setMatchDialog({ open: true, lineIndex: idx, line })}
                                                disabled={isReconciled}
                                                sx={{ fontSize: '0.72rem', py: 0.3 }}
                                            >
                                                Match
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}

            {/* Reconcile footer */}
            {statement.lines.length > 0 && !isReconciled && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5, borderTop: '1px solid #F1F5F9', pt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                        {statement.lines.filter(l => l.matched).length} / {statement.lines.length} lines matched
                    </Typography>
                    <Button
                        variant="contained"
                        color={allMatched ? 'success' : 'warning'}
                        startIcon={<CheckCircleRoundedIcon />}
                        onClick={() => handleReconcile(false)}
                        disabled={!anyMatched || reconcileLoading}
                        sx={{ fontWeight: 700 }}
                    >
                        {reconcileLoading ? 'Reconciling...' : allMatched ? 'Reconcile Statement' : 'Reconcile (Partial)'}
                    </Button>
                </Box>
            )}
            {isReconciled && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#10B981' }}>
                    <CheckCircleRoundedIcon fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Reconciled on {fmtDate(statement.reconciled_at)}
                    </Typography>
                </Box>
            )}

            <MatchDialog
                open={matchDialog.open}
                onClose={() => setMatchDialog({ open: false, lineIndex: null, line: null })}
                companyId={companyId}
                statementId={statement._id}
                lineIndex={matchDialog.lineIndex}
                line={matchDialog.line}
                onMatched={onUpdated}
            />
        </Box>
    );
};

/* ── Main Page ────────────────────────────────────────────────────────────── */
const BankReconciliation = () => {
    const { selectedCompanyId: companyId } = useAuth();
    const { get, loading } = useApi();
    const [statements, setStatements] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(15);
    const [selectedStatement, setSelectedStatement] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [newDialogOpen, setNewDialogOpen] = useState(false);

    const fetchStatements = useCallback(async () => {
        if (!companyId) return;
        try {
            const res = await get(`/${companyId}/finance/reconciliation?page=${page + 1}&limit=${rowsPerPage}`);
            setStatements(res.data || []);
            setTotal(res.pagination?.total || 0);
        } catch {}
    }, [companyId, page, rowsPerPage, get]);

    useEffect(() => { fetchStatements(); }, [fetchStatements]);

    const loadStatementDetail = async (stmt) => {
        setDetailLoading(true);
        try {
            const res = await get(`/${companyId}/finance/reconciliation/${stmt._id}`);
            setSelectedStatement(res.data);
        } catch {} finally {
            setDetailLoading(false);
        }
    };

    const handleCreated = (newStmt) => {
        fetchStatements();
        loadStatementDetail(newStmt);
    };

    const handleStatementUpdated = (updatedStmt) => {
        setSelectedStatement(updatedStmt);
        // Refresh list to reflect new status
        fetchStatements();
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AccountBalanceRoundedIcon sx={{ color: '#7C3AED', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>Bank Reconciliation</Typography>
                        <Typography variant="body2" color="text.secondary">Match bank statement lines to payments</Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => setNewDialogOpen(true)}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                    New Statement
                </Button>
            </Stack>

            <Grid container spacing={2.5}>
                {/* Left Panel — Statement List */}
                <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F1F5F9' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#374151' }}>
                                Statements ({total})
                            </Typography>
                        </Box>
                        {loading && !statements.length ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : statements.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                                <AccountBalanceRoundedIcon sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                                <Typography color="text.secondary" variant="body2">No statements yet. Create one to start reconciling.</Typography>
                            </Box>
                        ) : (
                            <>
                                {statements.map(stmt => {
                                    const isSelected = selectedStatement?._id === stmt._id;
                                    return (
                                        <Box
                                            key={stmt._id}
                                            onClick={() => loadStatementDetail(stmt)}
                                            sx={{
                                                px: 2, py: 1.5,
                                                borderBottom: '1px solid #F8FAFC',
                                                cursor: 'pointer',
                                                bgcolor: isSelected ? '#F5F3FF' : 'transparent',
                                                borderLeft: isSelected ? '3px solid #7C3AED' : '3px solid transparent',
                                                transition: 'all 0.15s',
                                                '&:hover': { bgcolor: isSelected ? '#F5F3FF' : '#FAFAFA' },
                                            }}
                                        >
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', noWrap: true }}>
                                                        {stmt.bank_account_id?.account_name || 'Unknown Account'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {fmtDate(stmt.statement_date)}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={stmt.status}
                                                    color={statusColor[stmt.status] || 'default'}
                                                    size="small"
                                                    sx={{ fontSize: '0.68rem', fontWeight: 600, ml: 1, flexShrink: 0 }}
                                                />
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                                Closing: {fmtCurrency(stmt.closing_balance, stmt.currency)}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                                <TablePagination
                                    component="div"
                                    count={total}
                                    page={page}
                                    rowsPerPage={rowsPerPage}
                                    onPageChange={(_, p) => setPage(p)}
                                    rowsPerPageOptions={[15]}
                                    sx={{ borderTop: '1px solid #F1F5F9' }}
                                />
                            </>
                        )}
                    </Card>
                </Grid>

                {/* Right Panel — Statement Detail */}
                <Grid item xs={12} md={8}>
                    <Card variant="outlined" sx={{ borderRadius: 3, minHeight: 400 }}>
                        {!selectedStatement && !detailLoading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: '#94A3B8' }}>
                                <AccountBalanceRoundedIcon sx={{ fontSize: 56, mb: 2, color: '#E2E8F0' }} />
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#CBD5E1' }}>Select a statement</Typography>
                                <Typography variant="body2" color="text.disabled">Choose a statement from the left panel to view and reconcile its lines.</Typography>
                            </Box>
                        ) : detailLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Box sx={{ p: 2.5 }}>
                                <StatementLines
                                    statement={selectedStatement}
                                    companyId={companyId}
                                    onUpdated={handleStatementUpdated}
                                />
                            </Box>
                        )}
                    </Card>
                </Grid>
            </Grid>

            <NewStatementDialog
                open={newDialogOpen}
                onClose={() => setNewDialogOpen(false)}
                companyId={companyId}
                onCreated={handleCreated}
            />
        </Box>
    );
};

export default BankReconciliation;
