import { useEffect, useRef, useCallback } from 'react';

export default function useUnsavedChanges(isDirty) {
    const isDirtyRef = useRef(isDirty);
    useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

    // Warn on browser tab close / navigation away
    useEffect(() => {
        const handler = (e) => {
            if (!isDirtyRef.current) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    // Returns a function to check and confirm before closing dialogs/drawers
    const confirmClose = useCallback((onClose) => {
        if (!isDirtyRef.current) { onClose(); return; }
        if (window.confirm('You have unsaved changes. Leave without saving?')) {
            onClose();
        }
    }, []);

    return { confirmClose };
}
