import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaHome, FaBox, FaChartLine, FaCog, FaStore, FaChevronDown, FaChevronRight, FaRobot } from 'react-icons/fa';
import { TbTrendingUp } from 'react-icons/tb';
import classNames from 'classnames';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [expandedMenus, setExpandedMenus] = useState({});

    const toggleMenu = (name) => {
        setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const settingsSubItems = [];
    // Profile is available for everyone
    settingsSubItems.push({ name: 'My Profile', path: '/dashboard/settings/profile' });

    if (user && ['owner', 'admin'].includes(user.role)) {
        settingsSubItems.push({ name: 'Store Settings', path: '/dashboard/settings/store' });
        settingsSubItems.push({ name: 'User Management', path: '/dashboard/settings/users' });
    } else if (user && user.role === 'manager') {
        settingsSubItems.push({ name: 'User Management', path: '/dashboard/settings/users' });
    }

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: FaHome, end: true },
        {
            name: 'Planogram Optimization',
            path: '/dashboard/optimization',
            icon: FaBox,
            subItems: [
                { name: 'Optimization', path: '/dashboard/optimization', end: true },
                { name: 'Shelves', path: '/dashboard/optimization/shelves' },
                { name: 'Products', path: '/dashboard/optimization/products' },
                { name: 'Constraints', path: '/dashboard/optimization/constraints' },
                { name: 'Runs & Evaluation', path: '/dashboard/optimization/runs' },
            ]
        },
        {
            name: 'Promotional Forecasting',
            path: '/dashboard/promotional-forecasting',
            icon: FaChartLine,
            subItems: [
                { name: 'AI Promotion', path: '/dashboard/planograms/ai-promotion' },
                { name: 'Forecast', path: '/dashboard/promotional-forecasting/forecast' },
                { name: 'Recommendations', path: '/dashboard/promotional-forecasting/suggested' },
            ]
        },
        {
            name: 'Compliance ',
            path: '/dashboard/compliance',
            icon: FaRobot,
            subItems: [
                { name: 'System Forensics', path: '/dashboard/compliance/analysis' },
                { name: 'Compliance Intelligence', path: '/dashboard/compliance', end: true },
                { name: 'Compliance History', path: '/dashboard/compliance/history' }
            ]
        },
        { name: 'Analytics', path: '/dashboard/analytics', icon: FaChartLine },
        { name: 'Store Info', path: '/dashboard/store', icon: FaStore },
        {
            name: 'Settings',
            path: '/dashboard/settings',
            icon: FaCog,
            subItems: settingsSubItems.length > 0 ? settingsSubItems : undefined
        },
        {
            name: 'Inventory',
            path: '/dashboard/inventory',
            icon: TbTrendingUp,
            subItems: [
                { name: 'Forecasting', path: '/dashboard/forecasting' },
                { name: 'Wastage Prevention', path: '/dashboard/inventory/wastage' }
            ]
        },
    ];

    const isSubItemActive = (subItems) => {
        return subItems.some(item => location.pathname === item.path);
    };

    return (
        <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col transition-all duration-300">
            <div className="h-24 flex items-center justify-center border-b border-slate-100">
                <img src="/logo.png" alt="Planitt Logo" className="h-14 w-auto hover:opacity-80 transition-opacity cursor-pointer" onClick={() => navigate('/')} />
            </div>

            <nav className="flex-1 overflow-y-auto py-6 space-y-1">
                {navItems.map((item) => {
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isExpanded = expandedMenus[item.name];
                    const activeParent = hasSubItems && isSubItemActive(item.subItems);

                    return (
                        <div key={item.name}>
                            {hasSubItems ? (
                                <button
                                    onClick={() => toggleMenu(item.name)}
                                    className={classNames(
                                        'w-full flex items-center justify-between px-4 lg:px-6 py-3.5 text-sm font-medium transition-all duration-200 group relative',
                                        {
                                            'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600': activeParent,
                                            'text-slate-500 hover:bg-slate-50 hover:text-slate-700': !activeParent
                                        }
                                    )}
                                >
                                    <div className="flex items-center">
                                        <item.icon className={classNames("h-5 w-5 transition-colors", {
                                            "text-indigo-600": activeParent,
                                            "text-slate-400 group-hover:text-slate-600": !activeParent
                                        })} />
                                        <span className="ml-3 hidden lg:block">{item.name}</span>
                                    </div>
                                    <div className="hidden lg:block">
                                        {isExpanded ? <FaChevronDown className="h-3 w-3" /> : <FaChevronRight className="h-3 w-3" />}
                                    </div>
                                </button>
                            ) : (
                                <NavLink
                                    to={item.path}
                                    end={item.end}
                                    className={({ isActive }) =>
                                        classNames(
                                            'flex items-center px-4 lg:px-6 py-3.5 text-sm font-medium transition-all duration-200 group relative',
                                            {
                                                'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600': isActive,
                                                'text-slate-500 hover:bg-slate-50 hover:text-slate-700': !isActive
                                            }
                                        )
                                    }
                                >
                                    <item.icon className={classNames("h-5 w-5 transition-colors", {
                                        "text-indigo-600": (({ isActive }) => isActive),
                                        "text-slate-400 group-hover:text-slate-600": (({ isActive }) => !isActive)
                                    })} />
                                    <span className="ml-3 hidden lg:block">{item.name}</span>
                                </NavLink>
                            )}

                            {/* Render Sub Items */}
                            {hasSubItems && isExpanded && (
                                <div className="bg-slate-50 py-1 space-y-1">
                                    {item.subItems.map(sub => (
                                        <NavLink
                                            key={sub.name}
                                            to={sub.path}
                                            end={sub.end}
                                            className={({ isActive }) =>
                                                classNames(
                                                    'flex items-center pl-14 pr-6 py-2 text-sm font-medium transition-colors duration-200',
                                                    {
                                                        'text-indigo-600 font-semibold': isActive,
                                                        'text-slate-500 hover:text-slate-700': !isActive
                                                    }
                                                )
                                            }
                                        >
                                            <span className="hidden lg:block">{sub.name}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
};

export default Sidebar;
