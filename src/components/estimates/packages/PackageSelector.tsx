import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Check, Package, Shield, Star, Sparkles, Leaf, ChevronDown, ChevronUp } from "lucide-react";

interface PackageSelectorProps {
  selectedPackage: string | null;
  onPackageSelect: (packageId: string | null) => void;
}

const PackageSelector = ({ selectedPackage, onPackageSelect }: PackageSelectorProps) => {
  const [show3mgStandardOptions, setShow3mgStandardOptions] = useState(false);
  
  // Handle click - toggle selection on double click
  const handlePackageClick = (packageId: string) => {
    if (packageId === '3mg-standard') {
      // Toggle 3MG Standard sub-options
      setShow3mgStandardOptions(!show3mgStandardOptions);
      return;
    }
    
    if (selectedPackage === packageId) {
      // If this package is already selected, allow double-click to deselect it
      onPackageSelect(null);
    } else {
      // Otherwise, select this package
      onPackageSelect(packageId);
    }
  };
  
  // Check if a 3MG Standard sub-option is selected
  const is3mgStandardSelected = selectedPackage === '3mg-standard-oc' || selectedPackage === '3mg-standard-gaf';
  
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">Select Package</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* GAF 1 - Basic Package */}
        <div 
          className={`relative rounded-lg p-4 cursor-pointer transition-all duration-200 border ${
            selectedPackage === 'gaf-1' 
              ? 'bg-green-50 border-green-500 shadow-md' 
              : 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400'
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
                <div className={`p-1.5 rounded-lg ${selectedPackage === 'gaf-1' ? 'bg-green-100' : 'bg-gray-200'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === 'gaf-1' ? 'text-green-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">
                    GAF Package 1
                  </h4>
                  <p className="text-xs text-gray-600">
                    Standard
                  </p>
                </div>
              </div>
            </div>
            
            {/* Warranty */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Shield className="h-3 w-3" />
              <span>Silver Pledge</span>
            </div>
            
            {/* Quick materials count */}
            <div className="text-xs text-gray-600">
              5 core materials included
            </div>
          </div>
        </div>
        
        {/* GAF 2 - Premium Package */}
        <div 
          className={`relative rounded-lg p-4 cursor-pointer transition-all duration-200 border ${
            selectedPackage === 'gaf-2' 
              ? 'bg-green-50 border-green-500 shadow-md' 
              : 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400'
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

        {/* 3MG Standard Package - With Sub-Options */}
        <div className="col-span-2">
          {/* Main 3MG Standard Card */}
          <div 
            className={`relative rounded-lg p-4 cursor-pointer transition-all duration-200 border ${
              is3mgStandardSelected
                ? 'bg-green-50 border-green-500 shadow-md' 
                : 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handlePackageClick('3mg-standard')}
          >
            {/* Selection Indicator */}
            {is3mgStandardSelected && (
              <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 rounded-full p-0.5">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              {/* Left Content */}
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${is3mgStandardSelected ? 'bg-green-100' : 'bg-gray-200'}`}>
                  <Package className={`h-4 w-4 ${is3mgStandardSelected ? 'text-green-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">
                    3MG Standard
                  </h4>
                  <p className="text-xs text-gray-600">
                    10-Year Warranty • Choose GAF or OC
                  </p>
                </div>
              </div>
              
              {/* Expand/Collapse Icon */}
              <div className="flex items-center gap-2">
                {is3mgStandardSelected && (
                  <Badge variant="outline" className="text-xs">
                    {selectedPackage === '3mg-standard-gaf' ? 'GAF' : selectedPackage === '3mg-standard-oc' ? 'OC' : ''}
                  </Badge>
                )}
                {show3mgStandardOptions ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </div>
          </div>
          
          {/* Sub-Options */}
          {show3mgStandardOptions && (
            <div className="mt-2 grid grid-cols-2 gap-3 ml-4">
              {/* OC Option */}
              <div 
                className={`relative rounded-lg p-3 cursor-pointer transition-all duration-200 border ${
                  selectedPackage === '3mg-standard-oc' 
                    ? 'bg-blue-50 border-blue-500 shadow-md' 
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => onPackageSelect('3mg-standard-oc')}
              >
                {selectedPackage === '3mg-standard-oc' && (
                  <div className="absolute -top-1.5 -right-1.5 bg-blue-500 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                
                <div className="space-y-1">
                  <h5 className="font-medium text-sm text-gray-900">OC Materials</h5>
                  <p className="text-xs text-gray-600">
                    Owens Corning Duration + Polyglass IRXE
                  </p>
                </div>
              </div>
              
              {/* GAF Option */}
              <div 
                className={`relative rounded-lg p-3 cursor-pointer transition-all duration-200 border ${
                  selectedPackage === '3mg-standard-gaf' 
                    ? 'bg-blue-50 border-blue-500 shadow-md' 
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => onPackageSelect('3mg-standard-gaf')}
              >
                {selectedPackage === '3mg-standard-gaf' && (
                  <div className="absolute -top-1.5 -right-1.5 bg-blue-500 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                
                <div className="space-y-1">
                  <h5 className="font-medium text-sm text-gray-900">GAF Materials</h5>
                  <p className="text-xs text-gray-600">
                    GAF HDZ + Polyglass IRXE
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 3MG Select - Premium Package */}
        <div 
          className={`relative rounded-lg p-4 cursor-pointer transition-all duration-200 border ${
            selectedPackage === '3mg-select' 
              ? 'bg-green-50 border-green-500 shadow-md' 
              : 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => handlePackageClick('3mg-select')}
        >
          {/* Selection Indicator */}
          {selectedPackage === '3mg-select' && (
            <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 rounded-full p-0.5">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          
          {/* Premium Badge */}
          <div className="absolute top-2 right-2">
            <Leaf className={`h-4 w-4 ${selectedPackage === '3mg-select' ? 'text-yellow-300' : 'text-yellow-500'}`} />
          </div>
          
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${selectedPackage === '3mg-select' ? 'bg-emerald-500/30' : 'bg-emerald-900/30'}`}>
                  <Package className={`h-4 w-4 ${selectedPackage === '3mg-select' ? 'text-emerald-300' : 'text-emerald-400'}`} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">
                    3MG Select
                  </h4>
                  <p className="text-xs text-gray-600">
                    25-Year Warranty
                  </p>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Shield className="h-3 w-3" />
                <span>25 Year 3MG Workmanship</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Star className="h-3 w-3" />
                <span>Premium Protection</span>
              </div>
            </div>
            
            {/* Quick materials count */}
            <div className="text-xs text-gray-600">
              GAF UHDZ with Polyglass IRXE
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
             selectedPackage === '3mg-standard-oc' ? '3MG Standard (OC) includes:' :
             selectedPackage === '3mg-standard-gaf' ? '3MG Standard (GAF) includes:' :
             selectedPackage === '3mg-select' ? '3MG Select includes:' :
             'Package includes:'}
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
            ) : selectedPackage === '3mg-standard-oc' ? (
              <>
                <li>• Owens Corning Duration Shingles</li>
                <li>• OC Oakridge Shingles</li>
                <li>• OC Proedge Hip & Ridge</li>
                <li>• OC Starter Strip Plus</li>
                <li>• MaxFelt Synthetic Underlayment</li>
                <li>• Polyglass IRXE (Valleys)</li>
                <li>• 10 Year 3MG Workmanship Warranty</li>
              </>
            ) : selectedPackage === '3mg-standard-gaf' ? (
              <>
                <li>• GAF Timberline HDZ Shingles</li>
                <li>• GAF ProStart Starter Strip</li>
                <li>• GAF Seal-A-Ridge</li>
                <li>• ABC Pro Guard 20 Underlayment</li>
                <li>• Polyglass IRXE (Valleys)</li>
                <li>• 10 Year 3MG Workmanship Warranty</li>
              </>
            ) : selectedPackage === '3mg-select' ? (
              <>
                <li>• GAF Timberline UHDZ Shingles</li>
                <li>• GAF ProStart Starter Strip</li>
                <li>• GAF Seal-A-Ridge Cap</li>
                <li>• MaxFelt Synthetic Underlayment</li>
                <li>• Polyglass IRXE (Valleys)</li>
                <li>• GAF Cobra Ridge Vent</li>
                <li>• 25 Year 3MG Workmanship Warranty</li>
              </>
            ) : null}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PackageSelector; 