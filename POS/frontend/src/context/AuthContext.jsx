import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as loginApi, logout as logoutApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function bootstrap() {
            const token = localStorage.getItem('pos_token');
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const data = await getMe();
                setUser(data.user);
            } catch (error) {
                localStorage.removeItem('pos_token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        }
        bootstrap();
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        async login(email, password) {
            const data = await loginApi({ email, password });
            setUser(data.user);
            return data;
        },
        async logout() {
            await logoutApi();
            setUser(null);
        },
    }), [user, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
