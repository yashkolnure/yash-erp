import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
    Box, TextField, Button, CircularProgress, Alert, Typography,
    InputAdornment, IconButton,
} from '@mui/material';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { login, clearError } from '../store/authSlice';

const Login = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [showPwd, setShowPwd] = useState(false);

    useEffect(() => {
        if (isAuthenticated) navigate('/dashboard', { replace: true });
        return () => dispatch(clearError());
    }, [isAuthenticated, navigate, dispatch]);

    const onSubmit = (data) => dispatch(login(data));

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#F0F2F5' }}>
            {/* Left panel */}
            <Box sx={{
                display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center',
                width: '45%', bgcolor: '#1A2332', p: 6, position: 'relative', overflow: 'hidden',
            }}>
                <Box sx={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', bgcolor: 'rgba(21,101,192,0.15)' }} />
                <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', bgcolor: 'rgba(21,101,192,0.1)' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BusinessRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
                        </Box>
                        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>ZohoERP</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.3, mb: 2 }}>
                        Manage your business<br />smarter, faster.
                    </Typography>
                    <Typography sx={{ color: '#7B9EC7', fontSize: '0.938rem', lineHeight: 1.7 }}>
                        A complete enterprise suite for finance, sales, procurement, inventory, and HR — all in one place.
                    </Typography>
                    <Box sx={{ mt: 5, display: 'flex', gap: 3 }}>
                        {[['12k+', 'Companies'], ['99.9%', 'Uptime'], ['24/7', 'Support']].map(([val, lbl]) => (
                            <Box key={lbl}>
                                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem' }}>{val}</Typography>
                                <Typography sx={{ color: '#7B9EC7', fontSize: '0.75rem' }}>{lbl}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* Right panel */}
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                <Box sx={{ width: '100%', maxWidth: 400 }}>
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BusinessRoundedIcon sx={{ color: '#fff', fontSize: 18 }} />
                        </Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1A2332' }}>ZohoERP</Typography>
                    </Box>

                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A2332', mb: 0.5 }}>Welcome back</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem', mb: 3 }}>Sign in to your account to continue</Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.813rem' }}>{error}</Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                        <Box sx={{ mb: 2 }}>
                            <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332', mb: 0.75 }}>Email address</Typography>
                            <TextField
                                fullWidth
                                type="email"
                                placeholder="you@company.com"
                                autoFocus
                                {...register('email', {
                                    required: 'Email is required',
                                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                                })}
                                error={!!errors.email}
                                helperText={errors.email?.message}
                            />
                        </Box>
                        <Box sx={{ mb: 3 }}>
                            <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1A2332', mb: 0.75 }}>Password</Typography>
                            <TextField
                                fullWidth
                                type={showPwd ? 'text' : 'password'}
                                placeholder="••••••••"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowPwd(p => !p)} edge="end">
                                                {showPwd ? <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} /> : <VisibilityRoundedIcon sx={{ fontSize: 18 }} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                {...register('password', { required: 'Password is required' })}
                                error={!!errors.password}
                                helperText={errors.password?.message}
                            />
                        </Box>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{ height: 46, fontSize: '0.938rem', fontWeight: 700 }}
                        >
                            {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                        </Button>
                    </Box>

                    <Typography sx={{ mt: 3, textAlign: 'center', fontSize: '0.75rem', color: '#94A3B8' }}>
                        Demo: admin@demo.com · Admin@123
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default Login;
