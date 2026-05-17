import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box, Typography, Avatar, TextField, Button, Chip, CircularProgress,
    Tooltip, Menu, MenuItem, IconButton, Divider, Select, FormControl,
    InputLabel,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import PublishedWithChangesRoundedIcon from '@mui/icons-material/PublishedWithChangesRounded';
import NoteRoundedIcon from '@mui/icons-material/NoteRounded';
import useApi from '../hooks/useApi';
import useAuth from '../hooks/useAuth';

const AVATAR_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
const avatarColor = (name = '') => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const initials = (u) => u ? `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() : '?';
const fullName = (u) => u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unknown';

const PRIORITY_COLORS = {
    Low:    { bg: '#F1F5F9', color: '#64748B' },
    Normal: { bg: '#EFF6FF', color: '#1565C0' },
    High:   { bg: '#FFFBEB', color: '#B45309' },
    Urgent: { bg: '#FEF2F2', color: '#B91C1C' },
};

const AUDIT_META = {
    Create:       { icon: <AddTaskRoundedIcon sx={{ fontSize: 14 }} />, color: '#059669', label: 'Created' },
    Update:       { icon: <EditRoundedIcon sx={{ fontSize: 14 }} />,    color: '#6366F1', label: 'Updated' },
    Post:         { icon: <PublishedWithChangesRoundedIcon sx={{ fontSize: 14 }} />, color: '#0891B2', label: 'Posted to GL' },
    Assign:       { icon: <AssignmentIndRoundedIcon sx={{ fontSize: 14 }} />, color: '#7C3AED', label: 'Assigned' },
    Confirm:      { icon: <PublishedWithChangesRoundedIcon sx={{ fontSize: 14 }} />, color: '#D97706', label: 'Confirmed' },
    Comment:      { icon: <NoteRoundedIcon sx={{ fontSize: 14 }} />,    color: '#3B82F6', label: 'Commented' },
    InternalNote: { icon: <LockRoundedIcon sx={{ fontSize: 14 }} />,    color: '#94A3B8', label: 'Internal note' },
    Cancel:       { icon: <EditRoundedIcon sx={{ fontSize: 14 }} />,    color: '#EF4444', label: 'Cancelled' },
};

function TimelineComment({ event, currentUserId, onDelete }) {
    const u = event.user_id;
    const isOwn = u?._id === currentUserId;

    return (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: '0.65rem', bgcolor: avatarColor(u?.first_name), flexShrink: 0, mt: 0.3 }}>
                {initials(u)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                    <Typography fontSize="0.788rem" fontWeight={700}>{fullName(u)}</Typography>
                    {event.is_internal && (
                        <Chip icon={<LockRoundedIcon sx={{ fontSize: 11 }} />} label="Internal" size="small"
                            sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#F1F5F9', '& .MuiChip-label': { px: 0.6 } }} />
                    )}
                    <Typography fontSize="0.7rem" color="text.secondary" sx={{ ml: 'auto' }}>
                        {new Date(event._time).toLocaleString()}
                    </Typography>
                    {isOwn && (
                        <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => onDelete(event._id)} sx={{ p: 0.3, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                <Typography fontSize="0.65rem" color="error">×</Typography>
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
                <Box sx={{
                    bgcolor: event.is_internal ? '#FFFBEB' : '#F8FAFC',
                    border: `1px solid ${event.is_internal ? '#FDE68A' : '#E2E8F0'}`,
                    borderRadius: '0 8px 8px 8px', px: 1.5, py: 1,
                }}>
                    <Typography fontSize="0.813rem" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{event.body}</Typography>
                </Box>
            </Box>
        </Box>
    );
}

function TimelineAudit({ event }) {
    const u = event.user_id;
    const meta = AUDIT_META[event.action] || AUDIT_META.Update;

    const renderDetail = () => {
        if (event.action === 'Assign' && event.new_values) {
            return null; // shown in label
        }
        return null;
    };

    return (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'center' }}>
            <Box sx={{
                width: 30, height: 30, borderRadius: '50%',
                bgcolor: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: meta.color,
            }}>
                {meta.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
                <Typography fontSize="0.775rem" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600, color: '#1A2332' }}>{fullName(u)}</Box>
                    {' '}{meta.label.toLowerCase()}
                    {renderDetail()}
                    <Box component="span" sx={{ ml: 1, fontSize: '0.7rem', color: '#CBD5E1' }}>
                        · {new Date(event._time).toLocaleString()}
                    </Box>
                </Typography>
            </Box>
        </Box>
    );
}

/**
 * Props:
 *   companyId, entityType ('Invoice'|'SalesOrder'|'PurchaseOrder'), entityId
 *   assignedTo  — current assigned user object { _id, first_name, last_name, email }
 *   priority    — 'Low'|'Normal'|'High'|'Urgent'
 *   assignPath  — PUT URL for assignment, e.g. `/${companyId}/ar/invoices/${id}/assign`
 *   companyUsers — array of user objects for the assignee picker
 *   onAssigned  — callback after successful assignment
 */
const ActivityPanel = ({ companyId, entityType, entityId, assignedTo, priority, assignPath, companyUsers = [], onAssigned }) => {
    const { get, post, put, del } = useApi();
    const { user } = useAuth();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(false);
    const [body, setBody] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [sending, setSending] = useState(false);
    const [assignAnchor, setAssignAnchor] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [localAssignee, setLocalAssignee] = useState(assignedTo);
    const [localPriority, setLocalPriority] = useState(priority || 'Normal');
    const bottomRef = useRef(null);

    const fetchFeed = useCallback(async () => {
        if (!companyId || !entityId) return;
        setLoading(true);
        try {
            const data = await get(`/${companyId}/activity/${entityType}/${entityId}`);
            setFeed(data?.data || []);
        } catch {}
        setLoading(false);
    }, [companyId, entityType, entityId, get]);

    useEffect(() => { fetchFeed(); }, [fetchFeed]);
    useEffect(() => { setLocalAssignee(assignedTo); }, [assignedTo]);
    useEffect(() => { setLocalPriority(priority || 'Normal'); }, [priority]);

    useEffect(() => {
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [feed]);

    const handleComment = async () => {
        if (!body.trim()) return;
        setSending(true);
        try {
            await post(`/${companyId}/activity/${entityType}/${entityId}/comments`, { body, is_internal: isInternal });
            setBody('');
            setIsInternal(false);
            await fetchFeed();
        } catch {}
        setSending(false);
    };

    const handleDelete = async (id) => {
        try {
            await del(`/${companyId}/activity/comments/${id}`);
            await fetchFeed();
        } catch {}
    };

    const handleAssign = async (userId) => {
        setAssignAnchor(null);
        setAssigning(true);
        try {
            const data = await put(assignPath, { assigned_to: userId || null });
            setLocalAssignee(data?.data?.assigned_to || null);
            if (onAssigned) onAssigned(data?.data);
            await fetchFeed();
        } catch {}
        setAssigning(false);
    };

    const handlePriority = async (p) => {
        setLocalPriority(p);
        try {
            await put(assignPath, { priority: p });
            if (onAssigned) onAssigned({ priority: p });
            await fetchFeed();
        } catch {}
    };

    const pc = PRIORITY_COLORS[localPriority] || PRIORITY_COLORS.Normal;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Assignment + Priority bar */}
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E2E8F0', bgcolor: '#FAFBFC' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {/* Assignee */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontSize="0.75rem" color="text.secondary" fontWeight={600}>Assignee</Typography>
                        <Tooltip title={assigning ? 'Updating…' : 'Click to reassign'}>
                            <Box
                                onClick={e => setAssignAnchor(e.currentTarget)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.8, cursor: 'pointer',
                                    px: 1, py: 0.4, borderRadius: 1.5, border: '1px dashed #CBD5E1',
                                    '&:hover': { bgcolor: '#F1F5F9' },
                                }}
                            >
                                {localAssignee ? (
                                    <>
                                        <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: avatarColor(localAssignee.first_name) }}>
                                            {initials(localAssignee)}
                                        </Avatar>
                                        <Typography fontSize="0.775rem" fontWeight={600}>{fullName(localAssignee)}</Typography>
                                    </>
                                ) : (
                                    <>
                                        <PersonRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                                        <Typography fontSize="0.775rem" color="text.secondary">Unassigned</Typography>
                                    </>
                                )}
                            </Box>
                        </Tooltip>
                    </Box>

                    {/* Priority */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontSize="0.75rem" color="text.secondary" fontWeight={600}>Priority</Typography>
                        <FormControl size="small" variant="outlined" sx={{ minWidth: 90 }}>
                            <Select
                                value={localPriority}
                                onChange={e => handlePriority(e.target.value)}
                                sx={{
                                    fontSize: '0.75rem', fontWeight: 700, color: pc.color,
                                    bgcolor: pc.bg, border: 'none',
                                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                    '& .MuiSelect-select': { py: 0.4, px: 1 },
                                }}
                            >
                                {['Low', 'Normal', 'High', 'Urgent'].map(p => (
                                    <MenuItem key={p} value={p} sx={{ fontSize: '0.775rem' }}>{p}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Box>

            {/* Assignee picker menu */}
            <Menu anchorEl={assignAnchor} open={Boolean(assignAnchor)} onClose={() => setAssignAnchor(null)}
                PaperProps={{ sx: { maxHeight: 260, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
                <MenuItem onClick={() => handleAssign(null)} sx={{ fontSize: '0.813rem', color: '#94A3B8' }}>
                    <PersonRoundedIcon sx={{ fontSize: 16, mr: 1 }} /> Unassign
                </MenuItem>
                <Divider />
                {companyUsers.map(u => (
                    <MenuItem key={u._id} onClick={() => handleAssign(u._id)} sx={{ fontSize: '0.813rem', gap: 1 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: avatarColor(u.first_name) }}>
                            {initials(u)}
                        </Avatar>
                        {fullName(u)}
                        {localAssignee?._id === u._id && (
                            <Box sx={{ ml: 'auto', width: 6, height: 6, borderRadius: '50%', bgcolor: '#059669' }} />
                        )}
                    </MenuItem>
                ))}
            </Menu>

            {/* Timeline */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : feed.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, color: '#CBD5E1' }}>
                        <NoteRoundedIcon sx={{ fontSize: 36, mb: 1 }} />
                        <Typography fontSize="0.813rem">No activity yet. Add a comment below.</Typography>
                    </Box>
                ) : feed.map((event, i) => (
                    event._feedType === 'comment' ? (
                        <TimelineComment key={event._id} event={event} currentUserId={user?._id} onDelete={handleDelete} />
                    ) : (
                        <TimelineAudit key={`${event._id}-${i}`} event={event} />
                    )
                ))}
                <div ref={bottomRef} />
            </Box>

            {/* Comment composer */}
            <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #E2E8F0', bgcolor: '#FAFBFC' }}>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                    <Button
                        size="small" variant={!isInternal ? 'contained' : 'outlined'}
                        startIcon={<LockOpenRoundedIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setIsInternal(false)}
                        sx={{ textTransform: 'none', fontSize: '0.725rem', py: 0.3, px: 1 }}
                    >
                        Comment
                    </Button>
                    <Button
                        size="small" variant={isInternal ? 'contained' : 'outlined'}
                        startIcon={<LockRoundedIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setIsInternal(true)}
                        color={isInternal ? 'warning' : 'inherit'}
                        sx={{ textTransform: 'none', fontSize: '0.725rem', py: 0.3, px: 1 }}
                    >
                        Internal Note
                    </Button>
                </Box>
                <TextField
                    fullWidth multiline minRows={2} maxRows={5} size="small"
                    placeholder={isInternal ? 'Add an internal note (team only)…' : 'Add a comment…'}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment(); }}
                    sx={{
                        mb: 1,
                        '& .MuiOutlinedInput-root': {
                            bgcolor: isInternal ? '#FFFBEB' : '#fff',
                            borderColor: isInternal ? '#FDE68A' : undefined,
                        }
                    }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography fontSize="0.65rem" color="text.secondary">Ctrl+Enter to send</Typography>
                    <Button
                        size="small" variant="contained" endIcon={<SendRoundedIcon sx={{ fontSize: 14 }} />}
                        onClick={handleComment} disabled={sending || !body.trim()}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                        {sending ? 'Sending…' : 'Send'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default ActivityPanel;
