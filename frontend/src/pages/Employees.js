import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, TablePagination, Avatar, Dialog, DialogTitle,
    DialogContent, TextField, Grid, Alert, InputBase, Divider, MenuItem, Stack,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import { useForm } from 'react-hook-form';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import { exportToCSV } from '../utils/export';

const STATUS_STYLE = {
    Active: { bg: '#F0FDF4', color: '#15803D' },
    Inactive: { bg: '#F1F5F9', color: '#64748B' },
    'On Leave': { bg: '#FFFBEB', color: '#B45309' },
    Terminated: { bg: '#FEF2F2', color: '#B91C1C' },
};

const TYPE_STYLE = {
    'Full-time': { bg: '#EFF6FF', color: '#1565C0' },
    'Part-time': { bg: '#F0FDF4', color: '#15803D' },
    Contract: { bg: '#FFFBEB', color: '#B45309' },
};

const AVATAR_COLORS = ['#1565C0', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const EmployeeForm = ({ companyId, onSuccess, onCancel }) => {
    const { post, loading, error } = useApi();
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        try { await post(`/${companyId}/hr/employees`, data); onSuccess(); } catch {}
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth required label="First Name" {...register('first_name', { required: true })} error={!!errors.first_name} helperText={errors.first_name && 'Required'} />
                </Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Last Name" {...register('last_name')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Email" type="email" {...register('email')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Department" {...register('department')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Job Title" {...register('job_title')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Salary" type="number" inputProps={{ step: 0.01 }} {...register('salary', { valueAsNumber: true })} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Date of Joining" type="date" InputLabelProps={{ shrink: true }} {...register('date_of_joining')} /></Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth select label="Employment Type" defaultValue="Full-time" {...register('employment_type')}>
                        {['Full-time', 'Part-time', 'Contract'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </TextField>
                </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button onClick={onCancel} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 700 }}>
                    {loading ? 'Saving...' : 'Save Employee'}
                </Button>
            </Box>
        </Box>
    );
};

const Employees = () => {
    const { selectedCompanyId } = useAuth();
    const { get } = useApi();
    const [employees, setEmployees] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [showForm, setShowForm] = useState(false);

    const fetchEmployees = async () => {
        if (!selectedCompanyId) return;
        try {
            const data = await get(`/${selectedCompanyId}/hr/employees?skip=${page * rowsPerPage}&limit=${rowsPerPage}`);
            setEmployees(data.data || []);
            setTotal(data.pagination?.total || 0);
        } catch {}
    };

    useEffect(() => { fetchEmployees(); }, [selectedCompanyId, page, rowsPerPage]);

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Employees</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>Manage workforce, HR records and payroll</Typography>
            </Box>

            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid #F0F2F5' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: 2, px: 1.5, py: 0.75, flex: 1, maxWidth: 360 }}>
                            <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 18, mr: 1 }} />
                            <InputBase placeholder="Search employees..." sx={{ fontSize: '0.813rem', color: '#1A2332', flex: 1 }} />
                        </Box>
                        <Box sx={{ flex: 1 }} />
                        <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => exportToCSV(employees.map(e => ({ Name: `${e.first_name} ${e.last_name}`, 'Employee #': e.employee_number, Department: e.department, Designation: e.designation, Email: e.email, Status: e.status })), 'employees.csv')} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>
                            Export CSV
                        </Button>
                        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setShowForm(true)} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>
                            New Employee
                        </Button>
                    </Box>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Employee</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Department</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: '0.875rem' }}>
                                        No employees found. Add your first employee to get started.
                                    </TableCell>
                                </TableRow>
                            ) : employees.map(e => {
                                const statusStyle = STATUS_STYLE[e.employment_status] || STATUS_STYLE.Inactive;
                                const typeStyle = TYPE_STYLE[e.employment_type] || { bg: '#F1F5F9', color: '#64748B' };
                                const fullName = `${e.first_name} ${e.last_name || ''}`.trim();
                                return (
                                    <TableRow key={e._id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 34, height: 34, bgcolor: getColor(e.first_name), fontSize: '0.813rem', fontWeight: 700 }}>
                                                    {e.first_name?.[0]?.toUpperCase()}{e.last_name?.[0]?.toUpperCase() || ''}
                                                </Avatar>
                                                <Box>
                                                    <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332' }}>{fullName}</Typography>
                                                    <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>{e.job_title || '—'}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C', fontFamily: 'monospace' }}>{e.employee_code}</TableCell>
                                        <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{e.department || '—'}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: typeStyle.bg }}>
                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: typeStyle.color }}>{e.employment_type}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: statusStyle.bg }}>
                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: statusStyle.color }}>{e.employment_status}</Typography>
                                            </Box>
                                        </TableCell>
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
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>New Employee</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    <EmployeeForm companyId={selectedCompanyId} onSuccess={() => { setShowForm(false); fetchEmployees(); }} onCancel={() => setShowForm(false)} />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default Employees;
