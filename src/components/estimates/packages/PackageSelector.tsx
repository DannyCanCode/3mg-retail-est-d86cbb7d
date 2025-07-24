import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Check, Package, Shield, Star, Sparkles, Leaf, ChevronDown, ChevronUp, Award } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-green-400" />
        <Badge variant="outline" className="text-sm font-medium bg-green-100/10 text-green-400 border-green-400/30">Choose One</Badge>
      </div>
      
      {/* GAF Packages Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-green-600/30 pb-2">
          <div className="w-6 h-6 bg-green-400/20 rounded-full flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-green-400" />
          </div>
          <h4 className="font-medium text-white">GAF Packages</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GAF 1 - Basic Package */}
          <div 
            className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 border-2 ${
              selectedPackage === 'gaf-1' 
                ? 'bg-blue-50 border-blue-500 shadow-lg ring-2 ring-blue-200' 
                : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
            onClick={() => handlePackageClick('gaf-1')}
          >
            {/* Selection Indicator */}
            {selectedPackage === 'gaf-1' && (
              <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1.5 shadow-lg">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
            
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedPackage === 'gaf-1' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Package className={`h-5 w-5 ${selectedPackage === 'gaf-1' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base text-white">GAF Package 1</h4>
                    <Badge variant="secondary" className="text-xs mt-1">Standard</Badge>
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>Silver Pledge Warranty</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>5 Core Materials</span>
                </div>
              </div>
              
              {/* Quick preview */}
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                HDZ Shingles, ProStart Starter, Seal-A-Ridge, WeatherWatch, Pro Guard 20
              </div>
            </div>
          </div>
          
          {/* GAF 2 - Premium Package */}
          <div 
            className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 border-2 ${
              selectedPackage === 'gaf-2' 
                ? 'bg-purple-50 border-purple-500 shadow-lg ring-2 ring-purple-200' 
                : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-purple-300 hover:shadow-md'
            }`}
            onClick={() => handlePackageClick('gaf-2')}
          >
            {/* Selection Indicator */}
            {selectedPackage === 'gaf-2' && (
              <div className="absolute -top-2 -right-2 bg-purple-500 rounded-full p-1.5 shadow-lg">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
            
            {/* Premium Badge */}
            <div className="absolute top-3 right-3">
              <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">Premium</Badge>
            </div>
            
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedPackage === 'gaf-2' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    <Package className={`h-5 w-5 ${selectedPackage === 'gaf-2' ? 'text-purple-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base text-white">GAF Package 2</h4>
                    <Badge variant="secondary" className="text-xs mt-1">Premium</Badge>
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>Silver & Gold Pledge</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Premium Materials</span>
                </div>
              </div>
              
              {/* Quick preview */}
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                HDZ Shingles, FeltBuster Synthetic, Full WeatherWatch Protection
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3MG Packages Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-green-600/30 pb-2">
          <div className="w-6 h-6 bg-green-400/20 rounded-full flex items-center justify-center">
            <Award className="h-3.5 w-3.5 text-green-400" />
          </div>
          <h4 className="font-medium text-white">3MG Packages</h4>
        </div>

        {/* 3MG Standard Package - With Sub-Options */}
        <div className="space-y-3">
          {/* Main 3MG Standard Card */}
          <div 
            className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 border-2 ${
              is3mgStandardSelected
                ? 'bg-green-50 border-green-500 shadow-lg ring-2 ring-green-200' 
                : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-green-300 hover:shadow-md'
            }`}
            onClick={() => handlePackageClick('3mg-standard')}
          >
            {/* Selection Indicator */}
            {is3mgStandardSelected && (
              <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1.5 shadow-lg">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              {/* Left Content */}
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${is3mgStandardSelected ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Package className={`h-5 w-5 ${is3mgStandardSelected ? 'text-green-600' : 'text-gray-600'}`} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-base text-white">3MG Standard</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>10-Year Workmanship</span>
                    </div>
                    <div className="text-gray-400">•</div>
                    <span className="text-orange-600 font-medium">Choose GAF or OC Materials</span>
                  </div>
                </div>
              </div>
              
              {/* Right Content */}
              <div className="flex items-center gap-3">
                {is3mgStandardSelected && (
                  <Badge className={`${
                    selectedPackage === '3mg-standard-gaf' 
                      ? 'bg-blue-100 text-blue-800 border-blue-300' 
                      : 'bg-orange-100 text-orange-800 border-orange-300'
                  }`}>
                    {selectedPackage === '3mg-standard-gaf' ? 'GAF Materials' : 'OC Materials'}
                  </Badge>
                )}
                <div className={`p-1 rounded ${show3mgStandardOptions ? 'bg-gray-200' : 'bg-gray-100'}`}>
                  {show3mgStandardOptions ? (
                    <ChevronUp className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Sub-Options */}
          {show3mgStandardOptions && (
            <div className="ml-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* OC Option */}
                <div 
                  className={`relative rounded-lg p-4 cursor-pointer transition-all duration-200 border ${
                    selectedPackage === '3mg-standard-oc' 
                      ? 'bg-orange-50 border-orange-400 shadow-md ring-1 ring-orange-200' 
                      : 'bg-white hover:bg-orange-25 border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => onPackageSelect('3mg-standard-oc')}
                >
                  {selectedPackage === '3mg-standard-oc' && (
                    <div className="absolute -top-1.5 -right-1.5 bg-orange-500 rounded-full p-1">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-sm">OC</span>
                      </div>
                      <h5 className="font-semibold text-sm text-white">Owens Corning</h5>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Oakridge Shingles + Proedge Hip & Ridge + Polyglass IRXE Valleys
                    </p>
                    <div className="text-xs text-orange-600 font-medium">Click to Select</div>
                  </div>
                </div>
                
                {/* GAF Option */}
                <div 
                  className={`relative rounded-lg p-4 cursor-pointer transition-all duration-200 border ${
                    selectedPackage === '3mg-standard-gaf' 
                      ? 'bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-200' 
                      : 'bg-white hover:bg-blue-25 border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => onPackageSelect('3mg-standard-gaf')}
                >
                  {selectedPackage === '3mg-standard-gaf' && (
                    <div className="absolute -top-1.5 -right-1.5 bg-blue-500 rounded-full p-1">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">GAF</span>
                      </div>
                      <h5 className="font-semibold text-sm text-white">GAF Materials</h5>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Timberline HDZ + ProStart Starter + Polyglass IRXE Valleys
                    </p>
                    <div className="text-xs text-blue-600 font-medium">Click to Select</div>
                  </div>
                </div>
              </div>
              
              {/* 3MG Standard Package Details - Show when sub-option is selected */}
              {is3mgStandardSelected && (
                <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-blue-600" />
                    <p className="font-medium text-gray-700">
                      {selectedPackage === '3mg-standard-oc' ? '3MG Standard (OC) Materials:' : '3MG Standard (GAF) Materials:'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedPackage === '3mg-standard-oc' ? (
                        <>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>Owens Corning Oakridge Shingles</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>OC Proedge Hip & Ridge</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>OC Starter Strip Plus</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>MaxFelt Synthetic Underlayment</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>Polyglass IRXE (Valleys)</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>10 Year 3MG Workmanship Warranty</li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>GAF Timberline HDZ Shingles</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>GAF ProStart Starter Strip</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>GAF Seal-A-Ridge</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>ABC Pro Guard 20 Underlayment</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>Polyglass IRXE (Valleys)</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>10 Year 3MG Workmanship Warranty</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 3MG Select - Premium Package */}
        <div 
          className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 border-2 ${
            selectedPackage === '3mg-select' 
              ? 'bg-emerald-50 border-emerald-500 shadow-lg ring-2 ring-emerald-200' 
              : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-emerald-300 hover:shadow-md'
          }`}
          onClick={() => handlePackageClick('3mg-select')}
        >
          {/* Selection Indicator */}
          {selectedPackage === '3mg-select' && (
            <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-1.5 shadow-lg">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
          
          {/* Premium Badge */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">Select</Badge>
          </div>
          
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedPackage === '3mg-select' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <Award className={`h-5 w-5 ${selectedPackage === '3mg-select' ? 'text-emerald-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h4 className="font-semibold text-base text-white">3MG Select</h4>
                  <Badge variant="secondary" className="text-xs mt-1">Premium</Badge>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span>25-Year Workmanship Warranty</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Leaf className="h-4 w-4 text-emerald-500" />
                <span>Premium Protection Package</span>
              </div>
            </div>
            
            {/* Quick preview */}
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              GAF UHDZ Shingles, Polyglass IRXE, Cobra Ridge Vent
            </div>
          </div>
        </div>
      </div>
      
      {/* Package Details - Only show for non-3MG Standard packages */}
      {selectedPackage && !is3mgStandardSelected && (
        <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-blue-600" />
            <p className="font-medium text-gray-700">
              {selectedPackage === 'gaf-1' ? 'GAF Package 1 Materials:' : 
               selectedPackage === 'gaf-2' ? 'GAF Package 2 Materials:' :
               selectedPackage === '3mg-select' ? '3MG Select Materials:' :
               'Package Materials:'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <ul className="text-sm text-gray-600 space-y-1">
              {selectedPackage === 'gaf-1' ? (
                <>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>GAF ProStart Starter Strip</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>GAF Timberline HDZ Shingles</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>GAF Seal-A-Ridge</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>WeatherWatch (Valleys Only)</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>ABC Pro Guard 20</li>
                </>
              ) : selectedPackage === 'gaf-2' ? (
                <>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>GAF Timberline HDZ Shingles</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>GAF Seal-A-Ridge (25')</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>GAF ProStart Starter Strip</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>FeltBuster Synthetic Underlayment</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>WeatherWatch Ice & Water Shield</li>
                </>
              ) : selectedPackage === '3mg-select' ? (
                <>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>GAF Timberline UHDZ Shingles</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>GAF ProStart Starter Strip</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>GAF Seal-A-Ridge Cap</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>MaxFelt Synthetic Underlayment</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>Polyglass IRXE (Valleys)</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>GAF Cobra Ridge Vent</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>25 Year 3MG Workmanship Warranty</li>
                </>
              ) : null}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageSelector; 