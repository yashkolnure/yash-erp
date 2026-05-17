import React, { useState, useCallback } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableHead, TableBody,
    TableRow, TableCell, TextField, CircularProgress, Collapse,
    IconButton, Chip,
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import { fmtCurrency } from '../utils/numbers';

const today = () => new Date().toISOString().slice(0, 10);

const BUCKET_LABELS = [
    { key: 'current',   label: 'Current',    color: 'default',  sx: {} },
    { key: 'days1_30',  label: '1-30 Days',  color: 'warning',  sx: { bgcolor: '#FEF9C3', color: '#92400E' } },
    { key: 'days31_60', label: '31-60 Days', color: 'warning',  sx: { bgcolor: '#FED7AA', color: '#9A3412' } },
    { key: 'days61_90', label: '61-90 Days', color: 'error',    sx: { bgcolor: '#FEE2E2', color: '#991B1B' } },
    { key: 'over90',    label: '90+ Days',   color: 'error',    sx: { bgcolor: '#FCA5A5', color: '#7F1D1D', fontWeight: 700 } },
];

const CARD_COLORS = ['#1565C0', '#B45309', '#C2410C', '#B91C1C', '#7F1D1D'];

function exportToCSV(summary, totals, asOfDate) {
    const headers = ['Vendor', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total'];
    const rows = summary.map(r => [
        r.vendor,
        r.current.toFixed(2),
        r.days1_30.toFixed(2),
        r.days31_60.toFixed(2),
        r.days61_90.toFixed(2),
        r.over90.toFixed(2),
        r.total.toFixed(2),
    ]);
    rows.push([
        'TOTAL',
        totals.current.toFixed(2),
        totals.days1_30.toFixed(2),
        totals.days31_60.toFixed(2),
        totals.days61_90.toFixed(2),
        totals.over90.toFixed(2),
        totals.grand_total.toFixed(2),
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ap-aging-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function VendorRow({ row, buckets, color }) {
    const [open, setOpen] = useState(false);

    // Collect all bills for this vendor across buckets
    const vendorBills = BUCKET_LABELS.flatMap(b =>
        (buckets[b.key] || []).filter(bill => bill.vendor === row.vendor).map(bill => ({ ...bill, bucket: b.label, bucketSx: b.sx }))
    );

    return (
        <>
            <TableRow
                hover
                sx={{ cursor: 'pointer', '& > td': { borderBottom: open ? 'none' : undefined } }}
                onClick={() => setOpen(o => !o)}
            >
                <TableCell sx={{ width: 36, pr: 0 }}>
                    <IconButton size="small" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
                        {open ? <KeyboardArrowUpRoundedIcon fontSize="small" /> : <KeyboardArrowDownRoundedIcon fontSize="small" />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{row.vendor}</TableCell>
                <TableCell align="right">{row.current > 0 ? fmtCurrency(row.current) : '—'}</TableCell>
                <TableCell align="right" sx={row.days1_30 > 0 ? { bgcolor: '#FFFBEB' } : {}}>
                    {row.days1_30 > 0 ? fmtCurrency(row.days1_30) : '—'}
                </TableCell>
                <TableCell align="right" sx={row.days31_60 > 0 ? { bgcolor: '#FFF7ED' } : {}}>
                    {row.days31_60 > 0 ? fmtCurrency(row.days31_60) : '—'}
                </TableCell>
                <TableCell align="right" sx={row.days61_90 > 0 ? { bgcolor: '#FEF2F2' } : {}}>
                    {row.days61_90 > 0 ? fmtCurrency(row.days61_90) : '—'}
                </TableCell>
                <TableCell align="right" sx={row.over90 > 0 ? { bgcolor: '#FEE2E2', fontWeight: 700 } : {}}>
                    {row.over90 > 0 ? fmtCurrency(row.over90) : '—'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtCurrency(row.total)}</TableCell>
            </TableRow>

            <TableRow>
                <TableCell colSpan={8} sx={{ p: 0, border: 'none' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ bgcolor: '#F8FAFC', px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                                Bills for {row.vendor}
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Bill #</TableCell>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Due Date</TableCell>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Bucket</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Days Overdue</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Total Amount</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Amount Due</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {vendorBills.map(bill => (
                                        <TableRow key={bill._id}>
                                            <TableCell sx={{ fontSize: '0.78rem' }}>{bill.bill_number || '—'}</TableCell>
                                            <TableCell sx={{ fontSize: '0.78rem' }}>
                                                {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={bill.bucket} size="small" sx={{ fontSize: '0.7rem', ...bill.bucketSx }} />
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.78rem' }}>
                                                {bill.days_overdue > 0 ? bill.days_overdue : '—'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{fmtCurrency(bill.total_amount)}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{fmtCurrency(bill.amount_due)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

export default function APAging() {
    const { selectedCompanyId } = useAuth();
    const { get } = useApi();
    const [asOfDate, setAsOfDate] = useState(today());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const runReport = useCallback(async () => {
        if (!selectedCompanyId) return;
        setLoading(true);
        setError('');
        try {
            const res = await get(`/${selectedCompanyId}/reports/ap-aging?as_of_date=${asOfDate}`);
            setData(res?.data);
        } catch (e) {
            setError(e?.message || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    }, [selectedCompanyId, asOfDate]);

    const handleExport = () => {
        if (!data) return;
        exportToCSV(data.summary, data.totals, asOfDate);
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <AssessmentRoundedIcon sx={{ color: '#A78BFA', fontSize: 28 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>AP Aging Report</Typography>
                {data && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadRoundedIcon />}
                        onClick={handleExport}
                    >
                        Export CSV
                    </Button>
                )}
            </Box>

            {/* Controls */}
            <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                    label="As of Date"
                    type="date"
                    size="small"
                    value={asOfDate}
                    onChange={e => setAsOfDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 200 }}
                />
                <Button
                    variant="contained"
                    onClick={runReport}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                >
                    {loading ? 'Running…' : 'Run Report'}
                </Button>
                {data && (
                    <Typography variant="caption" color="text.secondary">
                        As of {new Date(data.as_of_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                )}
            </Paper>

            {error && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                    <Typography color="error" variant="body2">{error}</Typography>
                </Paper>
            )}

            {data && (
                <>
                    {/* Totals Cards */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        {BUCKET_LABELS.map((b, i) => (
                            <Paper key={b.key} sx={{ flex: '1 1 160px', p: 2, borderTop: `3px solid ${CARD_COLORS[i]}`, minWidth: 140 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                                    {b.label}
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: CARD_COLORS[i] }}>
                                    {fmtCurrency(data.totals[b.key])}
                                </Typography>
                            </Paper>
                        ))}
                        <Paper sx={{ flex: '1 1 160px', p: 2, borderTop: '3px solid #1E293B', minWidth: 140, bgcolor: '#1E293B' }}>
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                                Grand Total
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: '#fff' }}>
                                {fmtCurrency(data.totals.grand_total)}
                            </Typography>
                        </Paper>
                    </Box>

                    {/* Summary Table */}
                    <Paper>
                        {data.summary.length === 0 ? (
                            <Box sx={{ p: 5, textAlign: 'center' }}>
                                <Typography color="text.secondary">No outstanding vendor bills found for this date.</Typography>
                            </Box>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                                        <TableCell sx={{ width: 36 }} />
                                        <TableCell sx={{ fontWeight: 700 }}>Vendor</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Current</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#B45309' }}>1-30 Days</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#C2410C' }}>31-60 Days</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#B91C1C' }}>61-90 Days</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#7F1D1D' }}>90+ Days</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.summary.map(row => (
                                        <VendorRow
                                            key={row.vendor}
                                            row={row}
                                            buckets={data.buckets}
                                        />
                                    ))}

                                    {/* Grand Total Footer */}
                                    <TableRow sx={{ bgcolor: '#1E293B' }}>
                                        <TableCell />
                                        <TableCell sx={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>Grand Total</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#fff' }}>{fmtCurrency(data.totals.current)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#FDE68A' }}>{fmtCurrency(data.totals.days1_30)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#FDBA74' }}>{fmtCurrency(data.totals.days31_60)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#FCA5A5' }}>{fmtCurrency(data.totals.days61_90)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#F87171' }}>{fmtCurrency(data.totals.over90)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{fmtCurrency(data.totals.grand_total)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        )}
                    </Paper>
                </>
            )}

            {!data && !loading && !error && (
                <Paper sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
                    <AssessmentRoundedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                    <Typography>Select a date and click Run Report to view AP aging.</Typography>
                </Paper>
            )}
        </Box>
    );
}
