import React, { useState, useEffect, useCallback } from 'react';
import {
    AppBar, Toolbar, IconButton, Box, Avatar, Menu, MenuItem,
    Typography, Divider, InputBase, Badge, Chip, Tooltip, ListItemIcon,
    Popover, Button, List, ListItem, ListItemText, CircularProgress,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import MessageRoundedIcon from '@mui/icons-material/MessageRounded';
import useAuth from '../../hooks/useAuth';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '../../store/uiSlice';
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import { useNavigate } from 'react-router-dom';
import useApi from '../../hooks/useApi';

const NOTIF_TYPE_COLOR = { info: '#1565C0', warning: '#B45309', success: '#15803D', error: '#B91C1C' };

const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const Navbar = ({ sidebarOpen }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, logout, selectedCompanyId } = useAuth();
    const { get, post } = useApi();
    const [anchorEl, setAnchorEl] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Messages unread count
    useEffect(() => {
        if (!selectedCompanyId) return;
        const fetchUnread = () => {
            get(`/${selectedCompanyId}/messages/unread-count`).then(d => setUnreadCount(d?.count || 0)).catch(() => {});
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        return () => clearInterval(interval);
    }, [selectedCompanyId, get]);

    // Notification bell state
    const [notifAnchor, setNotifAnchor] = useState(null);
    const [notifUnread, setNotifUnread] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    const fetchNotifUnread = useCallback(() => {
        if (!selectedCompanyId) return;
        get(`/${selectedCompanyId}/notifications/unread-count`)
            .then(d => setNotifUnread(d?.data?.count || 0))
            .catch(() => {});
    }, [selectedCompanyId, get]);

    useEffect(() => {
        fetchNotifUnread();
        const interval = setInterval(fetchNotifUnread, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifUnread]);

    const openNotifPanel = (e) => {
        setNotifAnchor(e.currentTarget);
        setNotifLoading(true);
        get(`/${selectedCompanyId}/notifications?limit=10`)
            .then(d => setNotifications(d?.data || []))
            .catch(() => {})
            .finally(() => setNotifLoading(false));
    };

    const handleMarkRead = async (id) => {
        try {
            await post(`/${selectedCompanyId}/notifications/${id}/read`, {});
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            setNotifUnread(prev => Math.max(0, prev - 1));
        } catch {}
    };

    const handleMarkAllRead = async () => {
        try {
            await post(`/${selectedCompanyId}/notifications/mark-all-read`, {});
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setNotifUnread(0);
        } catch {}
    };

    const company = user?.companies?.find(c => c.company_id === selectedCompanyId);
    const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : 'U';

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                bgcolor: '#fff',
                borderBottom: '1px solid #E8ECF0',
                left: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
                width: `calc(100% - ${sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH}px)`,
                transition: 'left 0.25s ease, width 0.25s ease',
                zIndex: 1100,
            }}
        >
            <Toolbar sx={{ minHeight: '56px !important', px: 2, gap: 1 }}>
                <IconButton size="small" onClick={() => dispatch(toggleSidebar())} sx={{ color: '#5F6B7C', mr: 1 }}>
                    <MenuRoundedIcon />
                </IconButton>

                {/* Search */}
                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F0F2F5', borderRadius: 2, px: 1.5, py: 0.5, flex: 1, maxWidth: 400, mr: 2 }}>
                    <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 18, mr: 1 }} />
                    <InputBase
                        placeholder="Search anything..."
                        sx={{ fontSize: '0.813rem', color: '#1A2332', flex: 1, '& input::placeholder': { color: '#94A3B8' } }}
                    />
                </Box>

                <Box sx={{ flex: 1 }} />

                {/* Company badge */}
                {company && (
                    <Chip
                        label={company.company_name}
                        size="small"
                        sx={{ bgcolor: '#EEF2FF', color: '#1565C0', fontWeight: 600, fontSize: '0.7rem', border: '1px solid #C7D2FE', mr: 1 }}
                    />
                )}

                <Tooltip title="Help">
                    <IconButton size="small" sx={{ color: '#5F6B7C' }}>
                        <HelpOutlineRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Messages">
                    <IconButton size="small" sx={{ color: '#5F6B7C' }} onClick={() => navigate('/messages')}>
                        <Badge badgeContent={unreadCount || null} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
                            <MessageRoundedIcon sx={{ fontSize: 20 }} />
                        </Badge>
                    </IconButton>
                </Tooltip>

                <Tooltip title="Notifications">
                    <IconButton size="small" sx={{ color: '#5F6B7C' }} onClick={openNotifPanel}>
                        <Badge badgeContent={notifUnread || null} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
                            <NotificationsRoundedIcon sx={{ fontSize: 20 }} />
                        </Badge>
                    </IconButton>
                </Tooltip>

                {/* Notifications Popover */}
                <Popover
                    open={Boolean(notifAnchor)}
                    anchorEl={notifAnchor}
                    onClose={() => setNotifAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ sx: { mt: 0.5, width: 360, maxHeight: 480, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #E8ECF0', borderRadius: 2 } }}
                >
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F0F2F5' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1A2332' }}>Notifications</Typography>
                        {notifUnread > 0 && (
                            <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#1565C0', textTransform: 'none', p: 0 }}>
                                Mark all read
                            </Button>
                        )}
                    </Box>
                    {notifLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : notifications.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center', color: '#94A3B8', fontSize: '0.813rem' }}>No notifications yet</Box>
                    ) : (
                        <List disablePadding sx={{ overflow: 'auto', maxHeight: 380 }}>
                            {notifications.map((n, i) => (
                                <React.Fragment key={n._id}>
                                    <ListItem
                                        alignItems="flex-start"
                                        onClick={() => { if (!n.read) handleMarkRead(n._id); if (n.link) { navigate(n.link); setNotifAnchor(null); } }}
                                        sx={{ cursor: 'pointer', bgcolor: n.read ? 'transparent' : '#F0F7FF', px: 2, py: 1.25, '&:hover': { bgcolor: '#F8FAFC' } }}
                                    >
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: NOTIF_TYPE_COLOR[n.type] || '#1565C0', mt: 0.75, mr: 1.5, flexShrink: 0, opacity: n.read ? 0.3 : 1 }} />
                                        <ListItemText
                                            primary={<Typography sx={{ fontSize: '0.813rem', fontWeight: n.read ? 500 : 700, color: '#1A2332', lineHeight: 1.3 }}>{n.title}</Typography>}
                                            secondary={
                                                <Box>
                                                    {n.message && <Typography sx={{ fontSize: '0.75rem', color: '#5F6B7C', mt: 0.3, lineHeight: 1.4 }}>{n.message}</Typography>}
                                                    <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8', mt: 0.5 }}>{timeAgo(n.createdAt)}</Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {i < notifications.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </Popover>

                <Tooltip title="Admin Settings">
                    <IconButton size="small" sx={{ color: '#5F6B7C' }} onClick={() => navigate('/admin-settings')}>
                        <SettingsRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, borderColor: '#E8ECF0' }} />

                {/* User menu */}
                <Box
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 2, px: 1, py: 0.5, '&:hover': { bgcolor: '#F0F2F5' } }}
                >
                    <Avatar sx={{ width: 30, height: 30, bgcolor: '#1565C0', fontSize: '0.75rem', fontWeight: 700 }}>
                        {initials}
                    </Avatar>
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                        <Typography sx={{ fontSize: '0.788rem', fontWeight: 600, color: '#1A2332', lineHeight: 1.2 }}>
                            {user?.first_name} {user?.last_name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8', lineHeight: 1.2 }}>
                            {company?.role || 'Admin'}
                        </Typography>
                    </Box>
                    <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                </Box>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    PaperProps={{ sx: { mt: 0.5, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #E8ECF0' } }}
                >
                    <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{user?.first_name} {user?.last_name}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{user?.email}</Typography>
                    </Box>
                    <Divider />
                    <MenuItem onClick={() => setAnchorEl(null)} sx={{ fontSize: '0.813rem', gap: 1.5 }}>
                        <ListItemIcon><PersonRoundedIcon fontSize="small" /></ListItemIcon>
                        My Profile
                    </MenuItem>
                    <MenuItem onClick={() => setAnchorEl(null)} sx={{ fontSize: '0.813rem', gap: 1.5 }}>
                        <ListItemIcon><SettingsRoundedIcon fontSize="small" /></ListItemIcon>
                        Settings
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={() => { setAnchorEl(null); logout(); }} sx={{ fontSize: '0.813rem', color: '#C62828', gap: 1.5 }}>
                        <ListItemIcon><LogoutRoundedIcon fontSize="small" sx={{ color: '#C62828' }} /></ListItemIcon>
                        Sign Out
                    </MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
