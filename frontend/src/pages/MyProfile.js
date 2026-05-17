import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Tabs, Tab, Paper, Stack, Chip, CircularProgress,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Select, InputLabel, FormControl, Alert,
} from '@mui/material';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { fmtCurrency } from '../utils/numbers';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const STATUS_COLORS = {
    Draft: 'default',
    Pending: 'warning',
    Submitted: 'warning',
    Approved: 'success',
    Paid: 'success',
    Rejected: 'error',
    Cancelled: 'default',
};

const InfoRow = ({ label, value }) => (
    <Stack direction="row" spacing={2} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ width: 200, color: 'text.secondary', fontSize: '0.85rem', flexShrink: 0 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{value || '—'}</Typography>
    </Stack>
);

const LEAVE_TYPES = ['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid', 'Other'];

const emptyLeaveForm = {
    leave_type: 'Annual',
    start_date: '',
    end_date: '',
    reason: '',
};

export default function MyProfile() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [tab, setTab] = useState(0);
    const [profile, setProfile] = useState(null);
    const [profileError, setProfileError] = useState(null);

    const [payslips, setPayslips] = useState([]);
    const [leave, setLeave] = useState([]);
    const [timesheets, setTimesheets] = useState([]);
    const [expenses, setExpenses] = useState([]);

    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
    const [leaveForm, setLeaveForm] = useState(emptyLeaveForm);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    /* ── Loaders ─────────────────────────────────────────────────────────── */
    const loadProfile = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const res = await get(`/${selectedCompanyId}/my/profile`);
            setProfile(res.data);
            setProfileError(null);
        } catch (err) {
            setProfileError(err.response?.data?.error || 'Could not load profile');
        }
    }, [selectedCompanyId, get]);

    const loadPayslips = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const res = await get(`/${selectedCompanyId}/my/payslips`);
            setPayslips(res.data || []);
        } catch (_) {}
    }, [selectedCompanyId, get]);

    const loadLeave = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const res = await get(`/${selectedCompanyId}/my/leave`);
            setLeave(res.data || []);
        } catch (_) {}
    }, [selectedCompanyId, get]);

    const loadTimesheets = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const res = await get(`/${selectedCompanyId}/my/timesheets`);
            setTimesheets(res.data || []);
        } catch (_) {}
    }, [selectedCompanyId, get]);

    const loadExpenses = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const res = await get(`/${selectedCompanyId}/my/expenses`);
            setExpenses(res.data || []);
        } catch (_) {}
    }, [selectedCompanyId, get]);

    useEffect(() => { loadProfile(); }, [loadProfile]);
    useEffect(() => { if (tab === 1) loadPayslips(); }, [tab, loadPayslips]);
    useEffect(() => { if (tab === 2) loadLeave(); }, [tab, loadLeave]);
    useEffect(() => { if (tab === 3) loadTimesheets(); }, [tab, loadTimesheets]);
    useEffect(() => { if (tab === 4) loadExpenses(); }, [tab, loadExpenses]);

    /* ── Apply for Leave ─────────────────────────────────────────────────── */
    const handleApplyLeave = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            await post(`/${selectedCompanyId}/my/leave`, leaveForm);
            setLeaveDialogOpen(false);
            setLeaveForm(emptyLeaveForm);
            loadLeave();
        } catch (err) {
            setSaveError(err.response?.data?.error || 'Failed to submit leave request');
        } finally {
            setSaving(false);
        }
    };

    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                <AccountCircleRoundedIcon sx={{ fontSize: 32, color: '#F59E0B' }} />
                <Box>
                    <Typography variant="h5" fontWeight={700}>My Profile</Typography>
                    <Typography variant="body2" color="text.secondary">Your personal self-service hub</Typography>
                </Box>
            </Stack>

            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: 'background.paper' }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label="Profile" />
                    <Tab label="My Payslips" />
                    <Tab label="My Leave" />
                    <Tab label="My Timesheets" />
                    <Tab label="My Expenses" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {/* ── Profile Tab ─────────────────────────────────────── */}
                    {tab === 0 && (
                        <>
                            {loading && <CircularProgress size={24} />}
                            {profileError && (
                                <Alert severity="warning" sx={{ mb: 2 }}>{profileError}</Alert>
                            )}
                            {profile && (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700} mb={1}>
                                        {profile.first_name} {profile.last_name}
                                    </Typography>
                                    <Chip
                                        label={profile.employment_status}
                                        color={profile.employment_status === 'Active' ? 'success' : 'default'}
                                        size="small"
                                        sx={{ mb: 2 }}
                                    />
                                    <InfoRow label="Employee Number" value={profile.employee_code} />
                                    <InfoRow label="Department" value={profile.department} />
                                    <InfoRow label="Job Title" value={profile.job_title} />
                                    <InfoRow label="Email" value={profile.email} />
                                    <InfoRow label="Phone" value={profile.phone} />
                                    <InfoRow label="Employment Type" value={profile.employment_type} />
                                    <InfoRow label="Date of Joining" value={fmtDate(profile.date_of_joining)} />
                                    <InfoRow label="Date of Birth" value={fmtDate(profile.date_of_birth)} />
                                    <InfoRow label="Currency" value={profile.currency} />
                                </Box>
                            )}
                        </>
                    )}

                    {/* ── Payslips Tab ────────────────────────────────────── */}
                    {tab === 1 && (
                        <>
                            {loading && <CircularProgress size={24} />}
                            {payslips.length === 0 && !loading ? (
                                <Typography color="text.secondary">No payslips found.</Typography>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Payslip #</TableCell>
                                                <TableCell>Period</TableCell>
                                                <TableCell align="right">Gross</TableCell>
                                                <TableCell align="right">Deductions</TableCell>
                                                <TableCell align="right">Net Pay</TableCell>
                                                <TableCell>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {payslips.map((ps) => (
                                                <TableRow key={ps._id} hover>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{ps.payslip_number}</TableCell>
                                                    <TableCell>{fmtDate(ps.period_start)} – {fmtDate(ps.period_end)}</TableCell>
                                                    <TableCell align="right">{fmtCurrency(ps.gross_salary, ps.currency)}</TableCell>
                                                    <TableCell align="right">{fmtCurrency(ps.total_deductions, ps.currency)}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtCurrency(ps.net_salary, ps.currency)}</TableCell>
                                                    <TableCell>
                                                        <Chip label={ps.status} color={STATUS_COLORS[ps.status] || 'default'} size="small" />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </>
                    )}

                    {/* ── Leave Tab ───────────────────────────────────────── */}
                    {tab === 2 && (
                        <>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle1" fontWeight={600}>My Leave Requests</Typography>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => { setSaveError(null); setLeaveDialogOpen(true); }}
                                    sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}
                                >
                                    Apply for Leave
                                </Button>
                            </Stack>
                            {loading && <CircularProgress size={24} />}
                            {leave.length === 0 && !loading ? (
                                <Typography color="text.secondary">No leave requests found.</Typography>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Type</TableCell>
                                                <TableCell>From</TableCell>
                                                <TableCell>To</TableCell>
                                                <TableCell align="right">Days</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Reason</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {leave.map((lr) => (
                                                <TableRow key={lr._id} hover>
                                                    <TableCell>{lr.leave_type}</TableCell>
                                                    <TableCell>{fmtDate(lr.start_date)}</TableCell>
                                                    <TableCell>{fmtDate(lr.end_date)}</TableCell>
                                                    <TableCell align="right">{lr.days}</TableCell>
                                                    <TableCell>
                                                        <Chip label={lr.status} color={STATUS_COLORS[lr.status] || 'default'} size="small" />
                                                    </TableCell>
                                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {lr.reason || '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}

                            {/* Apply for Leave Dialog */}
                            <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)} maxWidth="sm" fullWidth>
                                <DialogTitle>Apply for Leave</DialogTitle>
                                <DialogContent>
                                    <Stack spacing={2} mt={1}>
                                        {saveError && <Alert severity="error">{saveError}</Alert>}
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Leave Type</InputLabel>
                                            <Select
                                                label="Leave Type"
                                                value={leaveForm.leave_type}
                                                onChange={(e) => setLeaveForm(f => ({ ...f, leave_type: e.target.value }))}
                                            >
                                                {LEAVE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label="From Date"
                                            type="date"
                                            size="small"
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            value={leaveForm.start_date}
                                            onChange={(e) => setLeaveForm(f => ({ ...f, start_date: e.target.value }))}
                                        />
                                        <TextField
                                            label="To Date"
                                            type="date"
                                            size="small"
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            value={leaveForm.end_date}
                                            onChange={(e) => setLeaveForm(f => ({ ...f, end_date: e.target.value }))}
                                        />
                                        <TextField
                                            label="Reason"
                                            multiline
                                            rows={3}
                                            size="small"
                                            fullWidth
                                            value={leaveForm.reason}
                                            onChange={(e) => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                                        />
                                    </Stack>
                                </DialogContent>
                                <DialogActions>
                                    <Button onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleApplyLeave}
                                        disabled={saving || !leaveForm.start_date || !leaveForm.end_date}
                                        sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}
                                    >
                                        {saving ? <CircularProgress size={18} color="inherit" /> : 'Submit'}
                                    </Button>
                                </DialogActions>
                            </Dialog>
                        </>
                    )}

                    {/* ── Timesheets Tab ──────────────────────────────────── */}
                    {tab === 3 && (
                        <>
                            {loading && <CircularProgress size={24} />}
                            {timesheets.length === 0 && !loading ? (
                                <Typography color="text.secondary">No timesheets found.</Typography>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Week</TableCell>
                                                <TableCell align="right">Total Hours</TableCell>
                                                <TableCell align="right">Billable Hours</TableCell>
                                                <TableCell>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {timesheets.map((ts) => (
                                                <TableRow key={ts._id} hover>
                                                    <TableCell>{fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</TableCell>
                                                    <TableCell align="right">{ts.total_hours}</TableCell>
                                                    <TableCell align="right">{ts.billable_hours}</TableCell>
                                                    <TableCell>
                                                        <Chip label={ts.status} color={STATUS_COLORS[ts.status] || 'default'} size="small" />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </>
                    )}

                    {/* ── Expenses Tab ────────────────────────────────────── */}
                    {tab === 4 && (
                        <>
                            {loading && <CircularProgress size={24} />}
                            {expenses.length === 0 && !loading ? (
                                <Typography color="text.secondary">No expense claims found.</Typography>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Claim #</TableCell>
                                                <TableCell>Date</TableCell>
                                                <TableCell align="right">Total</TableCell>
                                                <TableCell>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {expenses.map((ec) => (
                                                <TableRow key={ec._id} hover>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{ec.claim_number}</TableCell>
                                                    <TableCell>{fmtDate(ec.claim_date)}</TableCell>
                                                    <TableCell align="right">{fmtCurrency(ec.total_amount, ec.currency)}</TableCell>
                                                    <TableCell>
                                                        <Chip label={ec.status} color={STATUS_COLORS[ec.status] || 'default'} size="small" />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </>
                    )}
                </Box>
            </Paper>
        </Box>
    );
}
