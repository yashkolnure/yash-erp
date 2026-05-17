import React, { useRef, useState } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemIcon, ListItemText, IconButton, CircularProgress, Chip } from '@mui/material';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import useAuth from '../hooks/useAuth';

const fmtSize = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function FileAttachments({ attachments = [], onAdd, onRemove, readonly = false }) {
    const { selectedCompanyId } = useAuth();
    const fileRef = useRef();
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`/api/v1/${selectedCompanyId}/uploads`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: formData,
            });
            const json = await res.json();
            if (json.success && onAdd) onAdd(json.data);
        } catch (err) {
            console.error('Upload failed', err);
        }
        setUploading(false);
        e.target.value = '';
    };

    const extColor = (name) => {
        const ext = name?.split('.').pop()?.toLowerCase();
        const map = { pdf: '#E53E3E', xlsx: '#38A169', xls: '#38A169', csv: '#2B6CB0', png: '#805AD5', jpg: '#805AD5', jpeg: '#805AD5', doc: '#3182CE', docx: '#3182CE' };
        return map[ext] || '#718096';
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>Attachments {attachments.length > 0 && <Chip label={attachments.length} size="small" sx={{ ml: 0.5 }} />}</Typography>
                {!readonly && (
                    <>
                        <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleFileChange}
                            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx" />
                        <Button size="small" startIcon={uploading ? <CircularProgress size={14} /> : <AttachFileRoundedIcon />}
                            onClick={() => fileRef.current?.click()} disabled={uploading}>
                            {uploading ? 'Uploading…' : 'Attach File'}
                        </Button>
                    </>
                )}
            </Box>
            {attachments.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No attachments</Typography>
            ) : (
                <List dense disablePadding>
                    {attachments.map((att, i) => (
                        <ListItem key={i} disableGutters sx={{ py: 0.3 }}
                            secondaryAction={
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton size="small" component="a" href={att.path} target="_blank" download={att.originalname}>
                                        <DownloadRoundedIcon fontSize="small" />
                                    </IconButton>
                                    {!readonly && onRemove && (
                                        <IconButton size="small" color="error" onClick={() => onRemove(i)}>
                                            <DeleteRoundedIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>
                            }
                        >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <InsertDriveFileRoundedIcon sx={{ color: extColor(att.originalname), fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={att.originalname}
                                secondary={fmtSize(att.size)}
                                primaryTypographyProps={{ variant: 'body2', noWrap: true, sx: { maxWidth: 220 } }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
    );
}
