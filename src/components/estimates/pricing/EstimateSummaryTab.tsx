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
  // Calculate the number of squares
  const totalSquares = Math.round(measurements.totalArea / 100 * 10) / 10;
  
  // Calculate material costs
  const materialCosts = Object.entries(materials).map(([key, material]) => {
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
  
  // Calculate labor costs
  const laborCosts = [
    { name: "Tear Off", rate: laborRates.tearOff, totalCost: laborRates.tearOff * totalSquares * (1 + laborRates.wastePercentage/100) },
    { name: "Installation", rate: laborRates.installation, totalCost: laborRates.installation * totalSquares * (1 + laborRates.wastePercentage/100) }
  ];
  
  // Add handload cost if enabled
  if (laborRates.isHandload) {
    laborCosts.push({
      name: "Handload", 
      rate: laborRates.handloadRate, 
      totalCost: laborRates.handloadRate * totalSquares * (1 + laborRates.wastePercentage/100)
    });
  }
  
  // Add dumpster costs
  laborCosts.push({
    name: `Dumpsters (${laborRates.dumpsterCount})`, 
    rate: laborRates.dumpsterRate, 
    totalCost: laborRates.dumpsterRate * laborRates.dumpsterCount
  });
  
  // Add pitch adjustments if applicable
  const predominantPitch = measurements.roofPitch;
  const pitchValue = parseInt(predominantPitch.split(':')[0]);
  
  if (pitchValue >= 8) {
    // Calculate pitch-based rate
    const basePitchValue = 8; // 8/12 is the base pitch
    const baseRate = 90; // Base rate for 8/12
    const increment = 5; // $5 increment per pitch level
    const pitchRate = baseRate + (pitchValue - basePitchValue) * increment;
    
    laborCosts.push({
      name: `Pitch Adjustment (${predominantPitch})`, 
      rate: pitchRate, 
      totalCost: pitchRate * totalSquares
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
              <p className="font-medium">{measurements.totalArea.toLocaleString()} sq ft ({totalSquares} squares)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Predominant Pitch:</p>
              <p className="font-medium">{measurements.roofPitch}</p>
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
