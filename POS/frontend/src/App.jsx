import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import POSLayout from './layouts/POSLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CashierPage from './pages/CashierPage';
import SuspendedOrdersPage from './pages/SuspendedOrdersPage';
import ReturnsVoidsPage from './pages/ReturnsVoidsPage';
import InventoryPage from './pages/InventoryPage';
import ProductsPage from './pages/ProductsPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="p-8">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function RoleRoute({ allowedRoles, children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/*"
                element={(
                    <ProtectedRoute>
                        <POSLayout />
                    </ProtectedRoute>
                )}
            >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="cashier" element={<CashierPage />} />
                <Route path="orders/suspended" element={<SuspendedOrdersPage />} />
                <Route path="returns-voids" element={<ReturnsVoidsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="products" element={(
                    <RoleRoute allowedRoles={['admin', 'owner', 'manager']}>
                        <ProductsPage />
                    </RoleRoute>
                )} />
                <Route path="purchase-orders" element={(
                    <RoleRoute allowedRoles={['admin', 'owner', 'manager']}>
                        <PurchaseOrdersPage />
                    </RoleRoute>
                )} />
                <Route path="reports" element={(
                    <RoleRoute allowedRoles={['admin', 'owner', 'manager']}>
                        <ReportsPage />
                    </RoleRoute>
                )} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}
