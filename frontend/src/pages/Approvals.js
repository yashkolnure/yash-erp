import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Tabs, Tab, TextField,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    Avatar, Stepper, Step, StepLabel, StepContent, InputAdornment, Pagination,
    Checkbox,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { exportToCSV } from '../utils/export';

const STATUS_COLORS = { Pending: 'warning', Approved: 'success', Rejected: 'error', Cancelled: 'default' };
const STEP_COLORS = { Pending: 'warning', Approved: 'success', Rejected: 'error' };
const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';
const fmtCurrency = (v) => v ? `$${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

export default function Approvals() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [tab, setTab] = useState(0);
    const [approvals, setApprovals] = useState([]);
    const [myPending, setMyPending] = useState([]);
    const [selected, setSelected] = useState(null);
    const [actionOpen, setActionOpen] = useState(false);
    const [actionData, setActionData] = useState({ id: '', action: '', comments: '' });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;
    const [total, setTotal] = useState(0);
    const [bulkSelected, setBulkSelected] = useState(new Set());

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        params.set('skip', (page - 1) * limit);
        params.set('limit', limit);
        const [allRes, myRes] = await Promise.all([
            get(`/${selectedCompanyId}/approvals?${params}`),
            get(`/${selectedCompanyId}/approvals/my-pending`),
        ]);
        if (allRes?.data) { setApprovals(allRes.data); setTotal(allRes.pagination?.total || 0); }
        if (myRes?.data) setMyPending(myRes.data);
    }, [selectedCompanyId, statusFilter, page, get]);

    useEffect(() => { load(); }, [load]);

    const filtered = (tab === 0 ? myPending : approvals).filter(a =>
        !search ||
        a.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
        a.entity_ref?.toLowerCase().includes(search.toLowerCase())
    );

    const openAction = (approval, action) => {
        setActionData({ id: approval._id, action, comments: '' });
        setActionOpen(true);
    };

    const handleAction = async () => {
        await post(`/${selectedCompanyId}/approvals/${actionData.id}/action`, {
            action: actionData.action,
            comments: actionData.comments,
        });
        setActionOpen(false);
        load();
        if (selected?._id === actionData.id) {
            const res = await get(`/${selectedCompanyId}/approvals?`);
        }
    };

    // Bulk selection helpers (only for tab 1 — All Approvals)
    const allFilteredIds = filtered.map(a => a._id);
    const allBulkSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => bulkSelected.has(id));
    const someBulkSelected = allFilteredIds.some(id => bulkSelected.has(id)) && !allBulkSelected;

    const handleBulkSelectAll = (e) => {
        if (e.target.checked) {
            setBulkSelected(prev => new Set([...prev, ...allFilteredIds]));
        } else {
            setBulkSelected(prev => {
                const next = new Set(prev);
                allFilteredIds.forEach(id => next.delete(id));
                return next;
            });
        }
    };

    const handleBulkSelectRow = (id) => {
        setBulkSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleBulkExport = () => {
        const rows = filtered
            .filter(a => bulkSelected.has(a._id))
            .map(a => ({
                Type: a.entity_type,
                Reference: a.entity_ref || '',
                Description: a.description || '',
                Amount: a.amount || '',
                Steps: a.steps?.length || 0,
                Status: a.status,
                Created: fmtDate(a.created_at || a.createdAt),
            }));
        exportToCSV(rows, `Approvals_Selected_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const handleBulkApprove = async () => {
        const pendingSelected = filtered.filter(a => bulkSelected.has(a._id) && a.status === 'Pending');
        for (const a of pendingSelected) {
            try {
                await post(`/${selectedCompanyId}/approvals/${a._id}/action`, { action: 'approve', comments: 'Bulk approved' });
            } catch {}
        }
        setBulkSelected(new Set());
        load();
    };

    const ApprovalRow = ({ a, showActions = true, showCheckbox = false }) => (
        <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(a === selected ? null : a)}>
            {showCheckbox && (
                <TableCell padding="checkbox" onClick={e => { e.stopPropagation(); handleBulkSelectRow(a._id); }}>
                    <Checkbox size="small" checked={bulkSelected.has(a._id)} onChange={() => handleBulkSelectRow(a._id)} />
                </TableCell>
            )}
            <TableCell><Typography variant="body2" fontWeight={600}>{a.entity_type}</Typography></TableCell>
            <TableCell>{a.entity_ref || '—'}</TableCell>
            <TableCell>{a.description || '—'}</TableCell>
            <TableCell>{fmtCurrency(a.amount)}</TableCell>
            <TableCell>{a.steps?.length || 0} step{a.steps?.length !== 1 ? 's' : ''}</TableCell>
            <TableCell><Chip label={a.status} size="small" color={STATUS_COLORS[a.status]} /></TableCell>
            <TableCell>{fmtDate(a.created_at || a.createdAt)}</TableCell>
            {showActions && (
                <TableCell onClick={e => e.stopPropagation()}>
                    {a.status === 'Pending' && (
                        <Stack direction="row" spacing={0.5}>
                            <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleRoundedIcon />}
                                onClick={() => openAction(a, 'approve')} sx={{ minWidth: 0, px: 1 }}>
                                Approve
                            </Button>
                            <Button size="small" variant="outlined" color="error" startIcon={<CancelRoundedIcon />}
                                onClick={() => openAction(a, 'reject')} sx={{ minWidth: 0, px: 1 }}>
                                Reject
                            </Button>
                        </Stack>
                    )}
                </TableCell>
            )}
        </TableRow>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Approvals</Typography>
                <Typography variant="body2" color="text.secondary">Multi-step approval workflows</Typography>
            </Box>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label={`My Pending ${myPending.length > 0 ? `(${myPending.length})` : ''}`} />
                    <Tab label="All Approvals" />
                </Tabs>
            </Paper>

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ width: 220 }} />
                {tab === 1 && (
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                        <InputLabel>Status</InputLabel>
                        <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <MenuItem value="">All</MenuItem>
                            {['Pending', 'Approved', 'Rejected', 'Cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                    </FormControl>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{filtered.length} records</Typography>
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 2, alignItems: 'start' }}>
                {/* Bulk Action Bar — All Approvals tab only */}
                {tab === 1 && bulkSelected.size > 0 && (
                    <Paper sx={{ p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                        <Typography variant="body2" fontWeight={600}>{bulkSelected.size} selected</Typography>
                        <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleRoundedIcon />} onClick={handleBulkApprove}>Approve Selected</Button>
                        <Button size="small" variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={handleBulkExport}>Export Selected</Button>
                        <Button size="small" sx={{ ml: 'auto' }} onClick={() => setBulkSelected(new Set())}>Clear</Button>
                    </Paper>
                )}

                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                {tab === 1 && (
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            size="small"
                                            checked={allBulkSelected}
                                            indeterminate={someBulkSelected}
                                            onChange={handleBulkSelectAll}
                                        />
                                    </TableCell>
                                )}
                                <TableCell><b>Type</b></TableCell>
                                <TableCell><b>Reference</b></TableCell>
                                <TableCell><b>Description</b></TableCell>
                                <TableCell><b>Amount</b></TableCell>
                                <TableCell><b>Steps</b></TableCell>
                                <TableCell><b>Status</b></TableCell>
                                <TableCell><b>Created</b></TableCell>
                                <TableCell><b>Actions</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && !filtered.length ? (
                                <TableRow><TableCell colSpan={tab === 1 ? 9 : 8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={tab === 1 ? 9 : 8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    {tab === 0 ? 'No pending approvals for you' : 'No approvals found'}
                                </TableCell></TableRow>
                            ) : filtered.map(a => <ApprovalRow key={a._id} a={a} showCheckbox={tab === 1} />)}
                        </TableBody>
                    </Table>
                </TableContainer>
                {tab === 1 && total > limit && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination count={Math.ceil(total / limit)} page={page} onChange={(_, v) => setPage(v)} color="primary" />
                    </Box>
                )}

                {/* Step Detail Panel */}
                {selected && (
                    <Paper sx={{ p: 2, position: 'sticky', top: 80 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={700}>{selected.entity_type} — {selected.entity_ref}</Typography>
                            <Chip label={selected.status} size="small" color={STATUS_COLORS[selected.status]} />
                        </Box>
                        {selected.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selected.description}</Typography>
                        )}
                        {selected.amount && (
                            <Typography variant="body2" sx={{ mb: 2 }}>Amount: <b>{fmtCurrency(selected.amount)}</b></Typography>
                        )}
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Approval Steps</Typography>
                        <Stepper orientation="vertical" nonLinear>
                            {(selected.steps || []).map((step, i) => (
                                <Step key={i} active={step.status === 'Pending'} completed={step.status === 'Approved'}>
                                    <StepLabel
                                        error={step.status === 'Rejected'}
                                        icon={
                                            step.status === 'Approved' ? <CheckCircleRoundedIcon color="success" /> :
                                            step.status === 'Rejected' ? <CancelRoundedIcon color="error" /> :
                                            <HourglassTopRoundedIcon color="warning" />
                                        }
                                    >
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>
                                                {step.approver_id?.first_name} {step.approver_id?.last_name}
                                            </Typography>
                                            <Chip label={step.status} size="small" color={STEP_COLORS[step.status]} sx={{ height: 18, fontSize: 10 }} />
                                        </Box>
                                    </StepLabel>
                                    {(step.comments || step.acted_at) && (
                                        <StepContent>
                                            {step.comments && <Typography variant="caption">{step.comments}</Typography>}
                                            {step.acted_at && <Typography variant="caption" color="text.secondary" display="block">{fmtDate(step.acted_at)}</Typography>}
                                        </StepContent>
                                    )}
                                </Step>
                            ))}
                        </Stepper>
                        {selected.status === 'Pending' && (
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                <Button size="small" variant="contained" color="success" onClick={() => openAction(selected, 'approve')}>Approve</Button>
                                <Button size="small" variant="outlined" color="error" onClick={() => openAction(selected, 'reject')}>Reject</Button>
                            </Stack>
                        )}
                    </Paper>
                )}
            </Box>

            {/* Action Dialog */}
            <Dialog open={actionOpen} onClose={() => setActionOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: actionData.action === 'approve' ? 'success.main' : 'error.main' }}>
                    {actionData.action === 'approve' ? 'Approve Request' : 'Reject Request'}
                </DialogTitle>
                <DialogContent dividers>
                    <TextField fullWidth size="small" label="Comments (optional)" multiline rows={3}
                        value={actionData.comments} onChange={e => setActionData(d => ({ ...d, comments: e.target.value }))} sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionOpen(false)}>Cancel</Button>
                    <Button variant="contained" color={actionData.action === 'approve' ? 'success' : 'error'} onClick={handleAction}>
                        Confirm {actionData.action === 'approve' ? 'Approval' : 'Rejection'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
