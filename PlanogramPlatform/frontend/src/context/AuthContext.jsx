import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            try {
                const res = await api.get('/auth/me');
                setUser(res.data.data.user);
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        setUser(res.data.data.user);
        return res.data;
    };

    const signup = async (userData) => {
        const res = await api.post('/auth/signup', userData);
        setUser(res.data.data.user);
        return res.data;
    };

    const logout = async () => {
        await api.get('/auth/logout');
        setUser(null);
    };

    const value = {
        user,
        login,
        signup,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
