import React from 'react';
import { Badge } from "@/components/ui/badge";

interface PackageSelectorProps {
  selectedPackage: string | null;
  onPackageSelect: (packageId: string | null) => void;
}

const PackageSelector = ({ selectedPackage, onPackageSelect }: PackageSelectorProps) => {
  
  // Handle click - toggle selection on double click
  const handlePackageClick = (packageId: string) => {
    if (selectedPackage === packageId) {
      // If this package is already selected, allow double-click to deselect it
      onPackageSelect(null);
    } else {
      // Otherwise, select this package
      onPackageSelect(packageId);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-md shadow-sm">
      <h3 className="text-lg font-medium mb-3">GAF Package Selection</h3>
      <p className="text-sm text-gray-600 mb-3">Select a package or double-click to deselect</p>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div 
          className={`border p-3 rounded-md cursor-pointer ${selectedPackage === 'gaf-1' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => handlePackageClick('gaf-1')}
        >
          <div className="flex justify-between">
            <h4 className="font-medium">GAF 1 - Basic Package</h4>
          </div>
          <p className="text-sm text-gray-600 mt-1">Standard GAF materials for quality installation</p>
          <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
            <li>GAF ProStart Starter Shingle Strip (120')</li>
            <li>GAF Timberline HDZ</li>
            <li>GAF Seal-A-Ridge (25')</li>
            <li>GAF WeatherWatch Ice & Water Shield (valleys only)</li>
            <li>ABC Pro Guard 20 (Rhino)</li>
          </ul>
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-green-500 text-green-700 font-medium bg-green-50">Silver Pledge Eligible</Badge>
            </div>
            <p className="text-xs text-gray-600 italic">This package only supports Silver Pledge warranty.</p>
          </div>
        </div>
        
        <div 
          className={`border p-3 rounded-md cursor-pointer ${selectedPackage === 'gaf-2' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => handlePackageClick('gaf-2')}
        >
          <div className="flex justify-between">
            <h4 className="font-medium">GAF 2 - Premium Package</h4>
          </div>
          <p className="text-sm text-gray-600 mt-1">Premium GAF materials with enhanced protection</p>
          <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
            <li>GAF Timberline HDZ</li>
            <li>GAF Seal-A-Ridge (25')</li>
            <li>GAF ProStart Starter Shingle Strip (120')</li>
            <li>GAF FeltBuster Synthetic Underlayment (10 sq)</li>
            <li>GAF WeatherWatch Ice & Water Shield (valleys only)</li>
          </ul>
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-green-500 text-green-700 font-medium bg-green-50">Silver Pledge Eligible</Badge>
              <Badge variant="outline" className="border-blue-500 text-blue-700 font-medium bg-blue-50">Gold Pledge Eligible</Badge>
            </div>
            <p className="text-xs text-gray-600 italic">This package supports both Silver and Gold Pledge warranties.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageSelector; 