import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUserTag } from 'react-icons/fa';
import Button from '../components/Button';
import Input from '../components/Input';

const SignupPage = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'staff' // Default role
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

        if (!formData.fullName.trim()) return "Full Name is required";
        if (!emailRegex.test(formData.email)) return "Please enter a valid email address";
        if (!passwordRegex.test(formData.password)) return "Password must be at least 8 chars (1 letter, 1 number)";

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
            await signup(formData);
            // Redirect to login with success message
            // Ideally, we could pass state to the login page to show an alert
            alert("Account created! Please contact your Store Owner or Admin to approve your access.");
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to sign up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-indigo-50/50 p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden max-w-5xl w-full flex min-h-[600px]">

                {/* Left Side - Image */}
                <div className="hidden lg:block w-1/2 p-4 bg-indigo-50">
                    <div className="h-full w-full rounded-[1.5rem] overflow-hidden relative group">
                        <img
                            src="/signup-bg-v2.png"
                            alt="Retail Illustration"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 to-transparent p-10 flex flex-col justify-end text-white">
                            <h2 className="text-3xl font-bold mb-2">Join the Revolution</h2>
                            <p className="opacity-90">Experience the future of retail management with AI-driven planograms.</p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-1/2 p-8 md:p-12 flex flex-col justify-center">

                    <div className="mb-8 text-center md:text-left">
                        <img
                            src="/logo.png"
                            alt="Planitt"
                            className="h-10 w-auto mb-6 mx-auto md:mx-0 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => navigate('/')}
                        />
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                        <p className="text-gray-500">Join your store team</p>
                    </div>

                    <div className="max-w-md mx-auto w-full">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Full Name"
                                type="text"
                                name="fullName"
                                required
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="bg-gray-50 border-transparent focus:bg-white"
                            />

                            <Input
                                label="Email Address"
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="bg-gray-50 border-transparent focus:bg-white"
                            />

                            <div className="relative">
                                <Input
                                    label="Password"
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="bg-gray-50 border-transparent focus:bg-white"
                                />
                                <p className="text-xs text-gray-400 mt-1">Min 8 chars, 1 letter, 1 number</p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <div className="relative">
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none appearance-none transition-all cursor-pointer"
                                    >
                                        <option value="staff">Staff Member</option>
                                        <option value="manager">Store Manager</option>
                                    </select>
                                    <FaUserTag className="absolute left-3.5 top-3.5 text-gray-400" />
                                    <div className="absolute right-3 top-4 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">Select your role in the store.</p>
                            </div>

                            {error && (
                                <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg text-center border border-red-100">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full py-4 text-lg font-semibold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 mt-6 cursor-pointer"
                                disabled={loading}
                            >
                                {loading ? 'creating Account...' : 'Sign Up'}
                            </Button>
                        </form>

                        <div className="mt-8 text-center text-sm text-gray-500">
                            Already have an account? {' '}
                            <button
                                onClick={() => navigate('/login')}
                                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer transition-colors"
                            >
                                Sign in
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
