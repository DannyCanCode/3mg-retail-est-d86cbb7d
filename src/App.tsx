import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import Login from '@/pages/Login';
import Index from '@/pages/Index';
import Estimates from '@/pages/Estimates';
import Pricing from '@/pages/Pricing';
import AccountingReport from '@/pages/AccountingReport';
import Users from '@/pages/Users';
import Onboarding from '@/pages/Onboarding';
import ManagerDashboard from '@/pages/ManagerDashboard';
import SalesRepDashboard from '@/pages/SalesRepDashboard';
import NotFound from '@/pages/NotFound';
import { RoleGuard } from '@/components/RoleGuard';
import Territories from '@/pages/Territories';
import Subtrades from '@/pages/Subtrades';
import Register from '@/pages/Register';
import CheckEmailPage from '@/pages/CheckEmailPage';

// Role-based dashboard redirection component
const RoleDashboardRedirect: React.FC = () => {
  const { profile } = useAuth();
  
  // Redirect based on user role
  switch (profile?.role) {
    case 'admin':
      return <Index />; // Admin gets the full dashboard
    case 'manager':
      return <Navigate to="/manager" replace />;
    case 'rep':
      return <Navigate to="/sales" replace />;
    default:
      return <Index />; // Fallback to main dashboard
  }
};

const AppRoutes: React.FC = () => {
  const { user, loading, profile } = useAuth();

  console.log('[DEBUG] AppRoutes render: loading=', loading, 'user=', !!user, 'profile=', profile);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading session...</p>
      </div>
    );
  }

  console.log('[DEBUG] AppRoutes: loading false, user=', !!user);

  // ADMIN BYPASS: Allow admin users to skip onboarding for demo purposes
  const isAdmin = profile?.role === 'admin';
  const needsOnboarding = profile && !profile.completed_onboarding && !profile.full_name && !isAdmin;
  
  if (user && needsOnboarding) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      
      <Route path="/" element={user ? <ProtectedLayout /> : <Navigate to="/login" replace />}>
        {/* Role-based dashboard routing */}
        <Route index element={<RoleDashboardRedirect />} />
        
        {/* Specific role dashboards */}
        <Route path="manager" element={<RoleGuard allowed={['manager', 'admin']}><ManagerDashboard /></RoleGuard>} />
        <Route path="sales" element={<RoleGuard allowed={['rep', 'admin']}><SalesRepDashboard /></RoleGuard>} />
        
        {/* General pages - accessible by all authenticated users */}
        <Route path="estimates" element={<Estimates />} />
        <Route path="estimates/:estimateId" element={<Estimates />} />
        
        {/* Admin/Manager only pages */}
        <Route path="pricing" element={<RoleGuard allowed={['admin', 'manager']}><Pricing /></RoleGuard>} />
        <Route path="accounting-report" element={<RoleGuard allowed={['admin', 'manager']}><AccountingReport /></RoleGuard>} />
        
        {/* Admin only pages */}
        <Route path="users" element={<RoleGuard allowed={['admin']}><Users /></RoleGuard>} />
        <Route path="territories" element={<RoleGuard allowed={['admin']}><Territories /></RoleGuard>} />
        <Route path="subtrades" element={<RoleGuard allowed={['admin', 'manager']}><Subtrades /></RoleGuard>} />
        
        {/* EMERGENCY ADMIN BYPASS ROUTE */}
        <Route path="admin-bypass" element={<Index />} />
        
        {/* All other nested routes will be caught by the outer NotFound */}
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AppRoutes />
      <Toaster />
    </Router>
  );
}

export default App;
