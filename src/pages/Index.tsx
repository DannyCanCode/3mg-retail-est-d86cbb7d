import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { MainContent } from '@/components/dashboard/MainContent';

const Index: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect users to their appropriate dashboards
    if (profile?.role) {
      switch (profile.role) {
        case 'manager':
          console.log('🔄 [Index] Redirecting territory manager to /manager dashboard');
          navigate('/manager', { replace: true });
          return;
        case 'rep':
        case 'project_manager':
          console.log('🔄 [Index] Redirecting sales rep/project manager to /sales dashboard');
          navigate('/sales', { replace: true });
          return;
        case 'admin':
          // Admins stay on the main dashboard (Index)
          console.log('✅ [Index] Admin staying on main dashboard');
          break;
        default:
          console.log('⚠️ [Index] Unknown role, staying on main dashboard:', profile.role);
          break;
      }
    }
  }, [profile, navigate]);

  // If user is being redirected, show loading state
  if (profile?.role === 'manager' || profile?.role === 'rep' || profile?.role === 'project_manager') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Only admins and unknown roles see the main dashboard
  return (
    <MainContent />
  );
};

export default Index;
