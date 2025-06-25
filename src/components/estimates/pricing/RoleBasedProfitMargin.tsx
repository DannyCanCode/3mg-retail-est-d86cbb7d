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
}

export const RoleBasedProfitMargin: React.FC<RoleBasedProfitMarginProps> = ({
  profitMargin,
  onProfitMarginChange,
  onProfitMarginCommit,
  selectedPackage,
  readOnly = false
}) => {
  const { profile } = useAuth();
  const userRole = profile?.role;

  // Determine margin constraints based on role
  const getMarginConstraints = () => {
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
          max: 50, // Allow managers to go higher than 35% if needed
          step: 1,
          isLocked: false,
          hideInput: false,
          description: 'Territory managers have a 30% minimum profit margin (cannot go lower). You can increase above 30% as needed.'
        };
      
      case 'rep':
        // Sales reps: Hide profit margin input entirely, enforce backend values
        const margin = selectedPackage === 'gaf1' ? 25 : 30; // Default to GAF2 if not specified
        return {
          min: margin,
          max: margin,
          step: 1,
          isLocked: true,
          hideInput: true, // NEW: Hide the input completely
          description: `Profit margin is automatically set based on your GAF package selection`
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
  
  // Auto-correct margin if it's below minimum
  React.useEffect(() => {
    if (profitMargin < constraints.min) {
      onProfitMarginChange([constraints.min]);
      onProfitMarginCommit([constraints.min]);
    } else if (profitMargin > constraints.max) {
      onProfitMarginChange([constraints.max]);
      onProfitMarginCommit([constraints.max]);
    }
  }, [profitMargin, constraints.min, constraints.max, onProfitMarginChange, onProfitMarginCommit]);

  // For sales reps, automatically set margin based on package
  React.useEffect(() => {
    if (userRole === 'rep' && selectedPackage) {
      const packageMargin = selectedPackage === 'gaf1' ? 25 : 30;
      if (profitMargin !== packageMargin) {
        onProfitMarginChange([packageMargin]);
        onProfitMarginCommit([packageMargin]);
      }
    }
  }, [userRole, selectedPackage, profitMargin, onProfitMarginChange, onProfitMarginCommit]);

  const getRoleIcon = () => {
    switch (userRole) {
      case 'admin': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'manager': return <Info className="h-4 w-4 text-green-600" />;
      case 'rep': return <EyeOff className="h-4 w-4 text-orange-600" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (userRole) {
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-green-100 text-green-800';
      case 'rep': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // For sales reps, don't render the profit margin section at all
  if (userRole === 'rep' && constraints.hideInput) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-orange-600" />
            Package Pricing
            <Badge className="bg-orange-100 text-orange-800">
              SALES REP
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            {constraints.description}
          </div>

          {/* Package selection info for sales reps */}
          <div className="p-3 border rounded-md bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Your Package Selection</span>
            </div>
            <div className="space-y-1 text-sm text-blue-800">
              <div className={`p-2 rounded ${selectedPackage === 'gaf1' ? 'bg-blue-200 font-semibold' : ''}`}>
                • GAF Package 1: Standard pricing
              </div>
              <div className={`p-2 rounded ${selectedPackage === 'gaf2' ? 'bg-blue-200 font-semibold' : ''}`}>
                • GAF Package 2: Premium pricing
              </div>
              {!selectedPackage && (
                <div className="text-orange-600 font-medium mt-2 p-2 bg-orange-100 rounded">
                  Please select a GAF package to continue
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-center text-muted-foreground border-t pt-2">
            Pricing is automatically calculated based on your package selection
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getRoleIcon()}
          Profit Margin
          <Badge className={getRoleBadgeColor()}>
            {userRole?.toUpperCase() || 'USER'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="profit-margin">Profit Margin</Label>
          <span className="text-2xl font-bold text-green-600">
            {effectiveMargin}%
          </span>
        </div>

        {/* Role-based description */}
        <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
          {constraints.description}
        </div>

        {/* Profit margin slider/display */}
        {constraints.isLocked ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Profit margin is locked for this package
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
              onValueChange={onProfitMarginChange}
              onValueCommit={onProfitMarginCommit}
              disabled={readOnly}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {constraints.min}%</span>
              <span>Max: {constraints.max}%</span>
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
      </CardContent>
    </Card>
  );
}; 