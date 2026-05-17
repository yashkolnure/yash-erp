import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Tabs, Tab, TextField,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, LinearProgress, IconButton, Tooltip, Grid, Card, CardContent, Pagination,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';

const STATUS_COLORS = { Pending: 'warning', Approved: 'success', Rejected: 'error', Cancelled: 'default' };
const LEAVE_TYPES = ['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid', 'Other'];
const ENTITLEMENT = { Annual: 21, Sick: 10, Casual: 7, Maternity: 90, Paternity: 5, Unpaid: 0, Other: 0 };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const emptyLeave = { employee_id: '', leave_type: 'Annual', start_date: '', end_date: '', reason: '', half_day: false };

export default function LeaveManagement() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [tab, setTab] = useState(0);
    const [leaves, setLeaves] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;
    const [total, setTotal] = useState(0);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyLeave);
    const [saving, setSaving] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [balances, setBalances] = useState([]);
    const [attForm, setAttForm] = useState({ employee_id: '', date: new Date().toISOString().slice(0, 10), status: 'Present', check_in: '', check_out: '' });
    const [attOpen, setAttOpen] = useState(false);
    const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
    const [attYear, setAttYear] = useState(new Date().getFullYear());
    const [attSummary, setAttSummary] = useState([]);

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        params.set('skip', (page - 1) * limit);
        params.set('limit', limit);
        const [leavesRes, empRes] = await Promise.all([
            get(`/${selectedCompanyId}/hr/leave?${params}`),
            get(`/${selectedCompanyId}/hr/employees`),
        ]);
        if (leavesRes?.data) { setLeaves(leavesRes.data); setTotal(leavesRes.pagination?.total || 0); }
        if (empRes?.data) setEmployees(empRes.data);
    }, [selectedCompanyId, statusFilter, page, get]);

    const loadAttendance = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams({ month: attMonth, year: attYear });
        if (selectedEmp) params.set('employee_id', selectedEmp);
        const [attRes, summaryRes] = await Promise.all([
            get(`/${selectedCompanyId}/hr/attendance?${params}&limit=100`),
            get(`/${selectedCompanyId}/hr/attendance/summary?month=${attMonth}&year=${attYear}`),
        ]);
        if (attRes?.data) setAttendance(attRes.data);
        if (summaryRes?.data) setAttSummary(summaryRes.data);
    }, [selectedCompanyId, attMonth, attYear, selectedEmp, get]);

    const loadBalance = useCallback(async () => {
        if (!selectedCompanyId || !selectedEmp) return;
        const res = await get(`/${selectedCompanyId}/hr/employees/${selectedEmp}/leave-balance`);
        if (res?.data) setBalances(res.data);
    }, [selectedCompanyId, selectedEmp, get]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { if (tab === 1) loadAttendance(); }, [tab, loadAttendance]);
    useEffect(() => { if (tab === 2 && selectedEmp) loadBalance(); }, [tab, selectedEmp, loadBalance]);

    const handleCreate = async () => {
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/hr/leave`, form);
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyLeave); load(); }
    };

    const handleAction = async (id, action) => {
        await post(`/${selectedCompanyId}/hr/leave/${id}/${action}`, {});
        load();
    };

    const handleMarkAttendance = async () => {
        const res = await post(`/${selectedCompanyId}/hr/attendance`, attForm);
        if (res?.data) { setAttOpen(false); loadAttendance(); }
    };

    const filtered = leaves.filter(l =>
        !search ||
        l.employee_id?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.employee_id?.last_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>HR — Leave & Attendance</Typography>
                    <Typography variant="body2" color="text.secondary">Manage leave requests and daily attendance</Typography>
                </Box>
                {tab === 0 && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>Apply Leave</Button>}
                {tab === 1 && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAttOpen(true)}>Mark Attendance</Button>}
            </Box>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Leave Requests" />
                    <Tab label="Attendance" />
                    <Tab label="Leave Balance" />
                </Tabs>
            </Paper>

            {/* Leave Requests Tab */}
            {tab === 0 && (
                <Stack spacing={2}>
                    <Paper sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField size="small" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ width: 250 }} />
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Status</InputLabel>
                            <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                {['Pending', 'Approved', 'Rejected', 'Cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Paper>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Employee</b></TableCell>
                                    <TableCell><b>Type</b></TableCell>
                                    <TableCell><b>From</b></TableCell>
                                    <TableCell><b>To</b></TableCell>
                                    <TableCell><b>Days</b></TableCell>
                                    <TableCell><b>Reason</b></TableCell>
                                    <TableCell><b>Status</b></TableCell>
                                    <TableCell><b>Actions</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading && !leaves.length ? (
                                    <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No leave requests</TableCell></TableRow>
                                ) : filtered.map(l => (
                                    <TableRow key={l._id} hover>
                                        <TableCell>{l.employee_id?.first_name} {l.employee_id?.last_name}</TableCell>
                                        <TableCell><Chip label={l.leave_type} size="small" /></TableCell>
                                        <TableCell>{fmtDate(l.start_date)}</TableCell>
                                        <TableCell>{fmtDate(l.end_date)}</TableCell>
                                        <TableCell>{l.days}{l.half_day ? ' (half)' : ''}</TableCell>
                                        <TableCell sx={{ maxWidth: 200 }}><Typography variant="caption" noWrap>{l.reason}</Typography></TableCell>
                                        <TableCell><Chip label={l.status} size="small" color={STATUS_COLORS[l.status]} /></TableCell>
                                        <TableCell>
                                            {l.status === 'Pending' && (
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="Approve">
                                                        <IconButton size="small" color="success" onClick={() => handleAction(l._id, 'approve')}><CheckCircleRoundedIcon fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Reject">
                                                        <IconButton size="small" color="error" onClick={() => handleAction(l._id, 'reject')}><CancelRoundedIcon fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                </Stack>
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

            {/* Attendance Tab */}
            {tab === 1 && (
                <Stack spacing={2}>
                    <Paper sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Employee</InputLabel>
                            <Select label="Employee" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.first_name} {e.last_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Month" type="number" value={attMonth} onChange={e => setAttMonth(e.target.value)} sx={{ width: 90 }} />
                        <TextField size="small" label="Year" type="number" value={attYear} onChange={e => setAttYear(e.target.value)} sx={{ width: 100 }} />
                        <Button variant="outlined" onClick={loadAttendance}>Filter</Button>
                    </Paper>

                    {attSummary.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Monthly Summary</Typography>
                            <Grid container spacing={1}>
                                {attSummary.slice(0, 6).map(s => (
                                    <Grid item xs={6} md={2} key={s.employee?._id}>
                                        <Card>
                                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                <Typography variant="caption" fontWeight={600}>{s.employee?.first_name} {s.employee?.last_name}</Typography>
                                                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                                    <Typography variant="caption" color="success.main">P:{s.present}</Typography>
                                                    <Typography variant="caption" color="error.main">A:{s.absent}</Typography>
                                                    <Typography variant="caption" color="warning.main">L:{s.late}</Typography>
                                                    <Typography variant="caption" color="info.main">H:{s.half_day}</Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Employee</b></TableCell>
                                    <TableCell><b>Date</b></TableCell>
                                    <TableCell><b>Status</b></TableCell>
                                    <TableCell><b>Check In</b></TableCell>
                                    <TableCell><b>Check Out</b></TableCell>
                                    <TableCell><b>Hours</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {attendance.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No attendance records</TableCell></TableRow>
                                ) : attendance.map(r => (
                                    <TableRow key={r._id} hover>
                                        <TableCell>{r.employee_id?.first_name} {r.employee_id?.last_name}</TableCell>
                                        <TableCell>{fmtDate(r.date)}</TableCell>
                                        <TableCell>
                                            <Chip label={r.status} size="small"
                                                color={r.status === 'Present' ? 'success' : r.status === 'Absent' ? 'error' : r.status === 'Late' ? 'warning' : 'default'} />
                                        </TableCell>
                                        <TableCell>{r.check_in ? new Date(r.check_in).toLocaleTimeString() : '—'}</TableCell>
                                        <TableCell>{r.check_out ? new Date(r.check_out).toLocaleTimeString() : '—'}</TableCell>
                                        <TableCell>{r.hours_worked ? `${r.hours_worked.toFixed(1)}h` : '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Stack>
            )}

            {/* Leave Balance Tab */}
            {tab === 2 && (
                <Stack spacing={2}>
                    <FormControl size="small" sx={{ maxWidth: 260 }}>
                        <InputLabel>Select Employee</InputLabel>
                        <Select label="Select Employee" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                            {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.first_name} {e.last_name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {balances.length > 0 && (
                        <Grid container spacing={2}>
                            {balances.map(b => (
                                <Grid item xs={12} sm={6} md={3} key={b.leave_type}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="subtitle2" fontWeight={700}>{b.leave_type}</Typography>
                                            <Box sx={{ mt: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">Used / Entitlement</Typography>
                                                    <Typography variant="caption" fontWeight={600}>{b.used} / {b.entitlement}</Typography>
                                                </Box>
                                                <LinearProgress variant="determinate" value={b.entitlement > 0 ? Math.min((b.used / b.entitlement) * 100, 100) : 0}
                                                    color={b.remaining <= 2 ? 'error' : b.remaining <= 5 ? 'warning' : 'success'} />
                                                <Typography variant="body2" fontWeight={700} color={b.remaining <= 2 ? 'error.main' : 'success.main'} sx={{ mt: 0.5 }}>
                                                    {b.remaining} days remaining
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                    {selectedEmp && balances.length === 0 && !loading && (
                        <Typography color="text.secondary">No leave data available</Typography>
                    )}
                </Stack>
            )}

            {/* Apply Leave Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Apply Leave</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Employee *</InputLabel>
                            <Select label="Employee *" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                                {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.first_name} {e.last_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Leave Type</InputLabel>
                            <Select label="Leave Type" value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}>
                                {LEAVE_TYPES.map(t => <MenuItem key={t} value={t}>{t} (entitlement: {ENTITLEMENT[t]} days)</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" type="date" label="Start Date" InputLabelProps={{ shrink: true }}
                                value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                            <TextField size="small" type="date" label="End Date" InputLabelProps={{ shrink: true }}
                                value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                        </Box>
                        <TextField size="small" label="Reason" multiline rows={2} fullWidth
                            value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                        <FormControl size="small" fullWidth>
                            <InputLabel>Half Day?</InputLabel>
                            <Select label="Half Day?" value={form.half_day} onChange={e => setForm(f => ({ ...f, half_day: e.target.value }))}>
                                <MenuItem value={false}>No</MenuItem>
                                <MenuItem value={true}>Yes (0.5 day)</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving || !form.employee_id || !form.start_date}>
                        {saving ? <CircularProgress size={20} /> : 'Apply Leave'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Mark Attendance Dialog */}
            <Dialog open={attOpen} onClose={() => setAttOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Mark Attendance</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Employee *</InputLabel>
                            <Select label="Employee *" value={attForm.employee_id} onChange={e => setAttForm(f => ({ ...f, employee_id: e.target.value }))}>
                                {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.first_name} {e.last_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }}
                            value={attForm.date} onChange={e => setAttForm(f => ({ ...f, date: e.target.value }))} />
                        <FormControl size="small" fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select label="Status" value={attForm.status} onChange={e => setAttForm(f => ({ ...f, status: e.target.value }))}>
                                {['Present', 'Absent', 'Late', 'Half Day', 'Holiday', 'Leave'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" type="time" label="Check In" InputLabelProps={{ shrink: true }}
                                value={attForm.check_in} onChange={e => setAttForm(f => ({ ...f, check_in: e.target.value }))} />
                            <TextField size="small" type="time" label="Check Out" InputLabelProps={{ shrink: true }}
                                value={attForm.check_out} onChange={e => setAttForm(f => ({ ...f, check_out: e.target.value }))} />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAttOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleMarkAttendance} disabled={!attForm.employee_id}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
