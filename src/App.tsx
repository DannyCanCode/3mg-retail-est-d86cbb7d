import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Estimates from "@/pages/Estimates";
import NotFound from "@/pages/NotFound";
import Pricing from "@/pages/Pricing";
import ManagerDashboard from "@/pages/ManagerDashboard";
import SalesRepDashboard from "@/pages/SalesRepDashboard";
import SalesRepEstimateFlow from "@/pages/SalesRepEstimateFlow";
import DocumentsLibrary from "@/pages/DocumentsLibrary";
import Territories from "@/pages/Territories";
import Users from "@/pages/Users";
import Subtrades from "@/pages/Subtrades";
import AccountingReport from "@/pages/AccountingReport";
import CheckEmailPage from "@/pages/CheckEmailPage";
import Onboarding from "@/pages/Onboarding";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: (failureCount, error: any) => {
        // Don't retry auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
    },
  },
});

// Error Boundary Component
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('App Error Boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error Details (Dev Only)
                </summary>
                <pre className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded overflow-auto">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Auth Guard Component
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile } = useAuth();

  // Prioritize logout state - if no user, show login immediately
  if (!user) {
    if (import.meta.env.DEV) {
      console.log('[AuthGuard] No user detected, rendering Login');
    }
    return <Login />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  // Handle onboarding redirect
  if (profile && !profile.completed_onboarding) {
    return <Onboarding />;
  }

  return <>{children}</>;
};

// Main Router Component
const AppRouter = () => {
  const { user, profile } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // DISABLED: Onboarding flow is no longer used - all users should go directly to main app
  // This prevents the old onboarding UI from appearing when auth context reloads
  if (false && profile && !profile.completed_onboarding) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      {/* DISABLED: Old onboarding route - always redirect to home */}
      
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<Index />} />
        <Route path="estimates" element={<Estimates />} />
        <Route path="estimates/:estimateId" element={<Estimates />} />
        <Route path="sales-estimate" element={<SalesRepEstimateFlow />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="manager" element={<ManagerDashboard />} />
        <Route path="sales" element={<SalesRepDashboard />} />
        <Route path="documents" element={<DocumentsLibrary />} />
        <Route path="territories" element={<Territories />} />
        <Route path="users" element={<Users />} />
        <Route path="subtrades" element={<Subtrades />} />
        <Route path="accounting-report" element={<AccountingReport />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<LoadingSpinner />}>
                <AuthGuard>
                  <AppRouter />
                </AuthGuard>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default App;
