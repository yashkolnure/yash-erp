import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, Avatar, Chip, IconButton, MenuItem, Select, FormControl,
    InputLabel, Divider, Badge, CircularProgress, Tooltip, Paper,
    List, ListItemButton, ListItemAvatar, ListItemText, Autocomplete,
    InputAdornment,
} from '@mui/material';
import ComposeIcon from '@mui/icons-material/Edit';
import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import ArchiveIcon from '@mui/icons-material/Archive';
import ReplyIcon from '@mui/icons-material/Reply';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';

const AVATAR_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (u) => u ? `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() : '?';
const fullName = (u) => u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unknown';

const FOLDERS = [
    { key: 'inbox', label: 'Inbox', icon: <InboxIcon fontSize="small" /> },
    { key: 'sent', label: 'Sent', icon: <SendIcon fontSize="small" /> },
    { key: 'all', label: 'All Messages', icon: <AllInboxIcon fontSize="small" /> },
];

const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const ENTITY_TYPES = ['General', 'Invoice', 'SalesOrder', 'PurchaseOrder', 'Payment', 'Customer', 'Vendor'];
const PRIORITY_COLORS = { Low: '#94A3B8', Normal: '#3B82F6', High: '#F59E0B', Urgent: '#EF4444' };

export default function Messages() {
    const { get, post, put } = useApi();
    const { selectedCompanyId, user } = useAuth();

    const [folder, setFolder] = useState('inbox');
    const [messages, setMessages] = useState([]);
    const [total, setTotal] = useState(0);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [replies, setReplies] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [composeOpen, setComposeOpen] = useState(false);
    const [replyOpen, setReplyOpen] = useState(false);
    const [users, setUsers] = useState([]);

    const fetchMessages = useCallback(async () => {
        if (!selectedCompanyId) return;
        setLoading(true);
        try {
            const data = await get(`/${selectedCompanyId}/messages?folder=${folder}&limit=50`);
            setMessages(data?.data || []);
            setTotal(data?.pagination?.total || 0);
            setUnread(data?.unread || 0);
        } catch {}
        setLoading(false);
    }, [selectedCompanyId, folder, get]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);

    useEffect(() => {
        if (!selectedCompanyId) return;
        get(`/${selectedCompanyId}/messages/users`).then(d => setUsers(d?.data || [])).catch(() => {});
    }, [selectedCompanyId, get]);

    const openMessage = async (msg) => {
        setSelected(msg);
        setDetailLoading(true);
        try {
            const data = await get(`/${selectedCompanyId}/messages/${msg._id}`);
            setSelected(data?.data || msg);
            setReplies(data?.replies || []);
            // Refresh unread count
            fetchMessages();
        } catch {}
        setDetailLoading(false);
    };

    const archiveMessage = async (id) => {
        try {
            await put(`/${selectedCompanyId}/messages/${id}/archive`);
            setSelected(null);
            fetchMessages();
        } catch {}
    };

    const filteredMessages = messages.filter(m => {
        if (!search) return true;
        const q = search.toLowerCase();
        return m.subject?.toLowerCase().includes(q) ||
            fullName(m.sender_id).toLowerCase().includes(q);
    });

    const isUnread = (msg) => {
        if (!user?._id) return false;
        return !msg.read_by?.includes(user._id);
    };

    return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 56px)', bgcolor: '#F8FAFC', gap: 0 }}>
            {/* Left: folder sidebar */}
            <Box sx={{ width: 200, flexShrink: 0, bgcolor: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', pt: 2 }}>
                <Box sx={{ px: 2, mb: 2 }}>
                    <Button
                        fullWidth variant="contained" startIcon={<ComposeIcon />}
                        onClick={() => setComposeOpen(true)}
                        sx={{ bgcolor: '#1565C0', '&:hover': { bgcolor: '#1976D2' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                        Compose
                    </Button>
                </Box>

                <List dense disablePadding>
                    {FOLDERS.map(f => (
                        <ListItemButton
                            key={f.key}
                            selected={folder === f.key}
                            onClick={() => { setFolder(f.key); setSelected(null); }}
                            sx={{
                                mx: 1, borderRadius: 1.5, mb: 0.5,
                                '&.Mui-selected': { bgcolor: '#EFF6FF', color: '#1565C0' },
                            }}
                        >
                            <Box sx={{ mr: 1.5, color: folder === f.key ? '#1565C0' : '#64748B' }}>{f.icon}</Box>
                            <ListItemText
                                primary={f.label}
                                primaryTypographyProps={{ fontSize: '0.813rem', fontWeight: folder === f.key ? 700 : 500 }}
                            />
                            {f.key === 'inbox' && unread > 0 && (
                                <Chip label={unread} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#1565C0', color: '#fff', '& .MuiChip-label': { px: 0.8 } }} />
                            )}
                        </ListItemButton>
                    ))}
                </List>
            </Box>

            {/* Middle: message list */}
            <Box sx={{ width: 340, flexShrink: 0, bgcolor: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 1.5, borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                        size="small" placeholder="Search messages..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        sx={{ flex: 1 }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                    />
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={fetchMessages}><RefreshIcon fontSize="small" /></IconButton>
                    </Tooltip>
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : filteredMessages.length === 0 ? (
                        <Box sx={{ textAlign: 'center', pt: 6, color: '#94A3B8' }}>
                            <InboxIcon sx={{ fontSize: 48, mb: 1 }} />
                            <Typography fontSize="0.875rem">No messages</Typography>
                        </Box>
                    ) : filteredMessages.map(msg => {
                        const unreadMsg = isUnread(msg);
                        const isSelected = selected?._id === msg._id;
                        return (
                            <Box
                                key={msg._id}
                                onClick={() => openMessage(msg)}
                                sx={{
                                    p: 1.5, cursor: 'pointer', borderBottom: '1px solid #F1F5F9',
                                    bgcolor: isSelected ? '#EFF6FF' : unreadMsg ? '#FAFBFF' : '#fff',
                                    '&:hover': { bgcolor: isSelected ? '#EFF6FF' : '#F8FAFC' },
                                    borderLeft: isSelected ? '3px solid #1565C0' : '3px solid transparent',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
                                    <Avatar sx={{ width: 34, height: 34, fontSize: '0.75rem', bgcolor: avatarColor(msg.sender_id?.first_name || '') }}>
                                        {initials(msg.sender_id)}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography fontSize="0.813rem" fontWeight={unreadMsg ? 700 : 500} noWrap>
                                            {fullName(msg.sender_id)}
                                        </Typography>
                                        <Typography fontSize="0.7rem" color="text.secondary">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                    {msg.priority && msg.priority !== 'Normal' && (
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PRIORITY_COLORS[msg.priority] || '#94A3B8', flexShrink: 0 }} />
                                    )}
                                </Box>
                                <Typography fontSize="0.813rem" fontWeight={unreadMsg ? 700 : 500} noWrap sx={{ mb: 0.3 }}>
                                    {msg.subject || '(no subject)'}
                                </Typography>
                                <Typography fontSize="0.75rem" color="text.secondary" noWrap>
                                    {msg.body?.replace(/<[^>]*>/g, '').slice(0, 80)}
                                </Typography>
                                {msg.entity_type && msg.entity_type !== 'General' && (
                                    <Chip
                                        label={msg.entity_type} size="small"
                                        sx={{ mt: 0.5, height: 16, fontSize: '0.6rem', bgcolor: '#F0F4FF', color: '#3B4FCF', '& .MuiChip-label': { px: 0.7 } }}
                                    />
                                )}
                            </Box>
                        );
                    })}
                </Box>
                <Box sx={{ p: 1, borderTop: '1px solid #E2E8F0' }}>
                    <Typography fontSize="0.7rem" color="text.secondary" textAlign="center">{total} total messages</Typography>
                </Box>
            </Box>

            {/* Right: message detail */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!selected ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#CBD5E1' }}>
                        <InboxIcon sx={{ fontSize: 64, mb: 2 }} />
                        <Typography fontSize="1rem" fontWeight={500}>Select a message to read</Typography>
                        <Typography fontSize="0.813rem" sx={{ mt: 0.5 }}>Or compose a new message</Typography>
                        <Button variant="outlined" startIcon={<ComposeIcon />} sx={{ mt: 2 }} onClick={() => setComposeOpen(true)}>
                            Compose
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                        {detailLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : (
                            <>
                                {/* Header */}
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                                            {selected.subject || '(no subject)'}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {selected.entity_type && selected.entity_type !== 'General' && (
                                                <Chip label={selected.entity_type} size="small" sx={{ bgcolor: '#EFF6FF', color: '#1565C0', fontSize: '0.7rem' }} />
                                            )}
                                            {selected.entity_ref && (
                                                <Chip label={selected.entity_ref} size="small" sx={{ bgcolor: '#F0FDF4', color: '#166534', fontSize: '0.7rem' }} />
                                            )}
                                            {selected.priority && selected.priority !== 'Normal' && (
                                                <Chip
                                                    label={selected.priority} size="small"
                                                    sx={{ bgcolor: PRIORITY_COLORS[selected.priority] + '22', color: PRIORITY_COLORS[selected.priority], fontSize: '0.7rem' }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Tooltip title="Reply">
                                            <IconButton size="small" onClick={() => setReplyOpen(true)}>
                                                <ReplyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Archive">
                                            <IconButton size="small" onClick={() => archiveMessage(selected._id)}>
                                                <ArchiveIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* From / To */}
                                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#FAFBFC' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ width: 40, height: 40, fontSize: '0.8rem', bgcolor: avatarColor(selected.sender_id?.first_name || '') }}>
                                            {initials(selected.sender_id)}
                                        </Avatar>
                                        <Box>
                                            <Typography fontWeight={600} fontSize="0.875rem">{fullName(selected.sender_id)}</Typography>
                                            <Typography fontSize="0.75rem" color="text.secondary">{selected.sender_id?.email}</Typography>
                                        </Box>
                                        <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                                            <Typography fontSize="0.75rem" color="text.secondary">
                                                {new Date(selected.created_at).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {selected.recipients?.length > 0 && (
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <Typography fontSize="0.75rem" color="text.secondary" sx={{ mr: 0.5 }}>To:</Typography>
                                            {selected.recipients.map(r => (
                                                <Chip key={r._id} label={fullName(r)} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                            ))}
                                        </Box>
                                    )}
                                </Paper>

                                {/* Body */}
                                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3, lineHeight: 1.8 }}>
                                    <Typography fontSize="0.875rem" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {selected.body}
                                    </Typography>
                                </Paper>

                                {/* Replies */}
                                {replies.length > 0 && (
                                    <Box>
                                        <Typography fontWeight={600} fontSize="0.813rem" color="text.secondary" sx={{ mb: 1.5 }}>
                                            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                                        </Typography>
                                        {replies.map(r => (
                                            <Paper key={r._id} variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2, ml: 2, borderLeft: '3px solid #CBD5E1' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', bgcolor: avatarColor(r.sender_id?.first_name || '') }}>
                                                        {initials(r.sender_id)}
                                                    </Avatar>
                                                    <Typography fontWeight={600} fontSize="0.813rem">{fullName(r.sender_id)}</Typography>
                                                    <Typography fontSize="0.7rem" color="text.secondary" sx={{ ml: 'auto' }}>
                                                        {new Date(r.created_at).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <Typography fontSize="0.813rem" sx={{ whiteSpace: 'pre-wrap' }}>{r.body}</Typography>
                                            </Paper>
                                        ))}
                                    </Box>
                                )}

                                {/* Quick reply */}
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
                                    <Typography fontSize="0.813rem" fontWeight={600} sx={{ mb: 1 }}>Quick Reply</Typography>
                                    <QuickReply
                                        companyId={selectedCompanyId}
                                        parentId={selected._id}
                                        recipients={selected.sender_id ? [selected.sender_id._id || selected.sender_id] : []}
                                        subject={`Re: ${selected.subject || ''}`}
                                        post={post}
                                        onSent={() => openMessage(selected)}
                                    />
                                </Paper>
                            </>
                        )}
                    </Box>
                )}
            </Box>

            {/* Compose Dialog */}
            <ComposeDialog
                open={composeOpen}
                onClose={() => setComposeOpen(false)}
                companyId={selectedCompanyId}
                users={users}
                post={post}
                onSent={() => { setComposeOpen(false); fetchMessages(); }}
            />

            {/* Reply Dialog */}
            {selected && (
                <ReplyDialog
                    open={replyOpen}
                    onClose={() => setReplyOpen(false)}
                    companyId={selectedCompanyId}
                    parent={selected}
                    post={post}
                    onSent={() => { setReplyOpen(false); openMessage(selected); }}
                />
            )}
        </Box>
    );
}

function QuickReply({ companyId, parentId, recipients, subject, post, onSent }) {
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const send = async () => {
        if (!body.trim()) return;
        setSending(true);
        try {
            await post(`/${companyId}/messages`, { subject, body, recipients, parent_id: parentId });
            setBody('');
            onSent();
        } catch {}
        setSending(false);
    };

    return (
        <Box>
            <TextField
                fullWidth multiline rows={3} size="small"
                placeholder="Write a reply..."
                value={body} onChange={e => setBody(e.target.value)}
                sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained" size="small" startIcon={<SendIcon />}
                    onClick={send} disabled={sending || !body.trim()}
                    sx={{ textTransform: 'none' }}
                >
                    {sending ? 'Sending...' : 'Send Reply'}
                </Button>
            </Box>
        </Box>
    );
}

function ComposeDialog({ open, onClose, companyId, users, post, onSent }) {
    const [form, setForm] = useState({ subject: '', body: '', recipients: [], entity_type: 'General', entity_ref: '', priority: 'Normal' });
    const [sending, setSending] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const send = async () => {
        if (!form.subject.trim() || !form.body.trim() || form.recipients.length === 0) return;
        setSending(true);
        try {
            await post(`/${companyId}/messages`, {
                ...form,
                recipients: form.recipients.map(u => u._id),
                entity_ref: form.entity_ref || null,
            });
            setForm({ subject: '', body: '', recipients: [], entity_type: 'General', entity_ref: '', priority: 'Normal' });
            onSent();
        } catch {}
        setSending(false);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography fontWeight={700}>New Message</Typography>
                <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
                <Autocomplete
                    multiple size="small"
                    options={users}
                    getOptionLabel={u => `${fullName(u)} <${u.email}>`}
                    value={form.recipients}
                    onChange={(_, v) => set('recipients', v)}
                    renderInput={params => <TextField {...params} label="To" sx={{ mb: 2 }} />}
                    renderTags={(value, getTagProps) =>
                        value.map((u, index) => (
                            <Chip key={u._id} label={fullName(u)} size="small" {...getTagProps({ index })} />
                        ))
                    }
                />
                <TextField fullWidth size="small" label="Subject" value={form.subject}
                    onChange={e => set('subject', e.target.value)} sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                        <InputLabel>Priority</InputLabel>
                        <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)}>
                            {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Link To</InputLabel>
                        <Select label="Link To" value={form.entity_type} onChange={e => set('entity_type', e.target.value)}>
                            {ENTITY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {form.entity_type !== 'General' && (
                        <TextField size="small" label="Reference #" value={form.entity_ref}
                            onChange={e => set('entity_ref', e.target.value)} sx={{ flex: 1 }} />
                    )}
                </Box>
                <TextField fullWidth multiline rows={6} label="Message" value={form.body}
                    onChange={e => set('body', e.target.value)} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button
                    variant="contained" startIcon={<SendIcon />} onClick={send}
                    disabled={sending || !form.subject.trim() || !form.body.trim() || form.recipients.length === 0}
                    sx={{ textTransform: 'none' }}
                >
                    {sending ? 'Sending...' : 'Send'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function ReplyDialog({ open, onClose, companyId, parent, post, onSent }) {
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const send = async () => {
        if (!body.trim()) return;
        setSending(true);
        try {
            await post(`/${companyId}/messages`, {
                subject: `Re: ${parent.subject || ''}`,
                body,
                recipients: parent.sender_id ? [parent.sender_id._id || parent.sender_id] : [],
                parent_id: parent._id,
            });
            setBody('');
            onSent();
        } catch {}
        setSending(false);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography fontWeight={700}>Reply to: {parent?.subject}</Typography>
                <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
                <TextField fullWidth multiline rows={8} label="Reply" value={body}
                    onChange={e => setBody(e.target.value)} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button
                    variant="contained" startIcon={<SendIcon />} onClick={send}
                    disabled={sending || !body.trim()} sx={{ textTransform: 'none' }}
                >
                    {sending ? 'Sending...' : 'Send Reply'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
