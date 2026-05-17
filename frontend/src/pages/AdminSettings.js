import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Tabs, Tab, Grid, TextField, Button,
    Alert, Divider, Table, TableHead, TableBody, TableRow, TableCell,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
    Stack, Avatar, Chip, Switch, FormControlLabel, Tooltip, Select,
    FormControl, InputLabel,
} from '@mui/material';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PeriodManagement from './PeriodManagement';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import CheckBoxRoundedIcon from '@mui/icons-material/CheckBoxRounded';
import CheckBoxOutlineBlankRoundedIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';

const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
];

const MODULES = ['Dashboard', 'Sales', 'Procurement', 'Inventory', 'Finance', 'HR', 'Payments', 'Admin'];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'post', 'approve'];

const AVATAR_COLORS = ['#1565C0', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ── Company Profile Tab ────────────────────────────────────────────────── */
const CompanyProfileTab = ({ companyId }) => {
    const { get, put, loading } = useApi();
    const [form, setForm] = useState({});
    const [saved, setSaved] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!companyId) return;
        get(`/${companyId}/admin/company`).then(d => setForm(d.data || {})).catch(() => {});
    }, [companyId, get]);

    const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

    const handleSave = async () => {
        setErr(null); setSaved(false);
        try {
            await put(`/${companyId}/admin/company`, form);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) { setErr(e.response?.data?.error || 'Failed to save'); }
    };

    return (
        <Box sx={{ p: 3 }}>
            {saved && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Company profile saved successfully.</Alert>}
            {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{err}</Alert>}

            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332', mb: 2 }}>Basic Information</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}><TextField fullWidth label="Company Name" value={form.company_name || ''} onChange={set('company_name')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Company Code" value={form.company_code || ''} InputProps={{ readOnly: true }} sx={{ bgcolor: '#F8FAFC' }} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Business Email" type="email" value={form.email || ''} onChange={set('email')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Phone" value={form.phone || ''} onChange={set('phone')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Website" value={form.website || ''} onChange={set('website')} /></Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332', mb: 2 }}>Tax & Registration</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}><TextField fullWidth label="Tax ID / EIN" value={form.tax_id || ''} onChange={set('tax_id')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="GST Number" value={form.gst_number || ''} onChange={set('gst_number')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="PAN Number" value={form.pan_number || ''} onChange={set('pan_number')} /></Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332', mb: 2 }}>Business Address</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}><TextField fullWidth label="Street Address" value={form.address || ''} onChange={set('address')} /></Grid>
                <Grid item xs={12} md={3}><TextField fullWidth label="City" value={form.city || ''} onChange={set('city')} /></Grid>
                <Grid item xs={12} md={3}><TextField fullWidth label="State / Province" value={form.state || ''} onChange={set('state')} /></Grid>
                <Grid item xs={12} md={3}><TextField fullWidth label="Postal Code" value={form.postal_code || ''} onChange={set('postal_code')} /></Grid>
                <Grid item xs={12} md={3}><TextField fullWidth label="Country" value={form.country || ''} onChange={set('country')} /></Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332', mb: 2 }}>Fiscal Year</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}><TextField fullWidth label="Fiscal Year Start" type="date" InputLabelProps={{ shrink: true }} value={form.fiscal_year_start ? form.fiscal_year_start.split('T')[0] : ''} onChange={set('fiscal_year_start')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Fiscal Year End" type="date" InputLabelProps={{ shrink: true }} value={form.fiscal_year_end ? form.fiscal_year_end.split('T')[0] : ''} onChange={set('fiscal_year_end')} /></Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ fontWeight: 700, px: 4 }}>
                    {loading ? 'Saving...' : 'Save Profile'}
                </Button>
            </Box>
        </Box>
    );
};

