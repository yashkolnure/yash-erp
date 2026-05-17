import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, TextField, Drawer, Tabs, Tab,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, IconButton, Tooltip, Divider, Pagination,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import GroupWorkRoundedIcon from '@mui/icons-material/GroupWorkRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { fmtCurrency } from '../utils/numbers';
import { exportToCSV } from '../utils/export';

const STATUS_COLORS = { Draft: 'default', Approved: 'info', Paid: 'success' };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const emptyForm = {
    employee_id: '', period_start: '', period_end: '',
    earnings: [], deductions: [], overtime_hours: 0, notes: '',
};

export default function Payroll() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [payslips, setPayslips] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [empFilter, setEmpFilter] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [bulkForm, setBulkForm] = useState({ period_start: '', period_end: '', deductions: [] });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        if (empFilter) params.set('employee_id', empFilter);
        params.set('skip', (page - 1) * limit);
        params.set('limit', limit);
        const [psRes, empRes] = await Promise.all([
            get(`/${selectedCompanyId}/payroll/payslips?${params}`),
            get(`/${selectedCompanyId}/hr/employees`),
        ]);
        if (psRes?.data) { setPayslips(psRes.data); setTotal(psRes.pagination?.total || 0); }
        if (empRes?.data) setEmployees(empRes.data);
    }, [selectedCompanyId, statusFilter, empFilter, page, get]);

    useEffect(() => { load(); }, [load]);

    const filtered = payslips.filter(p =>
        !search ||
        p.employee_id?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.payslip_number?.toLowerCase().includes(search.toLowerCase())
    );

    const openDetail = async (ps) => {
        const res = await get(`/${selectedCompanyId}/payroll/payslips/${ps._id}`);
        setSelected(res?.data || ps);
        setDrawerOpen(true);
    };

    const handleCreate = async () => {
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/payroll/payslips`, form);
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); load(); }
    };

    const handleBulk = async () => {
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/payroll/payslips/bulk`, bulkForm);
        setSaving(false);
        if (res?.data) { setBulkOpen(false); load(); }
    };

    const handleApprove = async (id) => {
        await post(`/${selectedCompanyId}/payroll/payslips/${id}/approve`);
        load();
        if (selected?._id === id) {
            const res = await get(`/${selectedCompanyId}/payroll/payslips/${id}`);
            setSelected(res?.data);
        }
    };

    const handleMarkPaid = async (id) => {
        await post(`/${selectedCompanyId}/payroll/payslips/${id}/mark-paid`);
        load();
        if (selected?._id === id) {
            const res = await get(`/${selectedCompanyId}/payroll/payslips/${id}`);
            setSelected(res?.data);
        }
    };

    const addEarning = () => setForm(f => ({ ...f, earnings: [...f.earnings, { label: '', amount: 0 }] }));
    const addDeduction = () => setForm(f => ({ ...f, deductions: [...f.deductions, { label: '', amount: 0 }] }));

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Payroll & Payslips</Typography>
                    <Typography variant="body2" color="text.secondary">Generate and manage employee payslips</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => exportToCSV(payslips.map(p => ({ 'Payslip #': p.payslip_number, Employee: `${p.employee_id?.first_name} ${p.employee_id?.last_name}`, Period: `${p.period_start} — ${p.period_end}`, Gross: p.gross_pay, Deductions: p.total_deductions, Net: p.net_pay, Status: p.status })), 'payroll.csv')}>Export CSV</Button>
                    <Button variant="outlined" startIcon={<GroupWorkRoundedIcon />} onClick={() => setBulkOpen(true)}>Bulk Generate</Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>New Payslip</Button>
                </Stack>
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ width: 220 }} />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {['Draft', 'Approved', 'Paid'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Employee</InputLabel>
                    <Select label="Employee" value={empFilter} onChange={e => setEmpFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.first_name} {e.last_name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{filtered.length} records</Typography>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>Payslip #</b></TableCell>
                            <TableCell><b>Employee</b></TableCell>
                            <TableCell><b>Period</b></TableCell>
                            <TableCell align="right"><b>Basic</b></TableCell>
                            <TableCell align="right"><b>Gross</b></TableCell>
                            <TableCell align="right"><b>Deductions</b></TableCell>
                            <TableCell align="right"><b>Net</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
                            <TableCell><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !payslips.length ? (
                            <TableRow><TableCell colSpan={9} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>No payslips found</TableCell></TableRow>
                        ) : filtered.map(ps => (
                            <TableRow key={ps._id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(ps)}>
                                <TableCell><Typography variant="body2" fontWeight={600} color="primary">{ps.payslip_number}</Typography></TableCell>
                                <TableCell>{ps.employee_id?.first_name} {ps.employee_id?.last_name}</TableCell>
                                <TableCell>{fmtDate(ps.period_start)} – {fmtDate(ps.period_end)}</TableCell>
                                <TableCell align="right">{fmtCurrency(ps.basic_salary, ps.currency)}</TableCell>
                                <TableCell align="right">{fmtCurrency(ps.gross_salary, ps.currency)}</TableCell>
                                <TableCell align="right" sx={{ color: 'error.main' }}>{fmtCurrency(ps.total_deductions, ps.currency)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>{fmtCurrency(ps.net_salary, ps.currency)}</TableCell>
                                <TableCell><Chip label={ps.status} size="small" color={STATUS_COLORS[ps.status]} /></TableCell>
                                <TableCell onClick={e => e.stopPropagation()}>
                                    <Stack direction="row" spacing={0.5}>
                                        {ps.status === 'Draft' && (
                                            <Tooltip title="Approve"><IconButton size="small" color="info" onClick={() => handleApprove(ps._id)}><CheckCircleRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                        )}
                                        {ps.status === 'Approved' && (
                                            <Tooltip title="Mark Paid"><IconButton size="small" color="success" onClick={() => handleMarkPaid(ps._id)}><PaymentsRoundedIcon fontSize="small" /></IconButton></Tooltip>
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
                                <Typography variant="h6" fontWeight={700}>{selected.payslip_number}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selected.employee_id?.first_name} {selected.employee_id?.last_name}
                                </Typography>
                            </Box>
                            <Chip label={selected.status} color={STATUS_COLORS[selected.status]} />
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        <Stack spacing={1.5}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                {[
                                    ['Period', `${fmtDate(selected.period_start)} – ${fmtDate(selected.period_end)}`],
                                    ['Working Days', selected.working_days],
                                    ['Present Days', selected.present_days],
                                    ['Absent Days', selected.absent_days],
                                    ['Leave Days', selected.leave_days],
                                    ['Overtime Hrs', selected.overtime_hours || 0],
                                ].map(([l, v]) => (
                                    <Box key={l}>
                                        <Typography variant="caption" color="text.secondary">{l}</Typography>
                                        <Typography variant="body2" fontWeight={500}>{v}</Typography>
                                    </Box>
                                ))}
                            </Box>

                            <Divider />
                            <Typography variant="subtitle2" fontWeight={700}>Earnings</Typography>
                            {(selected.earnings || []).map((e, i) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">{e.label}</Typography>
                                    <Typography variant="body2" fontWeight={500} color="success.main">{fmtCurrency(e.amount, selected.currency)}</Typography>
                                </Box>
                            ))}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <Typography variant="body2" fontWeight={700}>Gross Salary</Typography>
                                <Typography variant="body2" fontWeight={700} color="success.main">{fmtCurrency(selected.gross_salary, selected.currency)}</Typography>
                            </Box>

                            <Divider />
                            <Typography variant="subtitle2" fontWeight={700}>Deductions</Typography>
                            {(selected.deductions || []).map((d, i) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">{d.label}</Typography>
                                    <Typography variant="body2" fontWeight={500} color="error.main">{fmtCurrency(d.amount, selected.currency)}</Typography>
                                </Box>
                            ))}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" fontWeight={700}>Total Deductions</Typography>
                                <Typography variant="body2" fontWeight={700} color="error.main">{fmtCurrency(selected.total_deductions, selected.currency)}</Typography>
                            </Box>

                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                                <Typography variant="h6" fontWeight={700}>Net Salary</Typography>
                                <Typography variant="h6" fontWeight={700} color="primary">{fmtCurrency(selected.net_salary, selected.currency)}</Typography>
                            </Box>

                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                {selected.status === 'Draft' && (
                                    <Button variant="contained" color="info" startIcon={<CheckCircleRoundedIcon />} onClick={() => handleApprove(selected._id)}>
                                        Approve
                                    </Button>
                                )}
                                {selected.status === 'Approved' && (
                                    <Button variant="contained" color="success" startIcon={<PaymentsRoundedIcon />} onClick={() => handleMarkPaid(selected._id)}>
                                        Mark Paid
                                    </Button>
                                )}
                            </Stack>
                        </Stack>
                    </Box>
                )}
            </Drawer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Generate Payslip</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Employee *</InputLabel>
                            <Select label="Employee *" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                                {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.first_name} {e.last_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" type="date" label="Period Start" InputLabelProps={{ shrink: true }}
                                value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
                            <TextField size="small" type="date" label="Period End" InputLabelProps={{ shrink: true }}
                                value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
                        </Box>
                        <TextField size="small" label="Overtime Hours" type="number"
                            value={form.overtime_hours} onChange={e => setForm(f => ({ ...f, overtime_hours: e.target.value }))} />

                        <Typography variant="subtitle2" fontWeight={600}>Additional Earnings</Typography>
                        {form.earnings.map((e, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1 }}>
                                <TextField size="small" label="Label" value={e.label} onChange={ev => setForm(f => { const arr = [...f.earnings]; arr[i] = { ...arr[i], label: ev.target.value }; return { ...f, earnings: arr }; })} />
                                <TextField size="small" label="Amount" type="number" value={e.amount} onChange={ev => setForm(f => { const arr = [...f.earnings]; arr[i] = { ...arr[i], amount: ev.target.value }; return { ...f, earnings: arr }; })} />
                                <Button size="small" color="error" onClick={() => setForm(f => ({ ...f, earnings: f.earnings.filter((_, j) => j !== i) }))}>✕</Button>
                            </Box>
                        ))}
                        <Button size="small" onClick={addEarning}>+ Add Earning</Button>

                        <Typography variant="subtitle2" fontWeight={600}>Deductions</Typography>
                        {form.deductions.map((d, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1 }}>
                                <TextField size="small" label="Label" value={d.label} onChange={ev => setForm(f => { const arr = [...f.deductions]; arr[i] = { ...arr[i], label: ev.target.value }; return { ...f, deductions: arr }; })} />
                                <TextField size="small" label="Amount" type="number" value={d.amount} onChange={ev => setForm(f => { const arr = [...f.deductions]; arr[i] = { ...arr[i], amount: ev.target.value }; return { ...f, deductions: arr }; })} />
                                <Button size="small" color="error" onClick={() => setForm(f => ({ ...f, deductions: f.deductions.filter((_, j) => j !== i) }))}>✕</Button>
                            </Box>
                        ))}
                        <Button size="small" onClick={addDeduction}>+ Add Deduction</Button>

                        <TextField size="small" label="Notes" multiline rows={2} fullWidth
                            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving || !form.employee_id || !form.period_start}>
                        {saving ? <CircularProgress size={20} /> : 'Generate'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Generate Dialog */}
            <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Bulk Generate Payslips</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Generates payslips for all active employees. Skips employees with existing payslips for the period.
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" type="date" label="Period Start" InputLabelProps={{ shrink: true }}
                                value={bulkForm.period_start} onChange={e => setBulkForm(f => ({ ...f, period_start: e.target.value }))} />
                            <TextField size="small" type="date" label="Period End" InputLabelProps={{ shrink: true }}
                                value={bulkForm.period_end} onChange={e => setBulkForm(f => ({ ...f, period_end: e.target.value }))} />
                        </Box>
                        <Typography variant="subtitle2" fontWeight={600}>Common Deductions (applied to all)</Typography>
                        {bulkForm.deductions.map((d, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1 }}>
                                <TextField size="small" label="Label" value={d.label} onChange={ev => setBulkForm(f => { const arr = [...f.deductions]; arr[i] = { ...arr[i], label: ev.target.value }; return { ...f, deductions: arr }; })} />
                                <TextField size="small" label="Amount" type="number" value={d.amount} onChange={ev => setBulkForm(f => { const arr = [...f.deductions]; arr[i] = { ...arr[i], amount: ev.target.value }; return { ...f, deductions: arr }; })} />
                                <Button size="small" color="error" onClick={() => setBulkForm(f => ({ ...f, deductions: f.deductions.filter((_, j) => j !== i) }))}>✕</Button>
                            </Box>
                        ))}
                        <Button size="small" onClick={() => setBulkForm(f => ({ ...f, deductions: [...f.deductions, { label: '', amount: 0 }] }))}>+ Add Deduction</Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="secondary" onClick={handleBulk} disabled={saving || !bulkForm.period_start}>
                        {saving ? <CircularProgress size={20} /> : 'Generate for All'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
