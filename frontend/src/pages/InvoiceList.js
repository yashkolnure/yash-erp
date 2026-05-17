import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, TablePagination, Stack, Avatar, IconButton, Tooltip,
    InputBase, Divider, Select, MenuItem, FormControl, Drawer, Grid, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress,
    Tab, Tabs, Alert, Snackbar, Paper, TableContainer, InputAdornment, Checkbox,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import { exportToCSV } from '../utils/export';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import InvoiceForm from '../components/InvoiceForm';
import ActivityPanel from '../components/ActivityPanel';
import FileAttachments from '../components/FileAttachments';
import ConfirmDialog from '../components/ConfirmDialog';
import API from '../services/api';

const STATUS_STYLE = {
    Draft: { bg: '#F1F5F9', color: '#64748B' },
    Posted: { bg: '#EFF6FF', color: '#1565C0' },
    'Partially Paid': { bg: '#FFFBEB', color: '#B45309' },
    Paid: { bg: '#F0FDF4', color: '#15803D' },
    Overdue: { bg: '#FEF2F2', color: '#B91C1C' },
    Cancelled: { bg: '#F1F5F9', color: '#64748B' },
};

const toNum = (n) => Number(n?.$numberDecimal ?? n ?? 0);
const fmt = (n) => toNum(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

const StatusBadge = ({ status }) => {
    const s = STATUS_STYLE[status] || STATUS_STYLE.Draft;
    return (
        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: s.bg }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: s.color }}>{status}</Typography>
        </Box>
    );
};

