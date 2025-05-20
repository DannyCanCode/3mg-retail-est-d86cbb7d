import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle, XCircle } from "lucide-react";
import { MeasurementValues } from "../measurement/types";
import { Material } from "../materials/types";
import { LaborRates } from "./LaborProfitTab";
import { calculateEstimateTotal, Estimate, EstimateStatus, updateEstimateStatus } from "@/api/estimates";
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
  totalAmount: number;
  peelStickAddonCost?: number;
  onFinalizeEstimate: () => void;
  isSubmitting?: boolean;
  estimate?: Estimate | null;
  isReviewMode?: boolean;
}

export function EstimateSummaryTab({
  measurements,
  selectedMaterials,
  quantities,
  laborRates,
  profitMargin,
  totalAmount,
  peelStickAddonCost = 0,
  onFinalizeEstimate,
  isSubmitting = false,
  estimate,
  isReviewMode = false
}: EstimateSummaryTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
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

  const handleUpdateStatus = async (newStatus: EstimateStatus) => {
    if (!estimate?.id) {
      toast({
        title: "Error",
        description: "Cannot update estimate without ID",
        variant: "destructive"
      });
      return;
    }

    setIsStatusUpdating(true);
    try {
      const { error } = await updateEstimateStatus(estimate.id, newStatus, notes);
      
      if (error) throw error;
      
      toast({
        title: `Estimate ${newStatus}`,
        description: `The estimate has been ${newStatus} successfully.`,
      });
      
      // Close dialogs
      setIsApproveDialogOpen(false);
      setIsRejectDialogOpen(false);
      
      // Reload the page to refresh the estimates
      window.location.href = "/";
    } catch (error) {
      console.error(`Error ${newStatus} estimate:`, error);
      toast({
        title: "Error",
        description: `Failed to ${newStatus} estimate.`,
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
    permitRate: laborRates?.permitRate || 550,
    pitchRates: laborRates?.pitchRates || {},
    wastePercentage: laborRates?.wastePercentage || 12,
    includeGutters: laborRates?.includeGutters || false,
    gutterLinearFeet: laborRates?.gutterLinearFeet || 0,
    gutterRate: laborRates?.gutterRate || 8,
    includeDownspouts: laborRates?.includeDownspouts || false,
    downspoutCount: laborRates?.downspoutCount || 0,
    downspoutRate: laborRates?.downspoutRate || 65
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

  // Add combined labor or backward compatibility with separate tear off/installation
  if (safeLaborRates.laborRate) {
    // Use combined labor rate - but apply pitch-specific rates for different areas
    
    // Check if we have pitch areas to calculate with
    if (safeMeasurements.areasByPitch && safeMeasurements.areasByPitch.length > 0) {
      // Calculate labor cost for each pitch area
      const pitchAreas = safeMeasurements.areasByPitch;
      
      // Track if we've already added any pitch-specific labor items
      let hasPitchSpecificLabor = false;
      
      // Check if special low pitch materials are selected
      const hasPolyIsoMaterial = Object.values(selectedMaterials).some(material => 
        material.id === "gaf-poly-iso-4x8");
      
      const hasPolyglasMaterials = Object.values(selectedMaterials).some(material => 
        material.id === "polyglass-elastoflex-sbs" || material.id === "polyglass-polyflex-app");
      
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
        } else if (pitchValue === 0 && hasPolyIsoMaterial) {
          // 0/12 pitch with GAF Poly ISO has special $60/sq rate
          rate = 60;
          
          laborCosts.push({ 
            name: `Labor for ${pitch} Pitch (GAF Poly ISO) (${Math.round(areaSquares * 10) / 10} squares)`, 
            rate: rate, 
            totalCost: rate * areaSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
          });
          
          hasPitchSpecificLabor = true;
        } else if ((pitchValue === 1 || pitchValue === 2) && hasPolyglasMaterials) {
          // 1/12 or 2/12 pitch with Polyglass materials has special $109/sq rate
          rate = 109;
          
          laborCosts.push({ 
            name: `Labor for ${pitch} Pitch (Polyglass Base & Cap) (${Math.round(areaSquares * 10) / 10} squares)`, 
            rate: rate, 
            totalCost: rate * areaSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
          });
          
          hasPitchSpecificLabor = true;
        } else if (pitchValue <= 2) {
          // Default rate for low slope areas if special materials are not selected
          rate = 75;
          
          laborCosts.push({ 
            name: `Labor for ${pitch} Pitch (Low Slope) (${Math.round(areaSquares * 10) / 10} squares)`, 
            rate: rate, 
            totalCost: rate * areaSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
          });
          
          hasPitchSpecificLabor = true;
        } else {
          // 3/12-7/12 has the standard rate
          laborCosts.push({ 
            name: `Labor for ${pitch} Pitch (${Math.round(areaSquares * 10) / 10} squares)`, 
            rate: rate, 
            totalCost: rate * areaSquares * (1 + (safeLaborRates.wastePercentage || 12)/100) 
          });
        }
      });
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
  
  // Add gutters if included
  if (safeLaborRates.includeGutters && safeLaborRates.gutterLinearFeet > 0) {
    laborCosts.push({
      name: `6" Aluminum Seamless Gutters (${safeLaborRates.gutterLinearFeet} linear ft)`,
      rate: safeLaborRates.gutterRate,
      totalCost: safeLaborRates.gutterRate * safeLaborRates.gutterLinearFeet
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
  
  const totalLaborCost = laborCosts.reduce((sum, item) => sum + item.totalCost, 0);
  
  // Calculate total costs
  const subtotal = totalMaterialCost + totalLaborCost;
  const profitAmount = subtotal * (profitMargin / 100);
  const total = subtotal + profitAmount;

  // Log the discrepancy for debugging
  console.log("EstimateSummaryTab calculation:", {
    totalMaterialCost,
    totalLaborCost,
    subtotal,
    profitMargin,
    profitAmount,
    calculatedTotal: total,
    passedTotalAmount: totalAmount,
    difference: Math.abs(total - totalAmount)
  });

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
                      <td className="text-right py-2 px-4">${item.unitPrice.toFixed(2)}</td>
                      <td className="text-right py-2 px-4">${item.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                  {peelStickAddonCost > 0 && (
                     <tr className="border-t">
                       <td className="py-2 px-4 italic">Full Peel & Stick System Cost</td>
                       <td colSpan={2} className="text-right py-2 px-4">($60.00/sq)</td>
                       <td className="text-right py-2 px-4">${peelStickAddonCost.toFixed(2)}</td>
                     </tr>
                  )}
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
                    <th className="text-right py-2 px-4">Rate</th>
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
                    <td className="text-right py-2 px-4 font-semibold text-lg">${total.toFixed(2)}</td>
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
                    Approve
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
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Pricing
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
            <DialogTitle>Approve Estimate</DialogTitle>
            <DialogDescription>
              Approving this estimate will make it final and allow PDF generation. Add any notes before approving.
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
              {isStatusUpdating ? "Updating..." : "Approve Estimate"}
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
