import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface RoleBasedProfitMarginProps {
  profitMargin: number;
  onProfitMarginChange: (value: number[]) => void;
  onProfitMarginCommit: (value: number[]) => void;
  selectedPackage?: 'gaf1' | 'gaf2' | 'custom';
  readOnly?: boolean;
  // Admin edit mode props
  isAdminEditMode?: boolean;
  originalCreator?: string | null;
  originalCreatorRole?: string | null;
}

export const RoleBasedProfitMargin: React.FC<RoleBasedProfitMarginProps> = ({
  profitMargin,
  onProfitMarginChange,
  onProfitMarginCommit,
  selectedPackage,
  readOnly = false,
  // Admin edit mode props
  isAdminEditMode = false,
  originalCreator = null,
  originalCreatorRole = null,
}) => {
  const { profile } = useAuth();
  const userRole = profile?.role;

  // Determine margin constraints based on role
  const getMarginConstraints = () => {
    // Admin override: If in admin edit mode and current user is admin, use admin permissions
    if (isAdminEditMode && userRole === 'admin') {
      return {
        min: 0,
        max: 50,
        step: 1,
        isLocked: false,
        hideInput: false,
        description: `Admin editing ${originalCreator}'s estimate (${originalCreatorRole}) - Full access to all profit margins`
      };
    }
    
    // Normal role-based permissions
    switch (userRole) {
      case 'admin':
        return {
          min: 0,
          max: 50,
          step: 1,
          isLocked: false,
          hideInput: false,
          description: 'Full access to all profit margins'
        };
      
      case 'manager':
        return {
          min: 30,
          max: 50,
          step: 1,
          isLocked: false,
          hideInput: false,
          description: 'Territory managers have a 30% minimum profit margin (cannot go lower). You can increase above 30% as needed.'
        };
      
      case 'rep':
        // Sales reps: 30% minimum, 50% maximum profit margin
        return {
          min: 30,
          max: 50,
          step: 1,
          isLocked: false,
          hideInput: false,
          description: 'Sales reps have a 30% minimum profit margin and can go up to 50%. This ensures consistent pricing while allowing some flexibility.'
        };
      
      default:
        return {
          min: 25,
          max: 30,
          step: 1,
          isLocked: false,
          hideInput: false,
          description: 'Default margin range'
        };
    }
  };

  const constraints = getMarginConstraints();
  
  // Enforce minimum margin for the role
  const effectiveMargin = Math.max(constraints.min, Math.min(constraints.max, profitMargin));
  
  const handleValueChange = (value: number[]) => {
    const newValue = value[0];
    // Enforce constraints immediately
    const constrainedValue = Math.max(constraints.min, Math.min(constraints.max, newValue));
    onProfitMarginChange([constrainedValue]);
  };

  const handleValueCommit = (value: number[]) => {
    const finalValue = value[0];
    const constrainedValue = Math.max(constraints.min, Math.min(constraints.max, finalValue));
    onProfitMarginCommit([constrainedValue]);
  };

  // Auto-enforce role-based constraints
  React.useEffect(() => {
    // For all roles, enforce min/max constraints if needed
    if (profitMargin < constraints.min || profitMargin > constraints.max) {
      const targetMargin = Math.max(constraints.min, Math.min(constraints.max, profitMargin));
      onProfitMarginChange([targetMargin]);
      onProfitMarginCommit([targetMargin]);
    }
  }, [userRole, constraints.min, constraints.max, profitMargin, onProfitMarginChange, onProfitMarginCommit]);

  const getRoleIcon = () => {
    switch (userRole) {
      case 'admin': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'manager': return <Info className="h-4 w-4 text-green-600" />;
      case 'rep': return <Info className="h-4 w-4 text-green-600" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (userRole) {
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-green-100 text-green-800';
      case 'rep': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // For managers and admins, show the full profit margin controls
  return (
    <Card className={userRole === 'rep' ? "border-green-200 bg-green-50/30" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getRoleIcon()}
          <span className={userRole === 'rep' ? "text-green-700" : ""}>Profit Margin</span>
          <Badge className={getRoleBadgeColor()}>
            {userRole?.toUpperCase() || 'USER'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Label htmlFor="profit-margin" className={`text-base font-medium ${userRole === 'rep' ? 'text-green-700' : ''}`}>
                  Current Margin: <span className={userRole === 'rep' ? "text-green-600 font-bold" : ""}>{effectiveMargin}%</span>
                </Label>
                <Info className={`h-4 w-4 cursor-help ${userRole === 'rep' ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{constraints.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {constraints.isLocked ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Profit margin is locked for this role
              </span>
            </div>
            <div className="h-12 bg-muted rounded-md flex items-center justify-center">
              <span className="text-lg font-semibold">{effectiveMargin}%</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Slider
              id="profit-margin"
              min={constraints.min}
              max={constraints.max}
              step={constraints.step}
              value={[effectiveMargin]}
              onValueChange={handleValueChange}
              onValueCommit={handleValueCommit}
              disabled={readOnly && !(isAdminEditMode && userRole === 'admin')}
              className={userRole === 'rep' ? "w-full [&>span:first-child]:bg-green-100 [&>span>span]:bg-green-500 [&>span:last-child]:border-green-500" : "w-full"}
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={userRole === 'rep' ? "text-green-600 font-medium" : ""}>Min: {constraints.min}%</span>
              <span className={userRole === 'rep' ? "text-green-600 font-medium" : ""}>Max: {constraints.max}%</span>
            </div>
          </div>
        )}

        {/* Warning for territory managers */}
        {userRole === 'manager' && effectiveMargin < 30 && (
          <div className="mt-4 p-3 border-l-4 border-yellow-400 bg-yellow-50">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                Minimum margin enforced at 30%
              </span>
            </div>
          </div>
        )}

        {/* Warning for sales reps at minimum margin */}
        {userRole === 'rep' && effectiveMargin === 30 && (
          <div className="mt-4 p-3 border-l-4 border-green-400 bg-green-50">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">
                You're at the minimum 30% margin - consider increasing for better profitability
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 