import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
    TableHead, TableRow, Dialog, DialogTitle, DialogContent, TextField,
    Grid, Alert, Divider, MenuItem, Chip, IconButton, Drawer, Stack,
    Tooltip, Switch, FormControlLabel,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import { toNum, fmtCurrency } from '../utils/numbers';

const CALC_TYPES = ['Fixed', 'Percentage of Basic', 'Percentage of Gross'];

const emptyComponent = () => ({
    name: '',
    type: 'Earning',
    calc_type: 'Fixed',
    value: 0,
    is_taxable: true,
    order: 0,
});

const ComponentsEditor = ({ components, onChange }) => {
    const addRow = () => onChange([...components, { ...emptyComponent(), order: components.length }]);

    const updateRow = (idx, field, val) => {
        const updated = components.map((c, i) => i === idx ? { ...c, [field]: val } : c);
        onChange(updated);
    };

    const removeRow = (idx) => onChange(components.filter((_, i) => i !== idx));

    const moveRow = (idx, dir) => {
        const arr = [...components];
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= arr.length) return;
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
        onChange(arr.map((c, i) => ({ ...c, order: i })));
    };

    return (
        <Box>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 30 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 130 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 190 }}>Calculation</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 110 }}>Value</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 70 }}>Taxable</TableCell>
                        <TableCell sx={{ width: 80 }} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {components.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#94A3B8', fontSize: '0.813rem' }}>
                                No components yet. Click "Add Component" to begin.
                            </TableCell>
                        </TableRow>
                    )}
                    {components.map((c, idx) => (
                        <TableRow key={idx}>
                            <TableCell sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>{idx + 1}</TableCell>
                            <TableCell>
                                <TextField
                                    size="small" variant="standard" value={c.name}
                                    onChange={e => updateRow(idx, 'name', e.target.value)}
                                    placeholder="e.g. HRA"
                                    inputProps={{ style: { fontSize: '0.813rem' } }}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    select size="small" variant="standard" value={c.type}
                                    onChange={e => updateRow(idx, 'type', e.target.value)}
                                    inputProps={{ style: { fontSize: '0.813rem' } }}
                                    sx={{ minWidth: 110 }}
                                >
                                    <MenuItem value="Earning">Earning</MenuItem>
                                    <MenuItem value="Deduction">Deduction</MenuItem>
                                </TextField>
                            </TableCell>
                            <TableCell>
                                <TextField
                                    select size="small" variant="standard" value={c.calc_type}
                                    onChange={e => updateRow(idx, 'calc_type', e.target.value)}
                                    inputProps={{ style: { fontSize: '0.813rem' } }}
                                    sx={{ minWidth: 170 }}
                                >
                                    {CALC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </TextField>
                            </TableCell>
                            <TableCell>
                                <TextField
                                    size="small" variant="standard" type="number"
                                    value={c.value}
                                    onChange={e => updateRow(idx, 'value', parseFloat(e.target.value) || 0)}
                                    inputProps={{ step: 0.01, min: 0, style: { fontSize: '0.813rem' } }}
                                />
                            </TableCell>
                            <TableCell>
                                <Switch
                                    size="small" checked={!!c.is_taxable}
                                    onChange={e => updateRow(idx, 'is_taxable', e.target.checked)}
                                />
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Tooltip title="Move up">
                                        <span>
                                            <IconButton size="small" disabled={idx === 0} onClick={() => moveRow(idx, -1)}>
                                                <ArrowUpwardRoundedIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Move down">
                                        <span>
                                            <IconButton size="small" disabled={idx === components.length - 1} onClick={() => moveRow(idx, 1)}>
                                                <ArrowDownwardRoundedIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Remove">
                                        <IconButton size="small" onClick={() => removeRow(idx)} sx={{ color: '#EF4444' }}>
                                            <DeleteRoundedIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Box sx={{ mt: 1, px: 1 }}>
                <Button size="small" startIcon={<AddRoundedIcon />} onClick={addRow} sx={{ fontSize: '0.75rem' }}>
                    Add Component
                </Button>
            </Box>
        </Box>
    );
};

const CreateDialog = ({ open, onClose, companyId, onSuccess }) => {
    const { post, loading, error } = useApi();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [components, setComponents] = useState([]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        try {
            await post(`/${companyId}/hr/salary-structures`, { name, description, components });
            onSuccess();
            setName(''); setDescription(''); setComponents([]);
        } catch {}
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>New Salary Structure</DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2.5 }}>
                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Structure Name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Monthly" />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Description" value={description} onChange={e => setDescription(e.target.value)} />
                    </Grid>
                </Grid>
                <Typography sx={{ fontWeight: 700, fontSize: '0.813rem', color: '#1A2332', mb: 1 }}>Components</Typography>
                <ComponentsEditor components={components} onChange={setComponents} />
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button onClick={onClose} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={loading || !name.trim()} sx={{ fontWeight: 700 }}>
                        {loading ? 'Creating...' : 'Create Structure'}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

const DetailDrawer = ({ structure, open, onClose, companyId, onUpdated }) => {
    const { put, loading, error } = useApi();
    const [components, setComponents] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (structure) {
            setName(structure.name || '');
            setDescription(structure.description || '');
            setComponents((structure.components || []).map(c => ({
                ...c,
                value: toNum(c.value),
            })));
        }
    }, [structure]);

    const handleSave = async () => {
        try {
            await put(`/${companyId}/hr/salary-structures/${structure._id}`, { name, description, components });
            onUpdated();
        } catch {}
    };

    if (!structure) return null;

    return (
        <Drawer
            anchor="right" open={open} onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', md: 780 }, p: 3 } }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#1A2332' }}>Edit Salary Structure</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 0.3 }}>
                        {structure.components?.length || 0} components
                    </Typography>
                </Box>
                <Button onClick={onClose} sx={{ color: '#5F6B7C', fontSize: '0.813rem' }}>Close</Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Structure Name" value={name} onChange={e => setName(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Description" value={description} onChange={e => setDescription(e.target.value)} size="small" />
                </Grid>
            </Grid>

            <Typography sx={{ fontWeight: 700, fontSize: '0.813rem', color: '#1A2332', mb: 1 }}>Salary Components</Typography>
            <ComponentsEditor components={components} onChange={setComponents} />

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ fontWeight: 700 }}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </Box>
        </Drawer>
    );
};

