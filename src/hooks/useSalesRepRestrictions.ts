import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

interface SalesRepRestrictions {
  canViewProfitMargins: boolean;
  canEditProfitMargins: boolean;
  canViewAllEstimates: boolean;
  canViewCompanyMetrics: boolean;
  canApproveEstimates: boolean;
  canDeleteEstimates: boolean;
  canViewCustomerDetails: boolean;
  canEditSubmittedEstimates: boolean;
  canAccessAdminFeatures: boolean;
  canAccessManagerFeatures: boolean;
  minProfitMargin: number;
  maxProfitMargin: number;
  defaultProfitMargin: number;
}

/**
 * Hook to manage sales rep restrictions and permissions
 * This centralizes all role-based access control for the UI
 */
export function useSalesRepRestrictions(): SalesRepRestrictions {
  const { profile } = useAuth();
  
  return useMemo(() => {
    const role = profile?.role || 'rep';
    
    // Define restrictions based on role
    switch (role) {
      case 'admin':
        return {
          canViewProfitMargins: true,
          canEditProfitMargins: true,
          canViewAllEstimates: true,
          canViewCompanyMetrics: true,
          canApproveEstimates: true,
          canDeleteEstimates: true,
          canViewCustomerDetails: true,
          canEditSubmittedEstimates: true,
          canAccessAdminFeatures: true,
          canAccessManagerFeatures: true,
          minProfitMargin: 0,
          maxProfitMargin: 100,
          defaultProfitMargin: 20
        };
        
      case 'manager':
        return {
          canViewProfitMargins: true,
          canEditProfitMargins: true,
          canViewAllEstimates: true, // But filtered by territory
          canViewCompanyMetrics: true,
          canApproveEstimates: true,
          canDeleteEstimates: true,
          canViewCustomerDetails: true,
          canEditSubmittedEstimates: false,
          canAccessAdminFeatures: false,
          canAccessManagerFeatures: true,
          minProfitMargin: 30, // Managers have 30% minimum
          maxProfitMargin: 100,
          defaultProfitMargin: 30
        };
        
      case 'rep':
      default:
        return {
          canViewProfitMargins: false, // Sales reps cannot see profit margins
          canEditProfitMargins: false,
          canViewAllEstimates: false, // Only their own
          canViewCompanyMetrics: false,
          canApproveEstimates: false,
          canDeleteEstimates: false,
          canViewCustomerDetails: true, // Can see customer info on their estimates
          canEditSubmittedEstimates: false, // Cannot edit after submission
          canAccessAdminFeatures: false,
          canAccessManagerFeatures: false,
          minProfitMargin: 35, // Sales reps have 35% minimum (hidden from them)
          maxProfitMargin: 35, // Fixed at 35% for sales reps
          defaultProfitMargin: 35
        };
    }
  }, [profile?.role]);
} 