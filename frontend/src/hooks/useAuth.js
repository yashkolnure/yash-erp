import { useSelector, useDispatch } from 'react-redux';
import { logout, selectCompany } from '../store/authSlice';

const useAuth = () => {
    const dispatch = useDispatch();
    const { user, isAuthenticated, selectedCompanyId, loading, error } = useSelector((state) => state.auth);

    return {
        user,
        isAuthenticated,
        selectedCompanyId,
        loading,
        error,
        logout: () => dispatch(logout()),
        selectCompany: (companyId) => dispatch(selectCompany(companyId)),
    };
};

export default useAuth;
