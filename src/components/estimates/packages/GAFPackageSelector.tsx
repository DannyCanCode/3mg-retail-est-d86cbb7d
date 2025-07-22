import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Package, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GAFPackageSelectorProps {
  selectedPackage?: 'gaf-1' | 'gaf-2' | '3mg-1' | '3mg-2';
  onPackageSelect: (packageType: 'gaf-1' | 'gaf-2' | '3mg-1' | '3mg-2') => void;
  disabled?: boolean;
}

export const GAFPackageSelector: React.FC<GAFPackageSelectorProps> = ({
  selectedPackage,
  onPackageSelect,
  disabled = false
}) => {
  const packages = [
    {
      id: 'gaf-1' as const,
      name: 'GAF Package 1',
      description: 'Standard GAF materials with competitive pricing',
      profitMargin: 25,
      features: [
        'GAF Timberline HDZ Shingles',
        'Standard Underlayment',
        'Basic Ventilation',
        'Standard Warranty'
      ],
      badge: 'Standard',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'gaf-2' as const,
      name: 'GAF Package 2',
      description: 'Premium GAF materials with enhanced features',
      profitMargin: 30,
      features: [
        'GAF Timberline HDZ Shingles',
        'Premium Synthetic Underlayment',
        'Enhanced Ventilation System',
        'Extended Warranty Coverage'
      ],
      badge: 'Premium',
      badgeColor: 'bg-green-100 text-green-800'
    },
    {
      id: '3mg-1' as const,
      name: '3MG Standard',
      description: 'OC Oakridge or GAF HDZ with MaxFelt synthetic underlayment',
      profitMargin: 28,
      features: [
        'OC Oakridge Shingles',
        'MaxFelt Synthetic Underlayment',
        'Self-Adhering Upgrade Available',
        '10 Year 3MG Workmanship Warranty'
      ],
      badge: '3MG Standard',
      badgeColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: '3mg-2' as const,
      name: '3MG Select',
      description: 'GAF UHDZ premium shingles with MaxFelt synthetic underlayment',
      profitMargin: 32,
      features: [
        'GAF UHDZ Premium Shingles',
        'MaxFelt Synthetic Underlayment',
        'Self-Adhering Upgrade Available',
        '25 Year 3MG Workmanship Warranty'
      ],
      badge: '3MG Premium',
      badgeColor: 'bg-orange-100 text-orange-800'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Select Package</h3>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {packages.map((pkg) => (
          <Card 
            key={pkg.id}
            className={cn(
              "cursor-pointer transition-all border-2",
              selectedPackage === pkg.id 
                ? "border-primary bg-primary/5 shadow-md" 
                : "border-border hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && onPackageSelect(pkg.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {pkg.name}
                  {selectedPackage === pkg.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </CardTitle>
                <Badge className={pkg.badgeColor}>
                  {pkg.badge}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {pkg.description}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Profit Margin Display */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                <span className="font-medium">Profit Margin:</span>
                <span className="text-2xl font-bold text-green-600">
                  {pkg.profitMargin}%
                </span>
              </div>
              
              {/* Features List */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Included Features:</h4>
                <ul className="space-y-1">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Selection Button */}
              <Button
                variant={selectedPackage === pkg.id ? "default" : "outline"}
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) onPackageSelect(pkg.id);
                }}
                disabled={disabled}
              >
                {selectedPackage === pkg.id ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Selected
                  </>
                ) : (
                  'Select Package'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Information Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start gap-2">
          <Star className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Sales Rep Package Selection</h4>
            <p className="text-sm text-blue-800 mt-1">
              As a sales representative, you can only select from these pre-configured packages. 
              Each package has a fixed profit margin that cannot be modified. This ensures consistent 
              pricing and maintains company profit standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 