/* ── Bank Accounts Tab ──────────────────────────────────────────────────── */
const BankAccountsTab = ({ companyId }) => {
    const { get, post, put, del } = useApi();
    const [accounts, setAccounts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ account_name: '', bank_name: '', account_number: '', account_type: 'Current', currency: 'USD', ifsc_code: '', swift_code: '', routing_number: '', iban: '', branch_name: '', branch_address: '', is_default: false, notes: '' });
    const [err, setErr] = useState(null);

    const fetch = useCallback(() => {
        if (!companyId) return;
        get(`/${companyId}/admin/bank-accounts`).then(d => setAccounts(d.data || [])).catch(() => {});
    }, [companyId, get]);

    useEffect(() => { fetch(); }, [fetch]);

    const openNew = () => { setEditItem(null); setForm({ account_name: '', bank_name: '', account_number: '', account_type: 'Current', currency: 'USD', ifsc_code: '', swift_code: '', routing_number: '', iban: '', branch_name: '', branch_address: '', is_default: false, notes: '' }); setErr(null); setShowForm(true); };
    const openEdit = (a) => { setEditItem(a); setForm({ ...a }); setErr(null); setShowForm(true); };

    const handleSave = async () => {
        setErr(null);
        try {
            if (editItem) await put(`/${companyId}/admin/bank-accounts/${editItem._id}`, form);
            else await post(`/${companyId}/admin/bank-accounts`, form);
            setShowForm(false); fetch();
        } catch (e) { setErr(e.response?.data?.error || 'Failed'); }
    };

    const handleDelete = async (id) => {
        try { await del(`/${companyId}/admin/bank-accounts/${id}`); fetch(); } catch {}
    };

    const setDefault = async (a) => {
        try { await put(`/${companyId}/admin/bank-accounts/${a._id}`, { ...a, is_default: true }); fetch(); } catch {}
    };

    const sf = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2.5, borderBottom: '1px solid #F0F2F5' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#5F6B7C' }}>{accounts.length} bank account{accounts.length !== 1 ? 's' : ''}</Typography>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openNew} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Add Bank Account</Button>
            </Box>

            {accounts.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8' }}>
                    <AccountBalanceRoundedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                    <Typography>No bank accounts added yet.</Typography>
                </Box>
            ) : (
                <Box sx={{ p: 2.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
                    {accounts.map(a => (
                        <Box key={a._id} sx={{ border: `2px solid ${a.is_default ? '#1565C0' : '#E8ECF0'}`, borderRadius: 2.5, p: 2.5, bgcolor: a.is_default ? '#F0F6FF' : '#fff', position: 'relative' }}>
                            {a.is_default && (
                                <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.3, borderRadius: 10, bgcolor: '#1565C0' }}>
                                        <StarRoundedIcon sx={{ fontSize: 12, color: '#fff' }} />
                                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>DEFAULT</Typography>
                                    </Box>
                                </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AccountBalanceRoundedIcon sx={{ color: '#1565C0', fontSize: 22 }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332' }}>{a.account_name}</Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{a.bank_name}</Typography>
                                </Box>
                            </Box>
                            <Grid container spacing={1} sx={{ mb: 1.5 }}>
                                <Grid item xs={6}><Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>ACCOUNT #</Typography><Typography sx={{ fontSize: '0.813rem', fontFamily: 'monospace', color: '#1A2332' }}>{a.account_number}</Typography></Grid>
                                <Grid item xs={6}><Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>TYPE</Typography><Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{a.account_type}</Typography></Grid>
                                {a.ifsc_code && <Grid item xs={6}><Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>IFSC</Typography><Typography sx={{ fontSize: '0.813rem', fontFamily: 'monospace', color: '#1A2332' }}>{a.ifsc_code}</Typography></Grid>}
                                {a.swift_code && <Grid item xs={6}><Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>SWIFT</Typography><Typography sx={{ fontSize: '0.813rem', fontFamily: 'monospace', color: '#1A2332' }}>{a.swift_code}</Typography></Grid>}
                                {a.routing_number && <Grid item xs={6}><Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>ROUTING</Typography><Typography sx={{ fontSize: '0.813rem', fontFamily: 'monospace', color: '#1A2332' }}>{a.routing_number}</Typography></Grid>}
                                {a.iban && <Grid item xs={12}><Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>IBAN</Typography><Typography sx={{ fontSize: '0.813rem', fontFamily: 'monospace', color: '#1A2332' }}>{a.iban}</Typography></Grid>}
                                <Grid item xs={6}><Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>CURRENCY</Typography><Typography sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{a.currency}</Typography></Grid>
                            </Grid>
                            <Divider sx={{ mb: 1.5 }} />
                            <Stack direction="row" spacing={1}>
                                {!a.is_default && <Button size="small" variant="outlined" onClick={() => setDefault(a)} sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#1565C0', borderColor: '#DBEAFE', flex: 1 }}>Set Default</Button>}
                                <IconButton size="small" onClick={() => openEdit(a)} sx={{ color: '#5F6B7C', bgcolor: '#F0F2F5', borderRadius: 1.5 }}><EditRoundedIcon sx={{ fontSize: 15 }} /></IconButton>
                                <IconButton size="small" onClick={() => handleDelete(a._id)} sx={{ color: '#B91C1C', bgcolor: '#FEF2F2', borderRadius: 1.5 }}><DeleteRoundedIcon sx={{ fontSize: 15 }} /></IconButton>
                            </Stack>
                        </Box>
                    ))}
                </Box>
            )}

            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>{editItem ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}><TextField fullWidth label="Account Label *" placeholder="e.g. Main Operating Account" value={form.account_name} onChange={sf('account_name')} /></Grid>
                        <Grid item xs={12} md={6}><TextField fullWidth label="Bank Name *" value={form.bank_name} onChange={sf('bank_name')} /></Grid>
                        <Grid item xs={12} md={8}><TextField fullWidth label="Account Number *" value={form.account_number} onChange={sf('account_number')} /></Grid>
                        <Grid item xs={12} md={4}>
                            <TextField fullWidth select label="Account Type" value={form.account_type} onChange={sf('account_type')}>
                                {['Current', 'Savings', 'Payroll', 'Escrow', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth select label="Currency" value={form.currency} onChange={sf('currency')}>
                                {CURRENCIES.map(c => <MenuItem key={c.code} value={c.code}>{c.code} — {c.name}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}><TextField fullWidth label="IFSC Code (India)" value={form.ifsc_code} onChange={sf('ifsc_code')} /></Grid>
                        <Grid item xs={12} md={6}><TextField fullWidth label="SWIFT / BIC Code" value={form.swift_code} onChange={sf('swift_code')} /></Grid>
                        <Grid item xs={12} md={6}><TextField fullWidth label="Routing Number (US)" value={form.routing_number} onChange={sf('routing_number')} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="IBAN" value={form.iban} onChange={sf('iban')} /></Grid>
                        <Grid item xs={12} md={6}><TextField fullWidth label="Branch Name" value={form.branch_name} onChange={sf('branch_name')} /></Grid>
                        <Grid item xs={12} md={6}><TextField fullWidth label="Branch Address" value={form.branch_address} onChange={sf('branch_address')} /></Grid>
                        <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Notes" value={form.notes} onChange={sf('notes')} /></Grid>
                        <Grid item xs={12}><FormControlLabel control={<Switch checked={form.is_default} onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))} />} label="Set as default bank account" /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setShowForm(false)} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ fontWeight: 700 }}>Save Account</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

