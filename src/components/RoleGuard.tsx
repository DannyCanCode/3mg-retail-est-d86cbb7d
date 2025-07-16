import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface RoleGuardProps {
  allowed: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireTerritory?: boolean;
}

// Custom hook for role-based access checks
export const useRoleAccess = () => {
  const { profile } = useAuth();
  
  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const isSalesRep = profile?.role === 'rep' || profile?.role === 'project_manager';
  const isProjectManager = profile?.role === 'project_manager';
  const isSubtradeManager = profile?.role === 'subtrade_manager';
  
  const canAccess = (roles: string[]) => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };
  
  const hasTerritory = !!profile?.territory_id;
  
  return {
    isAdmin,
    isManager,
    isSalesRep,
    isProjectManager,
    isSubtradeManager,
    canAccess,
    hasTerritory,
    profile
  };
};

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  allowed, 
  children, 
  fallback,
  requireTerritory = false 
}) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">
              Please log in to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role access
  if (!allowed.includes(profile.role)) {
    return fallback || (
      <div className="flex h-[50vh] items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Required role: {allowed.join(' or ')} | Your role: {profile.role}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check territory requirement (except for admins)
  if (requireTerritory && !profile.territory_id && profile.role !== 'admin') {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-semibold mb-2">Territory Assignment Required</h2>
            <p className="text-muted-foreground">
              You need to be assigned to a territory to access this page.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGuard; 