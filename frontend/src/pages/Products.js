import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, TablePagination, Avatar, Dialog, DialogTitle,
    DialogContent, TextField, Grid, Alert, InputBase, Divider, Stack,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import { useForm } from 'react-hook-form';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import { exportToCSV } from '../utils/export';

const TYPE_STYLE = {
    'Finished Good': { bg: '#EFF6FF', color: '#1565C0' },
    'Raw Material': { bg: '#F0FDF4', color: '#15803D' },
    'Work in Progress': { bg: '#FFFBEB', color: '#B45309' },
    Service: { bg: '#FAF5FF', color: '#7C3AED' },
};

const AVATAR_COLORS = ['#1565C0', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const ProductForm = ({ companyId, onSuccess, onCancel }) => {
    const { post, loading, error } = useApi();
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        try { await post(`/${companyId}/inventory/products`, data); onSuccess(); } catch {}
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth required label="Product Name" {...register('product_name', { required: true })} error={!!errors.product_name} helperText={errors.product_name && 'Required'} />
                </Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Category" {...register('category')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Standard Cost" type="number" inputProps={{ step: 0.01 }} {...register('standard_cost', { valueAsNumber: true })} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="List Price" type="number" inputProps={{ step: 0.01 }} {...register('list_price', { valueAsNumber: true })} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Unit of Measure" defaultValue="EA" {...register('base_unit_of_measure')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Reorder Level" type="number" {...register('reorder_level', { valueAsNumber: true })} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Reorder Quantity" type="number" {...register('reorder_quantity', { valueAsNumber: true })} /></Grid>
                <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Description" {...register('description')} /></Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button onClick={onCancel} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 700 }}>
                    {loading ? 'Saving...' : 'Save Product'}
                </Button>
            </Box>
        </Box>
    );
};

const Products = () => {
    const { selectedCompanyId } = useAuth();
    const { get } = useApi();
    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [showForm, setShowForm] = useState(false);

    const fetchProducts = async () => {
        if (!selectedCompanyId) return;
        try {
            const data = await get(`/${selectedCompanyId}/inventory/products?skip=${page * rowsPerPage}&limit=${rowsPerPage}`);
            setProducts(data.data || []);
            setTotal(data.pagination?.total || 0);
        } catch {}
    };

    useEffect(() => { fetchProducts(); }, [selectedCompanyId, page, rowsPerPage]);

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Products</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>Manage product catalog and inventory items</Typography>
            </Box>

            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: 2, px: 1.5, py: 0.75, flex: 1, maxWidth: 360 }}>
                            <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 18, mr: 1 }} />
                            <InputBase placeholder="Search products..." sx={{ fontSize: '0.813rem', color: '#1A2332', flex: 1 }} />
                        </Box>
                        <Box sx={{ flex: 1 }} />
                        <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => exportToCSV(products.map(p => ({ Code: p.product_code, Name: p.product_name, Type: p.product_type, Category: p.category, 'Unit Price': p.unit_price, 'Reorder Level': p.reorder_level })), 'products.csv')} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>
                            Export CSV
                        </Button>
                        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setShowForm(true)} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>
                            New Product
                        </Button>
                    </Box>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Product</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell align="right">List Price</TableCell>
                                <TableCell align="right">Reorder Level</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>
                                        No products found. Add your first product to get started.
                                    </TableCell>
                                </TableRow>
                            ) : products.map(p => {
                                const typeStyle = TYPE_STYLE[p.product_type] || { bg: '#F1F5F9', color: '#64748B' };
                                return (
                                    <TableRow key={p._id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: getColor(p.product_name), fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.5 }}>
                                                    <Inventory2RoundedIcon sx={{ fontSize: 16 }} />
                                                </Avatar>
                                                <Box>
                                                    <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332' }}>{p.product_name}</Typography>
                                                    {p.description && <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }} noWrap>{p.description}</Typography>}
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C', fontFamily: 'monospace' }}>{p.product_code}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: typeStyle.bg }}>
                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: typeStyle.color }}>{p.product_type}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{p.category || '—'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.813rem', color: '#1A2332' }}>
                                            ${Number(p.list_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{p.reorder_level}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <Divider />
                    <TablePagination
                        component="div" count={total} page={page}
                        onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
                        rowsPerPageOptions={[10, 20, 50]}
                    />
                </CardContent>
            </Card>

            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>New Product</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    <ProductForm companyId={selectedCompanyId} onSuccess={() => { setShowForm(false); fetchProducts(); }} onCancel={() => setShowForm(false)} />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default Products;
