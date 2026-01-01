import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../Button';
import api from '../../services/api';
import { FaUser, FaLock, FaPhone, FaEnvelope, FaIdBadge, FaSave, FaSpinner } from 'react-icons/fa';

const ProfileSettings = () => {
    const { user, login } = useAuth(); // login is essentially setAuth
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess('');
        setError('');

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setError("New passwords do not match.");
            setLoading(false);
            return;
        }

        try {
            const payload = {};
            if (formData.fullName) payload.fullName = formData.fullName;
            if (formData.phone) payload.phone = formData.phone;

            if (formData.newPassword) {
                payload.currentPassword = formData.currentPassword;
                payload.newPassword = formData.newPassword;
            }

            const res = await api.put('/users/me', payload);

            setSuccess('Profile updated successfully!');
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FaUser className="text-indigo-600" /> My Profile
                </h1>
                <p className="text-slate-500 mt-1">Manage your personal information and security settings.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">Personal Details</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                    {success && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">{success}</div>}
                    {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Read Only Fields */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    readOnly
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 focus:outline-none cursor-not-allowed"
                                />
                                <FaEnvelope className="absolute left-3.5 top-3.5 text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Email cannot be changed.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={user?.role || ''}
                                    readOnly
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 capitalize focus:outline-none cursor-not-allowed"
                                />
                                <FaIdBadge className="absolute left-3.5 top-3.5 text-slate-400" />
                            </div>
                        </div>

                        {/* Editable Fields */}
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Your Name"
                                />
                                <FaUser className="absolute left-3.5 top-3.5 text-slate-400" />
                            </div>
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="+1 (555) 000-0000"
                                />
                                <FaPhone className="absolute left-3.5 top-3.5 text-slate-400" />
                            </div>
                        </div>

                        <div className="col-span-2 border-t border-slate-100 pt-6 mt-2">
                            <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <FaLock className="text-indigo-500" /> Security
                            </h4>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Password <span className="text-slate-400 font-normal">(Required to change password)</span></label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Enter current password"
                                        />
                                        <FaLock className="absolute left-3.5 top-3.5 text-slate-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                name="newPassword"
                                                value={formData.newPassword}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                                placeholder="Enter new password"
                                            />
                                            <FaLock className="absolute left-3.5 top-3.5 text-slate-400" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                                placeholder="Confirm new password"
                                            />
                                            <FaLock className="absolute left-3.5 top-3.5 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <Button type="submit" variant="primary" className="px-8 py-3 flex items-center gap-2" disabled={loading}>
                            <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettings;
