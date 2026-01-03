import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DashboardHome from '../components/dashboard/DashboardHome';
import Planograms from '../components/dashboard/Planograms';
import Analytics from '../components/dashboard/Analytics';
import StoreInfo from '../components/dashboard/StoreInfo';
import Settings from '../components/dashboard/Settings';
import UserManagement from '../components/dashboard/UserManagement';
import StoreSettings from '../components/dashboard/StoreSettings';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import AiPromotion from '../components/dashboard/AiPromotion';

const DashboardLayout = ({ children }) => {
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 lg:p-6 relative">
                    {/* Background blob for style */}
                    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 to-transparent -z-10 pointer-events-none"></div>
                    {children}
                </main>
            </div>
        </div>
    );
};

const UnassignedView = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
            <p className="text-slate-500">
                Currently you are not assigned to any store. Please check back later or contact your administrator.
            </p>
        </div>
    </div>
);

const Dashboard = () => {
    const { user } = useAuth();

    // Check if user is unassigned (and not admin)
    const isUnassigned = user && user.role !== 'admin' && !user.store;

    if (isUnassigned) {
        return (
            <DashboardLayout>
                <Routes>
                    <Route path="/settings/profile" element={<ProfileSettings />} />
                    <Route path="*" element={<UnassignedView />} />
                </Routes>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Routes>
                <Route path="/" element={<DashboardHome />} />
                <Route path="/planograms" element={<Planograms />} />
                <Route path="/planograms/*" element={<Planograms />} /> {/* Catch sub-routes if mostly same component or specific sub-routes defined above if distinct */}
                <Route path="/planograms/sub1" element={<div className="p-8"><h2 className="text-2xl font-bold mb-4">Planogram Sub Item 1</h2><p>Content for Sub Item 1</p></div>} />
                <Route path="/planograms/sub2" element={<div className="p-8"><h2 className="text-2xl font-bold mb-4">Planogram Sub Item 2</h2><p>Content for Sub Item 2</p></div>} />

                <Route path="/planograms/sub3" element={<div className="p-8"><h2 className="text-2xl font-bold mb-4">Planogram Sub Item 3</h2><p>Content for Sub Item 3</p></div>} />
                <Route path="/planograms/ai-promotion" element={<AiPromotion />} />

                <Route path="/analytics" element={<Analytics />} />
                <Route path="/store" element={<StoreInfo />} />

                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/users" element={<UserManagement />} />
                <Route path="/settings/store" element={<StoreSettings />} />
                <Route path="/settings/profile" element={<ProfileSettings />} />
            </Routes>
        </DashboardLayout>
    );
};

export default Dashboard;
