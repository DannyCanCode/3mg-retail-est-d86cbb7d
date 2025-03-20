import { useState } from 'react';

interface PackageSelectorProps {
  selectedPackage: string;
  onPackageSelect: (packageId: string) => void;
}

const PackageSelector = ({ selectedPackage, onPackageSelect }: PackageSelectorProps) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-sm">
      <h3 className="text-lg font-medium mb-3">GAF Package Selection</h3>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div 
          className={`border p-3 rounded-md cursor-pointer ${selectedPackage === 'gaf-1' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => onPackageSelect('gaf-1')}
        >
          <h4 className="font-medium">GAF 1 - Basic Package</h4>
          <p className="text-sm text-gray-600 mt-1">Standard GAF materials for quality installation</p>
          <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
            <li>GAF ProStart Starter Shingle Strip (120')</li>
            <li>GAF Timberline HDZ</li>
            <li>GAF Seal-A-Ridge (25')</li>
            <li>GAF WeatherWatch Ice & Water Shield</li>
            <li>ABC Pro Guard 20 (Rhino)</li>
          </ul>
          <p className="text-sm font-medium mt-2">Silver Pledge Warranty Eligible</p>
        </div>
        
        <div 
          className={`border p-3 rounded-md cursor-pointer ${selectedPackage === 'gaf-2' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onClick={() => onPackageSelect('gaf-2')}
        >
          <h4 className="font-medium">GAF 2 - Premium Package</h4>
          <p className="text-sm text-gray-600 mt-1">Premium GAF materials with enhanced protection</p>
          <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
            <li>GAF Timberline HDZ</li>
            <li>GAF Seal-A-Ridge (25')</li>
            <li>GAF ProStart Starter Shingle Strip (120')</li>
            <li>GAF FeltBuster Synthetic Underlayment (10 sq)</li>
            <li>GAF WeatherWatch Ice & Water Shield (valleys only)</li>
          </ul>
          <p className="text-sm font-medium mt-2 text-green-600">Gold Pledge Warranty Eligible</p>
        </div>
      </div>
    </div>
  );
};

export default PackageSelector; 