/* ── Currencies Tab ─────────────────────────────────────────────────────── */
const CurrenciesTab = ({ companyId }) => {
    const { get, put, loading } = useApi();
    const [primary, setPrimary] = useState('USD');
    const [supported, setSupported] = useState([]);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!companyId) return;
        get(`/${companyId}/admin/company`).then(d => {
            setPrimary(d.data?.primary_currency || 'USD');
            setSupported(d.data?.supported_currencies || []);
        }).catch(() => {});
    }, [companyId, get]);

    const toggleCurrency = (code) => {
        setSupported(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    };

    const handleSave = async () => {
        try {
            await put(`/${companyId}/admin/company`, { primary_currency: primary, supported_currencies: supported });
            setSaved(true); setTimeout(() => setSaved(false), 3000);
        } catch {}
    };

    return (
        <Box sx={{ p: 3 }}>
            {saved && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Currency settings saved.</Alert>}

            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332', mb: 2 }}>Base Currency</Typography>
            <TextField select label="Primary Currency" value={primary} onChange={e => setPrimary(e.target.value)} sx={{ minWidth: 300, mb: 3 }}>
                {CURRENCIES.map(c => <MenuItem key={c.code} value={c.code}><Stack direction="row" spacing={1} alignItems="center"><Typography sx={{ fontWeight: 700, minWidth: 36 }}>{c.code}</Typography><Typography sx={{ color: '#5F6B7C' }}>{c.name}</Typography><Typography sx={{ color: '#94A3B8' }}>({c.symbol})</Typography></Stack></MenuItem>)}
            </TextField>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332', mb: 0.5 }}>Supported Currencies</Typography>
            <Typography sx={{ fontSize: '0.813rem', color: '#94A3B8', mb: 2 }}>Enable currencies that your business accepts for transactions.</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
                {CURRENCIES.map(c => {
                    const isEnabled = supported.includes(c.code) || c.code === primary;
                    const isPrimary = c.code === primary;
                    return (
                        <Box
                            key={c.code}
                            onClick={() => !isPrimary && toggleCurrency(c.code)}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, border: `2px solid ${isEnabled ? '#1565C0' : '#E8ECF0'}`, bgcolor: isEnabled ? '#EFF6FF' : '#fff', cursor: isPrimary ? 'default' : 'pointer', transition: 'all 0.15s', '&:hover': !isPrimary ? { borderColor: '#93C5FD' } : {} }}
                        >
                            {isEnabled ? <CheckBoxRoundedIcon sx={{ color: '#1565C0', fontSize: 20 }} /> : <CheckBoxOutlineBlankRoundedIcon sx={{ color: '#CBD5E1', fontSize: 20 }} />}
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332' }}>{c.code}</Typography>
                                    {isPrimary && <Box sx={{ px: 1, py: 0.1, borderRadius: 4, bgcolor: '#1565C0' }}><Typography sx={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700 }}>BASE</Typography></Box>}
                                </Box>
                                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>{c.name} {c.symbol}</Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ fontWeight: 700, px: 4 }}>Save Currency Settings</Button>
            </Box>
        </Box>
    );
};

