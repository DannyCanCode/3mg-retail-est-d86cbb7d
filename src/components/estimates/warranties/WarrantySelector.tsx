import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, Check } from 'lucide-react';

interface WarrantySelectorProps {
  selectedPackage: string | null;
  selectedWarranty: string | null;
  onWarrantySelect: (warrantyType: string | null) => void;
  onPeelStickPriceUpdate?: (price: string) => void;
  isPeelStickSelected?: boolean;
  onPeelStickToggle?: (selected: boolean) => void;
}

export const WarrantySelector: React.FC<WarrantySelectorProps> = ({ 
  selectedPackage, 
  selectedWarranty, 
  onWarrantySelect,
  onPeelStickPriceUpdate,
  isPeelStickSelected = false,
  onPeelStickToggle,
}) => {
  
  // Check if warranties are available (only for GAF packages)
  const isGAFPackage = selectedPackage === 'gaf-1' || selectedPackage === 'gaf-2';
  const isGoldPledgeAvailable = selectedPackage === 'gaf-2';
  
  // If not a GAF package, don't show warranty options
  if (!isGAFPackage) {
    return null;
  }
  
  // Handle warranty selection
  const handleWarrantyClick = (warrantyId: string) => {
    if (warrantyId === selectedWarranty) {
      // If clicking on the currently selected warranty, deselect it
      onWarrantySelect(null);
    } else if (warrantyId === 'gold-pledge' && !isGoldPledgeAvailable) {
      // Don't select Gold Pledge if it's not available
      return;
    } else {
      // Otherwise select the warranty
      onWarrantySelect(warrantyId);
    }
  };
  
  // State for the calculated peel & stick extra cost (passed from parent)
  const [displayPeelStickCost, setDisplayPeelStickCost] = useState<string>("0.00");

  // Handle peel & stick checkbox toggle
  const handlePeelStickToggle = (checked: boolean) => {
    if (onPeelStickToggle) {
      onPeelStickToggle(checked);
    }
    // Cost update will now happen in the parent based on the toggled state
  };
  
  // Format price (can keep as utility)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="bg-white p-3 rounded-md shadow-sm">
      <h3 className="text-base font-medium mb-2">GAF Warranty Options</h3>
      <p className="text-xs text-gray-600 mb-2">Click a warranty to select it (automatically switches between options)</p>
      
      <div className="flex flex-col md:grid md:grid-cols-2 gap-3 mb-3">
        {/* Silver Pledge Option */}
        <div 
          className={`border p-2.5 rounded-md cursor-pointer transition-all duration-200 ${
            selectedWarranty === 'silver-pledge' 
              ? 'border-green-500 bg-green-50 shadow-md' 
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
          }`}
          onClick={() => handleWarrantyClick('silver-pledge')}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm">Silver Pledge™ Warranty</span>
            </div>
            {selectedWarranty === 'silver-pledge' && (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </div>
          <p className="text-xs text-gray-600 mb-1.5">Standard GAF warranty coverage</p>
          <ul className="text-xs space-y-0.5 text-gray-600">
            <li className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>10-year workmanship coverage</span>
            </li>
            <li className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>Lifetime material warranty</span>
            </li>
            <li className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>40-year algae warranty</span>
            </li>
          </ul>
          <div className="mt-2 pt-2 border-t">
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Available</Badge>
          </div>
        </div>

        {/* Gold Pledge Option */}
        <div 
          className={`border p-2.5 rounded-md transition-all duration-200 ${!isGoldPledgeAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
            selectedWarranty === 'gold-pledge' 
              ? 'border-green-500 bg-green-50 shadow-md' 
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
          }`}
          onClick={() => handleWarrantyClick('gold-pledge')}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Gold Pledge™ Warranty</span>
            </div>
            {selectedWarranty === 'gold-pledge' && (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </div>
          <p className="text-xs text-gray-600 mb-1.5">Premium GAF warranty with enhanced coverage</p>
          <ul className="text-xs space-y-0.5 text-gray-600">
            <li className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>25-year workmanship coverage</span>
            </li>
            <li className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>Lifetime material warranty</span>
            </li>
            <li className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>Requires GAF Cobra Ventilation</span>
            </li>
            <li className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>Requires GAF 2 Package</span>
            </li>
          </ul>
          <div className="mt-2 pt-2 border-t">
            {isGoldPledgeAvailable ? (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Available</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Unavailable</Badge>
            )}
          </div>
        </div>
      </div>
      
      {selectedWarranty === 'gold-pledge' && !isGoldPledgeAvailable && (
        <div className="mt-2 p-1.5 bg-yellow-900/20 border border-yellow-600/30 rounded-md text-xs text-yellow-400">
          <p className="font-medium">Gold Pledge Warranty Unavailable</p>
          <p>Gold Pledge Warranty requires the GAF 2 Premium Package, which includes GAF Cobra ventilation.
          Please select GAF 2 Package to enable this warranty option.</p>
        </div>
      )}
    </div>
  );
}; 