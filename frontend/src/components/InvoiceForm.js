import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
    Box, Grid, TextField, Button, Table, TableBody, TableCell,
    TableHead, TableRow, IconButton, MenuItem, Select,
    FormControl, InputLabel, Alert, Typography, Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import useApi from '../hooks/useApi';

const InvoiceForm = ({ companyId, onSuccess, onDirtyChange }) => {
    const { post, get, loading, error } = useApi();
    const [customers, setCustomers] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [submitError, setSubmitError] = useState(null);

    const { register, control, handleSubmit, watch, formState: { errors, isDirty } } = useForm({
        defaultValues: {
            customer_id: '',
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: '',
            bank_account_id: '',
            notes: '',
            line_items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 10 }],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'line_items' });
    const watchItems = watch('line_items');

    useEffect(() => { onDirtyChange && onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);

    useEffect(() => {
        if (!companyId) return;
        get(`/${companyId}/sales/customers?limit=200`).then(d => setCustomers(d?.data || [])).catch(() => {});
        get(`/${companyId}/admin/bank-accounts`).then(d => setBankAccounts(d?.data || [])).catch(() => {});
    }, [companyId, get]);

    const calcLineTotal = (item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        return qty * price;
    };

    const subtotal = watchItems.reduce((sum, item) => sum + calcLineTotal(item), 0);
    const taxAmount = watchItems.reduce((sum, item) => sum + calcLineTotal(item) * ((parseFloat(item.tax_rate) || 0) / 100), 0);
    const total = subtotal + taxAmount;

    const onSubmit = async (data) => {
        setSubmitError(null);
        try {
            await post(`/${companyId}/ar/invoices`, data);
            onSuccess();
        } catch (err) {
            setSubmitError(err.response?.data?.error || 'Failed to create invoice');
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            {(submitError || error) && <Alert severity="error" sx={{ mb: 2 }}>{submitError || error}</Alert>}

            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth required error={!!errors.customer_id}>
                        <InputLabel>Customer</InputLabel>
                        <Select label="Customer" defaultValue="" {...register('customer_id', { required: 'Customer required' })}>
                            {customers.map(c => <MenuItem key={c._id} value={c._id}>{c.customer_name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Invoice Date" type="date" InputLabelProps={{ shrink: true }}
                        {...register('invoice_date', { required: 'Required' })} error={!!errors.invoice_date} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Due Date" type="date" InputLabelProps={{ shrink: true }}
                        {...register('due_date', { required: 'Required' })} error={!!errors.due_date} />
                </Grid>
                {bankAccounts.length > 0 && (
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Bank Account (for payment details on invoice)</InputLabel>
                            <Select label="Bank Account (for payment details on invoice)" defaultValue="" {...register('bank_account_id')}>
                                <MenuItem value=""><em>None</em></MenuItem>
                                {bankAccounts.map(b => (
                                    <MenuItem key={b._id} value={b._id}>
                                        {b.account_name} — {b.bank_name} ({b.account_number?.slice(-4).padStart(b.account_number.length, '*')})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                )}
            </Grid>

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Line Items</Typography>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Description</TableCell>
                        <TableCell width={90}>Qty</TableCell>
                        <TableCell width={120}>Unit Price</TableCell>
                        <TableCell width={90}>Tax %</TableCell>
                        <TableCell width={110} align="right">Total</TableCell>
                        <TableCell width={50} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {fields.map((field, index) => (
                        <TableRow key={field.id}>
                            <TableCell>
                                <TextField size="small" fullWidth {...register(`line_items.${index}.description`)} />
                            </TableCell>
                            <TableCell>
                                <TextField size="small" type="number" inputProps={{ min: 1 }} {...register(`line_items.${index}.quantity`, { valueAsNumber: true })} />
                            </TableCell>
                            <TableCell>
                                <TextField size="small" type="number" inputProps={{ min: 0, step: 0.01 }} {...register(`line_items.${index}.unit_price`, { valueAsNumber: true })} />
                            </TableCell>
                            <TableCell>
                                <TextField size="small" type="number" inputProps={{ min: 0, max: 100, step: 0.5 }} {...register(`line_items.${index}.tax_rate`, { valueAsNumber: true })} />
                            </TableCell>
                            <TableCell align="right">
                                {calcLineTotal(watchItems[index]).toFixed(2)}
                            </TableCell>
                            <TableCell>
                                <IconButton size="small" onClick={() => remove(index)} disabled={fields.length === 1}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Button size="small" startIcon={<AddIcon />} sx={{ mt: 1 }}
                onClick={() => append({ description: '', quantity: 1, unit_price: 0, tax_rate: 10 })}>
                Add Line
            </Button>

            <Divider sx={{ my: 2 }} />
            <Box sx={{ textAlign: 'right' }}>
                <Typography>Subtotal: ${subtotal.toFixed(2)}</Typography>
                <Typography>Tax: ${taxAmount.toFixed(2)}</Typography>
                <Typography variant="h6" fontWeight="bold">Total: ${total.toFixed(2)}</Typography>
            </Box>

            <TextField fullWidth label="Notes" multiline rows={2} sx={{ mt: 2 }} {...register('notes')} />

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Invoice'}
                </Button>
            </Box>
        </Box>
    );
};

export default InvoiceForm;