/* ── Users & Roles Tab ──────────────────────────────────────────────────── */
const UsersTab = ({ companyId }) => {
    const { get, post, put, del } = useApi();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showInvite, setShowInvite] = useState(false);
    const [invite, setInvite] = useState({ email: '', first_name: '', last_name: '', role_id: '', password: '' });
    const [err, setErr] = useState(null);
    const [ok, setOk] = useState(null);

    const fetchAll = useCallback(() => {
        if (!companyId) return;
        get(`/${companyId}/admin/users`).then(d => setUsers(d.data || [])).catch(() => {});
        get(`/${companyId}/admin/roles`).then(d => setRoles(d.data || [])).catch(() => {});
    }, [companyId, get]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleInvite = async () => {
        setErr(null);
        try {
            await post(`/${companyId}/admin/invite`, invite);
            setShowInvite(false); setInvite({ email: '', first_name: '', last_name: '', role_id: '', password: '' });
            setOk('User invited successfully.'); setTimeout(() => setOk(null), 4000);
            fetchAll();
        } catch (e) { setErr(e.response?.data?.error || 'Failed'); }
    };

    const handleRoleChange = async (assignmentId, roleId) => {
        try { await put(`/${companyId}/admin/users/${assignmentId}/role`, { role_id: roleId }); fetchAll(); } catch {}
    };

    const handleRemove = async (assignmentId) => {
        try { await del(`/${companyId}/admin/users/${assignmentId}`); fetchAll(); } catch {}
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2.5, borderBottom: '1px solid #F0F2F5' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#5F6B7C' }}>{users.length} team member{users.length !== 1 ? 's' : ''}</Typography>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" startIcon={<PersonAddRoundedIcon />} onClick={() => { setShowInvite(true); setErr(null); }} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Invite User</Button>
            </Box>
            {ok && <Alert severity="success" sx={{ mx: 2.5, mt: 2, borderRadius: 2 }}>{ok}</Alert>}

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94A3B8' }}>No users found.</TableCell></TableRow>
                    ) : users.map(u => (
                        <TableRow key={u.assignment_id} hover>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: getColor(u.first_name), fontSize: '0.75rem', fontWeight: 700 }}>
                                        {u.first_name?.[0]}{u.last_name?.[0] || ''}
                                    </Avatar>
                                    <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332' }}>{u.first_name} {u.last_name}</Typography>
                                </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.813rem', color: '#5F6B7C' }}>{u.email}</TableCell>
                            <TableCell>
                                <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 10, bgcolor: u.user_status === 'Active' ? '#F0FDF4' : '#F1F5F9' }}>
                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: u.user_status === 'Active' ? '#15803D' : '#64748B' }}>{u.user_status}</Typography>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <TextField select size="small" value={u.role_id || ''} onChange={e => handleRoleChange(u.assignment_id, e.target.value)} sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { fontSize: '0.813rem' } }}>
                                    {roles.map(r => <MenuItem key={r._id} value={r._id} sx={{ fontSize: '0.813rem' }}>{r.role_name}</MenuItem>)}
                                </TextField>
                            </TableCell>
                            <TableCell align="center">
                                <Tooltip title="Revoke Access">
                                    <IconButton size="small" onClick={() => handleRemove(u.assignment_id)} sx={{ color: '#B91C1C', bgcolor: '#FEF2F2', borderRadius: 1.5 }}>
                                        <DeleteRoundedIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={showInvite} onClose={() => setShowInvite(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>Invite Team Member</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}><TextField fullWidth label="First Name" value={invite.first_name} onChange={e => setInvite(p => ({ ...p, first_name: e.target.value }))} /></Grid>
                        <Grid item xs={12} md={6}><TextField fullWidth label="Last Name" value={invite.last_name} onChange={e => setInvite(p => ({ ...p, last_name: e.target.value }))} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Email Address" type="email" value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Temporary Password" type="password" value={invite.password} onChange={e => setInvite(p => ({ ...p, password: e.target.value }))} helperText="User should change this on first login" /></Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth select label="Assign Role" value={invite.role_id} onChange={e => setInvite(p => ({ ...p, role_id: e.target.value }))}>
                                {roles.map(r => <MenuItem key={r._id} value={r._id}>{r.role_name}</MenuItem>)}
                            </TextField>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setShowInvite(false)} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleInvite} sx={{ fontWeight: 700 }}>Send Invite</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

