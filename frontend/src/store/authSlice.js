import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../services/api';

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
    try {
        const response = await API.post('/auth/login', { email, password });
        localStorage.setItem('token', response.data.token);
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.error || 'Login failed');
    }
});

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, { rejectWithValue }) => {
    try {
        const response = await API.get('/auth/profile');
        return response.data.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.error || 'Failed to fetch profile');
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: localStorage.getItem('token'),
        isAuthenticated: !!localStorage.getItem('token'),
        selectedCompanyId: localStorage.getItem('selectedCompanyId') || null,
        loading: false,
        error: null,
    },
    reducers: {
        logout(state) {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.selectedCompanyId = null;
            localStorage.removeItem('token');
            localStorage.removeItem('selectedCompanyId');
        },
        selectCompany(state, action) {
            state.selectedCompanyId = action.payload;
            localStorage.setItem('selectedCompanyId', action.payload);
        },
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.isAuthenticated = true;
                // Auto-select first company if only one
                if (action.payload.user?.companies?.length === 1) {
                    state.selectedCompanyId = action.payload.user.companies[0].company_id;
                    localStorage.setItem('selectedCompanyId', state.selectedCompanyId);
                }
            })
            .addCase(login.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
            .addCase(fetchProfile.fulfilled, (state, action) => { state.user = { ...state.user, ...action.payload }; });
    },
});

export const { logout, selectCompany, clearError } = authSlice.actions;
export default authSlice.reducer;
