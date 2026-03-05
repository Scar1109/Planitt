import { useState } from 'react';
import PlanittLogo from '../assets/favicon.png';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import {
    LogOut,
    LayoutDashboard,
    ShoppingCart,
    Package,
    Settings,
    FileText,
    ArrowLeftRight,
    Clock,
    Box,
    MonitorSmartphone,
    Users,
    ChevronLeft,
    ChevronRight,
    BarChart2,
    CornerUpLeft
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { cn } from '../lib/utils';

export default function POSLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    async function onLogout() {
        await logout();
        navigate('/login');
    }

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/cashier', label: 'Cashier', icon: MonitorSmartphone },
        { path: '/orders/suspended', label: 'Suspended Bills', icon: Clock },
        { path: '/returns-voids', label: 'Returns & Voids', icon: CornerUpLeft },
        { path: '/inventory', label: 'Inventory', icon: Package },
        { path: '/products', label: 'Products', icon: Box },
        { path: '/orders', label: 'Purchase Orders', icon: ShoppingCart },
        { path: '/customers', label: 'Loyalty Members', icon: Users },
        { path: '/reports', label: 'Reports', icon: BarChart2 },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
                <aside
                    className={cn(
                        "relative flex flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-300 ease-in-out z-20",
                        isCollapsed ? "w-20" : "w-64"
                    )}
                >
                    <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-4 relative">
                        <img src={PlanittLogo} alt="Planitt Logo" className="h-8 w-8 object-contain shrink-0 drop-shadow-sm" />
                        {!isCollapsed && (
                            <div className="ml-3 flex flex-col overflow-hidden">
                                <span className="truncate text-xs font-bold uppercase tracking-wider text-slate-500">Planitt</span>
                                <span className="truncate text-sm font-semibold text-slate-900">POS Terminal</span>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -right-3 top-5 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900 z-30 hidden md:flex"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                        >
                            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 md:py-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            .scrollbar-hide::-webkit-scrollbar { display: none; }
                        `}} />
                        <nav className="space-y-1.5 md:space-y-2.5 px-3 md:px-4">
                            {navItems.map((item) => {
                                const navLinkContent = (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            "group flex items-center rounded-lg px-3 py-3 md:px-4 md:py-4 text-sm md:text-base font-medium transition-all active:scale-[0.98]",
                                            location.pathname === item.path
                                                ? "bg-indigo-50 text-indigo-700 font-bold"
                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                        )}
                                    >
                                        <item.icon className={cn("shrink-0", isCollapsed ? "h-6 w-6 mx-auto" : "h-5 w-5 mr-3 md:h-6 md:w-6 md:mr-4")} />
                                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                                    </NavLink>
                                );

                                if (isCollapsed) {
                                    return (
                                        <Tooltip key={item.path} delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                {navLinkContent}
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="font-medium z-50">
                                                {item.label}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }
                                return navLinkContent;
                            })}
                        </nav>
                    </div>

                    <div className="mt-auto border-t border-slate-200 p-4">
                        {isCollapsed ? (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={onLogout}>
                                        <LogOut className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="font-medium text-red-600 z-50">
                                    Logout
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col overflow-hidden text-sm md:text-base">
                                    <span className="truncate font-bold text-slate-900">{user?.fullName || "Cashier"}</span>
                                    <span className="truncate text-xs md:text-sm text-slate-500 capitalize font-medium">{user?.role || "Staff"}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 md:h-12 md:w-12 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={onLogout}>
                                    <LogOut className="h-5 w-5 md:h-6 md:w-6" />
                                </Button>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex w-0 flex-1 flex-col overflow-hidden bg-slate-50">
                    <div className="relative flex-1 overflow-y-auto overflow-x-hidden min-w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}
