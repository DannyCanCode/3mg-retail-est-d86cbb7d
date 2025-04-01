import React, { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MeasurementValues } from "../measurement/types";
import { Material } from "../materials/types";

interface LaborProfitTabProps {
  onBack: () => void;
  onContinue: (laborRates: LaborRates, profitMargin: number) => void;
  initialLaborRates?: LaborRates;
  initialProfitMargin?: number;
  measurements?: MeasurementValues;
  selectedMaterials: {[key: string]: Material};
  quantities: {[key: string]: number};
  initialLaborRates2?: LaborRates;
  initialProfitMargin2?: number;
  onLaborProfitContinue: (laborRates: LaborRates, profitMargin: number) => void;
  readOnly?: boolean;
}

export interface LaborRates {
  laborRate?: number; // Combined tear off and installation rate
  tearOff?: number; // For backward compatibility
  installation?: number; // For backward compatibility
  isHandload: boolean;
  handloadRate: number;
  dumpsterLocation: "orlando" | "outside";
  dumpsterCount: number;
  dumpsterRate: number;
  includePermits: boolean; // Add permits flag
  permitRate: number; // Add permit rate
  pitchRates: {[pitch: string]: number};
  wastePercentage: number;
}

export function LaborProfitTab({
  onBack,
  onContinue,
  initialLaborRates = {
    laborRate: 85, // Default combined rate for 3/12-7/12 pitches
    isHandload: false,
    handloadRate: 15,
    dumpsterLocation: "orlando",
    dumpsterCount: 1,
    dumpsterRate: 400,
    includePermits: true, // Default to include permits
    permitRate: 550, // Default to Orlando permit rate
    pitchRates: {},
    wastePercentage: 12
  },
  initialProfitMargin = 25,
  measurements,
  selectedMaterials,
  quantities,
  initialLaborRates2,
  initialProfitMargin2,
  onLaborProfitContinue,
  readOnly
}: LaborProfitTabProps) {
  console.log("LaborProfitTab rendering, received measurements:", measurements?.totalArea);
  console.log("Received initialLaborRates:", JSON.stringify(initialLaborRates, null, 2));
  
  // Create a safe initial LaborRates object with all required properties and fallbacks
  const safeInitialRates: LaborRates = {
    // Ensure all required fields have default values
    laborRate: 85,
    tearOff: 0,
    installation: 0,
    isHandload: false,
    handloadRate: 15,
    dumpsterLocation: "orlando",
    dumpsterCount: 1,
    dumpsterRate: 400,
    includePermits: true,
    permitRate: 550,
    pitchRates: {},
    wastePercentage: 12,
    // Override with any values from initialLaborRates that exist
    ...initialLaborRates,
    // If initialLaborRates2 is provided, use those values instead
    ...(initialLaborRates2 || {})
  };
  
  console.log("Using safeInitialRates:", JSON.stringify(safeInitialRates, null, 2));
  
  // Normalize for backward compatibility (only if needed)
  if (!safeInitialRates.laborRate && (safeInitialRates.tearOff || safeInitialRates.installation)) {
    safeInitialRates.laborRate = (safeInitialRates.tearOff || 0) + (safeInitialRates.installation || 0);
    console.log(`Converted old labor rates to combined rate: ${safeInitialRates.laborRate}`);
  }
  
  const [laborRates, setLaborRates] = useState<LaborRates>(safeInitialRates);
  const [profitMargin, setProfitMargin] = useState(initialProfitMargin2 || initialProfitMargin || 25);
  
  // Calculate the rate for each pitch level
  const getPitchRate = (pitch: string = "6:12") => {
    try {
      // Handle potential undefined or malformed input
      if (!pitch) {
        console.log("getPitchRate received undefined/empty pitch, using default");
        return 85; // Default rate for standard pitch
      }
      
      // Make sure we have a valid string to parse
      const pitchValue = parseInt(pitch.split(/[:\/]/)[0]) || 0;
      console.log(`Calculating rate for pitch ${pitch}, numeric value: ${pitchValue}`);
      
      // Different rate logic based on pitch range
      if (pitchValue >= 8) {
        // 8/12-18/12 has increasing rates
        const basePitchValue = 8; // 8/12 is the base pitch
        const baseRate = 90; // Base rate for 8/12
        const increment = 5; // $5 increment per pitch level
        return baseRate + (pitchValue - basePitchValue) * increment;
      } else if (pitchValue === 0) {
        // 0/12 pitch uses GAF Poly ISO with $60/sq labor rate
        // This is handled separately in the getLaborCostForMaterial function
        return 60;
      } else if (pitchValue <= 2) {
        // 1/12-2/12 uses Polyglass Base and Cap with $100/sq labor rate
        // This is handled separately in the getLaborCostForMaterial function
        return 100;
      } else {
        // 3/12-7/12 has the standard $85 rate
        return 85;
      }
    } catch (e) {
      console.error("Error in getPitchRate:", e);
      return 85; // Default fallback
    }
  };
  
  // Get labor cost for a specific material
  const getLaborCostForMaterial = (materialId: string, squaresArea: number): number => {
    // Special case for GAF Poly ISO 4X8 (0/12 pitch) - $60/sq
    if (materialId === "gaf-poly-iso-4x8") {
      return squaresArea * 60;
    }
    
    // Special case for Polyglass Base Sheet (1/12 or 2/12 pitch) - $50/sq
    if (materialId === "polyglass-elastoflex-sbs") {
      return squaresArea * 50;
    }
    
    // Special case for Polyglass Cap Sheet (1/12 or 2/12 pitch) - $50/sq
    if (materialId === "polyglass-polyflex-app") {
      return squaresArea * 50;
    }
    
    // Default labor rate for standard pitches
    return squaresArea * (laborRates.laborRate || 85);
  };
  
  const calculateTotalLaborCost = (measurements: MeasurementValues, laborRates: LaborRates, selectedMaterials: {[key: string]: Material} = {}, quantities: {[key: string]: number} = {}) => {
    // Start with base assumptions
    const totalArea = measurements?.totalArea || 0;
    const squares = totalArea / 100;
    
    let totalLaborCost = 0;
    let has0PitchMaterial = false;
    let has12PitchMaterial = false;
    
    // Check for special pitch materials
    if (selectedMaterials) {
      has0PitchMaterial = Object.values(selectedMaterials).some(material => 
        material.id === "gaf-poly-iso-4x8");
      
      has12PitchMaterial = Object.values(selectedMaterials).some(material => 
        material.id === "polyglass-elastoflex-sbs" || material.id === "polyglass-polyflex-app");
    }
    
    // Calculate labor based on pitch areas
    if (measurements?.areasByPitch && measurements.areasByPitch.length > 0) {
      measurements.areasByPitch.forEach(area => {
        const pitchRaw = area.pitch;
        const pitchValue = parseInt(pitchRaw.split(/[:\/]/)[0]) || 0;
        const pitchSquares = area.area / 100;
        
        // Apply different labor rates based on pitch
        if (pitchValue === 0 && has0PitchMaterial) {
          // 0/12 pitch uses $60/sq labor rate for GAF Poly ISO
          totalLaborCost += pitchSquares * 60; // $60/sq for 0/12 pitch areas
        } else if ((pitchValue === 1 || pitchValue === 2) && has12PitchMaterial) {
          // 1/12 or 2/12 pitch uses $100/sq labor rate for Polyglass Base and Cap
          totalLaborCost += pitchSquares * 100; // $100/sq for 1/12-2/12 pitch areas
        } else {
          // Regular labor rate for standard pitches
          const specificPitchRate = laborRates.pitchRates[pitchRaw] || getPitchRate(pitchRaw);
          totalLaborCost += pitchSquares * specificPitchRate;
        }
      });
    } else {
      // Fallback if no pitch data
      totalLaborCost = squares * (laborRates.laborRate || 85);
    }
    
    // Add handload cost if applicable
    if (laborRates.isHandload) {
      totalLaborCost += squares * (laborRates.handloadRate || 15);
    }
    
    return totalLaborCost;
  };
  
  // Calculate approximate labor cost
  const estTotalLaborCost = measurements ? 
    calculateTotalLaborCost(measurements, laborRates, selectedMaterials, quantities) : 0;
  
  // Calculate dumpster count based on total roof area
  useEffect(() => {
    console.log("LaborProfitTab useEffect triggered, measurements:", measurements?.totalArea);
    if (measurements?.totalArea) {
      const totalSquares = measurements.totalArea / 100;
      const dumpsterCount = Math.max(1, Math.ceil(totalSquares / 20));
      const dumpsterRate = laborRates.dumpsterLocation === "orlando" ? 400 : 500;
      
      console.log(`Calculating dumpsters: ${totalSquares} squares, dumpsterCount: ${dumpsterCount}`);
      setLaborRates(prev => ({
        ...prev,
        dumpsterCount,
        dumpsterRate
      }));
    }
  }, [measurements?.totalArea, laborRates.dumpsterLocation]);
  
  // Update permit rate when location changes
  useEffect(() => {
    const newPermitRate = laborRates.dumpsterLocation === "orlando" ? 550 : 700;
    
    setLaborRates(prev => ({
      ...prev,
      permitRate: newPermitRate
    }));
  }, [laborRates.dumpsterLocation]);
  
  const handleLaborRateChange = (field: keyof Omit<LaborRates, "pitchRates" | "dumpsterCount" | "dumpsterRate" | "permitRate">, value: string | boolean | number) => {
    let numValue = value;
    if (typeof value === "string" && field !== "dumpsterLocation") {
      numValue = parseFloat(value) || 0;
    }
    
    setLaborRates(prev => {
      // Make sure prev is not undefined
      const safePrev = prev || {
        laborRate: 85,
        isHandload: false,
        handloadRate: 15,
        dumpsterLocation: "orlando",
        dumpsterCount: 1,
        dumpsterRate: 400,
        includePermits: true,
        permitRate: 550,
        pitchRates: {},
        wastePercentage: 12
      };
      
      return {
        ...safePrev,
        [field]: numValue
      };
    });
    
    // Update dumpster rate when location changes with safety check
    if (field === "dumpsterLocation") {
      const newRate = value === "orlando" ? 400 : 500;
      setLaborRates(prev => {
        // Make sure prev is not undefined
        const safePrev = prev || {
          laborRate: 85,
          isHandload: false,
          handloadRate: 15,
          dumpsterLocation: "orlando",
          dumpsterCount: 1,
          dumpsterRate: 400,
          includePermits: true,
          permitRate: 550,
          pitchRates: {},
          wastePercentage: 12
        };
        
        return {
          ...safePrev,
          dumpsterRate: newRate
        };
      });
    }
  };
  
  const handlePitchRateChange = (pitch: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLaborRates(prev => ({
      ...prev,
      pitchRates: {
        ...prev.pitchRates,
        [pitch]: numValue
      }
    }));
  };
  
  const handleProfitMarginChange = (value: number[]) => {
    setProfitMargin(value[0]);
  };
  
  const handleDumpsterLocationChange = (value: string) => {
    const location = value as "orlando" | "outside";
    const dumpsterRate = location === "orlando" ? 400 : 500;
    const permitRate = location === "orlando" ? 550 : 700;
    
    setLaborRates(prev => ({
      ...prev,
      dumpsterLocation: location,
      dumpsterRate,
      permitRate
    }));
  };
  
  const handleContinue = () => {
    // Convert laborRate back to tearOff and installation for backward compatibility
    const compatLaborRates = {
      ...laborRates,
      tearOff: laborRates.laborRate * 0.3, // 30% of labor rate goes to tear off
      installation: laborRates.laborRate * 0.7, // 70% goes to installation
    };
    
    if (onLaborProfitContinue) {
      onLaborProfitContinue(laborRates, profitMargin);
    } else if (onContinue) {
      onContinue(laborRates, profitMargin);
    }
  };
  
  // Generate pitch options from 8/12 to 18/12
  const pitchOptions = Array.from({ length: 11 }, (_, i) => {
    const pitch = i + 8;
    return `${pitch}:12`;
  });
  
  // Build a list of pitch rates to display
  const pitchRateDisplay = pitchOptions.map(pitch => {
    const defaultRate = getPitchRate(pitch);
    return {
      pitch,
      rate: defaultRate
    };
  });
  
  // Calculate total squares for display
  const totalSquares = measurements?.totalArea ? Math.round(measurements.totalArea / 100 * 10) / 10 : 0;
  
  // Check if any pitches are 8/12 or steeper
  const hasSteeperPitches = React.useMemo(() => {
    if (!measurements?.areasByPitch) return false;
    
    return measurements.areasByPitch.some(areaByPitch => {
      const pitchParts = areaByPitch.pitch.split(/[:\/]/);
      if (pitchParts.length < 2) return false;
      
      const numerator = parseInt(pitchParts[0]);
      return numerator >= 8;
    });
  }, [measurements?.areasByPitch]);
  
  // Get steepest pitch for display
  const steepestPitch = React.useMemo(() => {
    if (!measurements?.areasByPitch || measurements.areasByPitch.length === 0) {
      return "8:12"; // Default if no pitches
    }
    
    let maxPitch = 0;
    let pitchText = "8:12";
    
    measurements.areasByPitch.forEach(areaByPitch => {
      const pitchParts = areaByPitch.pitch.split(/[:\/]/);
      if (pitchParts.length < 2) return;
      
      const numerator = parseInt(pitchParts[0]);
      if (numerator > maxPitch) {
        maxPitch = numerator;
        pitchText = areaByPitch.pitch;
      }
    });
    
    return pitchText;
  }, [measurements?.areasByPitch]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Labor Rates & Profit Margin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dumpster Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Dumpsters</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Based on roof area of {totalSquares} squares, we recommend {laborRates.dumpsterCount} dumpster(s).
          </p>
          
          <div className="space-y-4">
            <RadioGroup
              value={laborRates.dumpsterLocation}
              onValueChange={handleDumpsterLocationChange}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="orlando" id="orlando" />
                <Label htmlFor="orlando">Orlando (${laborRates.dumpsterLocation === "orlando" ? "400" : "500"} per dumpster)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outside" id="outside" />
                <Label htmlFor="outside">Outside Orlando (${laborRates.dumpsterLocation === "outside" ? "500" : "400"} per dumpster)</Label>
              </div>
            </RadioGroup>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dumpsterCount">Number of Dumpsters</Label>
                <Input
                  id="dumpsterCount"
                  type="number"
                  value={(laborRates.dumpsterCount || 1).toString()}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dumpsterTotal">Total Dumpster Cost</Label>
                <Input
                  id="dumpsterTotal"
                  type="text"
                  value={`$${((laborRates.dumpsterCount || 1) * (laborRates.dumpsterRate || 400)).toFixed(2)}`}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Permits Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Permits</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Switch
                id="includePermits"
                checked={!!laborRates.includePermits}
                onCheckedChange={(checked) => handleLaborRateChange("includePermits", checked)}
              />
              <Label htmlFor="includePermits">
                Include Permits
              </Label>
            </div>
            
            {!!laborRates.includePermits && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">Permit cost for {laborRates.dumpsterLocation === "orlando" ? "Orlando" : "Outside Orlando"}: 
                  ${laborRates.permitRate.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Handload Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Handload</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Switch
                id="handload"
                checked={!!laborRates.isHandload}
                onCheckedChange={(checked) => handleLaborRateChange("isHandload", checked)}
              />
              <Label htmlFor="handload">
                Include Handload (Additional to labor tear off and installation)
              </Label>
            </div>
            
            {!!laborRates.isHandload && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="handloadRate">Handload Rate ($/square)</Label>
                  <Input
                    id="handloadRate"
                    type="number"
                    value={(laborRates.handloadRate || 15).toString()}
                    onChange={(e) => handleLaborRateChange("handloadRate", e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Handload cost with {laborRates.wastePercentage || 12}% waste: 
                  ${(totalSquares * (1 + (laborRates.wastePercentage || 12)/100) * (laborRates.handloadRate || 15)).toFixed(2)}
                </p>
              </>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Combined Labor Rate */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Labor Rates (per square)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="laborRate">Labor Rate ($/square)</Label>
                <Input
                  id="laborRate"
                  type="number"
                  value={(laborRates.laborRate || 85).toString()}
                  onChange={(e) => handleLaborRateChange("laborRate", e.target.value)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Combined rate for tear off and installation (3/12-7/12 pitches)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="wastePercentage">Waste Percentage (%)</Label>
                <Input
                  id="wastePercentage"
                  type="number"
                  value={(laborRates.wastePercentage || 12).toString()}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm mb-2">Fixed 12% waste factored into calculations</p>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">Labor with waste: 
                  ${(totalSquares * (1 + (laborRates.wastePercentage || 12)/100) * (laborRates.laborRate || 85)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Pitch Based Pricing */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Pitch-Based Labor Rates</h3>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Labor rates for steeper pitches (starting at 8/12 with $90/square):
            </p>
            
            {hasSteeperPitches && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> This roof has pitches that are 8/12 or steeper. 
                  The steepest pitch is {steepestPitch}, which will require a labor rate of 
                  ${getPitchRate(steepestPitch?.replace("/", ":") || "8:12")}/square.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pitchRateDisplay.map(({ pitch, rate }) => (
                <div key={pitch} className="flex items-center space-x-2">
                  <Label htmlFor={`pitch_${pitch}`} className="min-w-24">{pitch}</Label>
                  <Input
                    id={`pitch_${pitch}`}
                    type="text"
                    value={`$${rate}/square`}
                    readOnly
                    className="bg-muted flex-1"
                  />
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Different labor rates apply for different pitch ranges:
                <ul className="mt-1 list-disc list-inside">
                  <li>0/12-2/12 (low slope): $75/square</li>
                  <li>3/12-7/12 (standard): $85/square</li>
                  <li>8/12-18/12 (steep): $90-$140/square (increases with pitch)</li>
                </ul>
              </p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Profit Margin */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Profit Margin</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="profitMargin">Profit Margin (%)</Label>
              <span className="font-medium">{profitMargin}%</span>
            </div>
            <Slider
              id="profitMargin"
              value={[profitMargin]}
              min={0}
              max={50}
              step={1}
              onValueChange={handleProfitMarginChange}
            />
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Labor rates are applied per square of roof area. The profit margin is applied to the total cost of materials and labor.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Materials
        </Button>
        <Button 
          type="button" 
          onClick={handleContinue}
          className="flex items-center gap-2"
        >
          Continue to Summary
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
