import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../Button';
import { FaStore, FaMapMarkerAlt, FaPhone, FaBuilding, FaSave, FaSpinner, FaSearch } from 'react-icons/fa';

const StoreSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [storeId, setStoreId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        location: {
            city: '',
            latitude: '',
            longitude: ''
        }
    });

    // Location Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);



    useEffect(() => {
        fetchStoreDetails();

        // Click outside handler
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounce Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length > 2) {
                searchLocation(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const searchLocation = async (query) => {
        setSearching(true);
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            setSearchResults(response.data);
            setShowDropdown(true);
        } catch (error) {
            console.error("Location search failed", error);
        } finally {
            setSearching(false);
        }
    };

    const handleLocationSelect = (place) => {
        setSearchQuery(''); // Clear search or could set to place name
        setShowDropdown(false);

        setFormData(prev => ({
            ...prev,
            location: {
                city: place.display_name,
                latitude: parseFloat(place.lat),
                longitude: parseFloat(place.lon)
            }
        }));
    };

    const fetchStoreDetails = async () => {
        try {
            const res = await api.get('/stores/my-store');
            const data = res.data.data.store;
            setStoreId(data._id);
            setFormData({
                name: data.name || '',
                address: data.address || '',
                phone: data.phone || '',
                location: {
                    city: data.location?.city || '',
                    latitude: data.location?.latitude || '',
                    longitude: data.location?.longitude || ''
                }
            });
        } catch (err) {
            console.error(err);
            setError("Could not load store details.");
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess('');
        setError('');

        try {
            const payload = {
                name: formData.name,
                address: formData.address,
                phone: formData.phone,
                location: {
                    city: formData.location.city,
                    latitude: parseFloat(formData.location.latitude) || 0,
                    longitude: parseFloat(formData.location.longitude) || 0
                }
            };

            await api.put(`/stores/${storeId}`, payload);
            setSuccess('Store details updated successfully!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update store settings');
        } finally {
            setLoading(false);
        }
    };

    if (!['admin', 'owner'].includes(user?.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <FaStore className="h-12 w-12 mb-4 opacity-50" />
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p>Only Store Owners or Admins can manage store settings.</p>
            </div>
        );
    }

    if (fetching) {
        return <div className="p-12 text-center"><FaSpinner className="animate-spin h-8 w-8 text-indigo-500 mx-auto" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FaStore className="text-indigo-600" /> Store Settings
                </h1>
                <p className="text-slate-500 mt-1">Manage your store's public profile and location details.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">General Information</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                    {success && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">{success}</div>}
                    {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Store Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Planitt Flagship Store"
                                />
                                <FaStore className="absolute left-3.5 top-3.5 text-slate-400" />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Store Address</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="123 Retail Ave, Commerce City"
                                />
                                <FaBuilding className="absolute left-3.5 top-3.5 text-slate-400" />
                            </div>
                        </div>

                        <div>
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
                                <FaMapMarkerAlt className="text-indigo-500" /> Location Details
                            </h4>

                            {/* Inlined Location Search */}
                            <div className="relative mb-4" ref={dropdownRef}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Search City / Location (Auto-fills Coordinates)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search for city or address..."
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    />
                                    <FaSearch className="absolute left-3.5 top-3 text-slate-400" />
                                    {searching && (
                                        <FaSpinner className="absolute right-3.5 top-3 text-indigo-500 animate-spin" />
                                    )}
                                </div>

                                {showDropdown && searchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {searchResults.map((place) => (
                                            <div
                                                key={place.place_id}
                                                onClick={() => handleLocationSelect(place)}
                                                className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-start gap-2 border-b border-slate-50 last:border-0"
                                            >
                                                <FaMapMarkerAlt className="mt-1 text-slate-400 flex-shrink-0" />
                                                <span className="text-sm text-slate-700">{place.display_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">City (Selected)</label>
                            <input
                                type="text"
                                value={formData.location.city}
                                readOnly
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Latitude</label>
                            <input
                                type="text"
                                value={formData.location.latitude}
                                readOnly
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Longitude</label>
                            <input
                                type="text"
                                value={formData.location.longitude}
                                readOnly
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <Button type="submit" variant="primary" className="px-8 py-3 flex items-center gap-2" disabled={loading}>
                            <FaSave /> {loading ? 'Saving...' : 'Save Details'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StoreSettings;
