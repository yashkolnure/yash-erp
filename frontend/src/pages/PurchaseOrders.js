import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, TablePagination, Stack, Avatar, IconButton, Tooltip,
    InputBase, Divider, Select, MenuItem, FormControl, Drawer, Grid,
    CircularProgress, Alert, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import ActivityPanel from '../components/ActivityPanel';
import { toNum } from '../utils/numbers';

const fmt = (n) => toNum(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

const STATUS_STYLE = {
    Draft: { bg: '#F1F5F9', color: '#64748B' },
    Confirmed: { bg: '#EFF6FF', color: '#1565C0' },
    'Received Partial': { bg: '#FFFBEB', color: '#B45309' },
    'Received Complete': { bg: '#F0FDF4', color: '#15803D' },
    Invoiced: { bg: '#FAF5FF', color: '#7C3AED' },
    Closed: { bg: '#F1F5F9', color: '#64748B' },
    Cancelled: { bg: '#FEF2F2', color: '#B91C1C' },
};

const AVATAR_COLORS = ['#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const StatusBadge = ({ status }) => {
    const s = STATUS_STYLE[status] || STATUS_STYLE.Draft;
    return <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: s.bg }}><Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: s.color }}>{status}</Typography></Box>;
};

/* ── PO Detail Drawer ───────────────────────────────────────────────────── */
const PODetailDrawer = ({ open, onClose, poId, companyId, onAction, companyUsers }) => {
    const { get, post, loading } = useApi();
    const [po, setPO] = useState(null);
    const [toast, setToast] = useState(null);
    const [tab, setTab] = useState(0);

    const fetchPO = useCallback(() => {
        if (poId) get(`/${companyId}/procurement/po/${poId}`).then(d => setPO(d.data)).catch(() => {});
    }, [poId, companyId, get]);

    useEffect(() => { if (open) { setPO(null); setToast(null); setTab(0); fetchPO(); } }, [open, fetchPO]);

    const handleConfirm = async () => {
        try { await post(`/${companyId}/procurement/po/${poId}/confirm`); fetchPO(); onAction(); setToast({ type: 'success', msg: 'PO confirmed' }); }
        catch (e) { setToast({ type: 'error', msg: e.response?.data?.error || 'Failed' }); }
    };

    const handleDuplicate = async () => {
        try {
            await post(`/${companyId}/procurement/po/${poId}/duplicate`);
            setToast({ type: 'success', msg: 'PO duplicated as Draft' });
            onClose();
            onAction();
        } catch (e) {
            setToast({ type: 'error', msg: e.response?.data?.error || 'Duplicate failed' });
        }
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100vw', md: 680 }, bgcolor: '#FAFBFC', display: 'flex', flexDirection: 'column' } }}>
            {/* Header */}
            <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E8ECF0', p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1A2332' }}>{po?.po_number || 'Purchase Order'}</Typography>
                    {po && <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}><StatusBadge status={po.status} /><Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{po.vendor_id?.vendor_name}</Typography></Box>}
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
            </Box>

            {/* Actions */}
            {po && (
                <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F0F2F5', px: 2.5, py: 1.5, display: 'flex', gap: 1, flexShrink: 0 }}>
                    {po.status === 'Draft' && (
                        <Button size="small" variant="contained" startIcon={<CheckRoundedIcon sx={{ fontSize: 15 }} />} onClick={handleConfirm} disabled={loading} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                            Confirm PO
                        </Button>
                    )}
                    {po.status !== 'Void' && (
                        <Button size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 15 }} />} onClick={handleDuplicate} disabled={loading} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Duplicate
                        </Button>
                    )}
                    <Button size="small" variant="outlined" startIcon={<PrintRoundedIcon sx={{ fontSize: 15 }} />} onClick={() => window.print()} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        Print PO
                    </Button>
                </Box>
            )}

            {/* Tabs */}
            <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F0F2F5', px: 2.5, flexShrink: 0 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontSize: '0.788rem', fontWeight: 600, minHeight: 44, textTransform: 'none', color: '#5F6B7C' }, '& .Mui-selected': { color: '#1565C0' }, '& .MuiTabs-indicator': { bgcolor: '#1565C0' } }}>
                    <Tab label="Details" />
                    <Tab label="Line Items" />
                    <Tab label="Activity" />
                </Tabs>
            </Box>

            {!po ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8, flex: 1 }}><CircularProgress size={28} /></Box>
            ) : (
                <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {toast && <Alert severity={toast.type} sx={{ mx: 2.5, mt: 2, borderRadius: 2 }} onClose={() => setToast(null)}>{toast.msg}</Alert>}

                    {/* Tab 0: Details */}
                    {tab === 0 && (
                        <Box sx={{ p: 2.5 }}>
                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', p: 2.5, mb: 2 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: '#1A2332' }}>Purchase Order Details</Typography>
                                <Grid container spacing={1.5}>
                                    {[
                                        ['PO Number', po.po_number],
                                        ['Status', <StatusBadge key="s" status={po.status} />],
                                        ['Vendor', po.vendor_id?.vendor_name || '—'],
                                        ['PO Date', new Date(po.po_date).toLocaleDateString()],
                                        ['Required Date', po.required_date ? new Date(po.required_date).toLocaleDateString() : '—'],
                                        ['Currency', po.currency],
                                        ['Assigned To', po.assigned_to ? `${po.assigned_to.first_name} ${po.assigned_to.last_name}` : '—'],
                                        ['Priority', po.priority || 'Normal'],
                                    ].map(([label, value]) => (
                                        <Grid item xs={6} key={label}>
                                            <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.2 }}>{label}</Typography>
                                            <Typography sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1A2332' }}>{value}</Typography>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', p: 2.5 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1.5, color: '#1A2332' }}>Financial Summary</Typography>
                                {[
                                    ['Subtotal', `${po.currency} ${fmt(po.subtotal)}`],
                                    ['Tax', `${po.currency} ${fmt(po.tax_amount)}`],
                                    ['Total Amount', `${po.currency} ${fmt(po.total_amount)}`, true],
                                ].map(([label, value, bold]) => (
                                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: bold ? '2px solid #E8ECF0' : '1px solid #F0F2F5' }}>
                                        <Typography sx={{ fontSize: bold ? '0.875rem' : '0.813rem', fontWeight: bold ? 700 : 500, color: '#5F6B7C' }}>{label}</Typography>
                                        <Typography sx={{ fontSize: bold ? '0.938rem' : '0.813rem', fontWeight: bold ? 800 : 600, color: bold ? '#1565C0' : '#1A2332' }}>{value}</Typography>
                                    </Box>
                                ))}
                            </Box>

                            {po.notes && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E8ECF0' }}>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, mb: 0.5 }}>NOTES</Typography>
                                    <Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{po.notes}</Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Tab 1: Line Items */}
                    {tab === 1 && (
                        <Box sx={{ p: 2.5 }}>
                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ bgcolor: '#F7F9FC', fontSize: '0.7rem', fontWeight: 700, color: '#5F6B7C', textTransform: 'uppercase' }}>Item</TableCell>
                                            <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontSize: '0.7rem', fontWeight: 700, color: '#5F6B7C', textTransform: 'uppercase' }}>Qty Ordered</TableCell>
                                            <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontSize: '0.7rem', fontWeight: 700, color: '#5F6B7C', textTransform: 'uppercase' }}>Qty Received</TableCell>
                                            <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontSize: '0.7rem', fontWeight: 700, color: '#5F6B7C', textTransform: 'uppercase' }}>Unit Price</TableCell>
                                            <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontSize: '0.7rem', fontWeight: 700, color: '#5F6B7C', textTransform: 'uppercase' }}>Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(po.line_items || []).map((li, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell><Typography sx={{ fontSize: '0.813rem', fontWeight: 500 }}>{li.description}</Typography></TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{toNum(li.quantity_ordered)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: toNum(li.quantity_received) < toNum(li.quantity_ordered) ? '#B45309' : '#15803D', fontWeight: 600 }}>{toNum(li.quantity_received) || 0}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{fmt(li.unit_price)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem' }}>{po.currency} {fmt(li.line_total)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Box sx={{ p: 2, borderTop: '2px solid #E8ECF0', display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.2 }}>SUBTOTAL</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>{po.currency} {fmt(po.subtotal)}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.2 }}>TAX</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>{po.currency} {fmt(po.tax_amount)}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.2 }}>TOTAL</Typography>
                                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#7C3AED' }}>{po.currency} {fmt(po.total_amount)}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Tab 2: Activity */}
                    {tab === 2 && (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <ActivityPanel
                                companyId={companyId}
                                entityType="PurchaseOrder"
                                entityId={poId}
                                assignedTo={po.assigned_to}
                                priority={po.priority}
                                assignPath={`/${companyId}/procurement/po/${poId}/assign`}
                                companyUsers={companyUsers}
                                onAssigned={() => { onAction(); fetchPO(); }}
                            />
                        </Box>
                    )}
                </Box>
            )}

            {/* Print-only layout */}
            {po && (
                <Box className="print-area" sx={{ display: 'none', '@media print': { display: 'block' }, p: 4, fontFamily: 'sans-serif', color: '#000' }}>
                    <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
                    {/* Company header */}
                    <Box sx={{ borderBottom: '2px solid #000', pb: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Box>
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#000' }}>Your Company Name</Typography>
                            <Typography sx={{ fontSize: '0.8rem', color: '#333' }}>123 Business Street, City, Country</Typography>
                            <Typography sx={{ fontSize: '0.8rem', color: '#333' }}>Tel: +1 234 567 890 | info@company.com</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: '#000' }}>PURCHASE ORDER</Typography>
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{po.po_number}</Typography>
                            <Typography sx={{ fontSize: '0.8rem', color: '#555' }}>Date: {new Date(po.po_date).toLocaleDateString()}</Typography>
                            {po.required_date && <Typography sx={{ fontSize: '0.8rem', color: '#555' }}>Required: {new Date(po.required_date).toLocaleDateString()}</Typography>}
                        </Box>
                    </Box>

                    {/* Vendor info */}
                    <Box sx={{ mb: 3 }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#555', mb: 0.5 }}>Vendor</Typography>
                        <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{po.vendor_id?.vendor_name || '—'}</Typography>
                        {po.vendor_id?.address && <Typography sx={{ fontSize: '0.85rem' }}>{po.vendor_id.address}</Typography>}
                        {po.vendor_id?.contact_person && <Typography sx={{ fontSize: '0.85rem' }}>Contact: {po.vendor_id.contact_person}</Typography>}
                        {po.vendor_id?.email && <Typography sx={{ fontSize: '0.85rem' }}>Email: {po.vendor_id.email}</Typography>}
                    </Box>

                    {/* Line items table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f0f0f0' }}>
                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>#</th>
                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Description</th>
                                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Qty Ordered</th>
                                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Unit Price</th>
                                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(po.line_items || []).map((li, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                                    <td style={{ padding: '7px 8px', fontSize: '0.85rem' }}>{i + 1}</td>
                                    <td style={{ padding: '7px 8px', fontSize: '0.85rem' }}>{li.description}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{toNum(li.quantity_ordered)}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{fmt(li.unit_price)}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>{po.currency} {fmt(li.line_total)}</td>
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
                                    <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{po.currency} {fmt(po.subtotal)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '4px 8px', fontSize: '0.85rem', color: '#555' }}>Tax</td>
                                    <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{po.currency} {fmt(po.tax_amount)}</td>
                                </tr>
                                <tr style={{ borderTop: '2px solid #000' }}>
                                    <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '1rem' }}>Grand Total</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>{po.currency} {fmt(po.total_amount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Box>

                    {/* Terms / Notes */}
                    {po.notes && (
                        <Box sx={{ borderTop: '1px solid #ccc', pt: 2, mt: 2 }}>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Notes</Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: '#333' }}>{po.notes}</Typography>
                        </Box>
                    )}
                    <Box sx={{ borderTop: '1px solid #ccc', pt: 2, mt: 2 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#777' }}>
                            This is an official Purchase Order. Please reference PO #{po.po_number} on all correspondence and deliveries.
                        </Typography>
                    </Box>
                </Box>
            )}
        </Drawer>
    );
};

