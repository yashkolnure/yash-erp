import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, IconButton, Drawer, Tabs, Tab, TextField,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
    MenuItem, Select, InputLabel, FormControl, CircularProgress, Tooltip,
    Avatar, Divider, Stack, InputAdornment, Dialog, DialogTitle,
    DialogContent, DialogActions, Autocomplete, Pagination,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import ActivityPanel from '../components/ActivityPanel';
import { toNum, fmtCurrency } from '../utils/numbers';
import { exportToCSV } from '../utils/export';

const STATUS_COLORS = {
    Draft: 'default', Sent: 'info', Accepted: 'success',
    Rejected: 'error', Expired: 'warning', Converted: 'secondary',
};

const PRIORITY_COLORS = { Low: '#94A3B8', Normal: '#60A5FA', High: '#FBBF24', Urgent: '#F87171' };

const emptyForm = {
    customer_id: '', expiry_date: '', description: '', terms_conditions: '',
    assigned_to: '', priority: 'Normal', discount: 0, tax_rate: 0,
    line_items: [{ description: '', quantity: 1, unit_price: 0, discount_pct: 0 }],
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

export default function Quotations() {
    const { selectedCompanyId } = useAuth();
    const { get, post, put, loading } = useApi();

    const [quotations, setQuotations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [companyUsers, setCompanyUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [tab, setTab] = useState(0);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        params.set('skip', (page - 1) * limit);
        params.set('limit', limit);
        const [qRes, custRes, usersRes] = await Promise.all([
            get(`/${selectedCompanyId}/sales/quotations?${params}`),
            get(`/${selectedCompanyId}/sales/customers`),
            get(`/${selectedCompanyId}/messages/users`),
        ]);
        if (qRes?.data) { setQuotations(qRes.data); setTotal(qRes.pagination?.total || 0); }
        if (custRes?.data) setCustomers(custRes.data);
        if (usersRes?.data) setCompanyUsers(usersRes.data);
    }, [selectedCompanyId, statusFilter, page, get]);

    useEffect(() => { load(); }, [load]);

    const filtered = quotations.filter(q =>
        !search || q.quotation_number?.toLowerCase().includes(search.toLowerCase()) ||
        q.customer_id?.customer_name?.toLowerCase().includes(search.toLowerCase())
    );

    const openDetail = (q) => { setSelected(q); setTab(0); setDrawerOpen(true); };

    const calcLine = (line) => {
        const base = parseFloat(line.quantity || 0) * parseFloat(line.unit_price || 0);
        const disc = base * (parseFloat(line.discount_pct || 0) / 100);
        return base - disc;
    };

    const calcTotals = (lines, taxRate) => {
        const subtotal = lines.reduce((s, l) => s + calcLine(l), 0);
        const tax = subtotal * (parseFloat(taxRate || 0) / 100);
        return { subtotal, tax, total: subtotal + tax };
    };

    const handleCreate = async () => {
        setSaving(true);
        const { subtotal, tax, total } = calcTotals(form.line_items, form.tax_rate);
        const res = await post(`/${selectedCompanyId}/sales/quotations`, {
            ...form,
            line_items: form.line_items.map(l => ({ ...l, line_total: calcLine(l) })),
            subtotal, tax_amount: tax, total_amount: total,
        });
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); load(); }
    };

    const handleAction = async (id, action) => {
        const endpointMap = { send: 'send', accept: 'accept', reject: 'reject', convert: 'convert' };
        await post(`/${selectedCompanyId}/sales/quotations/${id}/${endpointMap[action]}`);
        load();
        if (selected?._id === id) {
            const res = await get(`/${selectedCompanyId}/sales/quotations/${id}`);
            if (res?.data) setSelected(res.data);
        }
    };

    const handleDuplicate = async (id) => {
        await post(`/${selectedCompanyId}/sales/quotations/${id}/duplicate`);
        setDrawerOpen(false);
        load();
    };

    const setLineField = (idx, field, value) => {
        setForm(f => {
            const lines = [...f.line_items];
            lines[idx] = { ...lines[idx], [field]: value };
            return { ...f, line_items: lines };
        });
    };

    const { subtotal, tax, total: formTotal } = calcTotals(form.line_items, form.tax_rate);

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Quotations</Typography>
                    <Typography variant="body2" color="text.secondary">Create and manage sales quotations</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => exportToCSV(quotations.map(q => ({ 'Quote #': q.quotation_number, Customer: q.customer_id?.customer_name, Date: new Date(q.quotation_date).toLocaleDateString(), 'Expiry': new Date(q.expiry_date).toLocaleDateString(), Total: toNum(q.total_amount), Status: q.status })), 'quotations.csv')}>Export CSV</Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>
                        New Quotation
                    </Button>
                </Stack>
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    size="small" placeholder="Search quotations…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                    sx={{ width: 280 }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'].map(s => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {filtered.length} records
                </Typography>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>Number</b></TableCell>
                            <TableCell><b>Customer</b></TableCell>
                            <TableCell><b>Date</b></TableCell>
                            <TableCell><b>Expiry</b></TableCell>
                            <TableCell><b>Total</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
                            <TableCell><b>Assigned</b></TableCell>
                            <TableCell><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !quotations.length ? (
                            <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 4 }}>No quotations found</TableCell></TableRow>
                        ) : filtered.map(q => (
                            <TableRow key={q._id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(q)}>
                                <TableCell><Typography variant="body2" fontWeight={600} color="primary">{q.quotation_number}</Typography></TableCell>
                                <TableCell>{q.customer_id?.customer_name || '—'}</TableCell>
                                <TableCell>{fmtDate(q.quotation_date || q.createdAt)}</TableCell>
                                <TableCell>{fmtDate(q.expiry_date)}</TableCell>
                                <TableCell>{fmtCurrency(q.total_amount)}</TableCell>
                                <TableCell><Chip label={q.status} size="small" color={STATUS_COLORS[q.status] || 'default'} /></TableCell>
                                <TableCell>
                                    {q.assigned_to ? (
                                        <Tooltip title={`${q.assigned_to.first_name} ${q.assigned_to.last_name}`}>
                                            <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: PRIORITY_COLORS[q.priority] || '#60A5FA' }}>
                                                {q.assigned_to.first_name?.[0]}{q.assigned_to.last_name?.[0]}
                                            </Avatar>
                                        </Tooltip>
                                    ) : <Typography variant="caption" color="text.secondary">Unassigned</Typography>}
                                </TableCell>
                                <TableCell onClick={e => e.stopPropagation()}>
                                    <Stack direction="row" spacing={0.5}>
                                        {q.status === 'Draft' && (
                                            <Tooltip title="Send"><IconButton size="small" color="info" onClick={() => handleAction(q._id, 'send')}><SendRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                        )}
                                        {q.status === 'Sent' && (
                                            <>
                                                <Tooltip title="Accept"><IconButton size="small" color="success" onClick={() => handleAction(q._id, 'accept')}><CheckCircleRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Reject"><IconButton size="small" color="error" onClick={() => handleAction(q._id, 'reject')}><CancelRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                            </>
                                        )}
                                        {q.status === 'Accepted' && (
                                            <Tooltip title="Convert to Order"><IconButton size="small" color="secondary" onClick={() => handleAction(q._id, 'convert')}><SwapHorizRoundedIcon fontSize="small" /></IconButton></Tooltip>
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
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: 700 } } }}>
                {selected && (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>{selected.quotation_number}</Typography>
                                    <Typography variant="body2" color="text.secondary">{selected.customer_id?.customer_name}</Typography>
                                </Box>
                                <Chip label={selected.status} color={STATUS_COLORS[selected.status] || 'default'} />
                            </Box>
                        </Box>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
                            <Tab label="Details" />
                            <Tab label="Line Items" />
                            <Tab label="Activity" />
                        </Tabs>
                        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                            {tab === 0 && (
                                <Stack spacing={2}>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                        {[
                                            ['Customer', selected.customer_id?.customer_name],
                                            ['Expiry Date', fmtDate(selected.expiry_date)],
                                            ['Priority', selected.priority],
                                            ['Assigned To', selected.assigned_to ? `${selected.assigned_to.first_name} ${selected.assigned_to.last_name}` : 'Unassigned'],
                                            ['Subtotal', fmtCurrency(selected.subtotal)],
                                            ['Tax', fmtCurrency(selected.tax_amount)],
                                            ['Total', fmtCurrency(selected.total_amount)],
                                        ].map(([label, value]) => (
                                            <Box key={label}>
                                                <Typography variant="caption" color="text.secondary">{label}</Typography>
                                                <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                    {selected.description && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Description</Typography>
                                            <Typography variant="body2">{selected.description}</Typography>
                                        </Box>
                                    )}
                                    {selected.terms_conditions && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Terms & Conditions</Typography>
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{selected.terms_conditions}</Typography>
                                        </Box>
                                    )}
                                    <Divider />
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {selected.status === 'Draft' && <Button size="small" variant="outlined" color="info" startIcon={<SendRoundedIcon />} onClick={() => handleAction(selected._id, 'send')}>Send</Button>}
                                        {selected.status === 'Sent' && <>
                                            <Button size="small" variant="outlined" color="success" onClick={() => handleAction(selected._id, 'accept')}>Accept</Button>
                                            <Button size="small" variant="outlined" color="error" onClick={() => handleAction(selected._id, 'reject')}>Reject</Button>
                                        </>}
                                        {selected.status === 'Accepted' && <Button size="small" variant="contained" color="secondary" startIcon={<SwapHorizRoundedIcon />} onClick={() => handleAction(selected._id, 'convert')}>Convert to Order</Button>}
                                        {selected.status !== 'Void' && (
                                            <Button size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => handleDuplicate(selected._id)}>Duplicate</Button>
                                        )}
                                        <Button size="small" variant="outlined" startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>Print Quote</Button>
                                    </Stack>
                                </Stack>
                            )}
                            {/* Print-only layout — visible on all tabs when printing */}
                            <Box className="print-area" sx={{ display: 'none', '@media print': { display: 'block' }, fontFamily: 'sans-serif', color: '#000' }}>
                                <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; box-sizing: border-box; } }`}</style>
                                {/* Header */}
                                <Box sx={{ borderBottom: '2px solid #000', pb: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <Box>
                                        <Typography sx={{ fontSize: '1.5rem', fontWeight: 800 }}>Your Company Name</Typography>
                                        <Typography sx={{ fontSize: '0.8rem', color: '#333' }}>123 Business Street, City, Country</Typography>
                                        <Typography sx={{ fontSize: '0.8rem', color: '#333' }}>Tel: +1 234 567 890 | info@company.com</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '1.2rem', fontWeight: 800 }}>QUOTATION</Typography>
                                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{selected.quotation_number}</Typography>
                                        <Typography sx={{ fontSize: '0.8rem', color: '#555' }}>Date: {fmtDate(selected.quotation_date || selected.createdAt)}</Typography>
                                        <Typography sx={{ fontSize: '0.8rem', color: '#555' }}>Expiry: {fmtDate(selected.expiry_date)}</Typography>
                                    </Box>
                                </Box>

                                {/* Customer info */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#555', mb: 0.5 }}>Customer</Typography>
                                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{selected.customer_id?.customer_name || '—'}</Typography>
                                    {selected.customer_id?.email && <Typography sx={{ fontSize: '0.85rem' }}>{selected.customer_id.email}</Typography>}
                                    {selected.customer_id?.address && <Typography sx={{ fontSize: '0.85rem' }}>{selected.customer_id.address}</Typography>}
                                </Box>

                                {/* Line items */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>#</th>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Description</th>
                                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Qty</th>
                                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Unit Price</th>
                                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Discount</th>
                                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selected.line_items || []).map((line, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                                                <td style={{ padding: '7px 8px', fontSize: '0.85rem' }}>{i + 1}</td>
                                                <td style={{ padding: '7px 8px', fontSize: '0.85rem' }}>{line.description || line.product_id?.product_name}</td>
                                                <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{toNum(line.quantity)}</td>
                                                <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{fmtCurrency(line.unit_price)}</td>
                                                <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{toNum(line.discount_pct) || 0}%</td>
                                                <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>{fmtCurrency(line.line_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Totals */}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                                    <table style={{ minWidth: 280, borderCollapse: 'collapse' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '4px 8px', fontSize: '0.85rem', color: '#555' }}>Subtotal</td>
                                                <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{fmtCurrency(selected.subtotal)}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '4px 8px', fontSize: '0.85rem', color: '#555' }}>Tax</td>
                                                <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{fmtCurrency(selected.tax_amount)}</td>
                                            </tr>
                                            <tr style={{ borderTop: '2px solid #000' }}>
                                                <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '1rem' }}>Grand Total</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>{fmtCurrency(selected.total_amount)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </Box>

                                {/* Terms and conditions */}
                                {selected.terms_conditions && (
                                    <Box sx={{ borderTop: '1px solid #ccc', pt: 2, mt: 2 }}>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Terms & Conditions</Typography>
                                        <Typography sx={{ fontSize: '0.82rem', color: '#333', whiteSpace: 'pre-wrap' }}>{selected.terms_conditions}</Typography>
                                    </Box>
                                )}
                                {selected.description && (
                                    <Box sx={{ borderTop: '1px solid #ccc', pt: 2, mt: 2 }}>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Description</Typography>
                                        <Typography sx={{ fontSize: '0.85rem', color: '#333' }}>{selected.description}</Typography>
                                    </Box>
                                )}
                                <Box sx={{ borderTop: '1px solid #ccc', pt: 2, mt: 2 }}>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#777' }}>
                                        Quotation #{selected.quotation_number} — Valid until {fmtDate(selected.expiry_date)}. Please contact us to confirm your order.
                                    </Typography>
                                </Box>
                            </Box>

                            {tab === 1 && (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                                <TableCell>Description</TableCell>
                                                <TableCell align="right">Qty</TableCell>
                                                <TableCell align="right">Unit Price</TableCell>
                                                <TableCell align="right">Discount</TableCell>
                                                <TableCell align="right">Total</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(selected.line_items || []).map((line, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{line.description || line.product_id?.product_name}</TableCell>
                                                    <TableCell align="right">{toNum(line.quantity)}</TableCell>
                                                    <TableCell align="right">{fmtCurrency(line.unit_price)}</TableCell>
                                                    <TableCell align="right">{toNum(line.discount_pct) || 0}%</TableCell>
                                                    <TableCell align="right">{fmtCurrency(line.line_total)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <Box sx={{ textAlign: 'right', p: 2 }}>
                                        <Typography variant="body2">Subtotal: <b>{fmtCurrency(selected.subtotal)}</b></Typography>
                                        <Typography variant="body2">Tax: <b>{fmtCurrency(selected.tax_amount)}</b></Typography>
                                        <Typography variant="h6">Total: <b>{fmtCurrency(selected.total_amount)}</b></Typography>
                                    </Box>
                                </TableContainer>
                            )}
                            {tab === 2 && (
                                <ActivityPanel
                                    companyId={selectedCompanyId}
                                    entityType="Quotation"
                                    entityId={selected._id}
                                    assignedTo={selected.assigned_to}
                                    priority={selected.priority}
                                    assignPath={`/${selectedCompanyId}/sales/quotations/${selected._id}/assign`}
                                    companyUsers={companyUsers}
                                    onAssigned={(updated) => setSelected(s => ({ ...s, ...updated }))}
                                />
                            )}
                        </Box>
                    </Box>
                )}
            </Drawer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>New Quotation</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Customer *</InputLabel>
                                <Select label="Customer *" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                                    {customers.map(c => <MenuItem key={c._id} value={c._id}>{c.customer_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField size="small" type="date" label="Expiry Date" InputLabelProps={{ shrink: true }}
                                value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                            <FormControl size="small" fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                    {['Low', 'Normal', 'High', 'Urgent'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField size="small" label="Tax Rate (%)" type="number"
                                value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
                        </Box>
                        <TextField size="small" label="Description" multiline rows={2} fullWidth
                            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

                        <Typography variant="subtitle2" fontWeight={600}>Line Items</Typography>
                        {form.line_items.map((line, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: 1, alignItems: 'center' }}>
                                <TextField size="small" label="Description" value={line.description} onChange={e => setLineField(i, 'description', e.target.value)} />
                                <TextField size="small" label="Qty" type="number" value={line.quantity} onChange={e => setLineField(i, 'quantity', e.target.value)} />
                                <TextField size="small" label="Unit Price" type="number" value={line.unit_price} onChange={e => setLineField(i, 'unit_price', e.target.value)} />
                                <TextField size="small" label="Disc %" type="number" value={line.discount_pct} onChange={e => setLineField(i, 'discount_pct', e.target.value)} />
                                <Button size="small" color="error" onClick={() => setForm(f => ({ ...f, line_items: f.line_items.filter((_, j) => j !== i) }))}>✕</Button>
                            </Box>
                        ))}
                        <Button size="small" onClick={() => setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', quantity: 1, unit_price: 0, discount_pct: 0 }] }))}>
                            + Add Line
                        </Button>

                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2">Subtotal: {fmtCurrency(subtotal)}</Typography>
                            <Typography variant="body2">Tax ({form.tax_rate}%): {fmtCurrency(tax)}</Typography>
                            <Typography variant="h6">Total: {fmtCurrency(formTotal)}</Typography>
                        </Box>

                        <TextField size="small" label="Terms & Conditions" multiline rows={3} fullWidth
                            value={form.terms_conditions} onChange={e => setForm(f => ({ ...f, terms_conditions: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving || !form.customer_id}>
                        {saving ? <CircularProgress size={20} /> : 'Create Quotation'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
