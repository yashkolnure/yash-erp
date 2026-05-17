import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        sidebarOpen: true,
        snackbar: { open: false, message: '', severity: 'info' },
    },
    reducers: {
        toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen; },
        setSidebarOpen(state, action) { state.sidebarOpen = action.payload; },
        showSnackbar(state, action) {
            state.snackbar = { open: true, message: action.payload.message, severity: action.payload.severity || 'info' };
        },
        hideSnackbar(state) { state.snackbar.open = false; },
    },
});

export const { toggleSidebar, setSidebarOpen, showSnackbar, hideSnackbar } = uiSlice.actions;
export default uiSlice.reducer;
