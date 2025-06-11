import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Estimates from '@/pages/Estimates';
// import Measurements from '@/pages/Measurements'; // Remove this import
import Pricing from '@/pages/Pricing';
import Index from '@/pages/Index'; // Assuming this is your Dashboard
import NotFound from '@/pages/NotFound'; // Assuming you have a 404 component
// import Settings from '@/pages/Settings'; // Comment out: File does not exist
import AccountingReport from '@/pages/AccountingReport'; // Import the new component
import Login from '@/pages/Login';
import { useAuth } from '@/contexts/AuthContext';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null; // or a spinner
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  // Check if Supabase is configured (optional, could be handled elsewhere)
  // const isSupabaseReady = isSupabaseConfigured();

  return (
    <Router>
      <Routes>
        {/* Main application routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
        <Route path="/estimates" element={<RequireAuth><Estimates /></RequireAuth>} />
        <Route path="/estimates/:estimateId" element={<RequireAuth><Estimates /></RequireAuth>} />
        {/* <Route path="/measurements" element={<Measurements />} /> */}{/* Remove this route */}
        <Route path="/pricing" element={<RequireAuth><Pricing /></RequireAuth>} />
        {/* <Route path="/settings" element={<Settings />} /> */}{/* Comment out: File does not exist */}
        
        {/* --- Add the new route for the Accounting Report --- */}
        <Route path="/accounting-report" element={<RequireAuth><AccountingReport /></RequireAuth>} />
        {/* --- End new route --- */}

        {/* Catch-all 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
