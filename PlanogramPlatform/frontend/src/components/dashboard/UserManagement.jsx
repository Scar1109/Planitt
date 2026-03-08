import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FaEdit, FaUserSlash, FaUserCheck, FaPlus, FaTimes, FaSpinner, FaBuilding, FaUserPlus } from 'react-icons/fa';
import Button from '../Button';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('store'); // 'store' or 'pending'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [stores, setStores] = useState([]); // For Admin dropdown

    // Form State
    const [editingUser, setEditingUser] = useState(null); // null = create mode
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: 'staff',
        password: '', // Only for creation
        store: '' // Store ID
    });
    const [error, setError] = useState('');

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        userId: null,
        userName: '',
        isActive: false
    });

    useEffect(() => {
        fetchUsers();
        if (currentUser?.role === 'admin') {
            fetchStores();
        }
    }, [activeTab]);

    const fetchStores = async () => {
        try {
            const res = await api.get('/stores');
            setStores(res.data.data.stores);
        } catch (err) {
            console.error("Failed to fetch stores", err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (activeTab === 'pending') {
                params.unassigned = true;
            }
            // For Admin viewing store users, we could add store filter, but defaults to all if no filter
            // Ideally Admin selects a store first, but for now showing all is fine for "Store Users" view if admin

            const res = await api.get('/users', { params });
            setUsers(res.data.data.users);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({
            fullName: '',
            email: '',
            role: 'staff',
            password: '',
            store: currentUser.role === 'admin' ? '' : currentUser.store?._id || ''
        });
        setIsModalOpen(true);
        setError('');
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            password: '',
            store: user.store?._id || ''
        });
        setIsModalOpen(true);
        setError('');
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            if (editingUser) {
                // Update
                const updateData = {
                    fullName: formData.fullName,
                    role: formData.role,
                    email: formData.email,
                    store: formData.store || null // Send null if empty string
                };
                await api.put(`/users/${editingUser._id}`, updateData);
            } else {
                // Create
                const createData = {
                    ...formData,
                    store: formData.store || null
                };
                await api.post('/users', createData);
            }
            await fetchUsers();
            handleCloseModal();
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = (user) => {
        setConfirmModal({
            isOpen: true,
            userId: user._id,
            userName: user.fullName,
            isActive: user.isActive
        });
    };

    const confirmToggleStatus = async () => {
        try {
            await api.patch(`/users/${confirmModal.userId}/status`);
            fetchUsers();
            setConfirmModal({ isOpen: false, userId: null, userName: '', isActive: false });
        } catch (err) {
            alert('Failed to change status');
        }
    };

    const handleAssignStore = async (user) => {
        if (!currentUser.store) {
            alert("You are not assigned to a store, so you cannot claim users.");
            return;
        }
        const myStoreName = currentUser.store.name || 'your store';
        if (!window.confirm(`Assign ${user.fullName} to ${myStoreName}?`)) return;
        try {
            await api.put(`/users/${user._id}`, {
                store: currentUser.store._id, // Assign by ID!
                isActive: true // Activate upon assignment
            });
            fetchUsers(); // Refresh list (user should disappear from pending)
        } catch (err) {
            alert('Failed to assign user');
        }
    };

    // Access Control for View
    if (currentUser?.role === 'staff') {
        return <div className="p-8 text-center text-slate-500">You do not have permission to view this page.</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                    <p className="text-slate-500 text-sm">Manage access for {currentUser?.store?.name || 'All Stores'}</p>
                </div>
                {activeTab === 'store' && (
                    <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2">
                        <FaPlus /> Add New User
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-slate-200">
                <button
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'store' ? 'text-[#1B4F72] border-b-2 border-[#17A2B8]' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('store')}
                >
                    Store Users
                </button>
                <button
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'pending' ? 'text-[#1B4F72] border-b-2 border-[#17A2B8]' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Approvals
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                {currentUser.role === 'admin' && activeTab === 'store' && <th className="px-6 py-4">Store</th>}
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center">
                                        <FaSpinner className="animate-spin h-6 w-6 text-[#17A2B8] mx-auto" />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                        {activeTab === 'store' ? 'No users found.' : 'No pending approvals.'}
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">{user.fullName}</td>
                                        <td className="px-6 py-4">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                                                    user.role === 'owner' ? 'bg-slate-50 text-[#164060]' :
                                                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        {currentUser.role === 'admin' && activeTab === 'store' && (
                                            <td className="px-6 py-4">{user.store?.name || '-'}</td>
                                        )}
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {user.isActive ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {activeTab === 'pending' ? (
                                                currentUser.role !== 'staff' && (
                                                    <Button
                                                        variant="outline"
                                                        className="text-xs py-1"
                                                        onClick={() => currentUser.role === 'admin' ? openEditModal(user) : handleAssignStore(user)}
                                                    >
                                                        {currentUser.role === 'admin' ? 'Assign' : <><FaUserPlus className="mr-1 inline" /> Claim</>}
                                                    </Button>
                                                )
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="text-[#1B4F72] hover:text-[#1B4F72] p-1 rounded hover:bg-[#17A2B8]/10 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(user)}
                                                        className={`${user.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-800 hover:bg-green-50'} p-1 rounded transition-colors`}
                                                        title={user.isActive ? 'Suspend' : 'Activate'}
                                                    >
                                                        {user.isActive ? <FaUserSlash /> : <FaUserCheck />}
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] outline-none transition-all"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] outline-none transition-all"
                                    placeholder="john@example.com"
                                />
                            </div>

                            {/* Store Selection - Only visible/editable for Admin */}
                            {currentUser.role === 'admin' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign Store</label>
                                    <div className="relative">
                                        <select
                                            name="store"
                                            value={formData.store}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] outline-none transition-all appearance-none"
                                        >
                                            <option value="">-- Unassigned --</option>
                                            {stores.map(store => (
                                                <option key={store._id} value={store._id}>
                                                    {store.name}
                                                </option>
                                            ))}
                                        </select>
                                        <FaBuilding className="absolute left-3.5 top-3 text-slate-400" />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Select logic store assignment.</p>
                                </div>
                            )}

                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required={!editingUser}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#17A2B8] focus:border-[#17A2B8] outline-none transition-all"
                                >
                                    <option value="staff">Staff</option>
                                    <option value="manager">Manager</option>
                                    {/* Allow Owner/Admin to create Owners */}
                                    {['owner', 'admin'].includes(currentUser.role) && (
                                        <option value="owner">Store Owner</option>
                                    )}
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={handleCloseModal}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${confirmModal.isActive ? 'bg-red-100' : 'bg-green-100'}`}>
                                {confirmModal.isActive ? <FaUserSlash className="h-6 w-6 text-red-600" /> : <FaUserCheck className="h-6 w-6 text-green-600" />}
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-2">
                                {confirmModal.isActive ? 'Suspend User?' : 'Activate User?'}
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Are you sure you want to {confirmModal.isActive ? 'suspend' : 'activate'} <strong>{confirmModal.userName}</strong>?
                                {confirmModal.isActive && ' They will no longer be able to log in.'}
                            </p>
                            <div className="flex justify-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmModal({ isOpen: false, userId: null, userName: '', isActive: false })}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant={confirmModal.isActive ? "danger" : "primary"}
                                    onClick={confirmToggleStatus}
                                    className={confirmModal.isActive ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                                >
                                    {confirmModal.isActive ? 'Suspend User' : 'Activate User'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
