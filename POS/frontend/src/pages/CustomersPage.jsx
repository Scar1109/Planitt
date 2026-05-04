import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Users, Plus, UserPlus, Phone, Search, RefreshCw, Mail } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../components/ui/dialog";

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filtering, setFiltering] = useState(false);

    // New Customer Dialog State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    async function fetchCustomers(query = '') {
        try {
            if (query) setFiltering(true);
            else setLoading(true);

            let endpoint = '/customers?limit=50';
            if (query.trim().length >= 3) {
                endpoint = `/customers/search?query=${encodeURIComponent(query)}`;
            } else if (query.trim().length > 0 && query.trim().length < 3) {
                // Ignore searches less than 3 chars unless empty
                setFiltering(false);
                return;
            }

            const { data } = await api.get(endpoint);
            setCustomers(data.data || []);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setLoading(false);
            setFiltering(false);
        }
    }

    useEffect(() => {
        // Initial load
        fetchCustomers();
    }, []);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchCustomers(searchQuery);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    async function handleAddCustomer(e) {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);

        try {
            await api.post('/customers', newCustomer);
            setIsAddOpen(false);
            setNewCustomer({ name: '', phone: '', email: '' });
            fetchCustomers(); // Refresh the list
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create customer');
        } finally {
            setFormLoading(false);
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Users className="h-6 w-6 text-indigo-600" />
                        Loyalty Members
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Manage customers, view loyalty points, and register new members.</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                            <Plus className="mr-2 h-4 w-4" />
                            Register Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-indigo-600" />
                                Register New Member
                            </DialogTitle>
                            <DialogDescription>
                                Add a new customer to the loyalty program. Phone and Name are required.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddCustomer} className="space-y-4 py-4">
                            {formError && (
                                <div className="text-sm font-medium text-rose-600 bg-rose-50 p-3 rounded-md border border-rose-100">
                                    {formError}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Full Name *</label>
                                <Input
                                    required
                                    placeholder="e.g. John Doe"
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Phone Number *</label>
                                <Input
                                    required
                                    placeholder="e.g. 0712345678"
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Email Address (Optional)</label>
                                <Input
                                    type="email"
                                    placeholder="e.g. john@example.com"
                                    value={newCustomer.email}
                                    onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2" disabled={formLoading}>
                                {formLoading ? 'Registering...' : 'Complete Registration'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Find by name or phone number..."
                            className="pl-9 bg-white border-slate-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {filtering && <RefreshCw className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400 animate-spin" />}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Customer Details</th>
                                    <th className="px-6 py-4">Contact Info</th>
                                    <th className="px-6 py-4">Loyalty Points</th>
                                    <th className="px-6 py-4">Joined Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && !filtering ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                                            Loading members...
                                        </td>
                                    </tr>
                                ) : customers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                            <p className="text-base font-medium text-slate-600">No customers found</p>
                                            <p className="text-sm mt-1">Try a different search or register a new member.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map(customer => (
                                        <tr key={customer._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                        <span className="font-bold text-indigo-700">
                                                            {customer.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{customer.name}</p>
                                                        <p className="text-xs text-slate-500 font-mono">{customer._id.substring(customer._id.length - 6)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 space-y-1">
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <Phone className="h-3 w-3 text-slate-400" />
                                                    {customer.phone}
                                                </div>
                                                {customer.email && (
                                                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                        <Mail className="h-3 w-3 text-slate-400" />
                                                        {customer.email}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                    {customer.loyaltyPoints} pts
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {formatDate(customer.createdAt)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
