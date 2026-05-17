import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Drawer, TextField,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, IconButton, Tooltip, Pagination, Checkbox, FormControlLabel,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import { exportToCSV } from '../utils/export';

const STATUS_COLORS = { Draft: 'default', Submitted: 'warning', Approved: 'success', Rejected: 'error' };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const emptyEntry = () => ({ date: '', project: '', task_description: '', hours: 0, billable: false });

const getWeekBounds = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(now.setDate(diff));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return {
        week_start: mon.toISOString().slice(0, 10),
        week_end: sun.toISOString().slice(0, 10),
    };
};

const emptyForm = { employee_id: '', ...getWeekBounds(), entries: DAYS.map(() => emptyEntry()) };

export default function Timesheets() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [timesheets, setTimesheets] = useState([]);
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
        const [tsRes, empRes] = await Promise.all([
            get(`/${selectedCompanyId}/hr/timesheets?${params}`),
            get(`/${selectedCompanyId}/hr/employees`),
        ]);
        if (tsRes?.data) { setTimesheets(tsRes.data); setTotal(tsRes.pagination?.total || 0); }
        if (empRes?.data) setEmployees(empRes.data);
    }, [selectedCompanyId, page, statusFilter, get]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        setSaving(true);
        const weekStart = new Date(form.week_start + 'T00:00:00');
        const entries = form.entries
            .map((e, i) => ({
                ...e,
                date: e.date || new Date(weekStart.getTime() + i * 86400000).toISOString().slice(0, 10),
            }))
            .filter(e => parseFloat(e.hours) > 0);
        const res = await post(`/${selectedCompanyId}/hr/timesheets`, { ...form, entries });
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm({ ...emptyForm, ...getWeekBounds() }); load(); }
    };

    const handleSubmit = async (id) => {
        await post(`/${selectedCompanyId}/hr/timesheets/${id}/submit`);
        load();
        if (selected?._id === id) setDrawerOpen(false);
    };

    const handleApprove = async (id) => {
        await post(`/${selectedCompanyId}/hr/timesheets/${id}/approve`, { action: 'approve' });
        load();
        setDrawerOpen(false);
    };

    const handleReject = async (id) => {
        const reason = window.prompt('Rejection reason:');
        if (reason === null) return;
        await post(`/${selectedCompanyId}/hr/timesheets/${id}/approve`, { action: 'reject', rejection_reason: reason });
        load();
        setDrawerOpen(false);
    };

    const setEntry = (idx, field, val) => setForm(f => {
        const entries = [...f.entries];
        entries[idx] = { ...entries[idx], [field]: val };
        return { ...f, entries };
    });

    const totalHours = form.entries.reduce((s, e) => s + parseFloat(e.hours || 0), 0);

    const filtered = timesheets.filter(t =>
        !search ||
        `${t.employee_id?.first_name} ${t.employee_id?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        t.employee_id?.employee_code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Timesheets</Typography>
                    <Typography variant="body2" color="text.secondary">Track weekly employee hours</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => exportToCSV(timesheets.map(t => ({ 'Timesheet #': t.timesheet_number, Employee: `${t.employee_id?.first_name} ${t.employee_id?.last_name}`, 'Week Start': t.week_start_date, 'Total Hours': t.total_hours, Status: t.status })), 'timesheets.csv')}>Export CSV</Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>New Timesheet</Button>
                </Stack>
            </Box>

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ width: 240 }} />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                        <MenuItem value="">All</MenuItem>
                        {['Draft', 'Submitted', 'Approved', 'Rejected'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{total} records</Typography>
            </Paper>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>Employee</b></TableCell>
                            <TableCell><b>Week</b></TableCell>
                            <TableCell align="right"><b>Total Hours</b></TableCell>
                            <TableCell align="right"><b>Billable</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
                            <TableCell><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !timesheets.length ? (
                            <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No timesheets found</TableCell></TableRow>
                        ) : filtered.map(ts => (
                            <TableRow key={ts._id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelected(ts); setDrawerOpen(true); }}>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600}>{ts.employee_id?.first_name} {ts.employee_id?.last_name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{ts.employee_id?.employee_code}</Typography>
                                </TableCell>
                                <TableCell>{fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</TableCell>
                                <TableCell align="right"><b>{ts.total_hours?.toFixed(1)}h</b></TableCell>
                                <TableCell align="right" sx={{ color: 'primary.main' }}>{ts.billable_hours?.toFixed(1)}h</TableCell>
                                <TableCell><Chip label={ts.status} size="small" color={STATUS_COLORS[ts.status]} /></TableCell>
                                <TableCell onClick={e => e.stopPropagation()}>
                                    <Stack direction="row" spacing={0.5}>
                                        {ts.status === 'Draft' && (
                                            <Tooltip title="Submit for approval">
                                                <IconButton size="small" color="primary" onClick={() => handleSubmit(ts._id)}><SendRoundedIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                        {ts.status === 'Submitted' && (
                                            <>
                                                <Tooltip title="Approve"><IconButton size="small" color="success" onClick={() => handleApprove(ts._id)}><CheckCircleRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Reject"><IconButton size="small" color="error" onClick={() => handleReject(ts._id)}><CancelRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                            </>
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
                                <Typography variant="h6" fontWeight={700}>{selected.employee_id?.first_name} {selected.employee_id?.last_name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {fmtDate(selected.week_start)} – {fmtDate(selected.week_end)} · {selected.total_hours?.toFixed(1)}h total
                                </Typography>
                            </Box>
                            <Chip label={selected.status} color={STATUS_COLORS[selected.status]} />
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Date</b></TableCell>
                                    <TableCell><b>Project</b></TableCell>
                                    <TableCell><b>Task</b></TableCell>
                                    <TableCell align="right"><b>Hours</b></TableCell>
                                    <TableCell><b>Billable</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {(selected.entries || []).map((e, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{fmtDate(e.date)}</TableCell>
                                            <TableCell>{e.project || '—'}</TableCell>
                                            <TableCell sx={{ maxWidth: 150 }}><Typography variant="caption" noWrap>{e.task_description || '—'}</Typography></TableCell>
                                            <TableCell align="right">{e.hours}h</TableCell>
                                            <TableCell><Chip label={e.billable ? 'Yes' : 'No'} size="small" color={e.billable ? 'primary' : 'default'} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {selected.rejection_reason && (
                            <Typography variant="body2" color="error" sx={{ mt: 2 }}>Rejection: {selected.rejection_reason}</Typography>
                        )}
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
                        </Stack>
                    </Box>
                )}
            </Drawer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => confirmClose(() => setCreateOpen(false))} maxWidth="md" fullWidth>
                <DialogTitle>New Timesheet</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Employee *</InputLabel>
                                <Select label="Employee *" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                                    {employees.map(emp => <MenuItem key={emp._id} value={emp._id}>{emp.first_name} {emp.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField size="small" type="date" label="Week Start" InputLabelProps={{ shrink: true }}
                                value={form.week_start} onChange={e => setForm(f => ({ ...f, week_start: e.target.value }))} />
                            <TextField size="small" type="date" label="Week End" InputLabelProps={{ shrink: true }}
                                value={form.week_end} onChange={e => setForm(f => ({ ...f, week_end: e.target.value }))} />
                        </Box>

                        <Typography variant="subtitle2" fontWeight={600}>Daily Entries</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ width: 60 }}><b>Day</b></TableCell>
                                    <TableCell><b>Project</b></TableCell>
                                    <TableCell><b>Task Description</b></TableCell>
                                    <TableCell sx={{ width: 80 }}><b>Hours</b></TableCell>
                                    <TableCell sx={{ width: 80 }}><b>Billable</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {form.entries.map((entry, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Typography variant="caption" fontWeight={600}>{DAYS[i]}</Typography></TableCell>
                                            <TableCell>
                                                <TextField size="small" fullWidth value={entry.project} onChange={e => setEntry(i, 'project', e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <TextField size="small" fullWidth value={entry.task_description} onChange={e => setEntry(i, 'task_description', e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <TextField size="small" type="number" value={entry.hours} sx={{ width: 70 }}
                                                    onChange={e => setEntry(i, 'hours', parseFloat(e.target.value) || 0)} />
                                            </TableCell>
                                            <TableCell>
                                                <Checkbox size="small" checked={!!entry.billable} onChange={e => setEntry(i, 'billable', e.target.checked)} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                            Total: <b>{totalHours.toFixed(1)} hours</b>
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => confirmClose(() => setCreateOpen(false))}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving || !form.employee_id}>
                        {saving ? <CircularProgress size={20} /> : 'Create Timesheet'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
