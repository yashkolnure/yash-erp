import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, TextField, MenuItem, Select, InputLabel, FormControl,
    CircularProgress, Stack, Paper, Table, TableBody, TableCell, TableHead,
    TableRow, TableContainer, Chip, InputAdornment, Pagination, Button,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';

const ACTION_COLORS = {
    Create: 'success', Update: 'info', Delete: 'error', Post: 'primary',
    Approve: 'success', Reject: 'error', Assign: 'secondary',
    Comment: 'default', InternalNote: 'warning', Cancel: 'error',
};

const ENTITY_TYPES = [
    'Invoice', 'SalesOrder', 'PurchaseOrder', 'Quotation', 'Payment',
    'JournalEntry', 'ApprovalRequest', 'LeaveRequest', 'Payslip',
    'StockAdjustment', 'Employee', 'Customer', 'Vendor',
];

const ACTIONS = ['Create', 'Update', 'Delete', 'Post', 'Approve', 'Reject', 'Assign', 'Comment', 'Cancel'];

const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';

export default function AuditLogs() {
    const { selectedCompanyId } = useAuth();
    const { get, loading } = useApi();

    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 50;
    const [filters, setFilters] = useState({
        entity_type: '', action: '', from_date: '', to_date: '',
    });
    const [applied, setApplied] = useState(filters);

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams({ skip: (page - 1) * limit, limit });
        if (applied.entity_type) params.set('entity_type', applied.entity_type);
        if (applied.action) params.set('action', applied.action);
        if (applied.from_date) params.set('from_date', applied.from_date);
        if (applied.to_date) params.set('to_date', applied.to_date);
        const res = await get(`/${selectedCompanyId}/reports/audit-logs?${params}`);
        if (res?.data) { setLogs(res.data); setTotal(res.pagination?.total || 0); }
    }, [selectedCompanyId, page, applied, get]);

    useEffect(() => { load(); }, [load]);

    const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
    const applyFilters = () => { setApplied(filters); setPage(1); };
    const clearFilters = () => { const f = { entity_type: '', action: '', from_date: '', to_date: '' }; setFilters(f); setApplied(f); setPage(1); };

    const hasFilters = Object.values(applied).some(Boolean);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Audit Log</Typography>
                <Typography variant="body2" color="text.secondary">Complete trail of all system actions</Typography>
            </Box>

            {/* Filter Bar */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Entity Type</InputLabel>
                        <Select label="Entity Type" value={filters.entity_type} onChange={e => setFilter('entity_type', e.target.value)}>
                            <MenuItem value="">All</MenuItem>
                            {ENTITY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                        <InputLabel>Action</InputLabel>
                        <Select label="Action" value={filters.action} onChange={e => setFilter('action', e.target.value)}>
                            <MenuItem value="">All</MenuItem>
                            {ACTIONS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
                        value={filters.from_date} onChange={e => setFilter('from_date', e.target.value)} />
                    <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
                        value={filters.to_date} onChange={e => setFilter('to_date', e.target.value)} />
                    <Button variant="contained" size="small" startIcon={<FilterListRoundedIcon />} onClick={applyFilters}>Apply</Button>
                    {hasFilters && <Button size="small" onClick={clearFilters}>Clear</Button>}
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                        {total.toLocaleString()} total records
                    </Typography>
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>Timestamp</b></TableCell>
                            <TableCell><b>User</b></TableCell>
                            <TableCell><b>Action</b></TableCell>
                            <TableCell><b>Entity Type</b></TableCell>
                            <TableCell><b>Entity ID</b></TableCell>
                            <TableCell><b>Details</b></TableCell>
                            <TableCell><b>IP Address</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No audit logs found</TableCell></TableRow>
                        ) : logs.map(log => (
                            <TableRow key={log._id} hover>
                                <TableCell>
                                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>{fmtDate(log.timestamp)}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={500}>
                                        {log.user_id?.first_name} {log.user_id?.last_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">{log.user_id?.email}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip label={log.action} size="small" color={ACTION_COLORS[log.action] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{log.entity_type}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                        {String(log.entity_id).slice(-8)}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ maxWidth: 260 }}>
                                    {log.new_values && (
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }} noWrap>
                                            {JSON.stringify(log.new_values).slice(0, 80)}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption" color="text.secondary">{log.ip_address}</Typography>
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
        </Box>
    );
}