const SalaryStructures = () => {
    const { selectedCompanyId } = useAuth();
    const { get } = useApi();
    const [structures, setStructures] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const fetchStructures = useCallback(async () => {
        if (!selectedCompanyId) return;
        try {
            const data = await get(`/${selectedCompanyId}/hr/salary-structures`);
            setStructures(data.data || []);
        } catch {}
    }, [selectedCompanyId]);

    useEffect(() => { fetchStructures(); }, [fetchStructures]);

    const handleRowClick = (s) => {
        setSelected(s);
        setDrawerOpen(true);
    };

    const handleUpdated = () => {
        fetchStructures();
        setDrawerOpen(false);
    };

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Salary Structures</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>
                        Define salary components and link them to employees for automatic payslip calculation
                    </Typography>
                </Box>
                <Button
                    variant="contained" startIcon={<AddRoundedIcon />}
                    onClick={() => setShowCreate(true)}
                    sx={{ fontWeight: 700, fontSize: '0.813rem', flexShrink: 0, mt: 0.5 }}
                >
                    New Structure
                </Button>
            </Box>

            <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Components</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Earnings</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Deductions</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {structures.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94A3B8', fontSize: '0.875rem' }}>
                                        No salary structures defined yet. Click "New Structure" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : structures.map(s => {
                                const earnings = (s.components || []).filter(c => c.type === 'Earning').length;
                                const deductions = (s.components || []).filter(c => c.type === 'Deduction').length;
                                return (
                                    <TableRow
                                        key={s._id} hover
                                        onClick={() => handleRowClick(s)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem', color: '#1A2332' }}>{s.name}</TableCell>
                                        <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{s.description || '—'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{(s.components || []).length}</TableCell>
                                        <TableCell>
                                            <Chip label={`${earnings} Earning${earnings !== 1 ? 's' : ''}`} size="small"
                                                sx={{ bgcolor: '#F0FDF4', color: '#15803D', fontWeight: 700, fontSize: '0.7rem' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={`${deductions} Deduction${deductions !== 1 ? 's' : ''}`} size="small"
                                                sx={{ bgcolor: '#FEF2F2', color: '#B91C1C', fontWeight: 700, fontSize: '0.7rem' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={s.is_active ? 'Active' : 'Inactive'}
                                                size="small"
                                                sx={{
                                                    bgcolor: s.is_active ? '#EFF6FF' : '#F1F5F9',
                                                    color: s.is_active ? '#1565C0' : '#64748B',
                                                    fontWeight: 700, fontSize: '0.7rem',
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CreateDialog
                open={showCreate}
                onClose={() => setShowCreate(false)}
                companyId={selectedCompanyId}
                onSuccess={() => { setShowCreate(false); fetchStructures(); }}
            />

            <DetailDrawer
                structure={selected}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                companyId={selectedCompanyId}
                onUpdated={handleUpdated}
            />
        </Box>
    );
};

export default SalaryStructures;
