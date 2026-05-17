import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, TablePagination, Stack, Avatar, IconButton, Tooltip,
    InputBase, Divider, Select, MenuItem, FormControl, Drawer, Grid,
    CircularProgress, Alert, Tabs, Tab,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import ActivityPanel from '../components/ActivityPanel';
import { toNum } from '../utils/numbers';

const fmt = (n) => toNum(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

const STATUS_STYLE = {
    Draft: { bg: '#F1F5F9', color: '#64748B' },
    Confirmed: { bg: '#EFF6FF', color: '#1565C0' },
    Processing: { bg: '#F0F9FF', color: '#0369A1' },
    Shipped: { bg: '#FFFBEB', color: '#B45309' },
    Delivered: { bg: '#F0FDF4', color: '#15803D' },
    Invoiced: { bg: '#FAF5FF', color: '#7C3AED' },
    Cancelled: { bg: '#FEF2F2', color: '#B91C1C' },
};

const AVATAR_COLORS = ['#1565C0', '#7C3AED', '#0891B2', '#059669', '#D97706'];
const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const StatusBadge = ({ status }) => {
    const s = STATUS_STYLE[status] || STATUS_STYLE.Draft;
    return <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: s.bg }}><Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: s.color }}>{status}</Typography></Box>;
};

/* ── Order Detail Drawer ───────────────────────────────────────────────── */
const OrderDetailDrawer = ({ open, onClose, orderId, companyId, onAction, companyUsers }) => {
    const { get, post, loading } = useApi();
    const [order, setOrder] = useState(null);
    const [toast, setToast] = useState(null);
    const [tab, setTab] = useState(0);

    const fetchOrder = useCallback(() => {
        if (orderId) get(`/${companyId}/sales/orders/${orderId}`).then(d => setOrder(d.data)).catch(() => {});
    }, [orderId, companyId, get]);

    useEffect(() => { if (open) { setOrder(null); setToast(null); setTab(0); fetchOrder(); } }, [open, fetchOrder]);

    const handleConfirm = async () => {
        try { await post(`/${companyId}/sales/orders/${orderId}/confirm`); fetchOrder(); onAction(); setToast({ type: 'success', msg: 'Order confirmed' }); }
        catch (e) { setToast({ type: 'error', msg: e.response?.data?.error || 'Failed' }); }
    };

    const handleInvoice = async () => {
        try { await post(`/${companyId}/sales/orders/${orderId}/invoice`); fetchOrder(); onAction(); setToast({ type: 'success', msg: 'Invoice created from order' }); }
        catch (e) { setToast({ type: 'error', msg: e.response?.data?.error || 'Failed' }); }
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100vw', md: 680 }, bgcolor: '#FAFBFC', display: 'flex', flexDirection: 'column' } }}>
            {/* Header */}
            <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E8ECF0', p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1A2332' }}>{order?.order_number || 'Sales Order'}</Typography>
                    {order && <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}><StatusBadge status={order.status} /><Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{order.customer_id?.customer_name}</Typography></Box>}
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
            </Box>

            {/* Actions */}
            {order && (
                <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F0F2F5', px: 2.5, py: 1.5, display: 'flex', gap: 1, flexShrink: 0 }}>
                    {order.status === 'Draft' && (
                        <Button size="small" variant="contained" startIcon={<CheckRoundedIcon sx={{ fontSize: 15 }} />} onClick={handleConfirm} disabled={loading} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                            Confirm Order
                        </Button>
                    )}
                    {['Confirmed', 'Processing', 'Shipped', 'Delivered'].includes(order.status) && (
                        <Button size="small" variant="outlined" startIcon={<ReceiptRoundedIcon sx={{ fontSize: 15 }} />} onClick={handleInvoice} disabled={loading} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Create Invoice
                        </Button>
                    )}
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

            {!order ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8, flex: 1 }}><CircularProgress size={28} /></Box>
            ) : (
                <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {toast && <Alert severity={toast.type} sx={{ mx: 2.5, mt: 2, borderRadius: 2 }} onClose={() => setToast(null)}>{toast.msg}</Alert>}

                    {/* Tab 0: Details */}
                    {tab === 0 && (
                        <Box sx={{ p: 2.5 }}>
                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', p: 2.5, mb: 2 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: '#1A2332' }}>Order Details</Typography>
                                <Grid container spacing={1.5}>
                                    {[
                                        ['Order Number', order.order_number],
                                        ['Status', <StatusBadge key="s" status={order.status} />],
                                        ['Customer', order.customer_id?.customer_name || '—'],
                                        ['Order Date', new Date(order.order_date).toLocaleDateString()],
                                        ['Required Date', order.required_date ? new Date(order.required_date).toLocaleDateString() : '—'],
                                        ['Currency', order.currency],
                                        ['Assigned To', order.assigned_to ? `${order.assigned_to.first_name} ${order.assigned_to.last_name}` : '—'],
                                        ['Priority', order.priority || 'Normal'],
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
                                    ['Subtotal', `${order.currency} ${fmt(order.subtotal)}`],
                                    ['Tax', `${order.currency} ${fmt(order.tax_amount)}`],
                                    ['Total Amount', `${order.currency} ${fmt(order.total_amount)}`, true],
                                ].map(([label, value, bold]) => (
                                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: bold ? '2px solid #E8ECF0' : '1px solid #F0F2F5' }}>
                                        <Typography sx={{ fontSize: bold ? '0.875rem' : '0.813rem', fontWeight: bold ? 700 : 500, color: '#5F6B7C' }}>{label}</Typography>
                                        <Typography sx={{ fontSize: bold ? '0.938rem' : '0.813rem', fontWeight: bold ? 800 : 600, color: bold ? '#1565C0' : '#1A2332' }}>{value}</Typography>
                                    </Box>
                                ))}
                            </Box>

                            {order.notes && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E8ECF0' }}>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, mb: 0.5 }}>NOTES</Typography>
                                    <Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{order.notes}</Typography>
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
                                            <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontSize: '0.7rem', fontWeight: 700, color: '#5F6B7C', textTransform: 'uppercase' }}>Qty</TableCell>
                                            <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontSize: '0.7rem', fontWeight: 700, color: '#5F6B7C', textTransform: 'uppercase' }}>Unit Price</TableCell>
                                            <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontSize: '0.7rem', fontWeight: 700, color: '#5F6B7C', textTransform: 'uppercase' }}>Tax%</TableCell>
                                            <TableCell align="right" sx={{ bgcolor: '#F7F9FC', fontSize: '0.7rem', fontWeight: 700, color: '#5F6B7C', textTransform: 'uppercase' }}>Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(order.line_items || []).map((li, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell><Typography sx={{ fontSize: '0.813rem', fontWeight: 500 }}>{li.description}</Typography></TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{toNum(li.quantity)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{fmt(li.unit_price)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{toNum(li.tax_rate)}%</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem' }}>{order.currency} {fmt(li.line_total || toNum(li.quantity) * toNum(li.unit_price))}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Box sx={{ p: 2, borderTop: '2px solid #E8ECF0', display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.2 }}>SUBTOTAL</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>{order.currency} {fmt(order.subtotal)}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.2 }}>TAX</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>{order.currency} {fmt(order.tax_amount)}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.2 }}>TOTAL</Typography>
                                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#1565C0' }}>{order.currency} {fmt(order.total_amount)}</Typography>
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
                                entityType="SalesOrder"
                                entityId={orderId}
                                assignedTo={order.assigned_to}
                                priority={order.priority}
                                assignPath={`/${companyId}/sales/orders/${orderId}/assign`}
                                companyUsers={companyUsers}
                                onAssigned={() => { onAction(); fetchOrder(); }}
                            />
                        </Box>
                    )}
                </Box>
            )}
        </Drawer>
    );
};

