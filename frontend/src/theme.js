import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1565C0', light: '#1976D2', dark: '#0D47A1', contrastText: '#fff' },
        secondary: { main: '#E91E63', light: '#F06292', dark: '#C2185B', contrastText: '#fff' },
        success: { main: '#2E7D32', light: '#43A047', dark: '#1B5E20' },
        warning: { main: '#E65100', light: '#FB8C00', dark: '#BF360C' },
        error: { main: '#C62828', light: '#E53935', dark: '#B71C1C' },
        info: { main: '#0277BD', light: '#0288D1', dark: '#01579B' },
        background: { default: '#F0F2F5', paper: '#FFFFFF' },
        text: { primary: '#1A2332', secondary: '#5F6B7C' },
        divider: '#E8ECF0',
        sidebar: { bg: '#1A2332', active: '#243447', hover: '#1E2A3A', text: '#B8C5D6', activeText: '#FFFFFF', icon: '#7B9EC7' },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
        h4: { fontWeight: 700, fontSize: '1.5rem' },
        h5: { fontWeight: 700, fontSize: '1.25rem' },
        h6: { fontWeight: 600, fontSize: '1rem' },
        subtitle1: { fontWeight: 600, fontSize: '0.875rem' },
        body2: { fontSize: '0.813rem' },
        caption: { fontSize: '0.75rem' },
    },
    shape: { borderRadius: 8 },
    shadows: [
        'none',
        '0px 1px 3px rgba(0,0,0,0.08)',
        '0px 2px 6px rgba(0,0,0,0.10)',
        '0px 4px 12px rgba(0,0,0,0.10)',
        '0px 6px 16px rgba(0,0,0,0.12)',
        ...Array(20).fill('0px 8px 24px rgba(0,0,0,0.12)'),
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 600, borderRadius: 6, fontSize: '0.813rem' },
                containedPrimary: { boxShadow: '0 2px 6px rgba(21,101,192,0.35)', '&:hover': { boxShadow: '0 4px 12px rgba(21,101,192,0.45)' } },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: { borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #E8ECF0' },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: { '& .MuiTableCell-head': { backgroundColor: '#F7F9FC', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5F6B7C', borderBottom: '2px solid #E8ECF0' } },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: { '&:hover': { backgroundColor: '#F7F9FC' }, '&:last-child td': { borderBottom: 0 } },
            },
        },
        MuiTableCell: {
            styleOverrides: { root: { fontSize: '0.813rem', padding: '10px 16px', borderColor: '#F0F2F5' } },
        },
        MuiChip: {
            styleOverrides: { root: { fontWeight: 600, fontSize: '0.7rem', height: 22, borderRadius: 4 } },
        },
        MuiTextField: {
            defaultProps: { size: 'small' },
            styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 6, fontSize: '0.813rem' } } },
        },
        MuiInputLabel: {
            styleOverrides: { root: { fontSize: '0.813rem' } },
        },
        MuiPaper: {
            styleOverrides: { root: { borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } },
        },
        MuiDialog: {
            styleOverrides: { paper: { borderRadius: 12 } },
        },
        MuiDialogTitle: {
            styleOverrides: { root: { fontWeight: 700, fontSize: '1rem', padding: '16px 20px', borderBottom: '1px solid #E8ECF0' } },
        },
        MuiLinearProgress: {
            styleOverrides: { root: { borderRadius: 4, height: 6 } },
        },
    },
});

export default theme;
