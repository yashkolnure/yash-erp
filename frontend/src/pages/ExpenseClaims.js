import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Drawer, TextField,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, IconButton, Tooltip, Pagination,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import { toNum, fmtCurrency } from '../utils/numbers';
import { exportToCSV } from '../utils/export';
import FileAttachments from '../components/FileAttachments';

const STATUS_COLORS = { Draft: 'default', Submitted: 'warning', Approved: 'success', Rejected: 'error', Paid: 'info' };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Software', 'Training', 'Entertainment', 'Other'];

const emptyLine = () => ({ date: new Date().toISOString().slice(0, 10), category: '', description: '', amount: '' });
const emptyForm = { employee_id: '', claim_date: new Date().toISOString().slice(0, 10), lines: [emptyLine()], notes: '', currency: 'USD' };

export default function ExpenseClaims() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [claims, setClaims] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 20;
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const isDirty = JSON.stringify(form) !== JSON.stringify(emptyForm);
    const { confirmClose } = useUnsavedChanges(isDirty);

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams({ skip: (page - 1) * limit, limit });
        if (statusFilter) params.set('status', statusFilter);
        const [claimRes, empRes] = await Promise.all([
            get(`/${selectedCompanyId}/hr/expense-claims?${params}`),
            get(`/${selectedCompanyId}/hr/employees`),
        ]);
        if (claimRes?.data) { setClaims(claimRes.data); setTotal(claimRes.pagination?.total || 0); }
        if (empRes?.data) setEmployees(empRes.data);
    }, [selectedCompanyId, page, statusFilter, get]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/hr/expense-claims`, form);
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); load(); }
    };

    const handleSubmit = async (id) => {
        await post(`/${selectedCompanyId}/hr/expense-claims/${id}/submit`);
        load();
        setDrawerOpen(false);
    };

    const handleApprove = async (id) => {
        await post(`/${selectedCompanyId}/hr/expense-claims/${id}/approve`);
        load();
        setDrawerOpen(false);
    };

    const handleReject = async (id) => {
        const reason = window.prompt('Rejection reason:');
        if (reason === null) return;
        await post(`/${selectedCompanyId}/hr/expense-claims/${id}/reject`, { reason });
        load();
        setDrawerOpen(false);
    };

    const handleMarkPaid = async (id) => {
        await post(`/${selectedCompanyId}/hr/expense-claims/${id}/pay`);
        load();
        setDrawerOpen(false);
    };

    const setLineField = (idx, field, val) => setForm(f => {
        const lines = [...f.lines];
        lines[idx] = { ...lines[idx], [field]: val };
        return { ...f, lines };
    });

    const formTotal = form.lines.reduce((s, l) => s + parseFloat(l.amount || 0), 0);

    const filtered = claims.filter(c =>
        !search ||
        c.claim_number?.toLowerCase().includes(search.toLowerCase()) ||
        `${c.employee_id?.first_name} ${c.employee_id?.last_name}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Expense Claims</Typography>
                    <Typography variant="body2" color="text.secondary">Submit and approve employee expense reimbursements</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => exportToCSV(claims.map(c => ({ 'Claim #': c.claim_number, Employee: `${c.employee_id?.first_name} ${c.employee_id?.last_name}`, Date: new Date(c.claim_date).toLocaleDateString(), Lines: c.lines?.length, Total: toNum(c.total_amount), Status: c.status })), 'expense-claims.csv')}>Export CSV</Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>New Claim</Button>
                </Stack>
            </Box>

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ width: 240 }} />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                        <MenuItem value="">All</MenuItem>
                        {['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{total} records</Typography>
            </Paper>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>Claim #</b></TableCell>
                            <TableCell><b>Employee</b></TableCell>
                            <TableCell><b>Date</b></TableCell>
                            <TableCell><b>Lines</b></TableCell>
                            <TableCell align="right"><b>Total</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
                            <TableCell><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !claims.length ? (
                            <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No expense claims found</TableCell></TableRow>
                        ) : filtered.map(c => (
                            <TableRow key={c._id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelected(c); setDrawerOpen(true); }}>
                                <TableCell><Typography variant="body2" fontWeight={600} color="primary">{c.claim_number}</Typography></TableCell>
                                <TableCell>{c.employee_id?.first_name} {c.employee_id?.last_name}</TableCell>
                                <TableCell>{fmtDate(c.claim_date)}</TableCell>
                                <TableCell>{c.lines?.length || 0} items</TableCell>
                                <TableCell align="right"><b>{fmtCurrency(c.total_amount)}</b></TableCell>
                                <TableCell><Chip label={c.status} size="small" color={STATUS_COLORS[c.status]} /></TableCell>
                                <TableCell onClick={e => e.stopPropagation()}>
                                    <Stack direction="row" spacing={0.5}>
                                        {c.status === 'Draft' && (
                                            <Tooltip title="Submit"><IconButton size="small" color="primary" onClick={() => handleSubmit(c._id)}><SendRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                        )}
                                        {c.status === 'Submitted' && (
                                            <>
                                                <Tooltip title="Approve"><IconButton size="small" color="success" onClick={() => handleApprove(c._id)}><CheckCircleRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Reject"><IconButton size="small" color="error" onClick={() => handleReject(c._id)}><CancelRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                            </>
                                        )}
                                        {c.status === 'Approved' && (
                                            <Tooltip title="Mark Paid"><IconButton size="small" color="info" onClick={() => handleMarkPaid(c._id)}><PaidRoundedIcon fontSize="small" /></IconButton></Tooltip>
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
                                <Typography variant="h6" fontWeight={700}>{selected.claim_number}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selected.employee_id?.first_name} {selected.employee_id?.last_name} · {fmtDate(selected.claim_date)}
                                </Typography>
                            </Box>
                            <Chip label={selected.status} color={STATUS_COLORS[selected.status]} />
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Date</b></TableCell>
                                    <TableCell><b>Category</b></TableCell>
                                    <TableCell><b>Description</b></TableCell>
                                    <TableCell align="right"><b>Amount</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {(selected.lines || []).map((l, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{fmtDate(l.date)}</TableCell>
                                            <TableCell><Chip label={l.category} size="small" /></TableCell>
                                            <TableCell sx={{ maxWidth: 150 }}><Typography variant="caption" noWrap>{l.description}</Typography></TableCell>
                                            <TableCell align="right">{fmtCurrency(l.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={3} align="right"><b>Total</b></TableCell>
                                        <TableCell align="right"><b>{fmtCurrency(selected.total_amount)}</b></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {selected.notes && <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>{selected.notes}</Typography>}
                        {selected.rejection_reason && (
                            <Typography variant="body2" color="error" sx={{ mt: 2 }}>Rejection: {selected.rejection_reason}</Typography>
                        )}
                        <Box sx={{ mt: 2 }}>
                            <FileAttachments attachments={selected.attachments || []} readonly />
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                            {selected.status === 'Draft' && (
                                <Button variant="contained" startIcon={<SendRoundedIcon />} onClick={() => handleSubmit(selected._id)}>Submit</Button>
                            )}
                            {selected.status === 'Submitted' && (
                                <>
                                    <Button variant="contained" color="success" startIcon={<CheckCircleRoundedIcon />} onClick={() => handleApprove(selected._id)}>Approve</Button>
                                    <Button variant="outlined" color="error" startIcon={<CancelRoundedIcon />} onClick={() => handleReject(selected._id)}>Reject</Button>
                                </>
                            )}
                            {selected.status === 'Approved' && (
                                <Button variant="contained" color="info" startIcon={<PaidRoundedIcon />} onClick={() => handleMarkPaid(selected._id)}>Mark Paid</Button>
                            )}
                        </Stack>
                    </Box>
                )}
            </Drawer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => confirmClose(() => setCreateOpen(false))} maxWidth="md" fullWidth>
                <DialogTitle>New Expense Claim</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Employee *</InputLabel>
                                <Select label="Employee *" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                                    {employees.map(emp => <MenuItem key={emp._id} value={emp._id}>{emp.first_name} {emp.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField size="small" type="date" label="Claim Date" InputLabelProps={{ shrink: true }}
                                value={form.claim_date} onChange={e => setForm(f => ({ ...f, claim_date: e.target.value }))} />
                            <FormControl size="small" fullWidth>
                                <InputLabel>Currency</InputLabel>
                                <Select label="Currency" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                                    {['USD', 'EUR', 'GBP', 'INR', 'AUD'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Box>

                        <Typography variant="subtitle2" fontWeight={600}>Expense Lines</Typography>
                        {form.lines.map((line, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '130px 140px 1fr 100px auto', gap: 1 }}>
                                <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }}
                                    value={line.date} onChange={e => setLineField(i, 'date', e.target.value)} />
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Category</InputLabel>
                                    <Select label="Category" value={line.category} onChange={e => setLineField(i, 'category', e.target.value)}>
                                        {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField size="small" label="Description" value={line.description} onChange={e => setLineField(i, 'description', e.target.value)} />
                                <TextField size="small" label="Amount" type="number" value={line.amount} onChange={e => setLineField(i, 'amount', e.target.value)} />
                                <Button size="small" color="error" onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))}>✕</Button>
                            </Box>
                        ))}
                        <Button size="small" onClick={() => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))}>+ Add Line</Button>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6">Total: {fmtCurrency(formTotal)}</Typography>
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
                    <Button onClick={() => confirmClose(() => setCreateOpen(false))}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving || !form.employee_id}>
                        {saving ? <CircularProgress size={20} /> : 'Create Claim'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
