import React from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import Navbar from './Navbar';
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import { hideSnackbar } from '../../store/uiSlice';

const Layout = ({ children }) => {
    const dispatch = useDispatch();
    const { sidebarOpen, snackbar } = useSelector((state) => state.ui);

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F0F2F5' }}>
            <Sidebar open={sidebarOpen} />

            <Box sx={{ flex: 1, ml: `${sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH}px`, transition: 'margin-left 0.25s ease', display: 'flex', flexDirection: 'column' }}>
                <Navbar sidebarOpen={sidebarOpen} />

                <Box component="main" sx={{ flex: 1, mt: '56px', p: 3 }}>
                    {children}
                </Box>
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => dispatch(hideSnackbar())}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => dispatch(hideSnackbar())}
                    sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 500 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Layout;
