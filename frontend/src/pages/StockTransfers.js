import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, TextField, MenuItem, Select, InputLabel,
    FormControl, CircularProgress, Stack, Paper, Table, TableBody,
    TableCell, TableHead, TableRow, TableContainer, Dialog,
    DialogTitle, DialogContent, DialogActions, Pagination,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import { exportToCSV } from '../utils/export';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const emptyForm = {
    product_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: '',
    transfer_date: new Date().toISOString().slice(0, 10),
    notes: '',
};

export default function StockTransfers() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [transfers, setTransfers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 20;

    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams({ skip: (page - 1) * limit, limit });
        const [trRes, prodRes, whRes] = await Promise.all([
            get(`/${selectedCompanyId}/inventory/transfers?${params}`),
            get(`/${selectedCompanyId}/inventory/products`),
            get(`/${selectedCompanyId}/inventory/warehouses`),
        ]);
        if (trRes?.data) { setTransfers(trRes.data); setTotal(trRes.pagination?.total || 0); }
        if (prodRes?.data) setProducts(prodRes.data);
        if (whRes?.data) setWarehouses(whRes.data);
    }, [selectedCompanyId, page, get]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        setError('');
        if (!form.product_id || !form.from_warehouse_id || !form.to_warehouse_id || !form.quantity) {
            setError('All fields except notes are required.');
            return;
        }
        if (form.from_warehouse_id === form.to_warehouse_id) {
            setError('Source and destination must be different warehouses.');
            return;
        }
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/inventory/transfer`, {
            ...form,
            quantity: Number(form.quantity),
        });
        setSaving(false);
        if (res?.data) {
            setCreateOpen(false);
            setForm(emptyForm);
            load();
        } else if (res?.error) {
            setError(res.error);
        }
    };

    const handleExport = () => {
        const rows = transfers.map(t => ({
            'Transfer #': t.transfer_number,
            'Date': fmtDate(t.transfer_date),
            'Product': t.product_id?.product_name || '',
            'From Warehouse': t.from_warehouse_id?.name || '',
            'To Warehouse': t.to_warehouse_id?.name || '',
            'Quantity': t.quantity,
            'Notes': t.notes || '',
        }));
        exportToCSV(rows, 'stock-transfers.csv');
    };

    const whOptions = (excludeId) => warehouses.filter(w => w._id !== excludeId);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Stock Transfers</Typography>
                    <Typography variant="body2" color="text.secondary">Move inventory between warehouses</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={handleExport} disabled={!transfers.length}>
                        Export CSV
                    </Button>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setCreateOpen(true); setError(''); }}>
                        New Transfer
                    </Button>
                </Stack>
            </Box>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>Transfer #</b></TableCell>
                            <TableCell><b>Date</b></TableCell>
                            <TableCell><b>Product</b></TableCell>
                            <TableCell><b>From</b></TableCell>
                            <TableCell><b></b></TableCell>
                            <TableCell><b>To</b></TableCell>
                            <TableCell align="right"><b>Qty</b></TableCell>
                            <TableCell><b>Notes</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !transfers.length ? (
                            <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : transfers.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No transfers yet</TableCell></TableRow>
                        ) : transfers.map(t => (
                            <TableRow key={t._id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600} color="primary">{t.transfer_number}</Typography>
                                </TableCell>
                                <TableCell>{fmtDate(t.transfer_date)}</TableCell>
                                <TableCell>
                                    <Typography variant="body2">{t.product_id?.product_name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{t.product_id?.product_code}</Typography>
                                </TableCell>
                                <TableCell>{t.from_warehouse_id?.name}</TableCell>
                                <TableCell sx={{ color: 'text.disabled' }}><SwapHorizRoundedIcon fontSize="small" /></TableCell>
                                <TableCell>{t.to_warehouse_id?.name}</TableCell>
                                <TableCell align="right"><b>{t.quantity}</b></TableCell>
                                <TableCell>
                                    <Typography variant="caption" color="text.secondary">{t.notes || '—'}</Typography>
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

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>New Stock Transfer</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Product *</InputLabel>
                            <Select label="Product *" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
                                {products.map(p => (
                                    <MenuItem key={p._id} value={p._id}>{p.product_name} ({p.product_code})</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 1, alignItems: 'center' }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>From Warehouse *</InputLabel>
                                <Select label="From Warehouse *" value={form.from_warehouse_id}
                                    onChange={e => setForm(f => ({ ...f, from_warehouse_id: e.target.value }))}>
                                    {whOptions(form.to_warehouse_id).map(w => <MenuItem key={w._id} value={w._id}>{w.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <SwapHorizRoundedIcon color="action" />
                            <FormControl size="small" fullWidth>
                                <InputLabel>To Warehouse *</InputLabel>
                                <Select label="To Warehouse *" value={form.to_warehouse_id}
                                    onChange={e => setForm(f => ({ ...f, to_warehouse_id: e.target.value }))}>
                                    {whOptions(form.from_warehouse_id).map(w => <MenuItem key={w._id} value={w._id}>{w.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" label="Quantity *" type="number" inputProps={{ min: 1 }}
                                value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                            <TextField size="small" type="date" label="Transfer Date" InputLabelProps={{ shrink: true }}
                                value={form.transfer_date} onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))} />
                        </Box>

                        <TextField size="small" label="Notes" multiline rows={2} fullWidth
                            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

                        {error && (
                            <Typography variant="body2" color="error">{error}</Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : 'Transfer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
