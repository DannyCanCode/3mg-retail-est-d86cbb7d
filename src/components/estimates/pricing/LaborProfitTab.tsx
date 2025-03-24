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

interface LaborProfitTabProps {
  onBack: () => void;
  onContinue: (laborRates: LaborRates, profitMargin: number) => void;
  initialLaborRates?: LaborRates;
  initialProfitMargin?: number;
  measurements?: MeasurementValues;
}

export interface LaborRates {
  laborRate: number; // Combined tear off and installation rate
  isHandload: boolean;
  handloadRate: number;
  dumpsterLocation: "orlando" | "outside";
  dumpsterCount: number;
  dumpsterRate: number;
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
    pitchRates: {},
    wastePercentage: 12
  },
  initialProfitMargin = 25,
  measurements
}: LaborProfitTabProps) {
  console.log("LaborProfitTab rendering, received measurements:", measurements?.totalArea);
  const [laborRates, setLaborRates] = useState<LaborRates>(initialLaborRates);
  const [profitMargin, setProfitMargin] = useState(initialProfitMargin);
  
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
  
  const handleLaborRateChange = (field: keyof Omit<LaborRates, "pitchRates" | "dumpsterCount" | "dumpsterRate">, value: string | boolean | number) => {
    let numValue = value;
    if (typeof value === "string" && field !== "dumpsterLocation") {
      numValue = parseFloat(value) || 0;
    }
    
    setLaborRates(prev => ({
      ...prev,
      [field]: numValue
    }));
    
    // Update dumpster rate when location changes
    if (field === "dumpsterLocation") {
      const newRate = value === "orlando" ? 400 : 500;
      setLaborRates(prev => ({
        ...prev,
        dumpsterRate: newRate
      }));
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
    const rate = location === "orlando" ? 400 : 500;
    
    setLaborRates(prev => ({
      ...prev,
      dumpsterLocation: location,
      dumpsterRate: rate
    }));
  };
  
  const handleContinue = () => {
    // Convert laborRate back to tearOff and installation for backward compatibility
    const compatLaborRates = {
      ...laborRates,
      tearOff: laborRates.laborRate * 0.3, // 30% of labor rate goes to tear off
      installation: laborRates.laborRate * 0.7, // 70% goes to installation
    };
    
    onContinue(laborRates, profitMargin);
  };
  
  // Generate pitch options from 8/12 to 18/12
  const pitchOptions = Array.from({ length: 11 }, (_, i) => {
    const pitch = i + 8;
    return `${pitch}:12`;
  });
  
  // Calculate the rate for each pitch level
  const getPitchRate = (pitch: string) => {
    const pitchValue = parseInt(pitch.split(/[:\/]/)[0]);
    
    // Different rate logic based on pitch range
    if (pitchValue >= 8) {
      // 8/12-18/12 has increasing rates
      const basePitchValue = 8; // 8/12 is the base pitch
      const baseRate = 90; // Base rate for 8/12
      const increment = 5; // $5 increment per pitch level
      return baseRate + (pitchValue - basePitchValue) * increment;
    } else if (pitchValue <= 2) {
      // 0/12-2/12 (low slope) has special rates
      return 75; // Just an example rate for low-slope
    } else {
      // 3/12-7/12 has the standard $85 rate
      return 85;
    }
  };
  
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
      <CardContent className="space-y-8">
        {/* Dumpsters Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Dumpsters</h3>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Based on roof area of {totalSquares} squares, we recommend {laborRates.dumpsterCount} dumpster(s).
            </p>
            
            <RadioGroup
              value={laborRates.dumpsterLocation}
              onValueChange={handleDumpsterLocationChange}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="orlando" id="orlando" />
                <Label htmlFor="orlando">Orlando ($400 per dumpster)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outside" id="outside" />
                <Label htmlFor="outside">Outside Orlando ($500 per dumpster)</Label>
              </div>
            </RadioGroup>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dumpsterCount">Number of Dumpsters</Label>
                <Input
                  id="dumpsterCount"
                  type="number"
                  value={laborRates.dumpsterCount}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dumpsterTotal">Total Dumpster Cost</Label>
                <Input
                  id="dumpsterTotal"
                  type="text"
                  value={`$${(laborRates.dumpsterCount * laborRates.dumpsterRate).toFixed(2)}`}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
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
                checked={laborRates.isHandload}
                onCheckedChange={(checked) => handleLaborRateChange("isHandload", checked)}
              />
              <Label htmlFor="handload">
                Include Handload (Additional to labor tear off and installation)
              </Label>
            </div>
            
            {laborRates.isHandload && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="handloadRate">Handload Rate ($/square)</Label>
                  <Input
                    id="handloadRate"
                    type="number"
                    value={laborRates.handloadRate.toString()}
                    onChange={(e) => handleLaborRateChange("handloadRate", e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Handload cost with {laborRates.wastePercentage}% waste: 
                  ${(totalSquares * (1 + laborRates.wastePercentage/100) * laborRates.handloadRate).toFixed(2)}
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
                  value={laborRates.laborRate.toString()}
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
                  value={laborRates.wastePercentage.toString()}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm mb-2">Fixed 12% waste factored into calculations</p>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">Labor with waste: 
                  ${(totalSquares * (1 + laborRates.wastePercentage/100) * laborRates.laborRate).toFixed(2)}
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
                  ${getPitchRate(steepestPitch.replace("/", ":"))}/square.
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
