import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const ProtectedLayout: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      // No user, redirect to login
      navigate('/login', { replace: true });
      return;
    }

    if (user && profile) {
      // User is authenticated and profile is loaded
      // ADMIN BYPASS: Allow admin users to skip onboarding for demo purposes
      const isAdmin = profile.role === 'admin';
      const needsOnboarding = !profile.completed_onboarding && !isAdmin;
      const isOnOnboardingPage = location.pathname === '/onboarding';
      
      console.log('[ProtectedLayout] User auth state:', {
        user: !!user,
        profile: !!profile,
        needsOnboarding,
        isAdmin,
        isOnOnboardingPage,
        completed_onboarding: profile.completed_onboarding,
        full_name: profile.full_name,
        currentPath: location.pathname
      });

      if (needsOnboarding && !isOnOnboardingPage) {
        // User needs onboarding, redirect there
        console.log('[ProtectedLayout] Redirecting to onboarding');
        navigate('/onboarding', { replace: true });
        return;
      }

      if (!needsOnboarding && isOnOnboardingPage) {
        // User has completed onboarding but is on onboarding page, redirect to dashboard
        console.log('[ProtectedLayout] User completed onboarding, redirecting to dashboard');
        navigate('/', { replace: true });
        return;
      }
    }
  }, [user, profile, loading, navigate, location.pathname]);

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while profile is being fetched
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-row bg-muted">
      <Sidebar />
      <main className="flex flex-col flex-1 overflow-y-auto sm:gap-4 sm:py-4 sm:pl-14">
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedLayout; 