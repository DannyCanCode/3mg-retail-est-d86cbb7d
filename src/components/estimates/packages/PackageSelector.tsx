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
        <h3 className="text-sm font-semibold text-gray-300">Select Package</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* GAF 1 - Basic Package */}
        <div 
          className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            selectedPackage === 'gaf-1' 
              ? 'bg-gradient-to-br from-green-600/30 to-emerald-600/30 text-white shadow-lg shadow-green-500/25 ring-2 ring-green-500 ring-offset-1 ring-offset-gray-800' 
              : 'bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 hover:border-green-600/50'
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
                <div className={`p-1.5 rounded-lg ${selectedPackage === 'gaf-1' ? 'bg-green-500/30' : 'bg-green-900/30'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === 'gaf-1' ? 'text-green-300' : 'text-green-400'}`} />
                </div>
                <div>
                  <h4 className={`font-semibold text-sm ${selectedPackage === 'gaf-1' ? 'text-white' : 'text-gray-800'}`}>
                    GAF Package 1
                  </h4>
                  <p className={`text-xs ${selectedPackage === 'gaf-1' ? 'text-blue-100' : 'text-gray-500'}`}>
                    Standard
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
              ? 'bg-gradient-to-br from-purple-600/30 to-purple-500/30 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-500 ring-offset-1 ring-offset-gray-800' 
              : 'bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 hover:border-purple-600/50'
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
                <div className={`p-1.5 rounded-lg ${selectedPackage === 'gaf-2' ? 'bg-purple-500/30' : 'bg-purple-900/30'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === 'gaf-2' ? 'text-purple-300' : 'text-purple-400'}`} />
                </div>
                <div>
                  <h4 className={`font-semibold text-sm ${selectedPackage === 'gaf-2' ? 'text-white' : 'text-gray-200'}`}>
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
              <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === 'gaf-2' ? 'text-purple-100' : 'text-gray-400'}`}>
                <Shield className="h-3 w-3" />
                <span>Silver Pledge</span>
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === 'gaf-2' ? 'text-purple-100' : 'text-gray-400'}`}>
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
              ? 'bg-gradient-to-br from-green-600/30 to-emerald-600/30 text-white shadow-lg shadow-green-500/25 ring-2 ring-green-500 ring-offset-1 ring-offset-gray-800' 
              : 'bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 hover:border-green-600/50'
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
                <div className={`p-1.5 rounded-lg ${selectedPackage === '3mg-1' ? 'bg-green-500/30' : 'bg-green-900/30'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === '3mg-1' ? 'text-green-300' : 'text-green-400'}`} />
                </div>
                <div>
                  <h4 className={`font-semibold text-sm ${selectedPackage === '3mg-1' ? 'text-white' : 'text-gray-200'}`}>
                    3MG Standard
                  </h4>
                  <p className={`text-xs ${selectedPackage === '3mg-1' ? 'text-green-100' : 'text-gray-500'}`}>
                    10-Year Warranty
                  </p>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === '3mg-1' ? 'text-green-100' : 'text-gray-400'}`}>
              <Shield className="h-3 w-3" />
              <span>10 Year 3MG Workmanship</span>
            </div>
            
            {/* Quick materials count */}
            <div className={`text-xs ${selectedPackage === '3mg-1' ? 'text-green-100' : 'text-gray-500'}`}>
              OC Oakridge with MaxFelt
            </div>
          </div>
        </div>
        
        {/* 3MG 2 - Premium Package */}
        <div 
          className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 ${
            selectedPackage === '3mg-2' 
              ? 'bg-gradient-to-br from-emerald-600/30 to-teal-600/30 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500 ring-offset-1 ring-offset-gray-800' 
              : 'bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 hover:border-emerald-600/50'
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
                <div className={`p-1.5 rounded-lg ${selectedPackage === '3mg-2' ? 'bg-emerald-500/30' : 'bg-emerald-900/30'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === '3mg-2' ? 'text-emerald-300' : 'text-emerald-400'}`} />
                </div>
                <div>
                  <h4 className={`font-semibold text-sm ${selectedPackage === '3mg-2' ? 'text-white' : 'text-gray-200'}`}>
                    3MG Select
                  </h4>
                  <p className={`text-xs ${selectedPackage === '3mg-2' ? 'text-emerald-100' : 'text-gray-500'}`}>
                    25-Year Warranty
                  </p>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="space-y-1">
              <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === '3mg-2' ? 'text-emerald-100' : 'text-gray-400'}`}>
                <Shield className="h-3 w-3" />
                <span>25 Year 3MG Workmanship</span>
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${selectedPackage === '3mg-2' ? 'text-emerald-100' : 'text-gray-400'}`}>
                <Star className="h-3 w-3" />
                <span>Premium Protection</span>
              </div>
            </div>
            
            {/* Quick materials count */}
            <div className={`text-xs ${selectedPackage === '3mg-2' ? 'text-emerald-100' : 'text-gray-500'}`}>
              GAF UHDZ with MaxFelt
            </div>
          </div>
        </div>
      </div>
      
      {/* Expandable details section */}
      {selectedPackage && (
        <div className="mt-3 p-3 bg-gray-700/40 rounded-lg border border-gray-600/50">
          <p className="text-xs font-medium text-gray-200 mb-2">
            {selectedPackage === 'gaf-1' ? 'GAF Package 1 includes:' : 
             selectedPackage === 'gaf-2' ? 'GAF Package 2 includes:' :
             selectedPackage === '3mg-1' ? '3MG Standard includes:' :
             '3MG Select includes:'}
          </p>
          <ul className="text-xs text-gray-400 space-y-0.5">
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
                <li>• OC Oakridge Shingles</li>
                <li>• OC Starter Strip</li>
                <li>• OC Hip & Ridge Cap</li>
                <li>• MaxFelt Synthetic Underlayment</li>
                <li>• Ice & Water Shield (Valleys)</li>
                <li>• 10 Year 3MG Workmanship Warranty</li>
              </>
            ) : (
              <>
                <li>• GAF Timberline UHDZ Shingles</li>
                <li>• GAF ProStart Starter Strip</li>
                <li>• GAF Seal-A-Ridge Cap</li>
                <li>• MaxFelt Synthetic Underlayment</li>
                <li>• Ice & Water Shield (Valleys)</li>
                <li>• GAF Cobra Ridge Vent</li>
                <li>• 25 Year 3MG Workmanship Warranty</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PackageSelector; 