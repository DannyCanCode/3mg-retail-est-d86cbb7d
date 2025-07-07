import React, { useState } from "react";
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
  
  // 🔍 DEBUG: Log what props we're receiving
  console.log("🔍 [SimplifiedReviewTab] Props received:", {
    extractedFileName: extractedFileName || "NULL",
    pdfUrl: pdfUrl || "NULL",
    pdfUrlType: typeof pdfUrl,
    hasFileName: !!extractedFileName,
    hasPdfUrl: !!pdfUrl
  });
  
  // Local state for editing (only used by admins)
  const [isEditing, setIsEditing] = useState(false);
  const [editableMeasurements, setEditableMeasurements] = useState<MeasurementValues>(measurements);
  const [isSavingAndContinuing, setIsSavingAndContinuing] = useState(false);
  
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
        description: `Now you can select materials for your estimate.${lowSlopeMessage}`,
      });
      
      // Navigate to materials after a brief delay to ensure state updates complete
      setTimeout(() => {
        onContinue();
        setIsSavingAndContinuing(false);
      }, 50);
      
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
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="flex justify-between items-center">
            <p className="text-sm text-blue-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
              Using measurements extracted from <strong>{extractedFileName}</strong>. 
              {canEditMeasurements ? "Please review and make any necessary adjustments." : "Measurements have been automatically extracted and saved."}
            </p>
            {pdfUrl && (
              <a 
                href={pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View PDF
              </a>
            )}
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Review Measurements</CardTitle>
          
          {/* Admin Edit Controls */}
          {canEditMeasurements && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Shield className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
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
                    >
                      Save Changes
                    </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Non-Admin Lock Indicator */}
          {!canEditMeasurements && (
            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
              <Lock className="h-3 w-3 mr-1" />
              Read Only
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Property Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Property Information</h3>
            
            {isEditing ? (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyAddress">Property Address</Label>
                  <Input
                    id="propertyAddress"
                    name="propertyAddress"
                    value={currentMeasurements.propertyAddress || ""}
                    onChange={handleInputChange}
                    placeholder="Enter property address"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-2">
                <div className="text-sm text-muted-foreground">Property Address:</div>
                <div className="text-sm font-medium">{currentMeasurements.propertyAddress || 'Not available'}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Area Measurements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Area Measurements</h3>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalArea">Total Roof Area (sq ft)</Label>
                    <Input
                      id="totalArea"
                      name="totalArea"
                      type="number"
                      value={currentMeasurements.totalArea || ""}
                      onChange={handleInputChange}
                      placeholder="Enter total roof area"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="predominantPitch">Predominant Pitch</Label>
                    <Input
                      id="predominantPitch"
                      name="predominantPitch"
                      value={currentMeasurements.predominantPitch || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., 6:12"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-2">
                  <div className="text-sm text-muted-foreground">Total Roof Area:</div>
                  <div className="text-sm font-medium">
                    {currentMeasurements.totalArea.toLocaleString()} sq ft 
                    <Badge variant="secondary" className="ml-2">{totalSquares} squares</Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">Predominant Pitch:</div>
                  <div className="text-sm font-medium">{currentMeasurements.predominantPitch}</div>
                </div>
              )}
            </div>
            
            {/* Length Measurements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Length Measurements</h3>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ridgeLength">Ridge Length (ft)</Label>
                      <Input
                        id="ridgeLength"
                        name="ridgeLength"
                        type="number"
                        value={currentMeasurements.ridgeLength || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hipLength">Hip Length (ft)</Label>
                      <Input
                        id="hipLength"
                        name="hipLength"
                        type="number"
                        value={currentMeasurements.hipLength || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valleyLength">Valley Length (ft)</Label>
                      <Input
                        id="valleyLength"
                        name="valleyLength"
                        type="number"
                        value={currentMeasurements.valleyLength || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eaveLength">Eave Length (ft)</Label>
                      <Input
                        id="eaveLength"
                        name="eaveLength"
                        type="number"
                        value={currentMeasurements.eaveLength || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rakeLength">Rake Length (ft)</Label>
                      <Input
                        id="rakeLength"
                        name="rakeLength"
                        type="number"
                        value={currentMeasurements.rakeLength || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stepFlashingLength">Step Flashing (ft)</Label>
                      <Input
                        id="stepFlashingLength"
                        name="stepFlashingLength"
                        type="number"
                        value={currentMeasurements.stepFlashingLength || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-2">
                  <div className="text-sm text-muted-foreground">Ridge Length:</div>
                  <div className="text-sm font-medium">{currentMeasurements.ridgeLength} ft</div>
                  
                  <div className="text-sm text-muted-foreground">Hip Length:</div>
                  <div className="text-sm font-medium">{currentMeasurements.hipLength} ft</div>
                  
                  <div className="text-sm text-muted-foreground">Valley Length:</div>
                  <div className="text-sm font-medium">{currentMeasurements.valleyLength} ft</div>
                  
                  <div className="text-sm text-muted-foreground">Eave Length:</div>
                  <div className="text-sm font-medium">{currentMeasurements.eaveLength} ft</div>
                  
                  <div className="text-sm text-muted-foreground">Rake Length:</div>
                  <div className="text-sm font-medium">{currentMeasurements.rakeLength} ft</div>
                  
                  <div className="text-sm text-muted-foreground">Step Flashing Length:</div>
                  <div className="text-sm font-medium">{currentMeasurements.stepFlashingLength} ft</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Areas by Pitch */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Areas by Pitch</h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pitch configurations</span>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={addPitchArea}
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
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        placeholder="Area (sq ft)"
                        value={area.area || ""}
                        onChange={(e) => handleAreaByPitchChange(index, 'area', e.target.value)}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        placeholder="Percentage"
                        value={area.percentage || ""}
                        onChange={(e) => handleAreaByPitchChange(index, 'percentage', e.target.value)}
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="col-span-1">
                      {currentMeasurements.areasByPitch.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removePitchArea(index)}
                          className="h-8 w-8"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {currentMeasurements.areasByPitch.map((area, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 text-sm">
                    <div>{area.pitch} pitch:</div>
                    <div>{area.area.toLocaleString()} sq ft</div>
                    <div>{area.percentage}% of roof</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {!isEditing && (
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> These measurements have been automatically extracted and saved. They will be used to calculate material quantities.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          {onBack && (
            <Button 
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2"
              disabled={isSavingAndContinuing}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Upload
            </Button>
          )}
          
          {onContinue && !isEditing && (
            <Button 
              onClick={handleSaveAndContinue}
              className="flex items-center gap-2 ml-auto"
              disabled={isSavingAndContinuing}
            >
              {isSavingAndContinuing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving & Continuing...
                </>
              ) : (
                <>
                  Continue to Select Materials
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 