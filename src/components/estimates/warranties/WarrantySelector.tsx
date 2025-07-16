import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface WarrantySelectorProps {
  selectedPackage: string | null;
  selectedWarranty: string | null;
  onWarrantySelect: (warrantyId: string | null) => void;
  onPeelStickPriceUpdate?: (price: string) => void;
  isPeelStickSelected?: boolean;
  onPeelStickToggle?: (selected: boolean) => void;
}

const WarrantySelector = ({ 
  selectedPackage, 
  selectedWarranty, 
  onWarrantySelect,
  onPeelStickPriceUpdate,
  isPeelStickSelected = false,
  onPeelStickToggle,
}: WarrantySelectorProps) => {
  
  const isGoldPledgeAvailable = selectedPackage === 'gaf-2' || selectedPackage === '3mg-2';
  
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
          className={`border p-2.5 rounded-md cursor-pointer ${selectedWarranty === 'silver-pledge' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => handleWarrantyClick('silver-pledge')}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-sm">Silver Pledge Warranty</h4>
            <Badge className="bg-green-600 text-white text-xs py-0.5">Available</Badge>
          </div>
          <p className="text-xs text-gray-600 mt-1">Standard GAF warranty coverage</p>
          <ul className="text-xs text-gray-600 mt-1.5 space-y-0.5 list-disc list-inside">
            <li>10-year workmanship coverage</li>
            <li>Lifetime material warranty</li>
            <li>Available with GAF 1 or GAF 2 Package</li>
          </ul>
          <p className="text-xs font-medium mt-1.5">Basic protection for your roof</p>
        </div>
        
        {/* Gold Pledge Option */}
        <div 
          className={`border p-2.5 rounded-md ${!isGoldPledgeAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${selectedWarranty === 'gold-pledge' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => handleWarrantyClick('gold-pledge')}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-sm">Gold Pledge Warranty</h4>
            {isGoldPledgeAvailable ? (
              <Badge className="bg-green-600 text-white text-xs py-0.5">Available</Badge>
            ) : (
              <Badge className="bg-yellow-500 text-white text-xs py-0.5">Unavailable</Badge>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">Premium GAF warranty with enhanced coverage</p>
          <ul className="text-xs text-gray-600 mt-1.5 space-y-0.5 list-disc list-inside">
            <li>25-year workmanship coverage</li>
            <li>Lifetime material warranty</li>
            <li>Requires GAF Cobra Ventilation</li>
            <li>Requires GAF 2 Package</li>
          </ul>
          <p className="text-xs font-medium mt-1.5 text-green-600">Superior protection for your investment</p>
        </div>
      </div>
      
      {selectedWarranty === 'gold-pledge' && !isGoldPledgeAvailable && (
        <div className="mt-2 p-1.5 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-700">
          <p className="font-medium">Gold Pledge Warranty Unavailable</p>
          <p>Gold Pledge Warranty requires the GAF 2 Premium Package, which includes GAF Cobra ventilation.
          Please select GAF 2 Package to enable this warranty option.</p>
        </div>
      )}
    </div>
  );
};

export default WarrantySelector; 