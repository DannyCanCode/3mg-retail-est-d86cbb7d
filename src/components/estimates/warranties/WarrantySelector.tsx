import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface WarrantySelectorProps {
  selectedPackage: string;
  selectedWarranty: string;
  onWarrantySelect: (warrantyId: string) => void;
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
  
  const isGoldPledgeAvailable = selectedPackage === 'gaf-2';
  
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
    <div className="bg-white p-4 rounded-md shadow-sm mt-4">
      <h3 className="text-lg font-medium mb-3">GAF Warranty Options</h3>
      
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 mb-4">
        <div 
          className={`border p-3 rounded-md cursor-pointer ${selectedWarranty === 'silver-pledge' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => onWarrantySelect('silver-pledge')}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-medium">Silver Pledge Warranty</h4>
            <Badge className="bg-green-600 text-white">Available</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">Standard GAF warranty coverage</p>
          <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
            <li>10-year workmanship coverage</li>
            <li>Lifetime material warranty</li>
            <li>Available with GAF 1 or GAF 2 Package</li>
          </ul>
          <p className="text-sm font-medium mt-2">Basic protection for your roof</p>
        </div>
        
        <div 
          className={`border p-3 rounded-md ${!isGoldPledgeAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${selectedWarranty === 'gold-pledge' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => isGoldPledgeAvailable && onWarrantySelect('gold-pledge')}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-medium">Gold Pledge Warranty</h4>
            {isGoldPledgeAvailable ? (
              <Badge className="bg-green-600 text-white">Available</Badge>
            ) : (
              <Badge className="bg-yellow-500 text-white">Unavailable</Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">Premium GAF warranty with enhanced coverage</p>
          <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
            <li>25-year workmanship coverage</li>
            <li>Lifetime material warranty</li>
            <li>Requires GAF Cobra Ventilation</li>
            <li>Requires GAF 2 Package</li>
          </ul>
          <p className="text-sm font-medium mt-2 text-green-600">Superior protection for your investment</p>
        </div>
      </div>
      
      <div className="border p-3 rounded-md cursor-pointer mt-4">
        <div className="flex items-start gap-2">
          <Checkbox 
            id="peel-stick-system"
            checked={isPeelStickSelected}
            onCheckedChange={handlePeelStickToggle}
            className="mt-1"
          />
          <div className="flex-1">
            <Label htmlFor="peel-stick-system" className="font-medium cursor-pointer">Full W.W Peel & Stick System</Label>
            <p className="text-sm text-gray-600 mt-1">Enhanced waterproofing protection</p>
            <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
              <li>Complete peel & stick underlayment system (1 roll / 1.5 sq)</li>
              <li>Maximum protection against water infiltration</li>
              <li>Adds $60/square to the estimate</li>
            </ul>
            {isPeelStickSelected && (
               <div className="mt-2 bg-gray-100 p-2 rounded">
                 <span className="text-xs font-medium">Additional System Cost:</span>
                 <span className="ml-2 font-semibold text-green-700">{/* Display value driven by parent */}</span>
                 <span className="ml-1 text-xs text-muted-foreground">($60.00/sq)</span>
               </div>
            )}
          </div>
        </div>
      </div>
      
      {selectedWarranty === 'gold-pledge' && !isGoldPledgeAvailable && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
          <p className="font-medium">Gold Pledge Warranty Unavailable</p>
          <p>Gold Pledge Warranty requires the GAF 2 Premium Package, which includes GAF Cobra ventilation.
          Please select GAF 2 Package to enable this warranty option.</p>
        </div>
      )}
    </div>
  );
};

export default WarrantySelector; 