/* ── Main SalesOrders ──────────────────────────────────────────────────── */
const SalesOrders = () => {
    const { selectedCompanyId } = useAuth();
    const { get, post } = useApi();
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [companyUsers, setCompanyUsers] = useState([]);

    const fetchOrders = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const params = new URLSearchParams({ skip: page * rowsPerPage, limit: rowsPerPage });
            if (statusFilter) params.append('status', statusFilter);
            const data = await get(`/${selectedCompanyId}/sales/orders?${params}`);
            setOrders(data.data || []);
            setTotal(data.pagination?.total || 0);
        } catch {}
    }, [selectedCompanyId, page, rowsPerPage, statusFilter, get]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    useEffect(() => {
        if (!selectedCompanyId) return;
        get(`/${selectedCompanyId}/messages/users`).then(d => setCompanyUsers(d?.data || [])).catch(() => {});
    }, [selectedCompanyId, get]);

    const exportCSV = () => {
        const rows = [['Order #', 'Customer', 'Date', 'Currency', 'Total', 'Status', 'Assignee'], ...orders.map(o => [o.order_number, o.customer_id?.customer_name || '', new Date(o.order_date).toLocaleDateString(), o.currency, toNum(o.total_amount).toFixed(2), o.status, o.assigned_to ? `${o.assigned_to.first_name} ${o.assigned_to.last_name}` : ''])];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `SalesOrders_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    };

    const displayed = search ? orders.filter(o => o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.customer_id?.customer_name?.toLowerCase().includes(search.toLowerCase())) : orders;

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Sales Orders</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>Track and manage customer orders through fulfillment</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={exportCSV} sx={{ fontWeight: 600, fontSize: '0.813rem', color: '#5F6B7C', borderColor: '#E8ECF0' }}>Export CSV</Button>
                </Stack>
            </Box>

            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5', flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: 2, px: 1.5, py: 0.75, flex: 1, minWidth: 200, maxWidth: 360 }}>
                            <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 18, mr: 1 }} />
                            <InputBase placeholder="Search order # or customer..." value={search} onChange={e => setSearch(e.target.value)} sx={{ fontSize: '0.813rem', color: '#1A2332', flex: 1 }} />
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <Select value={statusFilter} displayEmpty onChange={e => { setStatusFilter(e.target.value); setPage(0); }} renderValue={v => v || 'All Statuses'} sx={{ fontSize: '0.813rem', bgcolor: '#F0F2F5', '& fieldset': { border: 'none' }, borderRadius: 2 }} startAdornment={<FilterListRoundedIcon sx={{ fontSize: 16, mr: 0.5, color: '#94A3B8' }} />}>
                                <MenuItem value="" sx={{ fontSize: '0.813rem' }}>All Statuses</MenuItem>
                                {Object.keys(STATUS_STYLE).map(s => <MenuItem key={s} value={s} sx={{ fontSize: '0.813rem' }}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', ml: 'auto' }}>{total} total orders</Typography>
                    </Box>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Order #</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Order Date</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Assignee</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayed.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>No sales orders found.</TableCell></TableRow>
                            ) : displayed.map(o => {
                                const name = o.customer_id?.customer_name;
                                return (
                                    <TableRow key={o._id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedId(o._id)}>
                                        <TableCell><Typography sx={{ fontSize: '0.813rem', fontWeight: 700, color: '#1565C0' }}>{o.order_number}</Typography></TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar sx={{ width: 26, height: 26, bgcolor: getColor(name), fontSize: '0.65rem', fontWeight: 700 }}>{name?.[0]?.toUpperCase() || 'C'}</Avatar>
                                                <Typography sx={{ fontSize: '0.813rem', fontWeight: 500 }}>{name || '—'}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ color: '#5F6B7C', fontSize: '0.813rem' }}>{new Date(o.order_date).toLocaleDateString()}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem' }}>{o.currency} {fmt(o.total_amount)}</TableCell>
                                        <TableCell><StatusBadge status={o.status} /></TableCell>
                                        <TableCell onClick={e => e.stopPropagation()}>
                                            {o.assigned_to ? (
                                                <Tooltip title={`${o.assigned_to.first_name} ${o.assigned_to.last_name}`}>
                                                    <Avatar sx={{ width: 26, height: 26, fontSize: '0.6rem', bgcolor: getColor(o.assigned_to.first_name), cursor: 'pointer' }}
                                                        onClick={() => setSelectedId(o._id)}>
                                                        {(o.assigned_to.first_name?.[0] || '') + (o.assigned_to.last_name?.[0] || '')}
                                                    </Avatar>
                                                </Tooltip>
                                            ) : (
                                                <Typography sx={{ fontSize: '0.7rem', color: '#CBD5E1' }}>—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center" onClick={e => e.stopPropagation()}>
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                {o.status === 'Draft' && (
                                                    <Tooltip title="Confirm Order">
                                                        <IconButton size="small" onClick={async () => { try { await post(`/${selectedCompanyId}/sales/orders/${o._id}/confirm`); fetchOrders(); } catch {} }} sx={{ color: '#1565C0', bgcolor: '#EFF6FF', borderRadius: 1.5 }}>
                                                            <CheckRoundedIcon sx={{ fontSize: 15 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {['Confirmed', 'Processing', 'Shipped', 'Delivered'].includes(o.status) && (
                                                    <Tooltip title="Create Invoice">
                                                        <IconButton size="small" onClick={() => setSelectedId(o._id)} sx={{ color: '#7C3AED', bgcolor: '#FAF5FF', borderRadius: 1.5 }}>
                                                            <ReceiptRoundedIcon sx={{ fontSize: 15 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
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

            <OrderDetailDrawer
                open={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                orderId={selectedId}
                companyId={selectedCompanyId}
                onAction={fetchOrders}
                companyUsers={companyUsers}
            />
        </Box>
    );
};

export default SalesOrders;
