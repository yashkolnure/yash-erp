import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Drawer, TextField,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, Pagination,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import { toNum, fmtCurrency } from '../utils/numbers';
import FileAttachments from '../components/FileAttachments';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const emptyForm = { purchase_order_id: '', warehouse_id: '', receipt_date: new Date().toISOString().slice(0, 10), line_items: [], notes: '' };

export default function GoodsReceiptNotes() {
    const { selectedCompanyId } = useAuth();
    const { get, post, loading } = useApi();

    const [grns, setGRNs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 20;
    const [pos, setPOs] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [selectedPO, setSelectedPO] = useState(null);
    const [saving, setSaving] = useState(false);

    const isDirty = JSON.stringify(form) !== JSON.stringify(emptyForm);
    const { confirmClose } = useUnsavedChanges(isDirty);

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams({ skip: (page - 1) * limit, limit });
        const [grnRes, poRes, whRes, prodRes] = await Promise.all([
            get(`/${selectedCompanyId}/procurement/grn?${params}`),
            get(`/${selectedCompanyId}/procurement/po?status=Confirmed`),
            get(`/${selectedCompanyId}/inventory/warehouses`),
            get(`/${selectedCompanyId}/inventory/products`),
        ]);
        if (grnRes?.data) { setGRNs(grnRes.data); setTotal(grnRes.pagination?.total || 0); }
        if (poRes?.data) setPOs(poRes.data);
        if (whRes?.data) setWarehouses(whRes.data);
        if (prodRes?.data) setProducts(prodRes.data);
    }, [selectedCompanyId, page, get]);

    useEffect(() => { load(); }, [load]);

    const handlePOSelect = (poId) => {
        const po = pos.find(p => p._id === poId);
        setSelectedPO(po);
        if (po) {
            setForm(f => ({
                ...f, purchase_order_id: poId,
                line_items: (po.line_items || []).map(l => ({
                    product_id: l.product_id?._id || l.product_id,
                    product_name: l.product_id?.product_name || l.description,
                    quantity_ordered: toNum(l.quantity_ordered || l.quantity),
                    quantity_received: toNum(l.quantity_ordered || l.quantity),
                    quantity_accepted: toNum(l.quantity_ordered || l.quantity),
                    quantity_rejected: 0,
                    unit_price: toNum(l.unit_price),
                })),
            }));
        }
    };

    const handleCreate = async () => {
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/procurement/grn`, form);
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); setSelectedPO(null); load(); }
    };

    const setLineField = (idx, field, val) => setForm(f => {
        const lines = [...f.line_items];
        lines[idx] = { ...lines[idx], [field]: val };
        return { ...f, line_items: lines };
    });

    const filtered = grns.filter(g =>
        !search || g.grn_number?.toLowerCase().includes(search.toLowerCase()) ||
        g.vendor_id?.vendor_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Goods Receipt Notes</Typography>
                    <Typography variant="body2" color="text.secondary">Record goods received against purchase orders</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>New GRN</Button>
            </Box>

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ width: 240 }} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{total} records</Typography>
            </Paper>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>GRN #</b></TableCell>
                            <TableCell><b>PO #</b></TableCell>
                            <TableCell><b>Vendor</b></TableCell>
                            <TableCell><b>Warehouse</b></TableCell>
                            <TableCell><b>Receipt Date</b></TableCell>
                            <TableCell><b>Lines</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && !grns.length ? (
                            <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No GRNs found</TableCell></TableRow>
                        ) : filtered.map(g => (
                            <TableRow key={g._id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelected(g); setDrawerOpen(true); }}>
                                <TableCell><Typography variant="body2" fontWeight={600} color="primary">{g.grn_number}</Typography></TableCell>
                                <TableCell>{g.purchase_order_id?.po_number || '—'}</TableCell>
                                <TableCell>{g.vendor_id?.vendor_name}</TableCell>
                                <TableCell>{g.warehouse_id?.warehouse_name}</TableCell>
                                <TableCell>{fmtDate(g.receipt_date)}</TableCell>
                                <TableCell>{g.line_items?.length || 0} items</TableCell>
                                <TableCell><Chip label={g.status || 'Received'} size="small" color="success" /></TableCell>
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
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: 560 } } }}>
                {selected && (
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6" fontWeight={700}>{selected.grn_number}</Typography>
                            <Button size="small" variant="outlined" startIcon={<PrintRoundedIcon sx={{ fontSize: 15 }} />} onClick={() => window.print()} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                Print GRN
                            </Button>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>PO: {selected.purchase_order_id?.po_number} · {selected.vendor_id?.vendor_name}</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><b>Product</b></TableCell>
                                    <TableCell align="right"><b>Ordered</b></TableCell>
                                    <TableCell align="right"><b>Received</b></TableCell>
                                    <TableCell align="right"><b>Accepted</b></TableCell>
                                    <TableCell align="right"><b>Rejected</b></TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {(selected.line_items || []).map((line, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{line.product_id?.product_name || line.product_name}</TableCell>
                                            <TableCell align="right">{toNum(line.quantity_ordered)}</TableCell>
                                            <TableCell align="right">{toNum(line.quantity_received)}</TableCell>
                                            <TableCell align="right" sx={{ color: 'success.main' }}>{toNum(line.quantity_accepted)}</TableCell>
                                            <TableCell align="right" sx={{ color: 'error.main' }}>{toNum(line.quantity_rejected)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {selected.notes && <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>{selected.notes}</Typography>}
                        <Box sx={{ mt: 2 }}>
                            <FileAttachments attachments={selected.attachments || []} readonly />
                        </Box>

                        {/* Print-only layout */}
                        <Box className="print-area" sx={{ display: 'none', '@media print': { display: 'block' }, fontFamily: 'sans-serif', color: '#000' }}>
                            <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; box-sizing: border-box; } }`}</style>
                            {/* Header */}
                            <Box sx={{ borderBottom: '2px solid #000', pb: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <Box>
                                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 800 }}>Your Company Name</Typography>
                                    <Typography sx={{ fontSize: '0.8rem', color: '#333' }}>123 Business Street, City, Country</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography sx={{ fontSize: '1.2rem', fontWeight: 800 }}>GOODS RECEIPT NOTE</Typography>
                                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{selected.grn_number}</Typography>
                                    <Typography sx={{ fontSize: '0.8rem', color: '#555' }}>Receipt Date: {fmtDate(selected.receipt_date)}</Typography>
                                </Box>
                            </Box>

                            {/* Reference info */}
                            <Box sx={{ display: 'flex', gap: 6, mb: 3 }}>
                                <Box>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#555', mb: 0.5 }}>Vendor</Typography>
                                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{selected.vendor_id?.vendor_name || '—'}</Typography>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#555', mb: 0.5 }}>Purchase Order</Typography>
                                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{selected.purchase_order_id?.po_number || '—'}</Typography>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#555', mb: 0.5 }}>Warehouse</Typography>
                                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{selected.warehouse_id?.warehouse_name || '—'}</Typography>
                                </Box>
                            </Box>

                            {/* Line items */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>#</th>
                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Product</th>
                                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Ordered</th>
                                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Received</th>
                                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Accepted</th>
                                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #000', fontSize: '0.75rem', textTransform: 'uppercase' }}>Rejected</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selected.line_items || []).map((line, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                                            <td style={{ padding: '7px 8px', fontSize: '0.85rem' }}>{i + 1}</td>
                                            <td style={{ padding: '7px 8px', fontSize: '0.85rem' }}>{line.product_id?.product_name || line.product_name}</td>
                                            <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{toNum(line.quantity_ordered)}</td>
                                            <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{toNum(line.quantity_received)}</td>
                                            <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem', color: '#15803D', fontWeight: 600 }}>{toNum(line.quantity_accepted)}</td>
                                            <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: '0.85rem', color: '#B91C1C', fontWeight: 600 }}>{toNum(line.quantity_rejected)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {selected.notes && (
                                <Box sx={{ borderTop: '1px solid #ccc', pt: 2, mt: 2 }}>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Notes</Typography>
                                    <Typography sx={{ fontSize: '0.85rem', color: '#333' }}>{selected.notes}</Typography>
                                </Box>
                            )}
                            <Box sx={{ borderTop: '1px solid #ccc', pt: 2, mt: 2 }}>
                                <Typography sx={{ fontSize: '0.75rem', color: '#777' }}>
                                    Goods Receipt Note #{selected.grn_number} — Please retain this document for your records.
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Drawer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => confirmClose(() => setCreateOpen(false))} maxWidth="md" fullWidth>
                <DialogTitle>New Goods Receipt</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Purchase Order *</InputLabel>
                                <Select label="Purchase Order *" value={form.purchase_order_id} onChange={e => handlePOSelect(e.target.value)}>
                                    {pos.map(p => <MenuItem key={p._id} value={p._id}>{p.po_number} — {p.vendor_id?.vendor_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Warehouse *</InputLabel>
                                <Select label="Warehouse *" value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
                                    {warehouses.map(w => <MenuItem key={w._id} value={w._id}>{w.warehouse_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField size="small" type="date" label="Receipt Date" InputLabelProps={{ shrink: true }}
                                value={form.receipt_date} onChange={e => setForm(f => ({ ...f, receipt_date: e.target.value }))} />
                        </Box>

                        {form.line_items.length > 0 && (
                            <>
                                <Typography variant="subtitle2" fontWeight={600}>Line Items — Enter Received Quantities</Typography>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell>Product</TableCell>
                                            <TableCell align="right">Ordered</TableCell>
                                            <TableCell align="right">Received</TableCell>
                                            <TableCell align="right">Accepted</TableCell>
                                            <TableCell align="right">Rejected</TableCell>
                                        </TableRow></TableHead>
                                        <TableBody>
                                            {form.line_items.map((line, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{line.product_name}</TableCell>
                                                    <TableCell align="right">{toNum(line.quantity_ordered)}</TableCell>
                                                    <TableCell>
                                                        <TextField size="small" type="number" value={line.quantity_received} sx={{ width: 70 }}
                                                            onChange={e => setLineField(i, 'quantity_received', parseFloat(e.target.value) || 0)} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField size="small" type="number" value={line.quantity_accepted} sx={{ width: 70 }}
                                                            onChange={e => setLineField(i, 'quantity_accepted', parseFloat(e.target.value) || 0)} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField size="small" type="number" value={line.quantity_rejected} sx={{ width: 70 }}
                                                            onChange={e => setLineField(i, 'quantity_rejected', parseFloat(e.target.value) || 0)} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}

                        <TextField size="small" label="Notes" multiline rows={2} fullWidth value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                        <Box>
                            <FileAttachments attachments={form.attachments || []}
                                onAdd={att => setForm(f => ({ ...f, attachments: [...(f.attachments || []), att] }))}
                                onRemove={i => setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }))}
                            />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => confirmClose(() => setCreateOpen(false))}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving || !form.purchase_order_id || !form.warehouse_id}>
                        {saving ? <CircularProgress size={20} /> : 'Receive Goods'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
