import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Check, Package, Shield, Star, Sparkles, Leaf } from "lucide-react";

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
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Select Package</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* GAF 1 - Basic Package */}
        <div 
          className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            selectedPackage === 'gaf-1' 
              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-1' 
              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
          }`}
          onClick={() => handlePackageClick('gaf-1')}
        >
          {/* Selection Indicator */}
          {selectedPackage === 'gaf-1' && (
            <div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${selectedPackage === 'gaf-1' ? 'bg-blue-500' : 'bg-blue-100'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === 'gaf-1' ? 'text-white' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h4 className={`font-semibold text-sm ${selectedPackage === 'gaf-1' ? 'text-white' : 'text-gray-800'}`}>
                    GAF Package 1
                  </h4>
                  <p className={`text-xs ${selectedPackage === 'gaf-1' ? 'text-blue-100' : 'text-gray-500'}`}>
                    Essential
                  </p>
                </div>
              </div>
            </div>
            
            {/* Warranty */}
            <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === 'gaf-1' ? 'text-blue-100' : 'text-gray-600'}`}>
              <Shield className="h-3 w-3" />
              <span>Silver Pledge</span>
            </div>
            
            {/* Quick materials count */}
            <div className={`text-xs ${selectedPackage === 'gaf-1' ? 'text-blue-100' : 'text-gray-500'}`}>
              5 core materials included
            </div>
          </div>
        </div>
        
        {/* GAF 2 - Premium Package */}
        <div 
          className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            selectedPackage === 'gaf-2' 
              ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-600 ring-offset-1' 
              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
          }`}
          onClick={() => handlePackageClick('gaf-2')}
        >
          {/* Selection Indicator */}
          {selectedPackage === 'gaf-2' && (
            <div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          
          {/* Premium Badge */}
          <div className="absolute top-2 right-2">
            <Sparkles className={`h-4 w-4 ${selectedPackage === 'gaf-2' ? 'text-yellow-300' : 'text-yellow-500'}`} />
          </div>
          
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${selectedPackage === 'gaf-2' ? 'bg-purple-500' : 'bg-purple-100'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === 'gaf-2' ? 'text-white' : 'text-purple-600'}`} />
                </div>
                <div>
                  <h4 className={`font-semibold text-sm ${selectedPackage === 'gaf-2' ? 'text-white' : 'text-gray-800'}`}>
                    GAF Package 2
                  </h4>
                  <p className={`text-xs ${selectedPackage === 'gaf-2' ? 'text-purple-100' : 'text-gray-500'}`}>
                    Premium
                  </p>
                </div>
              </div>
            </div>
            
            {/* Warranties */}
            <div className="space-y-1">
              <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === 'gaf-2' ? 'text-purple-100' : 'text-gray-600'}`}>
                <Shield className="h-3 w-3" />
                <span>Silver Pledge</span>
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === 'gaf-2' ? 'text-purple-100' : 'text-gray-600'}`}>
                <Star className="h-3 w-3" />
                <span>Gold Pledge</span>
              </div>
            </div>
            
            {/* Quick materials count */}
            <div className={`text-xs ${selectedPackage === 'gaf-2' ? 'text-purple-100' : 'text-gray-500'}`}>
              5 premium materials
            </div>
          </div>
        </div>

        {/* 3MG 1 - Standard Package */}
        <div 
          className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            selectedPackage === '3mg-1' 
              ? 'bg-green-600 text-white shadow-md ring-2 ring-green-600 ring-offset-1' 
              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
          }`}
          onClick={() => handlePackageClick('3mg-1')}
        >
          {/* Selection Indicator */}
          {selectedPackage === '3mg-1' && (
            <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 rounded-full p-0.5">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${selectedPackage === '3mg-1' ? 'bg-green-500' : 'bg-green-100'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === '3mg-1' ? 'text-white' : 'text-green-600'}`} />
                </div>
                <div>
                  <h4 className={`font-semibold text-sm ${selectedPackage === '3mg-1' ? 'text-white' : 'text-gray-800'}`}>
                    3MG One Package
                  </h4>
                  <p className={`text-xs ${selectedPackage === '3mg-1' ? 'text-green-100' : 'text-gray-500'}`}>
                    Standard
                  </p>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === '3mg-1' ? 'text-green-100' : 'text-gray-600'}`}>
              <Shield className="h-3 w-3" />
              <span>3MG Standard Warranty</span>
            </div>
            
            {/* Quick materials count */}
            <div className={`text-xs ${selectedPackage === '3mg-1' ? 'text-green-100' : 'text-gray-500'}`}>
              Quality 3MG materials
            </div>
          </div>
        </div>
        
        {/* 3MG 2 - Premium Package */}
        <div 
          className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            selectedPackage === '3mg-2' 
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600 ring-offset-1' 
              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
          }`}
          onClick={() => handlePackageClick('3mg-2')}
        >
          {/* Selection Indicator */}
          {selectedPackage === '3mg-2' && (
            <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 rounded-full p-0.5">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          
          {/* Premium Badge */}
          <div className="absolute top-2 right-2">
            <Leaf className={`h-4 w-4 ${selectedPackage === '3mg-2' ? 'text-yellow-300' : 'text-yellow-500'}`} />
          </div>
          
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${selectedPackage === '3mg-2' ? 'bg-emerald-500' : 'bg-emerald-100'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === '3mg-2' ? 'text-white' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <h4 className={`font-semibold text-sm ${selectedPackage === '3mg-2' ? 'text-white' : 'text-gray-800'}`}>
                    3MG Two Package
                  </h4>
                  <p className={`text-xs ${selectedPackage === '3mg-2' ? 'text-emerald-100' : 'text-gray-500'}`}>
                    Premium
                  </p>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="space-y-1">
              <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === '3mg-2' ? 'text-emerald-100' : 'text-gray-600'}`}>
                <Shield className="h-3 w-3" />
                <span>3MG Extended Warranty</span>
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === '3mg-2' ? 'text-emerald-100' : 'text-gray-600'}`}>
                <Star className="h-3 w-3" />
                <span>Premium Protection</span>
              </div>
            </div>
            
            {/* Quick materials count */}
            <div className={`text-xs ${selectedPackage === '3mg-2' ? 'text-emerald-100' : 'text-gray-500'}`}>
              Premium 3MG materials
            </div>
          </div>
        </div>
      </div>
      
      {/* Expandable details section */}
      {selectedPackage && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">
            {selectedPackage === 'gaf-1' ? 'GAF Package 1 includes:' : 
             selectedPackage === 'gaf-2' ? 'GAF Package 2 includes:' :
             selectedPackage === '3mg-1' ? '3MG One Package includes:' :
             '3MG Two Package includes:'}
          </p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {selectedPackage === 'gaf-1' ? (
              <>
                <li>• GAF ProStart Starter Strip</li>
                <li>• GAF Timberline HDZ Shingles</li>
                <li>• GAF Seal-A-Ridge</li>
                <li>• WeatherWatch (Valleys Only)</li>
                <li>• ABC Pro Guard 20</li>
              </>
            ) : selectedPackage === 'gaf-2' ? (
              <>
                <li>• GAF Timberline HDZ Shingles</li>
                <li>• GAF Seal-A-Ridge (25')</li>
                <li>• GAF ProStart Starter Strip</li>
                <li>• FeltBuster Synthetic Underlayment</li>
                <li>• WeatherWatch Ice & Water Shield</li>
              </>
            ) : selectedPackage === '3mg-1' ? (
              <>
                <li>• 3MG High-Performance Shingles</li>
                <li>• ABC Pro Start Premium Starter Strip</li>
                <li>• 3MG Ridge Cap Shingles</li>
                <li>• 3MG Ice & Water Shield</li>
                <li>• ABC Pro Guard 20 Synthetic</li>
              </>
            ) : (
              <>
                <li>• 3MG Premium Architectural Shingles</li>
                <li>• 3MG Premium Starter Strip</li>
                <li>• 3MG Premium Ridge Cap System</li>
                <li>• 3MG Advanced Synthetic Underlayment</li>
                <li>• 3MG Premium Ice & Water Shield</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PackageSelector; 