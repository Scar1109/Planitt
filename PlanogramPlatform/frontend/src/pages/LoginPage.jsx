import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const validateForm = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return "Email is required";
        if (!emailRegex.test(email)) return "Please enter a valid email address";
        if (!password) return "Password is required";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#17A2B8]/5 p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden max-w-5xl w-full flex min-h-[600px]">
                {/* Left Side - Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
                    <div className="mb-10">
                        <img
                            src="/logo.png"
                            alt="Planitt"
                            className="h-10 w-auto mb-6 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => navigate('/')}
                        />
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hello Again!</h1>
                        <p className="text-gray-500">Welcome back you've been missed!</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <Input
                                label="Email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter username"
                                className="bg-gray-50 border-transparent focus:bg-white transition-all"
                            />
                            <Input
                                label="Password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="bg-gray-50 border-transparent focus:bg-white transition-all"
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center justify-end">
                            <button type="button" className="text-sm font-medium text-gray-500 hover:text-[#17A2B8]">
                                Recovery Password
                            </button>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full py-4 text-lg font-semibold shadow-lg shadow-[#1B4F72]/20 hover:shadow-[#1B4F72]/30 transition-all"
                            disabled={loading}
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        Not a member? {' '}
                        <button onClick={() => navigate('/signup')} className="font-semibold text-[#17A2B8] hover:text-[#1B4F72]">
                            Register now
                        </button>
                    </div>
                </div>

                {/* Right Side - Image */}
                <div className="hidden md:block w-1/2 p-4 bg-[#17A2B8]/5">
                    <div className="h-full w-full rounded-[1.5rem] overflow-hidden relative group">
                        <img
                            src="/login-bg.png"
                            alt="Login Illustration"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1B4F72]/40 to-transparent mix-blend-overlay"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
