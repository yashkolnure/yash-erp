import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Drawer, Tabs, Tab, TextField,
    MenuItem, Select, InputLabel, FormControl, CircularProgress,
    Stack, Paper, Grid, Card, CardContent, CardActionArea,
    InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Tooltip, LinearProgress, Avatar,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ViewKanbanRoundedIcon from '@mui/icons-material/ViewKanbanRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import AddCommentRoundedIcon from '@mui/icons-material/AddCommentRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const STAGE_COLORS = {
    New: '#94A3B8', Contacted: '#60A5FA', Qualified: '#34D399',
    Proposal: '#FBBF24', Negotiation: '#F97316', Won: '#22C55E', Lost: '#EF4444',
};
const SOURCES = ['Website', 'Referral', 'Cold Call', 'Advertisement', 'Trade Show', 'Social Media', 'Other'];
const fmtCurrency = (v) => v ? `$${parseFloat(v).toLocaleString()}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const emptyForm = {
    contact_name: '', company_name: '', email: '', phone: '', stage: 'New',
    source: 'Website', estimated_value: '', probability: 50,
    expected_close_date: '', assigned_to: '', notes: '',
};

export default function CRM() {
    const { selectedCompanyId } = useAuth();
    const { get, post, put, loading } = useApi();

    const [leads, setLeads] = useState([]);
    const [pipeline, setPipeline] = useState({});
    const [view, setView] = useState('kanban');
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState('');
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [tab, setTab] = useState(0);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [activityForm, setActivityForm] = useState({ type: 'Call', description: '', outcome: '' });
    const [addActOpen, setAddActOpen] = useState(false);

    const load = useCallback(async () => {
        if (!selectedCompanyId) return;
        const params = new URLSearchParams();
        if (stageFilter) params.set('stage', stageFilter);
        const [leadsRes, pipeRes] = await Promise.all([
            get(`/${selectedCompanyId}/crm/leads?${params}`),
            get(`/${selectedCompanyId}/crm/pipeline`),
        ]);
        if (leadsRes?.data) setLeads(leadsRes.data);
        if (pipeRes?.data) setPipeline(pipeRes.data);
    }, [selectedCompanyId, stageFilter, get]);

    useEffect(() => { load(); }, [load]);

    const filtered = leads.filter(l =>
        !search ||
        l.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.company_name?.toLowerCase().includes(search.toLowerCase())
    );

    const byStage = STAGES.reduce((acc, s) => {
        acc[s] = filtered.filter(l => l.stage === s);
        return acc;
    }, {});

    const openDetail = async (lead) => {
        const res = await get(`/${selectedCompanyId}/crm/leads/${lead._id}`);
        setSelected(res?.data || lead);
        setTab(0);
        setDrawerOpen(true);
    };

    const handleCreate = async () => {
        setSaving(true);
        const res = await post(`/${selectedCompanyId}/crm/leads`, form);
        setSaving(false);
        if (res?.data) { setCreateOpen(false); setForm(emptyForm); load(); }
    };

    const handleUpdate = async (field, value) => {
        const res = await put(`/${selectedCompanyId}/crm/leads/${selected._id}`, { [field]: value });
        if (res?.data) setSelected(res.data);
        load();
    };

    const handleAddActivity = async () => {
        const res = await post(`/${selectedCompanyId}/crm/leads/${selected._id}/activity`, { ...activityForm, date: new Date() });
        if (res?.data) setSelected(res.data);
        setAddActOpen(false);
        setActivityForm({ type: 'Call', description: '', outcome: '' });
    };

    const handleConvert = async () => {
        if (!window.confirm('Convert this lead to a customer?')) return;
        const res = await post(`/${selectedCompanyId}/crm/leads/${selected._id}/convert`);
        if (res?.data) { setDrawerOpen(false); load(); }
    };

    const LeadCard = ({ lead }) => (
        <Card sx={{ mb: 1, cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => openDetail(lead)}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body2" fontWeight={700} noWrap>{lead.contact_name}</Typography>
                {lead.company_name && <Typography variant="caption" color="text.secondary" noWrap>{lead.company_name}</Typography>}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, alignItems: 'center' }}>
                    {lead.estimated_value ? (
                        <Typography variant="caption" fontWeight={600} color="success.main">{fmtCurrency(lead.estimated_value)}</Typography>
                    ) : <span />}
                    <Typography variant="caption" color="text.secondary">{lead.probability || 0}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={lead.probability || 0} sx={{ mt: 0.5, height: 2, borderRadius: 1 }} />
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>CRM — Leads & Pipeline</Typography>
                    <Typography variant="body2" color="text.secondary">Manage your sales pipeline</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <IconButton onClick={() => setView('kanban')} color={view === 'kanban' ? 'primary' : 'default'}><ViewKanbanRoundedIcon /></IconButton>
                    <IconButton onClick={() => setView('list')} color={view === 'list' ? 'primary' : 'default'}><ViewListRoundedIcon /></IconButton>
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>New Lead</Button>
                </Stack>
            </Box>

            {/* Pipeline summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {STAGES.filter(s => s !== 'Lost').map(stage => {
                    const stat = pipeline[stage] || {};
                    return (
                        <Grid item xs={6} sm={4} md={2} key={stage}>
                            <Paper sx={{ p: 1.5, borderTop: 3, borderColor: STAGE_COLORS[stage] }}>
                                <Typography variant="caption" color="text.secondary">{stage}</Typography>
                                <Typography variant="h6" fontWeight={700}>{stat.count || 0}</Typography>
                                <Typography variant="caption" color="success.main">{fmtCurrency(stat.value)}</Typography>
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField size="small" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                    sx={{ width: 260 }} />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Stage</InputLabel>
                    <Select label="Stage" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {STAGES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>{filtered.length} leads</Typography>
            </Paper>

            {/* Kanban / List view */}
            {view === 'kanban' ? (
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
                    {STAGES.map(stage => (
                        <Box key={stage} sx={{ minWidth: 220, flex: '0 0 220px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, borderRadius: 1, bgcolor: `${STAGE_COLORS[stage]}18` }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STAGE_COLORS[stage] }} />
                                <Typography variant="caption" fontWeight={700} sx={{ color: STAGE_COLORS[stage] }}>{stage}</Typography>
                                <Chip label={byStage[stage].length} size="small" sx={{ ml: 'auto', height: 18, fontSize: 10 }} />
                            </Box>
                            {loading && !leads.length ? (
                                <CircularProgress size={20} />
                            ) : byStage[stage].map(lead => (
                                <LeadCard key={lead._id} lead={lead} />
                            ))}
                        </Box>
                    ))}
                </Box>
            ) : (
                <Paper>
                    {filtered.map((lead, i) => (
                        <Box key={lead._id} onClick={() => openDetail(lead)}
                            sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', borderBottom: i < filtered.length - 1 ? 1 : 0, borderColor: 'divider', '&:hover': { bgcolor: 'grey.50' } }}>
                            <Avatar sx={{ bgcolor: STAGE_COLORS[lead.stage], width: 36, height: 36, fontSize: 14 }}>
                                {lead.contact_name?.[0]}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={600}>{lead.contact_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{lead.company_name} · {lead.source}</Typography>
                            </Box>
                            <Chip label={lead.stage} size="small" sx={{ bgcolor: `${STAGE_COLORS[lead.stage]}22`, color: STAGE_COLORS[lead.stage], fontWeight: 600 }} />
                            <Typography variant="body2" fontWeight={600} color="success.main" sx={{ minWidth: 80, textAlign: 'right' }}>{fmtCurrency(lead.estimated_value)}</Typography>
                            <Typography variant="caption" color="text.secondary">{lead.probability || 0}%</Typography>
                        </Box>
                    ))}
                    {filtered.length === 0 && <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No leads found</Box>}
                </Paper>
            )}

            {/* Detail Drawer */}
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: 680 } } }}>
                {selected && (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>{selected.contact_name}</Typography>
                                    <Typography variant="body2" color="text.secondary">{selected.company_name} · {selected.lead_number}</Typography>
                                </Box>
                                <FormControl size="small" sx={{ minWidth: 130 }}>
                                    <Select value={selected.stage} onChange={e => handleUpdate('stage', e.target.value)}>
                                        {STAGES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
                            <Tab label="Details" />
                            <Tab label={`Activities (${selected.activities?.length || 0})`} />
                        </Tabs>
                        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                            {tab === 0 && (
                                <Stack spacing={2}>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                        {[
                                            ['Email', selected.email],
                                            ['Phone', selected.phone],
                                            ['Source', selected.source],
                                            ['Expected Close', fmtDate(selected.expected_close_date)],
                                            ['Estimated Value', fmtCurrency(selected.estimated_value)],
                                            ['Probability', `${selected.probability || 0}%`],
                                        ].map(([label, value]) => (
                                            <Box key={label}>
                                                <Typography variant="caption" color="text.secondary">{label}</Typography>
                                                <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                    {selected.notes && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Notes</Typography>
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</Typography>
                                        </Box>
                                    )}
                                    <Stack direction="row" spacing={1}>
                                        <TextField size="small" label="Probability %" type="number" sx={{ width: 140 }}
                                            defaultValue={selected.probability}
                                            onBlur={e => handleUpdate('probability', e.target.value)} />
                                        <TextField size="small" label="Est. Value" type="number" sx={{ width: 160 }}
                                            defaultValue={selected.estimated_value}
                                            onBlur={e => handleUpdate('estimated_value', e.target.value)} />
                                    </Stack>
                                    {!selected.converted && (
                                        <Button variant="outlined" color="success" startIcon={<PersonAddRoundedIcon />} onClick={handleConvert}>
                                            Convert to Customer
                                        </Button>
                                    )}
                                    {selected.converted && <Chip label="Converted to Customer" color="success" />}
                                </Stack>
                            )}
                            {tab === 1 && (
                                <Stack spacing={2}>
                                    <Button variant="outlined" size="small" startIcon={<AddCommentRoundedIcon />} onClick={() => setAddActOpen(true)}>
                                        Log Activity
                                    </Button>
                                    {(selected.activities || []).length === 0 && (
                                        <Typography color="text.secondary" variant="body2">No activities yet</Typography>
                                    )}
                                    {(selected.activities || []).map((act, i) => (
                                        <Paper key={i} sx={{ p: 2, bgcolor: 'grey.50' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Chip label={act.type} size="small" />
                                                <Typography variant="caption" color="text.secondary">{fmtDate(act.date)}</Typography>
                                            </Box>
                                            <Typography variant="body2">{act.description}</Typography>
                                            {act.outcome && <Typography variant="caption" color="success.main">Outcome: {act.outcome}</Typography>}
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </Box>
                )}
            </Drawer>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>New Lead / Opportunity</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" label="Contact Name *" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
                            <TextField size="small" label="Company Name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
                            <TextField size="small" label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                            <TextField size="small" label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                            <FormControl size="small" fullWidth>
                                <InputLabel>Stage</InputLabel>
                                <Select label="Stage" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                                    {STAGES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Source</InputLabel>
                                <Select label="Source" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                                    {SOURCES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField size="small" label="Estimated Value" type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} />
                            <TextField size="small" label="Probability %" type="number" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} />
                            <TextField size="small" type="date" label="Expected Close Date" InputLabelProps={{ shrink: true }}
                                value={form.expected_close_date} onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))} />
                        </Box>
                        <TextField size="small" label="Notes" multiline rows={2} fullWidth value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving || !form.contact_name}>
                        {saving ? <CircularProgress size={20} /> : 'Create Lead'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Activity Dialog */}
            <Dialog open={addActOpen} onClose={() => setAddActOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Log Activity</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select label="Type" value={activityForm.type} onChange={e => setActivityForm(f => ({ ...f, type: e.target.value }))}>
                                {['Call', 'Email', 'Meeting', 'Demo', 'Follow-up', 'Note'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Description *" multiline rows={2} fullWidth
                            value={activityForm.description} onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))} />
                        <TextField size="small" label="Outcome" fullWidth
                            value={activityForm.outcome} onChange={e => setActivityForm(f => ({ ...f, outcome: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddActOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddActivity} disabled={!activityForm.description}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