/* ── RBAC Tab ───────────────────────────────────────────────────────────── */
const RBACTab = ({ companyId }) => {
    const { get, post, put } = useApi();
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [showNewRole, setShowNewRole] = useState(false);
    const [newRole, setNewRole] = useState({ role_name: '', description: '' });
    const [saved, setSaved] = useState(false);
    const [err, setErr] = useState(null);

    const fetchRoles = useCallback(() => {
        if (!companyId) return;
        get(`/${companyId}/admin/roles`).then(d => setRoles(d.data || [])).catch(() => {});
    }, [companyId, get]);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const selectRole = (role) => {
        setSelectedRole(role);
        get(`/${companyId}/admin/roles/${role._id}/permissions`).then(d => {
            const map = {};
            (d.data || []).forEach(p => {
                if (!map[p.module]) map[p.module] = {};
                map[p.module][p.action] = p.permission_grant === 'Allow';
            });
            setPermissions(map);
        }).catch(() => {});
    };

    const togglePerm = (module, action) => {
        setPermissions(prev => ({
            ...prev,
            [module]: { ...prev[module], [action]: !prev[module]?.[action] },
        }));
    };

    const toggleModule = (module) => {
        const allOn = ACTIONS.every(a => permissions[module]?.[a]);
        setPermissions(prev => ({
            ...prev,
            [module]: ACTIONS.reduce((acc, a) => { acc[a] = !allOn; return acc; }, {}),
        }));
    };

    const handleSavePerms = async () => {
        const perms = [];
        Object.entries(permissions).forEach(([module, actions]) => {
            Object.entries(actions).forEach(([action, granted]) => {
                if (granted) perms.push({ module, feature: module, action, permission_grant: 'Allow' });
            });
        });
        try {
            await put(`/${companyId}/admin/roles/${selectedRole._id}/permissions`, { permissions: perms });
            setSaved(true); setTimeout(() => setSaved(false), 3000);
        } catch (e) { setErr(e.response?.data?.error || 'Failed'); }
    };

    const handleCreateRole = async () => {
        try {
            await post(`/${companyId}/admin/roles`, newRole);
            setShowNewRole(false); setNewRole({ role_name: '', description: '' });
            fetchRoles();
        } catch (e) { setErr(e.response?.data?.error || 'Failed'); }
    };

    return (
        <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Role list sidebar */}
            <Box sx={{ width: 220, borderRight: '1px solid #F0F2F5', flexShrink: 0 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '0.813rem', fontWeight: 700, color: '#1A2332' }}>Roles</Typography>
                    <IconButton size="small" onClick={() => setShowNewRole(true)} sx={{ color: '#1565C0', bgcolor: '#EFF6FF', borderRadius: 1.5 }}><AddRoundedIcon sx={{ fontSize: 16 }} /></IconButton>
                </Box>
                {roles.map(r => (
                    <Box
                        key={r._id}
                        onClick={() => selectRole(r)}
                        sx={{ px: 2, py: 1.5, cursor: 'pointer', bgcolor: selectedRole?._id === r._id ? '#EFF6FF' : 'transparent', borderRight: selectedRole?._id === r._id ? '3px solid #1565C0' : '3px solid transparent', '&:hover': { bgcolor: '#F7F9FC' } }}
                    >
                        <Typography sx={{ fontSize: '0.813rem', fontWeight: selectedRole?._id === r._id ? 700 : 500, color: selectedRole?._id === r._id ? '#1565C0' : '#1A2332' }}>{r.role_name}</Typography>
                        {r.description && <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }} noWrap>{r.description}</Typography>}
                    </Box>
                ))}
            </Box>

            {/* Permissions matrix */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {!selectedRole ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <ShieldRoundedIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                            <Typography>Select a role to manage permissions</Typography>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ p: 2.5 }}>
                        {saved && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Permissions saved for {selectedRole.role_name}.</Alert>}
                        {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{err}</Alert>}

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, justifyContent: 'space-between' }}>
                            <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#1A2332' }}>{selectedRole.role_name}</Typography>
                                {selectedRole.description && <Typography sx={{ fontSize: '0.813rem', color: '#94A3B8' }}>{selectedRole.description}</Typography>}
                            </Box>
                            <Button variant="contained" onClick={handleSavePerms} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Save Permissions</Button>
                        </Box>

                        <Box sx={{ border: '1px solid #E8ECF0', borderRadius: 2, overflow: 'hidden' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase', bgcolor: '#F7F9FC', width: 160 }}>Module</TableCell>
                                        {ACTIONS.map(a => (
                                            <TableCell key={a} align="center" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase', bgcolor: '#F7F9FC', width: 80 }}>{a}</TableCell>
                                        ))}
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#5F6B7C', textTransform: 'uppercase', bgcolor: '#F7F9FC', width: 80 }}>All</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {MODULES.map(module => {
                                        const allOn = ACTIONS.every(a => permissions[module]?.[a]);
                                        return (
                                            <TableRow key={module} hover>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem', color: '#1A2332' }}>{module}</TableCell>
                                                {ACTIONS.map(action => (
                                                    <TableCell key={action} align="center">
                                                        <Switch
                                                            size="small"
                                                            checked={!!permissions[module]?.[action]}
                                                            onChange={() => togglePerm(module, action)}
                                                            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#1565C0' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#1565C0' } }}
                                                        />
                                                    </TableCell>
                                                ))}
                                                <TableCell align="center">
                                                    <Switch
                                                        size="small"
                                                        checked={allOn}
                                                        onChange={() => toggleModule(module)}
                                                        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#059669' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#059669' } }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Box>
                    </Box>
                )}
            </Box>

            <Dialog open={showNewRole} onClose={() => setShowNewRole(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>Create New Role</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    <Stack spacing={2}>
                        <TextField fullWidth label="Role Name" value={newRole.role_name} onChange={e => setNewRole(p => ({ ...p, role_name: e.target.value }))} />
                        <TextField fullWidth label="Description" multiline rows={2} value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setShowNewRole(false)} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateRole} sx={{ fontWeight: 700 }}>Create Role</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

/* ── Exchange Rates Tab ─────────────────────────────────────────────────── */
const ExchangeRatesTab = ({ companyId }) => {
    const { get, post, del } = useApi();
    const [rates, setRates] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ from_currency: 'USD', to_currency: 'EUR', rate: '', effective_date: new Date().toISOString().slice(0, 10) });
    const [err, setErr] = useState(null);

    const fetchRates = useCallback(() => {
        if (!companyId) return;
        get(`/${companyId}/admin/exchange-rates`).then(d => setRates(d.data || [])).catch(() => {});
    }, [companyId, get]);

    useEffect(() => { fetchRates(); }, [fetchRates]);

    const handleSave = async () => {
        setErr(null);
        try {
            await post(`/${companyId}/admin/exchange-rates`, form);
            setShowForm(false);
            setForm({ from_currency: 'USD', to_currency: 'EUR', rate: '', effective_date: new Date().toISOString().slice(0, 10) });
            fetchRates();
        } catch (e) { setErr(e.response?.data?.error || 'Failed to save rate'); }
    };

    const handleDelete = async (id) => {
        try { await del(`/${companyId}/admin/exchange-rates/${id}`); fetchRates(); } catch {}
    };

    const sf = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2.5, borderBottom: '1px solid #F0F2F5' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#5F6B7C' }}>{rates.length} rate{rates.length !== 1 ? 's' : ''} defined</Typography>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setShowForm(true); setErr(null); }} sx={{ fontWeight: 700, fontSize: '0.813rem' }}>Add Rate</Button>
            </Box>

            {rates.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8' }}>
                    <CurrencyExchangeRoundedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                    <Typography>No exchange rates defined yet.</Typography>
                    <Typography sx={{ fontSize: '0.813rem', mt: 0.5 }}>Add rates to enable multi-currency transactions.</Typography>
                </Box>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell><b>From</b></TableCell>
                            <TableCell><b>To</b></TableCell>
                            <TableCell align="right"><b>Rate</b></TableCell>
                            <TableCell><b>Effective Date</b></TableCell>
                            <TableCell align="center"><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rates.map(r => (
                            <TableRow key={r._id} hover>
                                <TableCell><Chip label={r.from_currency} size="small" sx={{ fontWeight: 700, bgcolor: '#EFF6FF', color: '#1565C0' }} /></TableCell>
                                <TableCell><Chip label={r.to_currency} size="small" sx={{ fontWeight: 700, bgcolor: '#F0FDF4', color: '#15803D' }} /></TableCell>
                                <TableCell align="right"><Typography fontWeight={700}>{parseFloat(r.rate).toFixed(6)}</Typography></TableCell>
                                <TableCell>{r.effective_date ? new Date(r.effective_date).toLocaleDateString() : '—'}</TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Delete">
                                        <IconButton size="small" onClick={() => handleDelete(r._id)} sx={{ color: '#B91C1C', bgcolor: '#FEF2F2', borderRadius: 1.5 }}>
                                            <DeleteRoundedIcon sx={{ fontSize: 15 }} />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>Add Exchange Rate</DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={5}>
                            <FormControl fullWidth>
                                <InputLabel>From Currency</InputLabel>
                                <Select label="From Currency" value={form.from_currency} onChange={sf('from_currency')}>
                                    {CURRENCIES.map(c => <MenuItem key={c.code} value={c.code}>{c.code} — {c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <FormControl fullWidth>
                                <InputLabel>To Currency</InputLabel>
                                <Select label="To Currency" value={form.to_currency} onChange={sf('to_currency')}>
                                    {CURRENCIES.map(c => <MenuItem key={c.code} value={c.code}>{c.code} — {c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth label="Exchange Rate" type="number" inputProps={{ step: '0.000001' }} value={form.rate} onChange={sf('rate')} helperText={`1 ${form.from_currency} = ? ${form.to_currency}`} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth type="date" label="Effective Date" InputLabelProps={{ shrink: true }} value={form.effective_date} onChange={sf('effective_date')} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setShowForm(false)} sx={{ color: '#5F6B7C' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={!form.rate || form.from_currency === form.to_currency} sx={{ fontWeight: 700 }}>Save Rate</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

/* ── Main AdminSettings ─────────────────────────────────────────────────── */
const AdminSettings = () => {
    const { selectedCompanyId } = useAuth();
    const [tab, setTab] = useState(0);

    const tabs = [
        { label: 'Company Profile', icon: <BusinessRoundedIcon sx={{ fontSize: 16 }} /> },
        { label: 'Bank Accounts', icon: <AccountBalanceRoundedIcon sx={{ fontSize: 16 }} /> },
        { label: 'Currencies', icon: <CurrencyExchangeRoundedIcon sx={{ fontSize: 16 }} /> },
        { label: 'Exchange Rates', icon: <CurrencyExchangeRoundedIcon sx={{ fontSize: 16 }} /> },
        { label: 'Users', icon: <PeopleRoundedIcon sx={{ fontSize: 16 }} /> },
        { label: 'Roles & Permissions', icon: <ShieldRoundedIcon sx={{ fontSize: 16 }} /> },
        { label: 'Period Management', icon: <LockRoundedIcon sx={{ fontSize: 16 }} /> },
    ];

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332' }}>Admin Settings</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: '0.813rem', mt: 0.3 }}>Manage company profile, bank accounts, currencies, users and access control</Typography>
            </Box>

            <Card sx={{ minHeight: 600 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ borderBottom: '1px solid #F0F2F5', px: 2 }}>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontSize: '0.813rem', fontWeight: 600, minHeight: 48, textTransform: 'none', color: '#5F6B7C' }, '& .Mui-selected': { color: '#1565C0' }, '& .MuiTabs-indicator': { bgcolor: '#1565C0', height: 2.5, borderRadius: 2 } }}>
                            {tabs.map((t, i) => <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />)}
                        </Tabs>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        {tab === 0 && <CompanyProfileTab companyId={selectedCompanyId} />}
                        {tab === 1 && <BankAccountsTab companyId={selectedCompanyId} />}
                        {tab === 2 && <CurrenciesTab companyId={selectedCompanyId} />}
                        {tab === 3 && <ExchangeRatesTab companyId={selectedCompanyId} />}
                        {tab === 4 && <UsersTab companyId={selectedCompanyId} />}
                        {tab === 5 && <RBACTab companyId={selectedCompanyId} />}
                        {tab === 6 && <Box sx={{ p: 3 }}><PeriodManagement /></Box>}
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AdminSettings;
