import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useAuth from '../hooks/useAuth';
import useApi from '../hooks/useApi';

const PermissionsContext = createContext({ isAdmin: true, can: () => true, permissions: [], role: '' });

export const PermissionsProvider = ({ children }) => {
    const { selectedCompanyId, isAuthenticated } = useAuth();
    const { get } = useApi();
    const [state, setState] = useState({ isAdmin: true, permissions: [], role: '', loaded: false });

    const load = useCallback(async () => {
        if (!selectedCompanyId || !isAuthenticated) return;
        try {
            const res = await get(`/${selectedCompanyId}/admin/my-permissions`);
            if (res?.data) {
                setState({
                    isAdmin: res.data.is_admin,
                    role: res.data.role,
                    permissions: res.data.permissions || [],
                    loaded: true,
                });
            }
        } catch {
            // If endpoint fails (e.g. first setup), default to full access
            setState({ isAdmin: true, permissions: [], role: 'Admin', loaded: true });
        }
    }, [selectedCompanyId, isAuthenticated, get]);

    useEffect(() => { load(); }, [load]);

    const can = useCallback((module, action) => {
        if (state.isAdmin) return true;
        return state.permissions.some(p => p.module === module && p.action === action);
    }, [state]);

    const canModule = useCallback((module) => {
        if (state.isAdmin) return true;
        return state.permissions.some(p => p.module === module);
    }, [state]);

    return (
        <PermissionsContext.Provider value={{ ...state, can, canModule }}>
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => useContext(PermissionsContext);
export default PermissionsContext;
