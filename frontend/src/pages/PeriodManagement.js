import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Button, Chip, Grid,
    Dialog, DialogTitle, DialogContent, DialogActions, Alert,
    CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const monthName = (year, month) =>
    new Date(year, month - 1).toLocaleString('default', { month: 'long' });

const PeriodManagement = () => {
    const { selectedCompanyId } = useAuth();
    const { get, post } = useApi();

    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Confirmation dialog state
    const [confirm, setConfirm] = useState(null); // { action: 'close'|'open', month, monthName }
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const fetchPeriods = useCallback(async () => {
        if (!selectedCompanyId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await get(`/${selectedCompanyId}/finance/periods`);
            setPeriods(res.data || []);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to load periods');
        } finally {
            setLoading(false);
        }
    }, [selectedCompanyId, get]);

    useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

    const getStatus = (month) => {
        const found = periods.find(p => p.year === year && p.month === month);
        return found?.status || 'Open';
    };

    const openConfirm = (action, month) => {
        setActionError(null);
        setConfirm({ action, month, monthName: monthName(year, month) });
    };

    const handleConfirm = async () => {
        if (!confirm) return;
        setActionLoading(true);
        setActionError(null);
        try {
            const endpoint = confirm.action === 'close'
                ? `/${selectedCompanyId}/finance/periods/close`
                : `/${selectedCompanyId}/finance/periods/open`;
            await post(endpoint, { year, month: confirm.month });
            setSuccessMsg(
                confirm.action === 'close'
                    ? `${confirm.monthName} ${year} has been closed.`
                    : `${confirm.monthName} ${year} has been re-opened.`
            );
            setTimeout(() => setSuccessMsg(null), 4000);
            setConfirm(null);
            fetchPeriods();
        } catch (e) {
            setActionError(e.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const minYear = currentYear - 2;
    const maxYear = currentYear + 2;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>
                    Period Management
                </Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>
                    Lock and unlock accounting periods
                </Typography>
            </Box>

            {successMsg && (
                <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{successMsg}</Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
            )}

            {/* Year selector */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Tooltip title="Previous Year">
                    <span>
                        <IconButton
                            onClick={() => setYear(y => y - 1)}
                            disabled={year <= minYear}
                            sx={{ bgcolor: '#F0F2F5', borderRadius: 2 }}
                        >
                            <ChevronLeftRoundedIcon />
                        </IconButton>
                    </span>
                </Tooltip>
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#1A2332', minWidth: 60, textAlign: 'center' }}>
                    {year}
                </Typography>
                <Tooltip title="Next Year">
                    <span>
                        <IconButton
                            onClick={() => setYear(y => y + 1)}
                            disabled={year >= maxYear}
                            sx={{ bgcolor: '#F0F2F5', borderRadius: 2 }}
                        >
                            <ChevronRightRoundedIcon />
                        </IconButton>
                    </span>
                </Tooltip>
                {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
            </Box>

            {/* Month grid */}
            <Grid container spacing={2}>
                {MONTHS.map((month) => {
                    const status = getStatus(month);
                    const isClosed = status === 'Closed';
                    const name = monthName(year, month);

                    return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={month}>
                            <Card
                                sx={{
                                    border: `2px solid ${isClosed ? '#FEE2E2' : '#E8ECF0'}`,
                                    borderRadius: 2.5,
                                    bgcolor: isClosed ? '#FFF5F5' : '#fff',
                                    transition: 'all 0.15s',
                                    '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
                                }}
                            >
                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                    {/* Month + Year */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#1A2332' }}>
                                                {name}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                                {year}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                width: 36, height: 36, borderRadius: 2,
                                                bgcolor: isClosed ? '#FEE2E2' : '#F0FDF4',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            {isClosed
                                                ? <LockRoundedIcon sx={{ color: '#DC2626', fontSize: 20 }} />
                                                : <LockOpenRoundedIcon sx={{ color: '#16A34A', fontSize: 20 }} />
                                            }
                                        </Box>
                                    </Box>

                                    {/* Status chip */}
                                    <Chip
                                        label={status}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                            mb: 2,
                                            bgcolor: isClosed ? '#FEE2E2' : '#F0FDF4',
                                            color: isClosed ? '#DC2626' : '#16A34A',
                                        }}
                                    />

                                    {/* Action button */}
                                    {isClosed ? (
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            startIcon={<LockOpenRoundedIcon />}
                                            onClick={() => openConfirm('open', month)}
                                            sx={{
                                                fontWeight: 700, fontSize: '0.75rem',
                                                borderColor: '#CBD5E1', color: '#1565C0',
                                                '&:hover': { borderColor: '#1565C0', bgcolor: '#EFF6FF' },
                                            }}
                                        >
                                            Re-open Period
                                        </Button>
                                    ) : (
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            startIcon={<LockRoundedIcon />}
                                            onClick={() => openConfirm('close', month)}
                                            sx={{
                                                fontWeight: 700, fontSize: '0.75rem',
                                                borderColor: '#FECACA', color: '#DC2626',
                                                '&:hover': { borderColor: '#DC2626', bgcolor: '#FFF5F5' },
                                            }}
                                        >
                                            Close Period
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Confirmation Dialog */}
            <Dialog
                open={!!confirm}
                onClose={() => !actionLoading && setConfirm(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
                    {confirm?.action === 'close'
                        ? `Close ${confirm?.monthName} ${year}?`
                        : `Re-open ${confirm?.monthName} ${year}?`}
                </DialogTitle>
                <DialogContent>
                    {actionError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{actionError}</Alert>}
                    <Typography sx={{ fontSize: '0.875rem', color: '#5F6B7C' }}>
                        {confirm?.action === 'close'
                            ? `No GL transactions can be posted to this period after closing. Are you sure you want to close ${confirm?.monthName} ${year}?`
                            : `This will allow GL transactions to be posted to ${confirm?.monthName} ${year} again. Proceed?`}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={() => setConfirm(null)}
                        disabled={actionLoading}
                        sx={{ color: '#5F6B7C' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirm}
                        disabled={actionLoading}
                        color={confirm?.action === 'close' ? 'error' : 'primary'}
                        sx={{ fontWeight: 700 }}
                    >
                        {actionLoading
                            ? 'Processing...'
                            : confirm?.action === 'close' ? 'Close Period' : 'Re-open Period'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PeriodManagement;
