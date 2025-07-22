import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle, XCircle } from "lucide-react";
import { MeasurementValues } from "../measurement/types";
import { Material } from "../materials/types";
import { LaborRates } from "./LaborProfitTab";
import { calculateEstimateTotal, Estimate, EstimateStatus, updateEstimateStatus, saveEstimate } from "@/api/estimatesFacade";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface EstimateSummaryTabProps {
  measurements?: MeasurementValues;
  selectedMaterials: {[key: string]: Material};
  quantities: {[key: string]: number};
  laborRates: LaborRates;
  profitMargin: number;
  totalAmount?: number;
  peelStickAddonCost?: number;
  onFinalizeEstimate?: () => void;
  isSubmitting?: boolean;
  estimate?: Estimate | null;
  isReviewMode?: boolean;
  calculateLiveTotal: () => number;
  onEstimateUpdated?: () => void;
  onBack?: () => void;
}

export function EstimateSummaryTab({
  measurements,
  selectedMaterials,
  quantities,
  laborRates,
  profitMargin,
  peelStickAddonCost = 0,
  onFinalizeEstimate,
  isSubmitting = false,
  estimate,
  isReviewMode = false,
  calculateLiveTotal,
  onEstimateUpdated,
  onBack
}: EstimateSummaryTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState(estimate?.notes || "");
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // Add defensive checks to prevent errors when rendering with missing data
  if (!measurements || !selectedMaterials || !quantities || !laborRates) {
    console.error("EstimateSummaryTab missing required props:", { 
      hasMeasurements: !!measurements, 
      hasSelectedMaterials: !!selectedMaterials,
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
            <Button onClick={() => navigate(-1)} variant="default">
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total estimate using profit margin (moved to later in component)

  const handleUpdateStatus = async (newStatus: EstimateStatus) => {
    if (!estimate?.id) {
      toast({ title: "Error", description: "Estimate ID is missing.", variant: "destructive" });
      return;
    }
    if (newStatus === 'rejected' && !notes.trim()) {
      toast({ title: "Reason Required", description: "Please provide a reason for rejecting this estimate.", variant: "destructive" });
      return;
    }

    setIsStatusUpdating(true);
    try {
      let dataToSave: Partial<Estimate> & { id: string } = { id: estimate.id, notes };

      if (newStatus === 'approved') {
        if (!measurements) {
            toast({ title: "Error", description: "Cannot approve estimate without measurements data.", variant: "destructive"});
            setIsStatusUpdating(false);
            return;
        }
        dataToSave = {
          ...dataToSave,
          status: 'approved',
          materials: selectedMaterials,
          quantities: quantities,
          labor_rates: laborRates,
          profit_margin: profitMargin,
          measurements: measurements,
          total_price: currentTotalEstimate,
        };
      } else {
        dataToSave.status = newStatus;
      }

      const finalPayload: Estimate = {
        ...(estimate as Estimate),
        ...(dataToSave as Partial<Estimate>),
        id: estimate.id,
      };

      console.log("Payload for updating estimate status:", finalPayload);
      const { error } = await saveEstimate(finalPayload);

      if (error) throw error;

      toast({
        title: `Estimate ${newStatus}`,
        description: `The estimate has been ${newStatus} successfully.`,
      });
      
      setIsApproveDialogOpen(false);
      setIsRejectDialogOpen(false);
      setNotes("");
      
      if (onEstimateUpdated) {
        onEstimateUpdated();
      }

    } catch (error: any) {
      console.error(`Error updating estimate to ${newStatus}:`, error);
      toast({
        title: "Error",
        description: `Failed to update estimate: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Ensure safe access to properties with fallbacks
  const safeMeasurements = {
    totalArea: measurements?.totalArea || 0,
    roofPitch: measurements?.roofPitch || measurements?.predominantPitch || "Unknown",
    areasByPitch: measurements?.areasByPitch || [],
    propertyAddress: measurements?.propertyAddress || "",
    latitude: measurements?.latitude || "",
    longitude: measurements?.longitude || ""
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
    permitRate: laborRates?.permitRate || 450,
    pitchRates: laborRates?.pitchRates || {},
    wastePercentage: laborRates?.wastePercentage || 12,
    includeGutters: laborRates?.includeGutters || false,
    gutterLinearFeet: laborRates?.gutterLinearFeet || 0,
    gutterRate: laborRates?.gutterRate || 8,
    includeDownspouts: laborRates?.includeDownspouts || false,
    downspoutCount: laborRates?.downspoutCount || 0,
    downspoutRate: laborRates?.downspoutRate || 65,
    includeDetachResetGutters: laborRates?.includeDetachResetGutters || false,
    detachResetGutterLinearFeet: laborRates?.detachResetGutterLinearFeet || 0,
    detachResetGutterRate: laborRates?.detachResetGutterRate || 1,
    includeSkylights2x2: laborRates?.includeSkylights2x2 || false,
    skylights2x2Count: laborRates?.skylights2x2Count || 0,
    skylights2x2Rate: laborRates?.skylights2x2Rate || 280,
    includeSkylights2x4: laborRates?.includeSkylights2x4 || false,
    skylights2x4Count: laborRates?.skylights2x4Count || 0,
    skylights2x4Rate: laborRates?.skylights2x4Rate || 370,
    includeLowSlopeLabor: laborRates?.includeLowSlopeLabor ?? true,
    includeSteepSlopeLabor: laborRates?.includeSteepSlopeLabor ?? true,
  };

  // Calculate the number of squares
  const totalSquares = Math.round(safeMeasurements.totalArea / 100 * 10) / 10;
  
  // Calculate material costs
  const materialCosts = Object.entries(selectedMaterials || {}).map(([key, material]) => {
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
  
  const baseMaterialCost = materialCosts.reduce((sum, item) => sum + item.totalCost, 0);
  const totalMaterialCost = baseMaterialCost + peelStickAddonCost;
  
  // Calculate labor costs with combined labor rate
  const laborCosts = [];

  // Use the safeLaborRates which includes defaults and the new toggles
  const currentLaborRates = safeLaborRates; // Alias for clarity in this section
  
  // Removed console.log to reduce spam

  // Add combined labor or backward compatibility with separate tear off/installation
  if (currentLaborRates.laborRate) {
    // Use combined labor rate - but apply pitch-specific rates for different areas
    
    // Check if we have pitch areas to calculate with
    if (safeMeasurements.areasByPitch && safeMeasurements.areasByPitch.length > 0) {
      // Calculate labor cost for each pitch area
      const pitchAreas = safeMeasurements.areasByPitch;
      
      // Track if we've already added any pitch-specific labor items
      // let hasPitchSpecificLabor = false; // This can be removed or re-purposed
      
      // Check if special low pitch materials are selected (used for specific rate overrides)
      const hasPolyIsoMaterial = Object.values(selectedMaterials).some(material => 
        material.id === "gaf-poly-iso-4x8");
      
      const hasPolyglasMaterials = Object.values(selectedMaterials).some(material => 
        material.id === "polyglass-elastoflex-sbs" || material.id === "polyglass-polyflex-app");
      
      // Loop through each pitch area and apply the appropriate rate
      pitchAreas.forEach(pitchArea => {
        // Get the pitch value (numeric part of the pitch)
        const pitch = pitchArea.pitch;
        const pitchValue = parseInt(pitch.split(/[:\/]/)[0]) || 0;
        const areaSquares = Math.ceil((pitchArea.area || 0) / 100);

        if (areaSquares === 0) return; // No area, skip

        const isLowSlopePitch = pitchValue >= 0 && pitchValue <= 2;
        const isStandardOrSteepSlopePitch = pitchValue >= 3;

        // Debug logging
        console.log(`[EstimateSummaryTab] Processing pitch ${pitch}: includeLowSlope=${currentLaborRates.includeLowSlopeLabor}, includeSteepSlope=${currentLaborRates.includeSteepSlopeLabor}`);

        if (isLowSlopePitch && !(currentLaborRates.includeLowSlopeLabor ?? true)) {
          console.log(`[EstimateSummaryTab] ❌ Skipping low slope labor for ${pitch}`);
          return; 
        }
        if (isStandardOrSteepSlopePitch && !(currentLaborRates.includeSteepSlopeLabor ?? true)) {
          console.log(`[EstimateSummaryTab] ❌ Skipping steep slope labor for ${pitch}`);
          return; 
        }
        
        // Determine the appropriate rate for this pitch
        let rate = currentLaborRates.laborRate; // Default to the standard rate
        let itemNamePrefix = `Labor for ${pitch} Pitch`;
        
        if (pitchValue >= 8) {
          // 8/12-18/12 has increasing rates
          const defaultSteepRate = (() => {
            const basePitchValue = 8; // 8/12 is the base pitch
            const baseRate = 90; // Base rate for 8/12
            const increment = 5; // $5 increment per pitch level
            return baseRate + (pitchValue - basePitchValue) * increment;
          })();

          const pitchKey = pitch.replace("/", ":"); 
          rate = currentLaborRates.pitchRates[pitchKey] !== undefined 
                 ? currentLaborRates.pitchRates[pitchKey] 
                 : defaultSteepRate;
        } else if (pitchValue === 0) {
          // Default flat-roof rate $159 unless overridden via pitchRates
          const overrideRate = currentLaborRates.pitchRates["0:12"];
          rate = overrideRate !== undefined ? overrideRate : 159;
          itemNamePrefix = `Labor for ${pitch} Pitch`;
        } else if (pitchValue === 1 || pitchValue === 2) {
          rate = 109;
          itemNamePrefix = `Labor for ${pitch} Pitch (Low Slope)`;
        } // Standard rate (3/12-7/12) is already set in 'rate' by default
          
          laborCosts.push({ 
          name: `${itemNamePrefix} (${areaSquares} squares)`, 
            rate: rate, 
          totalCost: rate * areaSquares * (1 + (currentLaborRates.wastePercentage || 12)/100) 
          });
      });
    } else if (totalSquares > 0 && (currentLaborRates.includeSteepSlopeLabor ?? true) ){
      // No pitch areas available, but total area exists. Apply standard rate if steep slope labor is included.
      laborCosts.push({ 
        name: "Labor (Tear Off & Installation)", 
        rate: currentLaborRates.laborRate, 
        totalCost: currentLaborRates.laborRate * totalSquares * (1 + (currentLaborRates.wastePercentage || 12)/100) 
      });
    } // If no pitch areas AND steep slope labor is off, no general labor is added.

  } else if (currentLaborRates.tearOff || currentLaborRates.installation) {
    // Backward compatibility: handle old format with separate rates
    // This path should also respect the toggles, assuming these rates apply to standard/steep.
    if (currentLaborRates.includeSteepSlopeLabor ?? true) {
      const tearOff = currentLaborRates.tearOff || 0;
      const installation = currentLaborRates.installation || 0;
    
    if (tearOff > 0) {
      laborCosts.push({ 
        name: "Tear Off", 
        rate: tearOff, 
          totalCost: tearOff * totalSquares * (1 + (currentLaborRates.wastePercentage || 12)/100) 
      });
    }
    
    if (installation > 0) {
      laborCosts.push({ 
        name: "Installation", 
        rate: installation, 
          totalCost: installation * totalSquares * (1 + (currentLaborRates.wastePercentage || 12)/100) 
      });
      }
    }
  } else if (totalSquares > 0 && (currentLaborRates.includeSteepSlopeLabor ?? true)) {
    // Fallback to default rate if neither format is available AND steep slope labor is included
    const defaultRate = 85;
    laborCosts.push({ 
      name: "Labor (Default Rate)", 
      rate: defaultRate, 
      totalCost: defaultRate * totalSquares * (1 + (currentLaborRates.wastePercentage || 12)/100) 
    });
  }

  // Add handload cost if enabled and if any primary labor was calculated
  const hasCalculatedPitchLabor = laborCosts.some(lc => 
    lc.name.startsWith("Labor for") || lc.name === "Labor (Tear Off & Installation)" || lc.name === "Tear Off" || lc.name === "Installation" || lc.name === "Labor (Default Rate)"
  );
  
  // Removed console.log to reduce spam
  
  if (currentLaborRates.isHandload && hasCalculatedPitchLabor) {
    laborCosts.push({
      name: "Handload", 
      rate: currentLaborRates.handloadRate || 15, 
      totalCost: (currentLaborRates.handloadRate || 15) * totalSquares * (1 + (currentLaborRates.wastePercentage || 12)/100)
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
    // Calculate total permit cost: base permit + (additional permits × additional rate)
    const baseCost = safeLaborRates.permitRate || (safeLaborRates.dumpsterLocation === "orlando" ? 450 : 550);
    const additionalPermits = Math.max(0, (laborRates.permitCount || 1) - 1);
    const additionalCost = additionalPermits * (laborRates.permitAdditionalRate || 450);
    const totalPermitCost = baseCost + additionalCost;
    
    laborCosts.push({
      name: `Permits (${safeLaborRates.dumpsterLocation === "orlando" ? "Central Florida" : "Outside Central Florida"})`,
      rate: safeLaborRates.permitRate,
      totalCost: totalPermitCost
    });
  }
  
  // Add gutters if included
  if (safeLaborRates.includeGutters && safeLaborRates.gutterLinearFeet > 0) {
    laborCosts.push({
      name: `6" Aluminum Seamless Gutters (${safeLaborRates.gutterLinearFeet} linear ft)`,
      rate: safeLaborRates.gutterRate,
      totalCost: safeLaborRates.gutterRate * safeLaborRates.gutterLinearFeet
    });
  }
  
  // Add detach and reset gutters if included
  if (safeLaborRates.includeDetachResetGutters && safeLaborRates.detachResetGutterLinearFeet > 0) {
    laborCosts.push({
      name: `Detach and Reset Gutters (${safeLaborRates.detachResetGutterLinearFeet} linear ft)`,
      rate: safeLaborRates.detachResetGutterRate || 1,
      totalCost: (safeLaborRates.detachResetGutterRate || 1) * safeLaborRates.detachResetGutterLinearFeet
    });
  }
  
  // Add downspouts if included
  if (safeLaborRates.includeDownspouts && safeLaborRates.downspoutCount > 0) {
    laborCosts.push({
      name: `3" x 4" Downspouts (${safeLaborRates.downspoutCount})`,
      rate: safeLaborRates.downspoutRate,
      totalCost: safeLaborRates.downspoutRate * safeLaborRates.downspoutCount
    });
  }

  // Check if skylights are already included as materials to avoid double-counting
  const hasSkylightMaterials = Object.values(selectedMaterials || {}).some(material => 
    material.id === 'skylight-2x2' || material.id === 'skylight-2x4'
  );

  // Add 2x2 skylights if included and NOT already in materials
  if (safeLaborRates.includeSkylights2x2 && safeLaborRates.skylights2x2Count > 0 && !hasSkylightMaterials) {
    laborCosts.push({
      name: `2X2 Skylights (${safeLaborRates.skylights2x2Count})`,
      rate: safeLaborRates.skylights2x2Rate,
      totalCost: safeLaborRates.skylights2x2Rate * safeLaborRates.skylights2x2Count
    });
  }

  // Add 2x4 skylights if included and NOT already in materials
  if (safeLaborRates.includeSkylights2x4 && safeLaborRates.skylights2x4Count > 0 && !hasSkylightMaterials) {
    laborCosts.push({
      name: `2X4 Skylights (${safeLaborRates.skylights2x4Count})`,
      rate: safeLaborRates.skylights2x4Rate,
      totalCost: safeLaborRates.skylights2x4Rate * safeLaborRates.skylights2x4Count
    });
  }
  
  const totalLaborCost = laborCosts.reduce((sum, item) => sum + item.totalCost, 0);
  
  // Calculate total costs using profit margin (margin on selling price)
  const subtotal = totalMaterialCost + totalLaborCost;
  const marginDecimal = profitMargin / 100;
  const currentTotalEstimate = subtotal / (1 - marginDecimal);
  const profitAmount = currentTotalEstimate - subtotal;

  // Helper function to format numbers with commas
  const formatNumberWithCommas = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Removed console.log to reduce spam

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Estimate Summary</CardTitle>
          {isReviewMode && estimate && (
            <Badge 
              variant={
                estimate.status === "approved" ? "default" :
                estimate.status === "pending" ? "secondary" :
                estimate.status === "rejected" ? "destructive" : "outline"
              }
              className={cn(
                "capitalize",
                estimate.status === "approved" && "bg-[#10b981] hover:bg-[#10b981]/80",
                estimate.status === "pending" && "bg-[#f59e0b] hover:bg-[#f59e0b]/80",
                estimate.status === "rejected" && "bg-destructive hover:bg-destructive/80"
              )}
            >
              {estimate.status}
            </Badge>
          )}
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
              {safeMeasurements.propertyAddress && (
                <div>
                  <p className="text-muted-foreground">Property Address:</p>
                  <p className="font-medium">{safeMeasurements.propertyAddress}</p>
                </div>
              )}
              {(safeMeasurements.latitude && safeMeasurements.longitude) && (
                <div>
                  <p className="text-muted-foreground">Coordinates:</p>
                  <p className="font-medium">{safeMeasurements.latitude}, {safeMeasurements.longitude}</p>
                </div>
              )}
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
                      <td className="text-right py-2 px-4">${formatNumberWithCommas(item.unitPrice)}</td>
                      <td className="text-right py-2 px-4">${formatNumberWithCommas(item.totalCost)}</td>
                    </tr>
                  ))}
                  {peelStickAddonCost > 0 && (
                     <tr className="border-t">
                       <td className="py-2 px-4 italic">Full Peel & Stick System Cost</td>
                       <td colSpan={2} className="text-right py-2 px-4">($60.00/sq)</td>
                       <td className="text-right py-2 px-4">${formatNumberWithCommas(peelStickAddonCost)}</td>
                     </tr>
                  )}
                  <tr className="border-t bg-muted/30">
                    <td colSpan={3} className="py-2 px-4 font-semibold">Materials Subtotal</td>
                    <td className="text-right py-2 px-4 font-semibold">${formatNumberWithCommas(totalMaterialCost)}</td>
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
                    <th className="text-right py-2 px-4">Rate</th>
                    <th className="text-right py-2 px-4">Total (includes 12% waste)</th>
                  </tr>
                </thead>
                <tbody>
                  {laborCosts.map((item, index) => (
                    <tr key={index} className={index < laborCosts.length - 1 ? "border-b" : ""}>
                      <td className="py-2 px-4">{item.name}</td>
                      <td className="text-right py-2 px-4">${formatNumberWithCommas(item.rate)}</td>
                      <td className="text-right py-2 px-4">${formatNumberWithCommas(item.totalCost)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30">
                    <td colSpan={2} className="py-2 px-4 font-semibold">Labor Subtotal (includes 12% waste)</td>
                    <td className="text-right py-2 px-4 font-semibold">${formatNumberWithCommas(totalLaborCost)}</td>
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
                    <td className="text-right py-2 px-4">${formatNumberWithCommas(totalMaterialCost)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4">Labor Subtotal (includes 12% waste)</td>
                    <td className="text-right py-2 px-4">${formatNumberWithCommas(totalLaborCost)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4">Project Subtotal</td>
                    <td className="text-right py-2 px-4">${formatNumberWithCommas(subtotal)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4">Profit Margin ({profitMargin}%)</td>
                    <td className="text-right py-2 px-4">${formatNumberWithCommas(profitAmount)}</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="py-2 px-4 font-semibold">Total Estimate</td>
                    <td className="text-right py-2 px-4 font-semibold text-lg">${formatNumberWithCommas(currentTotalEstimate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {isReviewMode && estimate?.notes && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notes</h3>
              <div className="border rounded-md p-4 bg-muted/20">
                <p className="text-sm">{estimate.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          {isReviewMode ? (
            estimate?.status === "pending" ? (
              <>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => navigate("/")}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setIsRejectDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    onClick={() => setIsApproveDialogOpen(true)}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accept
                  </Button>
                </div>
              </>
            ) : (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => navigate("/")}
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            )
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={() => onBack?.()}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Project Details
              </Button>
              
              <Button 
                onClick={onFinalizeEstimate}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Finalize Estimate"}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Approve Dialog */}
      <Dialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Accept Estimate</DialogTitle>
                          <DialogDescription>
                Accepting this estimate will make it final and allow PDF generation. Add any notes before accepting.
              </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Add any notes or comments about the approval"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
                            <Button onClick={() => handleUpdateStatus("approved")} disabled={isStatusUpdating}>
                  {isStatusUpdating ? "Updating..." : "Accept Estimate"}
                </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Estimate</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this estimate. This will be stored with the record.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Reason for rejection"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleUpdateStatus("rejected")}
              disabled={isStatusUpdating || !notes.trim()}
            >
              {isStatusUpdating ? "Updating..." : "Reject Estimate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
