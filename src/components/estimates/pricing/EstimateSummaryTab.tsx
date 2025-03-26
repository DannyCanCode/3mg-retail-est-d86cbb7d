import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { MeasurementValues } from "../measurement/types";
import { Material } from "../materials/types";
import { LaborRates } from "./LaborProfitTab";

interface EstimateSummaryTabProps {
  measurements: MeasurementValues;
  materials: {[key: string]: Material};
  quantities: {[key: string]: number};
  laborRates: LaborRates;
  profitMargin: number;
  onBack: () => void;
  onFinalize: () => void;
  isSubmitting?: boolean;
}

export function EstimateSummaryTab({
  measurements,
  materials,
  quantities,
  laborRates,
  profitMargin,
  onBack,
  onFinalize,
  isSubmitting = false
}: EstimateSummaryTabProps) {
  // Add defensive checks to prevent errors when rendering with missing data
  if (!measurements || !materials || !quantities || !laborRates) {
    console.error("EstimateSummaryTab missing required props:", { 
      hasMeasurements: !!measurements, 
      hasMaterials: !!materials,
      hasQuantities: !!quantities,
      hasLaborRates: !!laborRates
    });
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estimate Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center">
            <p className="text-red-500 mb-4">Missing required data to display summary.</p>
            <Button onClick={onBack} variant="default">
              Go Back to Previous Step
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure safe access to properties with fallbacks
  const safeMeasurements = {
    totalArea: measurements?.totalArea || 0,
    roofPitch: measurements?.roofPitch || "3/12",
    areasByPitch: measurements?.areasByPitch || []
  };
  
  const safeLaborRates = {
    laborRate: laborRates?.laborRate || 85,
    tearOff: laborRates?.tearOff || 0,
    installation: laborRates?.installation || 0,
    isHandload: laborRates?.isHandload || false,
    handloadRate: laborRates?.handloadRate || 15,
    dumpsterLocation: laborRates?.dumpsterLocation || "orlando",
    dumpsterCount: laborRates?.dumpsterCount || 1,
    dumpsterRate: laborRates?.dumpsterRate || 400,
    includePermits: laborRates?.includePermits || true,
    permitRate: laborRates?.permitRate || 550,
    pitchRates: laborRates?.pitchRates || {},
    wastePercentage: laborRates?.wastePercentage || 12
  };

  // Calculate the number of squares
  const totalSquares = Math.round(safeMeasurements.totalArea / 100 * 10) / 10;
  
  // Calculate material costs
  const materialCosts = Object.entries(materials || {}).map(([key, material]) => {
    const quantity = quantities[key] || 0;
    const totalCost = material.price * quantity;
    return {
      name: material.name,
      quantity,
      unit: material.unit,
      unitPrice: material.price,
      totalCost
    };
  });
  
  const totalMaterialCost = materialCosts.reduce((sum, item) => sum + item.totalCost, 0);
  
  // Calculate labor costs with combined labor rate
  const laborCosts = [];

  // Add combined labor or backward compatibility with separate tear off/installation
  if (safeLaborRates.laborRate) {
    // Use combined labor rate - but apply pitch-specific rates for different areas
    
    // Check if we have pitch areas to calculate with
    if (safeMeasurements.areasByPitch && safeMeasurements.areasByPitch.length > 0) {
      // Calculate labor cost for each pitch area
      const pitchAreas = safeMeasurements.areasByPitch;
      
      // Track if we've already added any pitch-specific labor items
      let hasPitchSpecificLabor = false;
      
      // Loop through each pitch area and apply the appropriate rate
      pitchAreas.forEach(pitchArea => {
        // Get the pitch value (numeric part of the pitch)
        const pitch = pitchArea.pitch;
        const pitchValue = parseInt(pitch.split(/[:\/]/)[0]) || 0;
        const areaSquares = pitchArea.area / 100; // Convert to squares
        
        // Determine the appropriate rate for this pitch
        let rate = safeLaborRates.laborRate; // Default to the standard rate
        
        if (pitchValue >= 8) {
          // 8/12-18/12 has increasing rates
          const basePitchValue = 8; // 8/12 is the base pitch
          const baseRate = 90; // Base rate for 8/12
          const increment = 5; // $5 increment per pitch level
          rate = baseRate + (pitchValue - basePitchValue) * increment;
          
          laborCosts.push({ 
            name: `Labor for ${pitch} Pitch (${Math.round(areaSquares * 10) / 10} squares)`, 
            rate: rate, 
            totalCost: rate * areaSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
          });
          
          hasPitchSpecificLabor = true;
        } else if (pitchValue <= 2) {
          // 0/12-2/12 (low slope) has special rates
          rate = 75;
          
          laborCosts.push({ 
            name: `Labor for ${pitch} Pitch (Low Slope) (${Math.round(areaSquares * 10) / 10} squares)`, 
            rate: rate, 
            totalCost: rate * areaSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
          });
          
          hasPitchSpecificLabor = true;
        } else {
          // 3/12-7/12 has the standard rate
          // Always add standard pitches too (not just when other pitches exist)
          laborCosts.push({ 
            name: `Labor for ${pitch} Pitch (${Math.round(areaSquares * 10) / 10} squares)`, 
            rate: rate, 
            totalCost: rate * areaSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
          });
          
          // No need to set hasPitchSpecificLabor flag since we're adding all pitches now
        }
      });
      
      // We don't need this check anymore since we're always adding all pitches
      // If we didn't add any pitch-specific labor (all standard pitches), add the standard rate for the total
      // if (!hasPitchSpecificLabor) {
      //   laborCosts.push({ 
      //     name: "Labor (Tear Off & Installation)", 
      //     rate: safeLaborRates.laborRate, 
      //     totalCost: safeLaborRates.laborRate * totalSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
      //   });
      // }
    } else {
      // No pitch areas available, just use the standard rate for the total
      laborCosts.push({ 
        name: "Labor (Tear Off & Installation)", 
        rate: safeLaborRates.laborRate, 
        totalCost: safeLaborRates.laborRate * totalSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
      });
    }
  } else if (safeLaborRates.tearOff || safeLaborRates.installation) {
    // Backward compatibility: handle old format with separate rates
    const tearOff = safeLaborRates.tearOff || 0;
    const installation = safeLaborRates.installation || 0;
    
    if (tearOff > 0) {
      laborCosts.push({ 
        name: "Tear Off", 
        rate: tearOff, 
        totalCost: tearOff * totalSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
      });
    }
    
    if (installation > 0) {
      laborCosts.push({ 
        name: "Installation", 
        rate: installation, 
        totalCost: installation * totalSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
      });
    }
  } else {
    // Fallback to default rate if neither format is available
    const defaultRate = 85;
    laborCosts.push({ 
      name: "Labor (Default Rate)", 
      rate: defaultRate, 
      totalCost: defaultRate * totalSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
    });
  }

  // Add handload cost if enabled
  if (safeLaborRates.isHandload) {
    laborCosts.push({
      name: "Handload", 
      rate: safeLaborRates.handloadRate || 15, 
      totalCost: (safeLaborRates.handloadRate || 15) * totalSquares * (1 + (safeLaborRates.wastePercentage || 12)/100)
    });
  }
  
  // Add dumpster costs
  laborCosts.push({
    name: `Dumpsters (${safeLaborRates.dumpsterCount})`, 
    rate: safeLaborRates.dumpsterRate, 
    totalCost: safeLaborRates.dumpsterRate * safeLaborRates.dumpsterCount
  });
  
  // Add permit costs if included
  if (safeLaborRates.includePermits) {
    laborCosts.push({
      name: `Permits (${safeLaborRates.dumpsterLocation === "orlando" ? "Orlando" : "Outside Orlando"})`,
      rate: safeLaborRates.permitRate,
      totalCost: safeLaborRates.permitRate
    });
  }
  
  const totalLaborCost = laborCosts.reduce((sum, item) => sum + item.totalCost, 0);
  
  // Calculate total costs
  const subtotal = totalMaterialCost + totalLaborCost;
  const profitAmount = subtotal * (profitMargin / 100);
  const totalCost = subtotal + profitAmount;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Project Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Roof Area:</p>
              <p className="font-medium">{safeMeasurements.totalArea.toLocaleString()} sq ft ({totalSquares} squares)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Predominant Pitch:</p>
              <p className="font-medium">{safeMeasurements.roofPitch}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Materials</h3>
          <div className="border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Material</th>
                  <th className="text-right py-2 px-4">Quantity</th>
                  <th className="text-right py-2 px-4">Unit Price</th>
                  <th className="text-right py-2 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {materialCosts.map((item, index) => (
                  <tr key={index} className={index < materialCosts.length - 1 ? "border-b" : ""}>
                    <td className="py-2 px-4">{item.name}</td>
                    <td className="text-right py-2 px-4">{item.quantity} {item.unit}</td>
                    <td className="text-right py-2 px-4">${item.unitPrice.toFixed(2)}</td>
                    <td className="text-right py-2 px-4">${item.totalCost.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30">
                  <td colSpan={3} className="py-2 px-4 font-semibold">Materials Subtotal</td>
                  <td className="text-right py-2 px-4 font-semibold">${totalMaterialCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Labor</h3>
          <div className="border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Category</th>
                  <th className="text-right py-2 px-4">Rate (per square)</th>
                  <th className="text-right py-2 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {laborCosts.map((item, index) => (
                  <tr key={index} className={index < laborCosts.length - 1 ? "border-b" : ""}>
                    <td className="py-2 px-4">{item.name}</td>
                    <td className="text-right py-2 px-4">${item.rate.toFixed(2)}</td>
                    <td className="text-right py-2 px-4">${item.totalCost.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30">
                  <td colSpan={2} className="py-2 px-4 font-semibold">Labor Subtotal</td>
                  <td className="text-right py-2 px-4 font-semibold">${totalLaborCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pricing Summary</h3>
          <div className="border rounded-md">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4">Materials Subtotal</td>
                  <td className="text-right py-2 px-4">${totalMaterialCost.toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Labor Subtotal</td>
                  <td className="text-right py-2 px-4">${totalLaborCost.toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Project Subtotal</td>
                  <td className="text-right py-2 px-4">${subtotal.toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Profit Margin ({profitMargin}%)</td>
                  <td className="text-right py-2 px-4">${profitAmount.toFixed(2)}</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="py-2 px-4 font-semibold">Total Estimate</td>
                  <td className="text-right py-2 px-4 font-semibold text-lg">${totalCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
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
          Back to Labor & Profit
        </Button>
        <Button 
          type="button" 
          onClick={onFinalize}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Finalize Estimate"}
        </Button>
      </CardFooter>
    </Card>
  );
}
