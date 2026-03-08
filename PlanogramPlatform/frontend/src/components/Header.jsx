import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaSignOutAlt, FaBell } from 'react-icons/fa';

const Header = () => {
    const { user, logout } = useAuth();

    return (
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-end px-8 z-10 sticky top-0">
            <div className="flex items-center space-x-6">
                <button className="text-slate-400 hover:text-slate-600 relative transition-colors">
                    <FaBell className="h-5 w-5" />
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="flex items-center space-x-4 border-l pl-6 border-slate-100">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-slate-800">{user?.fullName}</p>
                        <p className="text-xs text-slate-500 capitalize">{user?.role} • {user?.storeName}</p>
                    </div>
                    <div className="h-10 w-10 bg-[#17A2B8]/10 rounded-full flex items-center justify-center text-[#1B4F72]">
                        <FaUserCircle className="h-6 w-6" />
                    </div>

                    <button
                        onClick={logout}
                        className="ml-2 p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-50"
                        title="Logout"
                    >
                        <FaSignOutAlt className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
