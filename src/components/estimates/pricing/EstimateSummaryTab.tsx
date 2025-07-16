import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle, XCircle, Info, Package, Settings, Eye, EyeOff, Download, Mail } from "lucide-react";
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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
  const [isClientView, setIsClientView] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState(estimate?.notes || "");
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // PDF Generation Function
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      const { width, height } = page.getSize();
      
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      let yPosition = height - 50;
      const greenColor = rgb(0.133, 0.545, 0.133); // Forest green
      
      // Header with 3MG branding
      page.drawRectangle({
        x: 0,
        y: yPosition - 30,
        width: width,
        height: 80,
        color: greenColor,
      });
      
      page.drawText('3MG', {
        x: 50,
        y: yPosition,
        size: 36,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
      
      page.drawText('Roofing and Solar', {
        x: 130,
        y: yPosition + 5,
        size: 18,
        font: helvetica,
        color: rgb(1, 1, 1),
      });
      
      // Company info
      page.drawText('1127 Solana Ave, Winter Park, FL 32789', {
        x: 50,
        y: yPosition - 25,
        size: 10,
        font: helvetica,
        color: rgb(1, 1, 1),
      });
      
      page.drawText('(407) 420-0201', {
        x: 450,
        y: yPosition - 25,
        size: 10,
        font: helvetica,
        color: rgb(1, 1, 1),
      });
      
      yPosition -= 80;
      
      // Customer Details
      yPosition -= 30;
      page.drawText('ROOFING ESTIMATE', {
        x: 50,
        y: yPosition,
        size: 20,
        font: helveticaBold,
        color: greenColor,
      });
      
      yPosition -= 30;
      page.drawText('Property Address:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(measurements?.propertyAddress || estimate?.customer_address || 'Not specified', {
        x: 50,
        y: yPosition - 15,
        size: 11,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      
      // Date
      page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: 400,
        y: yPosition,
        size: 11,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 40;
      
      // Scope of Work
      page.drawText('SCOPE OF WORK', {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: greenColor,
      });
      
      yPosition -= 20;
      
      const scopeItems = [
        '1. Remove existing roofing material down to decking',
        '2. Inspect roof decking and replace damaged sections as needed',
        '3. Install synthetic underlayment for enhanced protection',
        '4. Install drip edge and starter strips',
        '5. Install GAF roofing system with manufacturer specifications',
        '6. Install ridge vents for proper attic ventilation',
        '7. Install step flashing and pipe boot flashings',
        '8. Clean up all job-related debris daily',
        '9. Haul away and properly dispose of all old materials',
        '10. Final inspection and quality check',
        '11. Provide manufacturer warranty documentation',
        '12. Include all necessary permits and inspections',
        '13. Protect landscaping and property during work',
        '14. Complete work in a timely and professional manner',
        '15. Follow all local building codes and regulations'
      ];
      
      for (const item of scopeItems) {
        if (yPosition < 100) {
          // Add new page if needed
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }
        
        page.drawText(item, {
          x: 60,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
        
        yPosition -= 18;
      }
      
      // Investment Summary
      yPosition -= 30;
      
      if (yPosition < 150) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = height - 50;
      }
      
      page.drawText('INVESTMENT SUMMARY', {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: greenColor,
      });
      
      yPosition -= 25;
      
      // Get material package name
      const gafPackage = Object.values(selectedMaterials).find(m => 
        m.name.toLowerCase().includes('gaf') && m.name.toLowerCase().includes('package')
      );
      
      page.drawText(`Roofing System: ${gafPackage?.name || 'GAF Roofing System'}`, {
        x: 60,
        y: yPosition,
        size: 11,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 20;
      
      // Warranty type
      const warrantyType = laborRates.includeGutters ? 'System Plus' : 'Standard';
      page.drawText(`Warranty Type: GAF ${warrantyType} Warranty`, {
        x: 60,
        y: yPosition,
        size: 11,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 30;
      
      // Total Investment
      const totalInvestment = calculateLiveTotal();
      
      page.drawRectangle({
        x: 350,
        y: yPosition - 25,
        width: 200,
        height: 40,
        color: rgb(0.9, 0.9, 0.9),
      });
      
      page.drawText('TOTAL INVESTMENT:', {
        x: 360,
        y: yPosition,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(`$${totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, {
        x: 360,
        y: yPosition - 15,
        size: 16,
        font: helveticaBold,
        color: greenColor,
      });
      
      // Signature Section
      yPosition = 100;
      
      page.drawText('Customer Signature: _________________________________    Date: __________', {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 30;
      
      page.drawText('3MG Representative: _________________________________    Date: __________', {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      
      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Download PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = `3MG_Estimate_${measurements?.propertyAddress?.replace(/[^a-zA-Z0-9]/g, '_') || 'Roofing'}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Generated",
        description: "Your estimate PDF has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Email handler
  const handleEmailEstimate = () => {
    // In a real implementation, this would send the PDF via email
    toast({
      title: "Email Feature",
      description: "Email functionality will be implemented with your email service integration.",
    });
  };

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

  const currentTotalEstimate = calculateLiveTotal();

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

        if (isLowSlopePitch && !(currentLaborRates.includeLowSlopeLabor ?? true)) {
          // Skipping display labor for low slope pitch as includeLowSlopeLabor is false
          return; 
        }
        if (isStandardOrSteepSlopePitch && !(currentLaborRates.includeSteepSlopeLabor ?? true)) {
          // Skipping display labor for steep slope pitch as includeSteepSlopeLabor is false
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
      name: `Permits (${safeLaborRates.dumpsterLocation === "orlando" ? "Orlando" : "Outside Orlando"})`,
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
  if (laborRates.includeDetachResetGutters && laborRates.detachResetGutterLinearFeet > 0) {
    laborCosts.push({
      name: `Detach and Reset Gutters (${laborRates.detachResetGutterLinearFeet} linear ft)`,
      rate: laborRates.detachResetGutterRate || 1,
      totalCost: (laborRates.detachResetGutterRate || 1) * laborRates.detachResetGutterLinearFeet
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

  // Add 2x2 skylights if included
  if (safeLaborRates.includeSkylights2x2 && safeLaborRates.skylights2x2Count > 0) {
    laborCosts.push({
      name: `2X2 Skylights (${safeLaborRates.skylights2x2Count})`,
      rate: safeLaborRates.skylights2x2Rate,
      totalCost: safeLaborRates.skylights2x2Rate * safeLaborRates.skylights2x2Count
    });
  }

  // Add 2x4 skylights if included
  if (safeLaborRates.includeSkylights2x4 && safeLaborRates.skylights2x4Count > 0) {
    laborCosts.push({
      name: `2X4 Skylights (${safeLaborRates.skylights2x4Count})`,
      rate: safeLaborRates.skylights2x4Rate,
      totalCost: safeLaborRates.skylights2x4Rate * safeLaborRates.skylights2x4Count
    });
  }
  
  const totalLaborCost = laborCosts.reduce((sum, item) => sum + item.totalCost, 0);
  
  // Calculate total costs
  const subtotal = totalMaterialCost + totalLaborCost;
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
    <div className="space-y-8">
      {/* Header with Back Button and View Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Labor & Profit</span>
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-green-400">Estimate Summary</h1>
        </div>
      </div>

      {/* Client View */}
      {isClientView ? (
        <>
          {/* 3MG Branded Header */}
          <div className="relative bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-8 overflow-hidden">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  rgba(255,255,255,0.1) 10px,
                  rgba(255,255,255,0.1) 20px
                )`,
                animation: 'slide 20s linear infinite',
              }} />
            </div>
            
            {/* Logo and Company Info */}
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 3MG Logo */}
                  <div className="bg-white rounded-lg p-3">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-green-600 font-bold text-2xl">3MG</text>
                    </svg>
                  </div>
                  <div className="text-white">
                    <h1 className="text-3xl font-bold">3MG Roofing and Solar</h1>
                    <p className="text-green-100">Professional Roofing Estimate</p>
                  </div>
                </div>
                <div className="text-right text-white">
                  <p className="font-semibold">1127 Solana Ave</p>
                  <p>Winter Park, FL 32789</p>
                  <p className="font-semibold">(407) 420-0201</p>
                </div>
              </div>
            </div>
          </div>

          {/* Client Estimate Card */}
          <Card className="border-green-500/20 shadow-xl">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl text-gray-800">Property Information</CardTitle>
                  <p className="text-gray-600 mt-2">{measurements?.propertyAddress || estimate?.customer_address || 'Property Address'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Estimate Date</p>
                  <p className="font-semibold text-gray-800">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              {/* Scope of Work */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Scope of Work</h3>
                <div className="bg-green-50 rounded-lg p-6">
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Complete removal of existing roofing material down to decking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Inspection and replacement of damaged decking as needed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Installation of GAF roofing system with manufacturer specifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>All necessary flashings, vents, and accessories</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Complete cleanup and debris removal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Manufacturer warranty and workmanship guarantee</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Investment Summary */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Investment</h3>
                <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-green-100 text-sm">Total Investment for Your New Roof</p>
                      <p className="text-4xl font-bold mt-2">
                        ${calculateLiveTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-100 text-sm">Warranty</p>
                      <p className="font-semibold">GAF System Plus</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Next Steps</h3>
                <ol className="space-y-2 text-gray-700">
                  <li>1. Review this estimate with your family</li>
                  <li>2. Contact us with any questions</li>
                  <li>3. Sign and return to begin scheduling</li>
                  <li>4. We'll handle all permits and inspections</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsClientView(false)}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Internal View
            </Button>
            
            <div className="flex gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
                onClick={handleEmailEstimate}
              >
                <Mail className="w-5 h-5 mr-2" />
                Email to collect signature
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50 shadow-lg transform hover:scale-105 transition-all duration-200"
                onClick={generatePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download Estimate
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* CSS for animation */}
          <style>{`
            @keyframes slide {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(20px);
              }
            }
          `}</style>
        </>
      ) : (
        <>
          {/* Project Details Card */}
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl border border-green-500/30 p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-green-400 mb-6 flex items-center gap-3">
          <Info className="w-6 h-6" />
          Project Details
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-300">Property Address</p>
              <p className="text-lg font-semibold text-white">
                {measurements?.propertyAddress || estimate?.customer_address || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-300">Total Roof Area</p>
              <p className="text-lg font-semibold text-white">
                {totalSquares} squares ({(totalSquares * 100).toFixed(0)} sq ft)
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-300">Predominant Pitch</p>
              <p className="text-lg font-semibold text-white">
                {measurements?.roofPitch || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-300">Created Date</p>
              <p className="text-lg font-semibold text-white">
                {estimate?.created_at ? new Date(estimate.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Breakdown Card */}
      <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl border border-green-500/30 p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-green-400 mb-6 flex items-center gap-3">
          <Package className="w-6 h-6" />
          Materials Breakdown
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-200">Material</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-200">Quantity</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-200">Unit Price</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-200">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {/* GAF Package Materials */}
              {materialCosts.map((material, index) => (
                <tr key={index} className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">{material.name}</div>
                      <div className="text-sm text-gray-300">{material.unit}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    {material.quantity}
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    ${material.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    ${material.totalCost.toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* Additional Systems - using peelStickAddonCost prop */}
              {peelStickAddonCost > 0 && (
                <tr className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">Full W/W Peel & Stick System</div>
                      <div className="text-sm text-gray-300">Additional Coverage</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    -
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    $60.00/sq
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    ${peelStickAddonCost.toFixed(2)}
                  </td>
                </tr>
              )}

              {/* Optional Items from laborRates */}
              {laborRates.includeDetachResetGutters && laborRates.detachResetGutterLinearFeet && laborRates.detachResetGutterLinearFeet > 0 && (
                <tr className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">Detach & Reset Gutters</div>
                      <div className="text-sm text-gray-300">Linear Feet</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    {laborRates.detachResetGutterLinearFeet}
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    ${laborRates.detachResetGutterRate || 10}/ft
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    ${(laborRates.detachResetGutterLinearFeet * (laborRates.detachResetGutterRate || 10)).toFixed(2)}
                  </td>
                </tr>
              )}

              {((laborRates.includeSkylights2x2 && laborRates.skylights2x2Count && laborRates.skylights2x2Count > 0) ||
                (laborRates.includeSkylights2x4 && laborRates.skylights2x4Count && laborRates.skylights2x4Count > 0)) && (
                <tr className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">Replace Skylights</div>
                      <div className="text-sm text-gray-300">
                        {laborRates.skylights2x2Count ? `${laborRates.skylights2x2Count} 2x2` : ''}
                        {laborRates.skylights2x2Count && laborRates.skylights2x4Count ? ', ' : ''}
                        {laborRates.skylights2x4Count ? `${laborRates.skylights2x4Count} 2x4` : ''}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    {(laborRates.skylights2x2Count || 0) + (laborRates.skylights2x4Count || 0)}
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    Varies
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    ${(
                      (laborRates.skylights2x2Count || 0) * (laborRates.skylights2x2Rate || 280) +
                      (laborRates.skylights2x4Count || 0) * (laborRates.skylights2x4Rate || 370)
                    ).toFixed(2)}
                  </td>
                </tr>
              )}

              {laborRates.includeDownspouts && laborRates.downspoutCount && laborRates.downspoutCount > 0 && (
                <tr className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">Replace Downspouts</div>
                      <div className="text-sm text-gray-300">Each</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    {laborRates.downspoutCount}
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    ${laborRates.downspoutRate || 100}
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    ${(laborRates.downspoutCount * (laborRates.downspoutRate || 100)).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-600">
                <td colSpan={3} className="py-4 px-4 text-right font-semibold text-gray-200">
                  Materials Subtotal
                </td>
                <td className="py-4 px-4 text-right font-bold text-xl text-green-400">
                  ${totalMaterialCost.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Labor Breakdown Card */}
      <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl border border-green-500/30 p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-green-400 mb-6 flex items-center gap-3">
          <Settings className="w-6 h-6" />
          Labor Breakdown
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-200">Category</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-200">Rate</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-200">
                  Total (includes {((laborRates.wastePercentage || 0) * 100).toFixed(0)}% waste)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {laborCosts.map((item, index) => (
                <tr key={index} className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-medium text-white">{item.name}</div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    ${formatNumberWithCommas(item.rate)}/sq
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    ${formatNumberWithCommas(item.totalCost)}
                  </td>
                </tr>
              ))}
              {laborRates.includeDetachResetGutters && laborRates.detachResetGutterLinearFeet && laborRates.detachResetGutterLinearFeet > 0 && (
                <tr className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-medium text-white">Detach & Reset Gutters</div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    ${laborRates.detachResetGutterRate || 10}/ft
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    ${(laborRates.detachResetGutterLinearFeet * (laborRates.detachResetGutterRate || 10)).toFixed(2)}
                  </td>
                </tr>
              )}
              {((laborRates.includeSkylights2x2 && laborRates.skylights2x2Count && laborRates.skylights2x2Count > 0) ||
                (laborRates.includeSkylights2x4 && laborRates.skylights2x4Count && laborRates.skylights2x4Count > 0)) && (
                <tr className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-medium text-white">Replace Skylights</div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    2x2: ${laborRates.skylights2x2Rate || 280}, 2x4: ${laborRates.skylights2x4Rate || 370}
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    ${(
                      (laborRates.skylights2x2Count || 0) * (laborRates.skylights2x2Rate || 280) +
                      (laborRates.skylights2x4Count || 0) * (laborRates.skylights2x4Rate || 370)
                    ).toFixed(2)}
                  </td>
                </tr>
              )}
              {laborRates.includeDownspouts && laborRates.downspoutCount && laborRates.downspoutCount > 0 && (
                <tr className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-medium text-white">Replace Downspouts</div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    ${laborRates.downspoutRate || 100}/each
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    ${(laborRates.downspoutCount * (laborRates.downspoutRate || 100)).toFixed(2)}
                  </td>
                </tr>
              )}
              {laborRates.includePermits && (
                <tr className="hover:bg-gray-600/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-medium text-white">Permits (Orlando)</div>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    Fixed
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-green-400">
                    $450.00
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-600">
                <td colSpan={2} className="py-4 px-4 text-right font-semibold text-gray-200">
                  Labor Subtotal (includes {((laborRates.wastePercentage || 0) * 100).toFixed(0)}% waste)
                </td>
                <td className="py-4 px-4 text-right font-bold text-xl text-green-400">
                  ${totalLaborCost.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Total Summary Card */}
      <div className="bg-gradient-to-r from-green-800/30 to-green-700/30 backdrop-blur-sm rounded-xl border border-green-500/40 p-8 shadow-xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-2">Materials</p>
              <p className="text-2xl font-bold text-white">${totalMaterialCost.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-2">Labor</p>
              <p className="text-2xl font-bold text-white">${totalLaborCost.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-2">Subtotal</p>
              <p className="text-2xl font-bold text-white">${subtotal.toFixed(2)}</p>
            </div>
          </div>

          <div className="border-t border-gray-600 pt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-gray-200">Profit Margin ({(profitMargin * 100).toFixed(0)}%)</span>
              <span className="text-xl font-semibold text-green-400">
                ${profitAmount.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-white">Total Estimate</span>
              <span className="text-3xl font-bold text-green-400">
                ${currentTotalEstimate.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-all flex items-center gap-2 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Labor & Profit
        </button>
        
        <div className="flex gap-4">
          <Button
            size="lg"
            onClick={() => setIsClientView(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <Eye className="w-5 h-5" />
            Submit for Client View
          </Button>
          
          <button
            onClick={() => {
              // Finalize estimate logic here
              console.log('Finalizing estimate...');
            }}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-400 text-white rounded-lg hover:from-green-600 hover:to-green-500 transition-all shadow-lg shadow-green-500/20 font-semibold"
          >
            Finalize Estimate
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