/* ── Invoice Detail Drawer ─────────────────────────────────────────────── */
const InvoiceDetailDrawer = ({ open, onClose, invoiceId, companyId, onAction, companyUsers }) => {
    const { get, post, loading } = useApi();
    const [inv, setInv] = useState(null);
    const [tab, setTab] = useState(0);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [reminderLoading, setReminderLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [snackbar, setSnackbar] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    useEffect(() => {
        if (open && invoiceId) {
            setInv(null);
            setTab(0);
            get(`/${companyId}/ar/invoices/${invoiceId}`).then(d => setInv(d.data)).catch(() => {});
        }
    }, [open, invoiceId, companyId, get]);

    const handlePost = async () => {
        try {
            await post(`/${companyId}/ar/invoices/${invoiceId}/post`);
            setToast({ type: 'success', msg: 'Invoice posted to GL' });
            onAction();
            get(`/${companyId}/ar/invoices/${invoiceId}`).then(d => setInv(d.data)).catch(() => {});
        } catch (e) {
            setToast({ type: 'error', msg: e.response?.data?.error || 'Failed to post' });
        }
    };

    const handleEmail = async () => {
        try {
            await post(`/${companyId}/ar/invoices/${invoiceId}/email`);
            setToast({ type: 'success', msg: 'Invoice emailed to customer' });
        } catch (e) {
            setToast({ type: 'error', msg: e.response?.data?.error || 'Email failed' });
        }
    };

    const handleCancel = async () => {
        try {
            await post(`/${companyId}/ar/invoices/${invoiceId}/cancel`);
            setToast({ type: 'success', msg: 'Invoice cancelled' });
            onAction();
            get(`/${companyId}/ar/invoices/${invoiceId}`).then(d => setInv(d.data)).catch(() => {});
        } catch (e) {
            setToast({ type: 'error', msg: e.response?.data?.error || 'Cannot cancel' });
        }
    };

    const handleDuplicate = async () => {
        try {
            await post(`/${companyId}/ar/invoices/${invoiceId}/duplicate`);
            setToast({ type: 'success', msg: 'Invoice duplicated as Draft' });
            onClose();
            onAction();
        } catch (e) {
            setToast({ type: 'error', msg: e.response?.data?.error || 'Duplicate failed' });
        }
    };

    const handleSendReminder = async () => {
        setReminderLoading(true);
        try {
            await post(`/${companyId}/ar/invoices/${invoiceId}/send-reminder`);
            setSnackbar({ type: 'success', msg: 'Payment reminder sent successfully' });
        } catch (e) {
            setSnackbar({ type: 'error', msg: e.response?.data?.error || 'Failed to send reminder' });
        } finally {
            setReminderLoading(false);
        }
    };

    const requestCancel = () => {
        setPendingAction(() => handleCancel);
        setConfirmOpen(true);
    };

    const handlePDF = async () => {
        setPdfLoading(true);
        try {
            const resp = await API.get(`/${companyId}/ar/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${inv?.invoice_number || invoiceId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setToast({ type: 'error', msg: 'PDF generation failed' });
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <>
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100vw', md: 680 }, bgcolor: '#FAFBFC' } }}
        >
            {/* Header */}
            <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E8ECF0', p: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1A2332' }}>
                        {inv?.invoice_number || 'Invoice Detail'}
                    </Typography>
                    {inv && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <StatusBadge status={inv.status} />
                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                {inv.customer_id?.customer_name}
                            </Typography>
                        </Box>
                    )}
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}>
                    <CloseRoundedIcon />
                </IconButton>
            </Box>

            {/* Action bar */}
            {inv && (
                <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F0F2F5', px: 2.5, py: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {inv.status === 'Draft' && (
                        <Button size="small" variant="contained" startIcon={<CheckCircleRoundedIcon sx={{ fontSize: 15 }} />} onClick={handlePost} disabled={loading} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                            Post to GL
                        </Button>
                    )}
                    {!['Draft', 'Cancelled'].includes(inv.status) && (
                        <Button size="small" variant="outlined" startIcon={<EmailRoundedIcon sx={{ fontSize: 15 }} />} onClick={handleEmail} disabled={loading} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Email Customer
                        </Button>
                    )}
                    {['Posted', 'Partially Paid', 'Overdue'].includes(inv.status) && (
                        <Button size="small" variant="outlined" color="warning" startIcon={reminderLoading ? <CircularProgress size={12} /> : <NotificationsActiveRoundedIcon sx={{ fontSize: 15 }} />} onClick={handleSendReminder} disabled={reminderLoading} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Send Reminder
                        </Button>
                    )}
                    <Button size="small" variant="outlined" startIcon={pdfLoading ? <CircularProgress size={12} /> : <PictureAsPdfRoundedIcon sx={{ fontSize: 15 }} />} onClick={handlePDF} disabled={pdfLoading} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        Download PDF
                    </Button>
                    {inv.status !== 'Void' && (
                        <Button size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 15 }} />} onClick={handleDuplicate} disabled={loading} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Duplicate
                        </Button>
                    )}
                    {!['Paid', 'Cancelled'].includes(inv.status) && (
                        <Button size="small" color="error" variant="outlined" startIcon={<CancelRoundedIcon sx={{ fontSize: 15 }} />} onClick={requestCancel} disabled={loading} sx={{ fontWeight: 600, fontSize: '0.75rem', ml: 'auto' }}>
                            Cancel Invoice
                        </Button>
                    )}
                </Box>
            )}

            {!inv ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {toast && (
                        <Alert severity={toast.type} sx={{ mx: 2.5, mt: 2, borderRadius: 2 }} onClose={() => setToast(null)}>
                            {toast.msg}
                        </Alert>
                    )}

                    {/* Tabs */}
                    <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F0F2F5', px: 2.5 }}>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontSize: '0.788rem', fontWeight: 600, minHeight: 44, textTransform: 'none', color: '#5F6B7C' }, '& .Mui-selected': { color: '#1565C0' }, '& .MuiTabs-indicator': { bgcolor: '#1565C0' } }}>
                            <Tab label="Details" />
                            <Tab label="Line Items" />
                            <Tab label="Activity Log" />
                        </Tabs>
                    </Box>

                    {/* Tab 0: Details */}
                    {tab === 0 && (
                        <Box sx={{ p: 2.5 }}>
                            <Grid container spacing={2}>
                                {[
                                    ['Invoice Number', inv.invoice_number],
                                    ['Status', <StatusBadge key="s" status={inv.status} />],
                                    ['Customer', inv.customer_id?.customer_name],
                                    ['Customer Email', inv.customer_id?.email || '—'],
                                    ['Invoice Date', new Date(inv.invoice_date).toLocaleDateString()],
                                    ['Due Date', new Date(inv.due_date).toLocaleDateString()],
                                    ['Currency', inv.currency],
                                    ['Sales Order', inv.sales_order_id?.order_number || '—'],
                                ].map(([label, value]) => (
                                    <Grid item xs={6} key={label}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.3 }}>{label}</Typography>
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A2332' }}>{value}</Typography>
                                    </Grid>
                                ))}
                            </Grid>

                            {inv.notes && (
                                <Box sx={{ mt: 2.5, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E8ECF0' }}>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, mb: 0.5 }}>NOTES</Typography>
                                    <Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{inv.notes}</Typography>
                                </Box>
                            )}

                            <Box sx={{ mt: 2 }}>
                                <FileAttachments attachments={inv.attachments || []} readonly />
                            </Box>

                            {/* Totals */}
                            <Box sx={{ mt: 2.5, p: 2.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: '#1A2332' }}>Financial Summary</Typography>
                                {[
                                    ['Subtotal', `${inv.currency} ${fmt(inv.subtotal)}`],
                                    ['Tax', `${inv.currency} ${fmt(inv.tax_amount)}`],
                                    ['Total Amount', `${inv.currency} ${fmt(inv.total_amount)}`, true],
                                    ['Amount Paid', `${inv.currency} ${fmt(Number(inv.total_amount) - Number(inv.amount_due))}`, false, '#15803D'],
                                    ['Balance Due', `${inv.currency} ${fmt(inv.amount_due)}`, false, Number(inv.amount_due) > 0 ? '#B91C1C' : '#15803D'],
                                ].map(([label, value, bold, color]) => (
                                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: bold ? '2px solid #E8ECF0' : '1px solid #F0F2F5' }}>
                                        <Typography sx={{ fontSize: bold ? '0.875rem' : '0.813rem', fontWeight: bold ? 700 : 500, color: '#5F6B7C' }}>{label}</Typography>
                                        <Typography sx={{ fontSize: bold ? '0.938rem' : '0.813rem', fontWeight: bold ? 800 : 600, color: color || '#1A2332' }}>{value}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Tab 1: Line Items */}
                    {tab === 1 && (
                        <Box sx={{ p: 2.5 }}>
                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#5F6B7C', bgcolor: '#F7F9FC' }}>#</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#5F6B7C', bgcolor: '#F7F9FC' }}>Description</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#5F6B7C', bgcolor: '#F7F9FC' }}>Qty</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#5F6B7C', bgcolor: '#F7F9FC' }}>Unit Price</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#5F6B7C', bgcolor: '#F7F9FC' }}>Tax %</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#5F6B7C', bgcolor: '#F7F9FC' }}>Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(inv.line_items || []).map((li, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>{i + 1}</TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1A2332' }}>{li.description}</Typography>
                                                    {li.product_id && <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>{li.product_id}</Typography>}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{toNum(li.quantity)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{fmt(li.unit_price)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{toNum(li.tax_rate)}%</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.813rem', fontWeight: 700, color: '#1A2332' }}>{inv.currency} {fmt(li.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Box sx={{ p: 2, borderTop: '2px solid #E8ECF0', display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.3 }}>SUBTOTAL</Typography>
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.938rem' }}>{inv.currency} {fmt(inv.subtotal)}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.3 }}>TAX</Typography>
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.938rem' }}>{inv.currency} {fmt(inv.tax_amount)}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.3 }}>TOTAL</Typography>
                                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#1565C0' }}>{inv.currency} {fmt(inv.total_amount)}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Tab 2: Activity */}
                    {tab === 2 && (
                        <Box sx={{ height: 'calc(100vh - 210px)', display: 'flex', flexDirection: 'column' }}>
                            <ActivityPanel
                                companyId={companyId}
                                entityType="Invoice"
                                entityId={invoiceId}
                                assignedTo={inv.assigned_to}
                                priority={inv.priority}
                                assignPath={`/${companyId}/ar/invoices/${invoiceId}/assign`}
                                companyUsers={companyUsers}
                                onAssigned={() => { onAction(); get(`/${companyId}/ar/invoices/${invoiceId}`).then(d => setInv(d.data)).catch(() => {}); }}
                            />
                        </Box>
                    )}
                </Box>
            )}
        </Drawer>

        <Snackbar
            open={Boolean(snackbar)}
            autoHideDuration={4000}
            onClose={() => setSnackbar(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            {snackbar && (
                <Alert severity={snackbar.type} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
                    {snackbar.msg}
                </Alert>
            )}
        </Snackbar>

        <ConfirmDialog
            open={confirmOpen}
            title="Cancel Invoice"
            message="This will cancel the invoice. This action cannot be undone. Proceed?"
            confirmLabel="Cancel Invoice"
            confirmColor="error"
            onConfirm={() => { setConfirmOpen(false); pendingAction && pendingAction(); }}
            onCancel={() => setConfirmOpen(false)}
        />
        </>
    );
};

/* ── Aging Report Modal ────────────────────────────────────────────────── */
const AgingReportModal = ({ open, onClose, companyId }) => {
    const { get, loading } = useApi();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (open) {
            get(`/${companyId}/ar/aging-report`).then(d => setData(d.data)).catch(() => {});
        }
    }, [open, companyId, get]);

    const buckets = [
        { key: 'current', label: 'Current', color: '#15803D', bg: '#F0FDF4' },
        { key: 'days_1_30', label: '1–30 Days', color: '#B45309', bg: '#FFFBEB' },
        { key: 'days_31_60', label: '31–60 Days', color: '#C2410C', bg: '#FFF7ED' },
        { key: 'days_61_90', label: '61–90 Days', color: '#B91C1C', bg: '#FEF2F2' },
        { key: 'over_90', label: '90+ Days', color: '#7F1D1D', bg: '#FEF2F2' },
    ];

    const total = (key) => (data?.[key] || []).reduce((s, r) => s + r.amount_due, 0);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentRoundedIcon sx={{ color: '#1565C0' }} />
                Accounts Receivable Aging Report
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 0 }}>
                {loading || !data ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
                ) : (
                    <>
                        {/* Summary row */}
                        <Box sx={{ display: 'flex', p: 2.5, gap: 2, borderBottom: '1px solid #F0F2F5', flexWrap: 'wrap' }}>
                            {buckets.map(b => (
                                <Box key={b.key} sx={{ flex: 1, minWidth: 120, p: 1.5, borderRadius: 2, bgcolor: b.bg, textAlign: 'center' }}>
                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: b.color, mb: 0.5 }}>{b.label}</Typography>
                                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: b.color }}>${fmt(total(b.key))}</Typography>
                                    <Typography sx={{ fontSize: '0.7rem', color: b.color }}>{(data[b.key] || []).length} inv.</Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Detail tables per bucket */}
                        <Box sx={{ maxHeight: 460, overflow: 'auto' }}>
                            {buckets.map(b => (data[b.key] || []).length > 0 && (
                                <Box key={b.key}>
                                    <Box sx={{ px: 2.5, py: 1, bgcolor: '#F8FAFC', borderBottom: '1px solid #F0F2F5' }}>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: b.color }}>{b.label}</Typography>
                                    </Box>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Invoice #</TableCell>
                                                <TableCell>Customer</TableCell>
                                                <TableCell>Due Date</TableCell>
                                                <TableCell align="right">Days Overdue</TableCell>
                                                <TableCell align="right">Amount Due</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(data[b.key] || []).map((r, i) => (
                                                <TableRow key={i} hover>
                                                    <TableCell sx={{ fontWeight: 600, color: '#1565C0', fontSize: '0.813rem' }}>{r.invoice_number}</TableCell>
                                                    <TableCell sx={{ fontSize: '0.813rem' }}>{r.customer}</TableCell>
                                                    <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{new Date(r.due_date).toLocaleDateString()}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem', color: b.color }}>{Math.max(0, r.days_overdue)}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem', color: b.color }}>${fmt(r.amount_due)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            ))}
                        </Box>
                    </>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ color: '#5F6B7C' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Main InvoiceList ──────────────────────────────────────────────────── */
const InvoiceList = () => {
    const { selectedCompanyId } = useAuth();
    const { get } = useApi();
    const [invoices, setInvoices] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [showAging, setShowAging] = useState(false);
    const [stats, setStats] = useState({ total: 0, outstanding: 0, overdue: 0, paid: 0 });
    const [companyUsers, setCompanyUsers] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [invoiceFormDirty, setInvoiceFormDirty] = useState(false);
    const { confirmClose: confirmInvoiceClose } = useUnsavedChanges(invoiceFormDirty);

    const fetchInvoices = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const params = new URLSearchParams({ skip: page * rowsPerPage, limit: rowsPerPage });
            if (statusFilter) params.append('status', statusFilter);
            const data = await get(`/${selectedCompanyId}/ar/invoices?${params}`);
            setInvoices(data.data || []);
            setTotal(data.pagination?.total || 0);
        } catch {}
    }, [selectedCompanyId, page, rowsPerPage, statusFilter, get]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    useEffect(() => {
        if (!selectedCompanyId) return;
        get(`/${selectedCompanyId}/messages/users`).then(d => setCompanyUsers(d?.data || [])).catch(() => {});
    }, [selectedCompanyId, get]);

    // Derive stats from current page data + totals
    useEffect(() => {
        const s = invoices.reduce((acc, inv) => {
            acc.total += Number(inv.total_amount || 0);
            if (['Posted', 'Partially Paid', 'Overdue'].includes(inv.status)) acc.outstanding += Number(inv.amount_due || 0);
            if (inv.status === 'Overdue') acc.overdue += Number(inv.amount_due || 0);
            if (inv.status === 'Paid') acc.paid += Number(inv.total_amount || 0);
            return acc;
        }, { total: 0, outstanding: 0, overdue: 0, paid: 0 });
        setStats(s);
    }, [invoices]);

    const exportCSV = () => {
        const headers = ['Invoice #', 'Customer', 'Date', 'Due Date', 'Currency', 'Total', 'Balance Due', 'Status'];
        const rows = invoices.map(inv => [
            inv.invoice_number,
            inv.customer_id?.customer_name || '',
            new Date(inv.invoice_date).toLocaleDateString(),
            new Date(inv.due_date).toLocaleDateString(),
            inv.currency,
            Number(inv.total_amount).toFixed(2),
            Number(inv.amount_due).toFixed(2),
            inv.status,
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Invoices_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    const handlePDFRow = async (inv) => {
        try {
            const resp = await API.get(`/${selectedCompanyId}/ar/invoices/${inv._id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${inv.invoice_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {}
    };

    const displayed = search
        ? invoices.filter(inv => inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) || inv.customer_id?.customer_name?.toLowerCase().includes(search.toLowerCase()))
        : invoices;

    const allDisplayedIds = displayed.map(inv => inv._id);
    const allSelected = allDisplayedIds.length > 0 && allDisplayedIds.every(id => selectedIds.has(id));
    const someSelected = allDisplayedIds.some(id => selectedIds.has(id)) && !allSelected;

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(prev => new Set([...prev, ...allDisplayedIds]));
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                allDisplayedIds.forEach(id => next.delete(id));
                return next;
            });
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleBulkExport = () => {
        const selected = displayed.filter(inv => selectedIds.has(inv._id));
        const rows = selected.map(inv => ({
            'Invoice #': inv.invoice_number,
            Customer: inv.customer_id?.customer_name || '',
            Date: new Date(inv.invoice_date).toLocaleDateString(),
            'Due Date': new Date(inv.due_date).toLocaleDateString(),
            Currency: inv.currency,
            Total: Number(inv.total_amount).toFixed(2),
            'Balance Due': Number(inv.amount_due).toFixed(2),
            Status: inv.status,
        }));
        exportToCSV(rows, `Invoices_Selected_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Invoices</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>Manage billing, payments and accounts receivable</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<AssessmentRoundedIcon />} onClick={() => setShowAging(true)} sx={{ fontWeight: 600, fontSize: '0.813rem', color: '#5F6B7C', borderColor: '#E8ECF0' }}>
                        Aging Report
                    </Button>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={exportCSV} sx={{ fontWeight: 600, fontSize: '0.813rem', color: '#5F6B7C', borderColor: '#E8ECF0' }}>
                        Export CSV
                    </Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setShowForm(true)} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>
                        New Invoice
                    </Button>
                </Stack>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                {[
                    { label: 'Total Billed', value: `$${fmt(stats.total)}`, color: '#1565C0', bg: '#EFF6FF' },
                    { label: 'Outstanding', value: `$${fmt(stats.outstanding)}`, color: '#B45309', bg: '#FFFBEB' },
                    { label: 'Overdue', value: `$${fmt(stats.overdue)}`, color: '#B91C1C', bg: '#FEF2F2', icon: <WarningAmberRoundedIcon sx={{ fontSize: 14 }} /> },
                    { label: 'Collected', value: `$${fmt(stats.paid)}`, color: '#15803D', bg: '#F0FDF4' },
                ].map(s => (
                    <Grid item xs={12} sm={6} lg={3} key={s.label}>
                        <Card sx={{ border: 'none' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Box sx={{ bgcolor: s.bg, borderRadius: 1.5, p: 0.5, display: 'flex' }}>
                                        <ReceiptLongRoundedIcon sx={{ fontSize: 16, color: s.color }} />
                                    </Box>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>{s.label}</Typography>
                                </Box>
                                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.value}</Typography>
                                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 0.2 }}>Current page · {displayed.length} invoices</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <Paper sx={{ p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                    <Typography variant="body2" fontWeight={600}>{selectedIds.size} selected</Typography>
                    <Button size="small" variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={handleBulkExport}>Export Selected</Button>
                    <Button size="small" sx={{ ml: 'auto' }} onClick={() => setSelectedIds(new Set())}>Clear</Button>
                </Paper>
            )}

            {/* Main Table */}
            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5', flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: 2, px: 1.5, py: 0.75, flex: 1, minWidth: 200, maxWidth: 360 }}>
                            <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 18, mr: 1 }} />
                            <InputBase placeholder="Search invoice # or customer..." value={search} onChange={e => setSearch(e.target.value)} sx={{ fontSize: '0.813rem', color: '#1A2332', flex: 1 }} />
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <Select value={statusFilter} displayEmpty onChange={e => { setStatusFilter(e.target.value); setPage(0); }} renderValue={v => v || 'All Statuses'} sx={{ fontSize: '0.813rem', bgcolor: '#F0F2F5', '& fieldset': { border: 'none' }, borderRadius: 2 }} startAdornment={<FilterListRoundedIcon sx={{ fontSize: 16, mr: 0.5, color: '#94A3B8' }} />}>
                                <MenuItem value="" sx={{ fontSize: '0.813rem' }}>All Statuses</MenuItem>
                                {Object.keys(STATUS_STYLE).map(s => <MenuItem key={s} value={s} sx={{ fontSize: '0.813rem' }}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', ml: 'auto' }}>{total} total records</Typography>
                    </Box>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={allSelected}
                                        indeterminate={someSelected}
                                        onChange={handleSelectAll}
                                    />
                                </TableCell>
                                <TableCell>Invoice #</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Due Date</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell align="right">Balance Due</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Assignee</TableCell>
                                <TableCell align="center" sx={{ minWidth: 120 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayed.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#94A3B8', fontSize: '0.875rem' }}>
                                        No invoices found. Create your first invoice to get started.
                                    </TableCell>
                                </TableRow>
                            ) : displayed.map(inv => (
                                <TableRow
                                    key={inv._id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedId(inv._id)}
                                >
                                    <TableCell padding="checkbox" onClick={e => { e.stopPropagation(); handleSelectRow(inv._id); }}>
                                        <Checkbox size="small" checked={selectedIds.has(inv._id)} onChange={() => handleSelectRow(inv._id)} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontSize: '0.813rem', fontWeight: 700, color: '#1565C0' }}>{inv.invoice_number}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 26, height: 26, bgcolor: '#EEF2FF', color: '#1565C0', fontSize: '0.65rem', fontWeight: 700 }}>
                                                {inv.customer_id?.customer_name?.[0]?.toUpperCase() || 'C'}
                                            </Avatar>
                                            <Typography sx={{ fontSize: '0.813rem', fontWeight: 500 }}>{inv.customer_id?.customer_name || '—'}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ color: '#5F6B7C', fontSize: '0.813rem' }}>{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                                    <TableCell sx={{ color: '#5F6B7C', fontSize: '0.813rem' }}>{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.813rem' }}>
                                        {inv.currency} {fmt(inv.total_amount)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem', color: Number(inv.amount_due) > 0 ? '#B91C1C' : '#15803D' }}>
                                        {inv.currency} {fmt(inv.amount_due)}
                                    </TableCell>
                                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        {inv.assigned_to ? (
                                            <Tooltip title={`${inv.assigned_to.first_name} ${inv.assigned_to.last_name}`}>
                                                <Avatar sx={{ width: 26, height: 26, fontSize: '0.6rem', bgcolor: '#6366F1', cursor: 'pointer' }}
                                                    onClick={() => setSelectedId(inv._id)}>
                                                    {(inv.assigned_to.first_name?.[0] || '') + (inv.assigned_to.last_name?.[0] || '')}
                                                </Avatar>
                                            </Tooltip>
                                        ) : (
                                            <Typography sx={{ fontSize: '0.7rem', color: '#CBD5E1' }}>—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                            <Tooltip title="Download PDF">
                                                <IconButton size="small" onClick={() => handlePDFRow(inv)} sx={{ color: '#B91C1C', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' }, borderRadius: 1.5 }}>
                                                    <PictureAsPdfRoundedIcon sx={{ fontSize: 15 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="View Detail">
                                                <IconButton size="small" onClick={() => setSelectedId(inv._id)} sx={{ color: '#1565C0', bgcolor: '#EFF6FF', '&:hover': { bgcolor: '#DBEAFE' }, borderRadius: 1.5 }}>
                                                    <ReceiptLongRoundedIcon sx={{ fontSize: 15 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Divider />
                    <TablePagination
                        component="div" count={total} page={page}
                        onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                        rowsPerPageOptions={[10, 20, 50]}
                    />
                </CardContent>
            </Card>

            {/* New Invoice Dialog */}
            <Dialog open={showForm} onClose={() => confirmInvoiceClose(() => { setShowForm(false); setInvoiceFormDirty(false); })} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>New Invoice</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <InvoiceForm companyId={selectedCompanyId} onDirtyChange={setInvoiceFormDirty} onSuccess={() => { setShowForm(false); setInvoiceFormDirty(false); fetchInvoices(); }} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => confirmInvoiceClose(() => { setShowForm(false); setInvoiceFormDirty(false); })} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Invoice Detail Drawer */}
            <InvoiceDetailDrawer
                open={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                invoiceId={selectedId}
                companyId={selectedCompanyId}
                onAction={fetchInvoices}
                companyUsers={companyUsers}
            />

            {/* Aging Report */}
            <AgingReportModal open={showAging} onClose={() => setShowAging(false)} companyId={selectedCompanyId} />
        </Box>
    );
};

export default InvoiceList;
