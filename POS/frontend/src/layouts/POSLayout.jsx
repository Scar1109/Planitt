import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/cashier', label: 'Cashier' },
    { path: '/orders/suspended', label: 'Suspended Bills' },
    { path: '/returns-voids', label: 'Returns & Voids' },
    { path: '/inventory', label: 'Inventory' },
    { path: '/products', label: 'Products' },
    { path: '/purchase-orders', label: 'Purchase Orders' },
    { path: '/reports', label: 'Reports' },
    { path: '/settings', label: 'Settings' },
];

export default function POSLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    async function onLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <div className="flex min-h-screen bg-surface text-ink">
            <aside className="w-72 border-r border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
                    <img src="/logo.png" alt="Planitt" className="h-11 w-auto" />
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Planitt</p>
                        <h1 className="text-lg font-bold text-brand-600">POS Terminal</h1>
                    </div>
                </div>
                <nav className="space-y-1 px-3 py-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                                isActive ? 'bg-brand-600 text-white shadow-panel' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Store POS</p>
                            <p className="text-sm font-semibold text-slate-800">{user?.fullName} ({user?.role})</p>
                        </div>
                        <button
                            type="button"
                            onClick={onLogout}
                            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                        >
                            Logout
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
