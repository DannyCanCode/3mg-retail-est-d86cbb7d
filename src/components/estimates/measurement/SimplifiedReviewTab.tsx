import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Shield, Lock, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MeasurementValues, AreaByPitch } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/components/RoleGuard";
import { useToast } from "@/hooks/use-toast";

interface SimplifiedReviewTabProps {
  measurements: MeasurementValues;
  onMeasurementsUpdate?: (measurements: MeasurementValues) => void;
  onBack?: () => void;
  onContinue?: () => void;
  extractedFileName?: string;
  pdfUrl?: string | null;
}

export function SimplifiedReviewTab({
  measurements,
  onMeasurementsUpdate,
  onBack,
  onContinue,
  extractedFileName,
  pdfUrl
}: SimplifiedReviewTabProps) {
  const { profile } = useAuth();
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();
  
  // �� FIX: Prevent flash by tracking if component has mounted
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSavingAndContinuing, setIsSavingAndContinuing] = useState(false);
  
  // 🔧 FIX: Only log once on mount to reduce console spam
  useEffect(() => {
    if (!hasInitialized) {
      console.log("🔍 [SimplifiedReviewTab] Props received:", {
        extractedFileName: extractedFileName || 'none',
        pdfUrl: pdfUrl || 'none',
        pdfUrlType: typeof pdfUrl,
        hasFileName: !!extractedFileName,
        hasPdfUrl: !!pdfUrl,
      });
      setHasInitialized(true);
    }
  }, [hasInitialized, extractedFileName, pdfUrl]);
  
  // Local state for editing (only used by admins)
  const [isEditing, setIsEditing] = useState(false);
  const [editableMeasurements, setEditableMeasurements] = useState<MeasurementValues>(measurements);
  
  // Calculate totals
  const totalSquares = Math.round(measurements.totalArea / 100 * 10) / 10;
  
  // Determine if user can edit measurements
  const canEditMeasurements = isAdmin;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableMeasurements(prev => ({
      ...prev,
      [name]: name.includes('Area') || name.includes('Length') || name.includes('Count') 
        ? parseFloat(value) || 0 
        : value
    }));
  };
  
  const handleAreaByPitchChange = (index: number, field: keyof AreaByPitch, value: string) => {
    setEditableMeasurements(prev => ({
      ...prev,
      areasByPitch: prev.areasByPitch.map((area, i) => 
        i === index 
          ? { ...area, [field]: field === 'pitch' ? value : parseFloat(value) || 0 }
          : area
      )
    }));
  };
  
  const addPitchArea = () => {
    setEditableMeasurements(prev => ({
      ...prev,
      areasByPitch: [...prev.areasByPitch, { pitch: "", area: 0, percentage: 0 }]
    }));
  };
  
  const removePitchArea = (index: number) => {
    setEditableMeasurements(prev => ({
      ...prev,
      areasByPitch: prev.areasByPitch.filter((_, i) => i !== index)
    }));
  };
  
  const handleSaveAndContinue = async () => {
    if (!onMeasurementsUpdate || !onContinue) return;
    
    setIsSavingAndContinuing(true);
    
    try {
      // CRITICAL: Validate pitch data before saving to prevent corruption
      if (measurements.areasByPitch && measurements.areasByPitch.length > 0) {
        const invalidPitches = measurements.areasByPitch.filter(p => 
          !p.pitch || (!p.pitch.includes('/') && !p.pitch.includes(':') && !/^\d/.test(p.pitch))
        );
        
        if (invalidPitches.length > 0) {
          console.error("❌ CORRUPTION DETECTED - Invalid pitch data:", invalidPitches);
          toast({
            title: "Data Corruption Detected",
            description: "Invalid pitch data detected. Please refresh and re-upload your PDF.",
            variant: "destructive"
          });
          setIsSavingAndContinuing(false);
          return;
        }
        
        console.log("✅ Pitch data validated successfully:", measurements.areasByPitch);
      }
      
      // Save measurements first
      onMeasurementsUpdate(measurements);
      
      // Check for low-slope areas in the measurements
      const hasLowPitch = measurements.areasByPitch?.some(
        area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch)
      );
      
      // If there are low-slope areas, we'll display a special message in the toast
      const lowSlopeMessage = hasLowPitch ? 
        " Required materials for low-slope areas will be automatically added." : 
        "";
      
      // Show success toast
      toast({
        title: "Measurements saved",
        description: `Now you can select packages for your estimate.${lowSlopeMessage}`,
      });
      
      // Navigate to materials immediately without delay to prevent flashing
      onContinue();
      setIsSavingAndContinuing(false);
      
    } catch (error) {
      console.error("Error saving measurements:", error);
      toast({
        title: "Save failed",
        description: "Failed to save measurements. Please try again.",
        variant: "destructive"
      });
      setIsSavingAndContinuing(false);
    }
  };
  
  const currentMeasurements = isEditing ? editableMeasurements : measurements;
  
  return (
    <div className="space-y-6">
      {/* PDF Source Information */}
      {extractedFileName && (
        <div className="mb-6">
          <div className="flex items-start justify-between p-4 bg-green-900/20 rounded-lg border border-green-700/30">
            <div className="flex-1">
              <p className="text-sm text-gray-300">
                Using measurements extracted from <strong className="text-green-200">{extractedFileName}</strong>
                <br className="sm:hidden" />
                <span className="text-green-400 text-xs block sm:inline sm:ml-1">
                  {canEditMeasurements ? "Please review and make any necessary adjustments." : "Measurements have been automatically extracted and saved."}
                </span>
              </p>
            </div>
            {pdfUrl && (
              <a 
                href={pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-green-400 hover:text-green-300 hover:underline flex items-center font-medium whitespace-nowrap transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View PDF
              </a>
            )}
          </div>
        </div>
      )}
      
      <Card className="bg-gray-800/50 backdrop-blur-xl border-green-700/30">
        <CardHeader className="flex flex-row items-center justify-between border-b border-green-700/30">
          <CardTitle className="text-white">Review Measurements</CardTitle>
          
          {/* Admin Edit Controls */}
          {canEditMeasurements && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-600/30">
                <Shield className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="bg-gray-700/50 hover:bg-gray-700/70 text-green-400 border-green-600/30"
                >
                  Edit Measurements
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                                      <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditableMeasurements(measurements);
                        setIsEditing(false);
                      }}
                      className="bg-gray-700/50 hover:bg-gray-700/70 text-gray-400 border-gray-600"
                    >
                      Cancel
                    </Button>
                                      <Button
                      size="sm"
                      onClick={() => {
                        if (onMeasurementsUpdate) {
                          onMeasurementsUpdate(editableMeasurements);
                        }
                        setIsEditing(false);
                      }}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      Save Changes
                    </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Non-Admin Lock Indicator */}
          {!canEditMeasurements && (
            <Badge variant="outline" className="bg-gray-700/30 text-gray-400 border-gray-600">
              <Lock className="h-3 w-3 mr-1" />
              Read Only
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6 text-gray-300">
          {/* Property Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Property Information</h3>
            
            {isEditing ? (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyAddress" className="text-gray-300">Property Address</Label>
                  <Input
                    id="propertyAddress"
                    name="propertyAddress"
                    value={currentMeasurements.propertyAddress || ""}
                    onChange={handleInputChange}
                    placeholder="Enter property address"
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-2">
                <div className="text-sm text-gray-400">Property Address:</div>
                <div className="text-sm font-medium text-white">{currentMeasurements.propertyAddress || 'Not available'}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Area Measurements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Area Measurements</h3>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalArea" className="text-gray-300">Total Roof Area (sq ft)</Label>
                    <Input
                      id="totalArea"
                      name="totalArea"
                      type="number"
                      value={currentMeasurements.totalArea || ""}
                      onChange={handleInputChange}
                      placeholder="Enter total roof area"
                      className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="predominantPitch" className="text-gray-300">Predominant Pitch</Label>
                    <Input
                      id="predominantPitch"
                      name="predominantPitch"
                      value={currentMeasurements.predominantPitch || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., 6:12"
                      className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-2">
                  <div className="text-sm text-gray-400">Total Roof Area:</div>
                  <div className="text-sm font-medium text-white">
                    {currentMeasurements.totalArea.toLocaleString()} sq ft 
                    <Badge variant="secondary" className="ml-2">{totalSquares} squares</Badge>
                  </div>
                  
                  <div className="text-sm text-gray-400">Predominant Pitch:</div>
                  <div className="text-sm font-medium text-white">{currentMeasurements.predominantPitch}</div>
                </div>
              )}
            </div>
            
            {/* Length Measurements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Length Measurements</h3>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ridgeLength" className="text-gray-300">Ridge Length (ft)</Label>
                      <Input
                        id="ridgeLength"
                        name="ridgeLength"
                        type="number"
                        value={currentMeasurements.ridgeLength || ""}
                        onChange={handleInputChange}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hipLength" className="text-gray-300">Hip Length (ft)</Label>
                      <Input
                        id="hipLength"
                        name="hipLength"
                        type="number"
                        value={currentMeasurements.hipLength || ""}
                        onChange={handleInputChange}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valleyLength" className="text-gray-300">Valley Length (ft)</Label>
                      <Input
                        id="valleyLength"
                        name="valleyLength"
                        type="number"
                        value={currentMeasurements.valleyLength || ""}
                        onChange={handleInputChange}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eaveLength" className="text-gray-300">Eave Length (ft)</Label>
                      <Input
                        id="eaveLength"
                        name="eaveLength"
                        type="number"
                        value={currentMeasurements.eaveLength || ""}
                        onChange={handleInputChange}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rakeLength" className="text-gray-300">Rake Length (ft)</Label>
                      <Input
                        id="rakeLength"
                        name="rakeLength"
                        type="number"
                        value={currentMeasurements.rakeLength || ""}
                        onChange={handleInputChange}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stepFlashingLength" className="text-gray-300">Step Flashing (ft)</Label>
                      <Input
                        id="stepFlashingLength"
                        name="stepFlashingLength"
                        type="number"
                        value={currentMeasurements.stepFlashingLength || ""}
                        onChange={handleInputChange}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-2">
                  <div className="text-sm text-gray-400">Ridge Length:</div>
                  <div className="text-sm font-medium text-white">{currentMeasurements.ridgeLength} ft</div>
                  
                  <div className="text-sm text-gray-400">Hip Length:</div>
                  <div className="text-sm font-medium text-white">{currentMeasurements.hipLength} ft</div>
                  
                  <div className="text-sm text-gray-400">Valley Length:</div>
                  <div className="text-sm font-medium text-white">{currentMeasurements.valleyLength} ft</div>
                  
                  <div className="text-sm text-gray-400">Eave Length:</div>
                  <div className="text-sm font-medium text-white">{currentMeasurements.eaveLength} ft</div>
                  
                  <div className="text-sm text-gray-400">Rake Length:</div>
                  <div className="text-sm font-medium text-white">{currentMeasurements.rakeLength} ft</div>
                  
                  <div className="text-sm text-gray-400">Step Flashing Length:</div>
                  <div className="text-sm font-medium text-white">{currentMeasurements.stepFlashingLength} ft</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Areas by Pitch */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Areas by Pitch</h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Pitch configurations</span>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={addPitchArea}
                    className="bg-gray-700/50 hover:bg-gray-700/70 text-green-400 border-green-600/30"
                  >
                    Add Pitch
                  </Button>
                </div>
                
                {currentMeasurements.areasByPitch.map((area, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <Input
                        placeholder="Pitch (e.g., 6:12)"
                        value={area.pitch}
                        onChange={(e) => handleAreaByPitchChange(index, 'pitch', e.target.value)}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        placeholder="Area (sq ft)"
                        value={area.area || ""}
                        onChange={(e) => handleAreaByPitchChange(index, 'area', e.target.value)}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        placeholder="Percentage"
                        value={area.percentage || ""}
                        onChange={(e) => handleAreaByPitchChange(index, 'percentage', e.target.value)}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePitchArea(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {currentMeasurements.areasByPitch.map((area, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-gray-400">{area.pitch} pitch:</div>
                    <div className="font-medium text-white">{area.area.toLocaleString()} sq ft</div>
                    <div className="text-gray-400">{area.percentage}% of roof</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Note about auto-extracted measurements */}
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
            <p className="text-sm text-blue-300 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
              <span className="flex-1">
                <strong>Note:</strong> These measurements have been automatically extracted and saved. They will be used to calculate material quantities.
              </span>
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t border-green-700/30 pt-6">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="bg-gray-700/50 hover:bg-gray-700/70 text-green-400 border-green-600/30"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
          <Button 
            onClick={handleSaveAndContinue}
            disabled={isSavingAndContinuing}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
          >
            {isSavingAndContinuing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue to Select Packages
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 