/* ── Main PurchaseOrders ────────────────────────────────────────────────── */
const PurchaseOrders = () => {
    const { selectedCompanyId } = useAuth();
    const { get, post } = useApi();
    const [searchParams, setSearchParams] = useSearchParams();
    const [pos, setPos] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [companyUsers, setCompanyUsers] = useState([]);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [prefillLineItem, setPrefillLineItem] = useState(null);

    // Auto-open create dialog if navigated from reorder alert
    useEffect(() => {
        const productId = searchParams.get('product_id');
        const productName = searchParams.get('product_name');
        const qty = searchParams.get('qty');
        if (productId) {
            setPrefillLineItem({ product_id: productId, description: productName || '', quantity: parseInt(qty) || 1 });
            setShowCreateDialog(true);
            // Clear params to avoid re-triggering on revisit
            setSearchParams({}, { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchPOs = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const params = new URLSearchParams({ skip: page * rowsPerPage, limit: rowsPerPage });
            if (statusFilter) params.append('status', statusFilter);
            const data = await get(`/${selectedCompanyId}/procurement/po?${params}`);
            setPos(data.data || []);
            setTotal(data.pagination?.total || 0);
        } catch {}
    }, [selectedCompanyId, page, rowsPerPage, statusFilter, get]);

    useEffect(() => { fetchPOs(); }, [fetchPOs]);

    useEffect(() => {
        if (!selectedCompanyId) return;
        get(`/${selectedCompanyId}/messages/users`).then(d => setCompanyUsers(d?.data || [])).catch(() => {});
    }, [selectedCompanyId, get]);

    const exportCSV = () => {
        const rows = [['PO #', 'Vendor', 'Date', 'Currency', 'Total', 'Status', 'Assignee'], ...pos.map(p => [p.po_number, p.vendor_id?.vendor_name || '', new Date(p.po_date).toLocaleDateString(), p.currency, toNum(p.total_amount).toFixed(2), p.status, p.assigned_to ? `${p.assigned_to.first_name} ${p.assigned_to.last_name}` : ''])];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `PurchaseOrders_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    const displayed = search ? pos.filter(p => p.po_number?.toLowerCase().includes(search.toLowerCase()) || p.vendor_id?.vendor_name?.toLowerCase().includes(search.toLowerCase())) : pos;

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Purchase Orders</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>Manage procurement orders and vendor deliveries</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={exportCSV} sx={{ fontWeight: 600, fontSize: '0.813rem', color: '#5F6B7C', borderColor: '#E8ECF0' }}>Export CSV</Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setPrefillLineItem(null); setShowCreateDialog(true); }} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>New PO</Button>
                </Stack>
            </Box>

            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5', flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: 2, px: 1.5, py: 0.75, flex: 1, minWidth: 200, maxWidth: 360 }}>
                            <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 18, mr: 1 }} />
                            <InputBase placeholder="Search PO # or vendor..." value={search} onChange={e => setSearch(e.target.value)} sx={{ fontSize: '0.813rem', color: '#1A2332', flex: 1 }} />
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <Select value={statusFilter} displayEmpty onChange={e => { setStatusFilter(e.target.value); setPage(0); }} renderValue={v => v || 'All Statuses'} sx={{ fontSize: '0.813rem', bgcolor: '#F0F2F5', '& fieldset': { border: 'none' }, borderRadius: 2 }} startAdornment={<FilterListRoundedIcon sx={{ fontSize: 16, mr: 0.5, color: '#94A3B8' }} />}>
                                <MenuItem value="" sx={{ fontSize: '0.813rem' }}>All Statuses</MenuItem>
                                {Object.keys(STATUS_STYLE).map(s => <MenuItem key={s} value={s} sx={{ fontSize: '0.813rem' }}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', ml: 'auto' }}>{total} total POs</Typography>
                    </Box>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>PO #</TableCell>
                                <TableCell>Vendor</TableCell>
                                <TableCell>PO Date</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Assignee</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayed.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>No purchase orders found.</TableCell></TableRow>
                            ) : displayed.map(po => {
                                const name = po.vendor_id?.vendor_name;
                                return (
                                    <TableRow key={po._id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedId(po._id)}>
                                        <TableCell><Typography sx={{ fontSize: '0.813rem', fontWeight: 700, color: '#7C3AED' }}>{po.po_number}</Typography></TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 28, height: 28, bgcolor: getColor(name), fontSize: '0.7rem', fontWeight: 700 }}>{name?.[0]?.toUpperCase() || 'V'}</Avatar>
                                                <Typography sx={{ fontSize: '0.813rem', fontWeight: 500 }}>{name || '—'}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ color: '#5F6B7C', fontSize: '0.813rem' }}>{new Date(po.po_date).toLocaleDateString()}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem' }}>{po.currency} {fmt(po.total_amount)}</TableCell>
                                        <TableCell><StatusBadge status={po.status} /></TableCell>
                                        <TableCell onClick={e => e.stopPropagation()}>
                                            {po.assigned_to ? (
                                                <Tooltip title={`${po.assigned_to.first_name} ${po.assigned_to.last_name}`}>
                                                    <Avatar sx={{ width: 26, height: 26, fontSize: '0.6rem', bgcolor: getColor(po.assigned_to.first_name), cursor: 'pointer' }}
                                                        onClick={() => setSelectedId(po._id)}>
                                                        {(po.assigned_to.first_name?.[0] || '') + (po.assigned_to.last_name?.[0] || '')}
                                                    </Avatar>
                                                </Tooltip>
                                            ) : (
                                                <Typography sx={{ fontSize: '0.7rem', color: '#CBD5E1' }}>—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center" onClick={e => e.stopPropagation()}>
                                            {po.status === 'Draft' && (
                                                <Tooltip title="Confirm PO">
                                                    <IconButton size="small" onClick={async () => { try { await post(`/${selectedCompanyId}/procurement/po/${po._id}/confirm`); fetchPOs(); } catch {} }} sx={{ color: '#1565C0', bgcolor: '#EFF6FF', '&:hover': { bgcolor: '#DBEAFE' }, borderRadius: 1.5 }}>
                                                        <CheckRoundedIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <Divider />
                    <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }} rowsPerPageOptions={[10, 20, 50]} />
                </CardContent>
            </Card>

            <PODetailDrawer
                open={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                poId={selectedId}
                companyId={selectedCompanyId}
                onAction={fetchPOs}
                companyUsers={companyUsers}
            />

            {/* Create PO Dialog */}
            <Dialog open={showCreateDialog} onClose={() => { setShowCreateDialog(false); setPrefillLineItem(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
                    New Purchase Order
                    {prefillLineItem && (
                        <Typography sx={{ fontSize: '0.813rem', color: '#B45309', fontWeight: 500, mt: 0.5 }}>
                            Pre-filled from reorder alert: {prefillLineItem.description}
                        </Typography>
                    )}
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                        {prefillLineItem
                            ? `Creating PO for "${prefillLineItem.description}" (qty: ${prefillLineItem.quantity}). Please select a vendor and adjust details below, then submit from the full PO form.`
                            : 'Use this dialog to initiate a new Purchase Order. Full PO creation including vendor and line items is managed here.'}
                    </Alert>
                    {prefillLineItem && (
                        <Box sx={{ p: 2, bgcolor: '#FFFBEB', borderRadius: 2, border: '1px solid #FDE68A' }}>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#B45309', mb: 1, textTransform: 'uppercase' }}>Pre-filled Line Item</Typography>
                            <Grid container spacing={1.5}>
                                <Grid item xs={8}>
                                    <TextField fullWidth size="small" label="Product / Description" value={prefillLineItem.description} InputProps={{ readOnly: true }} sx={{ '& .MuiInputBase-root': { fontSize: '0.813rem' } }} />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField fullWidth size="small" label="Quantity" type="number" value={prefillLineItem.quantity} InputProps={{ readOnly: true }} sx={{ '& .MuiInputBase-root': { fontSize: '0.813rem' } }} />
                                </Grid>
                            </Grid>
                            <Typography sx={{ fontSize: '0.7rem', color: '#92400E', mt: 1 }}>
                                Product ID: {prefillLineItem.product_id}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => { setShowCreateDialog(false); setPrefillLineItem(null); }} sx={{ color: '#5F6B7C' }}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PurchaseOrders;
