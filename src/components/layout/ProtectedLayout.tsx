import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

const ProtectedLayout: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileWaitTime, setProfileWaitTime] = useState(0);
  const [showProfileError, setShowProfileError] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // CRITICAL FIX: Add safety timeout for loading state to prevent infinite white pages
  useEffect(() => {
    let loadingTimer: NodeJS.Timeout;
    
    if (loading) {
      loadingTimer = setTimeout(() => {
        if (import.meta.env.DEV) {
          console.warn('[ProtectedLayout] Loading timeout reached, showing recovery options');
        }
        setLoadingTimeout(true);
      }, 10000); // 10 seconds max loading time
    } else {
      setLoadingTimeout(false);
    }

    return () => {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
    };
  }, [loading]);

  // Track how long we've been waiting for profile
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (user && !profile && !loading) {
      interval = setInterval(() => {
        setProfileWaitTime((prev) => {
          const newTime = prev + 1;
          // Show error after 8 seconds of waiting (reduced from 10)
          if (newTime >= 8) {
            setShowProfileError(true);
          }
          return newTime;
        });
      }, 1000);
    } else {
      setProfileWaitTime(0);
      setShowProfileError(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, profile, loading]);

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      // No user, redirect to login
      navigate('/login', { replace: true });
      return;
    }

    if (user && profile) {
      // User is authenticated and profile is loaded
      const isAdmin = profile.role === 'admin';
      const needsOnboarding = !profile.completed_onboarding && !isAdmin;
      const isOnOnboardingPage = location.pathname === '/onboarding';
      
      if (import.meta.env.DEV) {
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
      }

      if (needsOnboarding && !isOnOnboardingPage) {
        // User needs onboarding, redirect there
        if (import.meta.env.DEV) {
          console.log('[ProtectedLayout] Redirecting to onboarding');
        }
        navigate('/onboarding', { replace: true });
        return;
      }

      if (!needsOnboarding && isOnOnboardingPage) {
        // User has completed onboarding but is on onboarding page, redirect to dashboard
        if (import.meta.env.DEV) {
          console.log('[ProtectedLayout] User completed onboarding, redirecting to dashboard');
        }
        navigate('/', { replace: true });
        return;
      }
    }
  }, [user, profile, loading, navigate, location.pathname]);

  // Show loading while auth is being determined
  if (loading && !loadingTimeout) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // CRITICAL FIX: Show recovery options if loading is stuck
  if (loading && loadingTimeout) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Issue</h2>
          <p className="text-gray-600 mb-6">
            The app is taking longer than usual to load. This might be due to a network issue or session conflict.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => {
                // Force refresh to clear any stuck states
                window.location.reload();
              }} 
              className="w-full"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh App
            </Button>
            <Button 
              onClick={() => {
                // Clear local storage and redirect to login
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login';
              }} 
              variant="outline"
              className="w-full"
            >
              Clear Session & Login Again
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            If this issue persists, try using a different browser or contact support.
          </p>
        </div>
      </div>
    );
  }

  // Handle profile loading/error states
  if (user && !profile) {
    if (showProfileError) {
      // Show error state with retry option
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-6">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Account Setup Issue</h2>
            <p className="text-gray-600 mb-6">
              We're having trouble loading your account information. This might be a temporary issue.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              <Button 
                onClick={() => navigate('/login')} 
                variant="outline"
                className="w-full"
              >
                Sign In Again
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              If this issue persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    // Show loading while profile is being fetched (with timeout)
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your account...</p>
          {profileWaitTime > 3 && (
            <p className="text-gray-500 text-sm mt-2">
              This is taking longer than usual ({profileWaitTime}s)
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-row bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProtectedLayout; 