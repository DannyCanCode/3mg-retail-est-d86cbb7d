import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  CheckCircle2, 
  FileText, 
  Calculator,
  Home,
  Phone,
  Mail,
  MapPin,
  Package,
  Wrench,
  DollarSign,
  TrendingUp,
  Sparkles,
  Layers,
  Activity,
  Shield,
  Award,
  Zap,
  Clock,
  Truck,
  TreePine,
  ArrowDown,
  Send,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { MeasurementValues } from '../measurement/types';
import { Material } from '../materials/types';
import { LaborRates } from './LaborProfitTab';
import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { toast } from '@/components/ui/use-toast';

interface SalesRepSummaryTabProps {
  measurements?: MeasurementValues;
  selectedMaterials: {[key: string]: Material};
  quantities: {[key: string]: number};
  laborRates: LaborRates;
  profitMargin: number;
  peelStickAddonCost?: number;
  onBack?: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  customerInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  jobWorksheet?: any;
  warrantyDetails?: {
    name: string;
    price: number;
    calculation: string;
  } | null;
}

export const SalesRepSummaryTab: React.FC<SalesRepSummaryTabProps> = ({
  measurements,
  selectedMaterials,
  quantities,
  laborRates,
  profitMargin,
  peelStickAddonCost = 0,
  onBack,
  onSubmit,
  isSubmitting = false,
  customerInfo,
  jobWorksheet,
  warrantyDetails
}) => {
  const [showClientView, setShowClientView] = useState(false);
  const [showInternalView, setShowInternalView] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const clientViewRef = useRef<HTMLDivElement>(null);
  
  // Handle scrolling to client view
  const handleShowClientView = () => {
    setShowClientView(true);
    setShowInternalView(false);
    setTimeout(() => {
      clientViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };
  
  // Helper function to format numbers with commas
  const formatNumberWithCommas = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Helper function to format numbers without decimals
  const formatNumberNoDecimals = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Calculate totals
  const calculateMaterialTotal = () => {
    let total = 0;
    Object.entries(selectedMaterials).forEach(([id, material]) => {
      const quantity = quantities[id] || 0;
      total += material.price * quantity;
    });
    total += peelStickAddonCost;
    
    // Add warranty cost if it exists
    if (warrantyDetails && warrantyDetails.price > 0) {
      total += warrantyDetails.price;
    }
    
    return total;
  };

  // Calculate labor costs by pitch
  const calculateLaborByPitch = () => {
    if (!measurements?.areasByPitch) return [];
    
    const laborDetails: any[] = [];
    
    measurements.areasByPitch.forEach(area => {
      const squares = area.area / 100;
      const pitch = area.pitch;
      const pitchValue = parseInt(pitch.split(/[:\/]/)[0]) || 0;
      
      // Check if we should include this pitch based on toggles
      const isLowSlopePitch = pitchValue >= 0 && pitchValue <= 2;
      const isStandardOrSteepSlopePitch = pitchValue >= 3;
      
      // Skip if low slope and includeLowSlopeLabor is false
      if (isLowSlopePitch && !(laborRates.includeLowSlopeLabor ?? true)) {
        return; // Skip this pitch
      }
      
      // Skip if steep slope and includeSteepSlopeLabor is false
      if (isStandardOrSteepSlopePitch && !(laborRates.includeSteepSlopeLabor ?? true)) {
        return; // Skip this pitch
      }
      
      // Determine labor rate based on pitch
      let rate = laborRates.laborRate || 85;
      
      // Apply pitch-specific rates
      if (pitchValue === 0) {
        rate = 159; // Flat roof rate
      } else if (pitchValue === 1 || pitchValue === 2) {
        rate = 109; // Low slope rate
      } else if (pitchValue >= 8) {
        // Steep pitch rates
        if (pitch.includes('8/12') || pitch.includes('8:12')) rate = 90;
        else if (pitch.includes('9/12') || pitch.includes('9:12')) rate = 100;
        else if (pitch.includes('10/12') || pitch.includes('10:12')) rate = 110;
        else if (pitch.includes('11/12') || pitch.includes('11:12')) rate = 120;
        else if (pitch.includes('12/12') || pitch.includes('12:12')) rate = 130;
        else if (pitchValue > 12) rate = 140;
      }
      
      const cost = squares * rate;
      
      laborDetails.push({
        pitch,
        area: area.area,
        squares,
        rate,
        cost
      });
    });
    
    return laborDetails;
  };

  // Check if skylights are already included as materials to avoid double-counting
  const hasSkylightMaterials = Object.values(selectedMaterials || {}).some(material => 
    material.id === 'skylight-2x2' || material.id === 'skylight-2x4'
  );

  const calculateLaborTotal = () => {
    const totalArea = measurements?.totalArea || 0;
    const totalSquares = totalArea / 100;
    
    // Base labor cost
    let laborCost = 0;
    const laborByPitch = calculateLaborByPitch();
    laborByPitch.forEach(item => {
      laborCost += item.cost;
    });
    
    // Add handload if applicable
    if (laborRates.isHandload) {
      laborCost += totalSquares * (laborRates.handloadRate || 10);
    }
    
    // Add dumpster
    const dumpsterCost = (laborRates.dumpsterCount || 1) * (laborRates.dumpsterRate || 400);
    
    // Add permits
    const permitCost = laborRates.includePermits ? (laborRates.permitRate || 450) : 0;
    
    // Add gutters
    const gutterCost = laborRates.includeGutters ? 
      (laborRates.gutterLinearFeet || 0) * (laborRates.gutterRate || 8) : 0;
    
    // Add downspouts
    const downspoutCost = laborRates.includeDownspouts ? 
      (laborRates.downspoutCount || 0) * (laborRates.downspoutRate || 75) : 0;
    
    // Add detach and reset gutters
    const detachResetGutterCost = laborRates.includeDetachResetGutters ?
      (laborRates.detachResetGutterLinearFeet || 0) * (laborRates.detachResetGutterRate || 1) : 0;
    
    // Add skylights only if NOT already in materials
    const skylightCost = hasSkylightMaterials ? 0 : 
      (laborRates.includeSkylights2x2 ? (laborRates.skylights2x2Count || 0) * (laborRates.skylights2x2Rate || 280) : 0) +
      (laborRates.includeSkylights2x4 ? (laborRates.skylights2x4Count || 0) * (laborRates.skylights2x4Rate || 370) : 0);
    
    return laborCost + dumpsterCost + permitCost + gutterCost + downspoutCost + detachResetGutterCost + skylightCost;
  };

  const materialTotal = calculateMaterialTotal();
  const laborTotal = calculateLaborTotal();
  const subtotal = materialTotal + laborTotal;
  // Profit margin calculation (margin on selling price, not markup on cost)
  const marginDecimal = profitMargin / 100;
  const grandTotal = subtotal / (1 - marginDecimal);
  const profitAmount = grandTotal - subtotal;

  const totalSquares = measurements?.totalArea ? (measurements.totalArea / 100).toFixed(1) : '0';
  const predominantPitch = measurements?.predominantPitch || measurements?.roofPitch || 'Unknown';
  const materialCount = Object.keys(selectedMaterials).length;

  // Helper function to format category names for display
  const formatCategoryName = (category: string): string => {
    switch (category) {
      case 'LOW_SLOPE':
        return 'Low Slope';
      case 'SHINGLES':
        return 'Shingles';
      case 'UNDERLAYMENTS':
        return 'Underlayments';
      case 'METAL':
        return 'Metal';
      case 'VENTILATION':
        return 'Ventilation';
      case 'ACCESSORIES':
        return 'Accessories';
      default:
        return category;
    }
  };

  // Group materials by category
  const groupedMaterials = Object.entries(selectedMaterials).reduce((acc, [id, material]) => {
    const category = material.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ id, material, quantity: quantities[id] || 0 });
    return acc;
  }, {} as Record<string, Array<{ id: string; material: Material; quantity: number }>>);

  // Generate PDF function
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // First, load and copy the 3MG infographic PDF (excluding page 6 - blank white page)
      try {
        const infographicUrl = '/pdf-templates/3mg-company-infographic.pdf';
        const response = await fetch(infographicUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch infographic: ${response.status} ${response.statusText}`);
        }
        
        const infographicBytes = await response.arrayBuffer();
        const infographicPdf = await PDFDocument.load(infographicBytes);
        
        // Get all page indices except pages 6 and 7 (indices 5 and 6 since it's 0-based)
        const allIndices = infographicPdf.getPageIndices();
        const filteredIndices = allIndices.filter(index => index !== 5 && index !== 6); // Skip pages 6 and 7
        
        // Copy filtered pages from the infographic to the beginning of our document
        const infographicPages = await pdfDoc.copyPages(infographicPdf, filteredIndices);
        infographicPages.forEach((page) => {
          pdfDoc.addPage(page);
        });
        
        console.log(`Added ${infographicPages.length} pages from company infographic (excluded pages 6-7)`);
      } catch (error) {
        console.error('Failed to load company infographic, continuing without it:', error);
        // Continue without the infographic if it fails to load
      }
      
      // Colors
      const green = rgb(0.173, 0.706, 0.424); // 3MG Brand Green #2cb46c
      const darkGray = rgb(0.2, 0.2, 0.2);
      const lightGray = rgb(0.5, 0.5, 0.5);
      const black = rgb(0, 0, 0);
      
      // Now add the estimate pages
      let page = pdfDoc.addPage([612, 792]); // Letter size
      const { width, height } = page.getSize();
      let y = height - 50;
      
      // Header with 3MG branding
      page.drawRectangle({
        x: 0,
        y: height - 80,
        width: width,
        height: 80,
        color: green,
      });
      
      // 3MG Logo/Title - Balanced sizing and positioning
      page.drawText('3MG', {
        x: 50,
        y: height - 45,
        size: 32,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
      
      page.drawText('ROOFING & SOLAR', {
        x: 50,
        y: height - 65,
        size: 14,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
      
      // Company info on right
      page.drawText('1127 Solana Ave', {
        x: width - 150,
        y: height - 35,
        size: 10,
        font: helvetica,
        color: rgb(1, 1, 1),
      });
      
      page.drawText('Winter Park, FL 32789', {
        x: width - 150,
        y: height - 48,
        size: 10,
        font: helvetica,
        color: rgb(1, 1, 1),
      });
      
      page.drawText('(407) 420-0201', {
        x: width - 150,
        y: height - 61,
        size: 10,
        font: helvetica,
        color: rgb(1, 1, 1),
      });
      
      y = height - 120;
      
      // Title
      page.drawText('Roof Replacement', {
        x: 50,
        y: y,
        size: 20,
        font: helveticaBold,
        color: darkGray,
      });
      
      y -= 30;
      
      // Package description - 3MG branded
      page.drawText('3MG Premium Roofing System with Comprehensive Warranty', {
        x: 50,
        y: y,
        size: 12,
        font: helvetica,
        color: darkGray,
      });
      
      y -= 40;
      
      // Customer info section
      page.drawText('Customer Information', {
        x: 50,
        y: y,
        size: 14,
        font: helveticaBold,
        color: darkGray,
      });
      
      y -= 20;
      
      // Draw customer details - only include phone and email if provided
      const customerDetails = [
        `Name: ${customerInfo?.name || 'N/A'}`,
        `Address: ${measurements?.propertyAddress || customerInfo?.address || 'N/A'}`,
        ...(customerInfo?.phone ? [`Phone: ${customerInfo.phone}`] : []),
        ...(customerInfo?.email ? [`Email: ${customerInfo.email}`] : []),
        `Date: ${new Date().toLocaleDateString()}`
      ];
      
      customerDetails.forEach(detail => {
        page.drawText(detail, {
          x: 50,
          y: y,
          size: 11,
          font: helvetica,
          color: darkGray,
        });
        y -= 18;
      });
      
      y -= 20;
      
      // Scope of Work section
      page.drawText('Scope of Work', {
        x: 50,
        y: y,
        size: 16,
        font: helveticaBold,
        color: green,
      });
      
      y -= 25;
      
      // Scope items
      const scopeItems = [
        "Set up perimeter protection for landscaping & property.",
        "Ensure the property is kept as clean and organized as possible during the entirety of the project.",
        "Ensure landscaping, screen enclosures, pools and exterior keepsakes are protected to the best of our ability.",
        "Remove all current roofing materials and discard them into the strategically-staged dumpster on site.",
        "Once all current roofing materials have been removed, we will inspect the entirety of the roof substrate/decking to ensure everything is in a strong structural state and suitable for the project.",
        "If we encounter rotted / saturated wood areas, we will surgically extract those pieces and replace them with new (Like-kind). We will ensure that decking has been returned to a strong nail-able surface.",
        "Once any necessary decking has been addressed, we will re-nail the entire surface every 6 inches to abide by and satisfy the strictly enforced new Florida Building Codes.",
        "Wood decking will be inspected and replaced on a \"as-needed\" basis at the cost of $80.00 per sheet. All framing work (fascia / trim) will be replaced on a \"as-needed\" basis at the cost of $10.00 per linear foot.",
        "Install 3MG premium roofing materials (color of your choice) to match exact product specifications and requirements for all-inclusive warranties also to abide by and satisfy the strictly enforced new Florida Building Codes.",
        "Install underlayment system to match exact product specifications and requirements for all-inclusive warranties also to abide by and satisfy the strictly enforced new Florida Building Codes.",
        "Install all new ventilation, pipes and attachments to match exact and current roof specifications.",
        "*Maximizing your roof's ventilation is the most beneficial action that can be done to ensure your roof reaches full life expectancy. Please review/discuss with your Account Manager.",
        "Provide 5 Year Limited Contractor's Warranty",
        "Provide 25-Year Limited 3MG Warranty",
        "Main Shingle Structure Only"
      ];
      
      let itemNumber = 1;
      for (const item of scopeItems) {
        // Check if we need a new page
        if (y < 100) {
          page = pdfDoc.addPage([612, 792]);
          y = height - 50;
        }
        
        // Draw item number
        page.drawText(`${itemNumber}.`, {
          x: 50,
          y: y,
          size: 11,
          font: helvetica,
          color: darkGray,
        });
        
        // Draw item text (with basic word wrapping)
        const maxWidth = width - 120;
        const words = item.split(' ');
        let line = '';
        let xOffset = 70;
        
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const testWidth = helvetica.widthOfTextAtSize(testLine, 11);
          
          if (testWidth > maxWidth && line !== '') {
            page.drawText(line.trim(), {
              x: xOffset,
              y: y,
              size: 11,
              font: helvetica,
              color: darkGray,
            });
            line = words[i] + ' ';
            y -= 12;
            
            // Check for new page - reduced threshold for better fit
            if (y < 80) {
              page = pdfDoc.addPage([612, 792]);
              y = height - 50;
            }
          } else {
            line = testLine;
          }
        }
        
        // Draw remaining text
        if (line.trim()) {
          page.drawText(line.trim(), {
            x: xOffset,
            y: y,
            size: 11,
            font: helvetica,
            color: darkGray,
          });
        }
        
        y -= 20;
        itemNumber++;
      }
      
      // Add spacing before estimate summary (same page)
      y -= 20;
      
      // Check if we need a new page for estimate summary
      if (y < 200) {
        page = pdfDoc.addPage([612, 792]);
        y = height - 50;
      }
      
      // Estimate Summary
      page.drawText('Estimate Summary', {
        x: 50,
        y: y,
        size: 16,
        font: helveticaBold,
        color: green,
      });
      
      y -= 30;
      
      // Draw summary box
      page.drawRectangle({
        x: 50,
        y: y - 60,
        width: width - 100,
        height: 60,
        borderColor: green,
        borderWidth: 1,
      });
      
      // Total Investment
      page.drawText('Total Investment:', {
        x: 70,
        y: y - 30,
        size: 14,
        font: helveticaBold,
        color: darkGray,
      });
      
      const totalPrice = grandTotal || 0;
      page.drawText(`$${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, {
        x: width - 150,
        y: y - 30,
        size: 18,
        font: helveticaBold,
        color: green,
      });
      
      y -= 80;
      
      // Payment terms
      page.drawText('This proposal is valid for 30 days from the date above.', {
        x: 50,
        y: y,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      
      y -= 15;
      
      page.drawText('Prices subject to change based on material availability.', {
        x: 50,
        y: y,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      
      y -= 60;
      
      // ESTIMATE DISCLAIMER - positioned after payment terms, before signatures
      page.drawText('ESTIMATE DISCLAIMER:', {
        x: 50,
        y: y,
        size: 12,
        font: helveticaBold,
        color: darkGray,
      });
      
      y -= 15;
      
      // Disclaimer text
      const disclaimerText = "A written contract, issued after mutual agreement on the scope of work and inspection findings, will govern the total price, payment terms, timeline, and all other obligations, and will supersede and render of no legal effect any figures contained in this estimate. Until that contract is executed, all amounts should be viewed as preliminary and subject to revision. Pricing may change based on on-site inspection findings; adjustments to project scope, materials, or requested services; fluctuations in labor, material, and permit costs; and unforeseen conditions.";
      
      // Word wrap the disclaimer text
      const disclaimerMaxWidth = width - 100;
      const disclaimerWords = disclaimerText.split(' ');
      let disclaimerLine = '';
      
      for (let i = 0; i < disclaimerWords.length; i++) {
        const testLine = disclaimerLine + disclaimerWords[i] + ' ';
        const testWidth = helvetica.widthOfTextAtSize(testLine, 9);
        
        if (testWidth > disclaimerMaxWidth && disclaimerLine !== '') {
          page.drawText(disclaimerLine.trim(), {
            x: 50,
            y: y,
            size: 9,
            font: helvetica,
            color: darkGray,
          });
          disclaimerLine = disclaimerWords[i] + ' ';
          y -= 11;
        } else {
          disclaimerLine = testLine;
        }
      }
      
      // Draw remaining disclaimer text
      if (disclaimerLine.trim()) {
        page.drawText(disclaimerLine.trim(), {
          x: 50,
          y: y,
          size: 9,
          font: helvetica,
          color: darkGray,
        });
        y -= 11;
      }
      
      y -= 120;
      
      // Signature section
      page.drawText('Signature', {
        x: 50,
        y: y,
        size: 14,
        font: helveticaBold,
        color: darkGray,
      });
      
      y -= 30;
      
      // Customer signature line
      page.drawLine({
        start: { x: 50, y: y },
        end: { x: 250, y: y },
        thickness: 1,
        color: darkGray,
      });
      
      page.drawText('Customer Signature', {
        x: 50,
        y: y - 15,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      
      // Date line
      page.drawLine({
        start: { x: 300, y: y },
        end: { x: 400, y: y },
        thickness: 1,
        color: darkGray,
      });
      
      page.drawText('Date', {
        x: 300,
        y: y - 15,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      
      y -= 50;
      
      // Company signature line
      page.drawLine({
        start: { x: 50, y: y },
        end: { x: 250, y: y },
        thickness: 1,
        color: darkGray,
      });
      
      page.drawText('3MG Representative', {
        x: 50,
        y: y - 15,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      
      // Date line
      page.drawLine({
        start: { x: 300, y: y },
        end: { x: 400, y: y },
        thickness: 1,
        color: darkGray,
      });
      
      page.drawText('Date', {
        x: 300,
        y: y - 15,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      
      // Footer
      page.drawText('3MG Solutions, LLC | 1127 Solana Ave, Winter Park, FL 32789 | (407) 420-0201', {
        x: width / 2 - 150,
        y: 30,
        size: 9,
        font: helvetica,
        color: lightGray,
      });
      
      // Generate PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const fileName = `3MG-Estimate-${measurements?.propertyAddress?.replace(/[^a-zA-Z0-9]/g, '-') || 'Customer'}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      saveAs(blob, fileName);
      
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle Internal View Button (only shown when client view is active) */}
      {showClientView && !showInternalView && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInternalView(!showInternalView)}
            className="text-gray-600 hover:text-gray-800 border-gray-300"
          >
            <FileText className="h-4 w-4 mr-2" />
            Show Internal Summary
          </Button>
        </div>
      )}
      
      {/* Internal Estimate Summary - Conditionally Rendered */}
      {showInternalView && (
        <>
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold">
                    Estimate Summary Review
                    {showClientView && (
                      <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
                        Internal View
                      </Badge>
                    )}
                  </h2>
                  <p className="text-green-100 text-sm">Review all details before submitting for approval</p>
                </div>
              </div>
              {showClientView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInternalView(false)}
                  className="text-white hover:bg-white/20"
                >
                  Hide
                </Button>
              )}
            </div>
          </div>

      {/* Customer Info & Project Overview Combined */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-1">
                <Home className="h-4 w-4" />
                Customer Information
              </h3>
              
              {/* Centered and Larger Address */}
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <span className="text-lg font-semibold text-gray-800">
                    {measurements?.propertyAddress || customerInfo?.address || 'Address not provided'}
                  </span>
                </div>
              </div>
              
              {/* Other contact info below */}
              <div className="space-y-1 text-sm">
                {customerInfo?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-gray-500" />
                    <span>{customerInfo.phone}</span>
                  </div>
                )}
                {customerInfo?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-gray-500" />
                    <span>{customerInfo.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Project Overview */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Project Overview
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Total Area</p>
                  <p className="font-bold">{formatNumberNoDecimals(measurements?.totalArea || 0)} sq ft</p>
                  <p className="text-xs text-gray-600">({totalSquares} sq)</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Pitch</p>
                  <p className="font-bold">{predominantPitch}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Materials</p>
                  <p className="font-bold">{materialCount}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials & Labor Combined */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Materials Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(groupedMaterials).map(([category, items]) => (
              <div key={category}>
                <h4 className="font-medium text-xs text-gray-600 mb-1">{formatCategoryName(category)}</h4>
                <div className="space-y-1">
                  {items.map(({ id, material, quantity }) => (
                    <div key={id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <div className="flex-1 pr-2">
                        <p className="font-medium text-sm">{material.name}</p>
                      </div>
                      <p className="font-semibold text-sm">{quantity} {material.unit}s</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {peelStickAddonCost > 0 && (
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                <p className="font-medium">Full W.W. Peel & Stick System</p>
                <p className="font-semibold">Included</p>
              </div>
            )}
            
            {warrantyDetails && warrantyDetails.price > 0 && (
              <div className="flex justify-between items-center p-2 bg-purple-50 rounded text-sm">
                <p className="font-medium">{warrantyDetails.name}</p>
                <p className="font-semibold">1</p>
              </div>
            )}
            
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center font-bold text-sm">
                <span>Materials Subtotal</span>
                <span>${formatNumberWithCommas(materialTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Labor Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Labor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Labor by Pitch - Compact */}
            <div>
              <h4 className="font-medium text-xs text-gray-600 mb-1">Labor by Pitch</h4>
              <div className="space-y-1">
                {calculateLaborByPitch().map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <span className="font-medium">Pitch {item.pitch}</span>
                    <span className="text-gray-600">{item.squares.toFixed(1)} sq</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Items - Compact List */}
            <div className="space-y-1">
              {laborRates.isHandload && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Handload</span>
                  <span className="text-gray-600">{totalSquares} sq</span>
                </div>
              )}

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                <span className="font-medium">Dumpster ({laborRates.dumpsterCount || 1})</span>
                <span className="text-gray-600">{laborRates.dumpsterLocation === 'orlando' ? 'Central Florida' : 'Outside Central Florida'}</span>
              </div>

              {laborRates.includePermits && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Permits</span>
                  <span className="text-gray-600">Required</span>
                </div>
              )}

              {laborRates.includeGutters && laborRates.gutterLinearFeet > 0 && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Gutters</span>
                  <span className="text-gray-600">{laborRates.gutterLinearFeet} LF</span>
                </div>
              )}

              {laborRates.includeDownspouts && laborRates.downspoutCount > 0 && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Downspouts</span>
                  <span className="text-gray-600">Qty: {laborRates.downspoutCount}</span>
                </div>
              )}

              {laborRates.includeDetachResetGutters && laborRates.detachResetGutterLinearFeet > 0 && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Detach & Reset Gutters</span>
                  <span className="text-gray-600">{laborRates.detachResetGutterLinearFeet} LF</span>
                </div>
              )}

              {/* Only show skylight labor items if NOT already included as materials */}
              {!hasSkylightMaterials && (laborRates.includeSkylights2x2 || laborRates.includeSkylights2x4) && (
                <>
                  {laborRates.includeSkylights2x2 && laborRates.skylights2x2Count > 0 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">Skylights 2x2</span>
                      <span className="text-gray-600">Qty: {laborRates.skylights2x2Count}</span>
                    </div>
                  )}
                  {laborRates.includeSkylights2x4 && laborRates.skylights2x4Count > 0 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">Skylights 2x4</span>
                      <span className="text-gray-600">Qty: {laborRates.skylights2x4Count}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center font-bold text-sm">
                <span>Labor Subtotal</span>
                <span>${formatNumberWithCommas(laborTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Summary - Compact */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Materials Total</span>
              <span className="font-semibold">${formatNumberWithCommas(materialTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Labor Total</span>
              <span className="font-semibold">${formatNumberWithCommas(laborTotal)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-semibold">${formatNumberWithCommas(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Profit Margin ({profitMargin}%)</span>
              <span className="font-semibold text-green-600">+${formatNumberWithCommas(profitAmount)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Grand Total</span>
              <span className="text-green-600">${formatNumberWithCommas(grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Project Details
        </Button>
        
        <div className="flex gap-3">
          {/* Generate PDF & Submit */}
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Estimate
              </>
            )}
          </Button>
          
          {/* Send for Signature - enabled for sales reps */}
          <Button
            onClick={() => {
              // TODO: Implement SignNow integration
              toast({
                title: "Send for Signature",
                description: "This feature will be available soon!",
              });
            }}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25"
          >
            <Send className="h-4 w-4 mr-2" />
            Send for Signature
          </Button>
        </div>
      </div>
      </>
      )}
      
      {/* Submit for Client View Button */}
      {!showClientView && showInternalView && (
        <div className="mt-12 flex justify-center">
          <div className="relative group cursor-pointer" onClick={handleShowClientView}>
            {/* Animated bubble background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-xl opacity-70 group-hover:opacity-100 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full blur-xl opacity-70 group-hover:opacity-100 animate-pulse animation-delay-2000"></div>
            
            {/* Main button */}
            <div className="relative bg-gray-900/90 backdrop-blur-sm rounded-full px-8 py-4 border border-purple-500/30 group-hover:border-purple-400/50 transition-all duration-300 transform group-hover:scale-105">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
                <span className="text-lg font-semibold text-white">Finalized Client Estimate</span>
                <ArrowDown className="h-5 w-5 text-purple-400 animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Client View Section */}
      {showClientView && (
        <div ref={clientViewRef} className="mt-16">
          <Separator className="mb-8" />
          
          {/* Client-Facing Proposal */}
          <div className="mt-12 bg-white rounded-lg shadow-xl border-2 border-lime-500 overflow-hidden">
            {/* Modern 3MG Header */}
            <div className="relative bg-gradient-to-r from-lime-500 to-green-600 p-8 overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`,
                  animation: 'slide 20s linear infinite'
                }} />
              </div>
              
              {/* 3MG Logo and Title */}
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center mb-4">
                  <div className="bg-white rounded-full p-4 shadow-2xl transform hover:scale-110 transition-transform duration-300">
                    <svg className="w-16 h-16 text-lime-600" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M50 10 L70 30 L70 50 L50 70 L30 50 L30 30 Z" opacity="0.8"/>
                      <path d="M50 20 L60 30 L60 50 L50 60 L40 50 L40 30 Z" opacity="0.6"/>
                      <circle cx="50" cy="40" r="15" fill="white"/>
                      <text x="50" y="47" textAnchor="middle" className="text-lime-600 font-bold" style={{ fontSize: '16px' }}>3MG</text>
                    </svg>
                  </div>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                  3MG Roofing and Solar
                </h1>
                <p className="text-lime-100 text-lg">Premium Roofing Solutions • GAF Certified Excellence</p>
                
                {/* Animated accent lines */}
                <div className="mt-6 flex justify-center space-x-2">
                  <div className="h-1 w-20 bg-white rounded-full opacity-80 animate-pulse" />
                  <div className="h-1 w-20 bg-lime-200 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="h-1 w-20 bg-white rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <svg className="w-5 h-5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-sm font-medium">Property Address</span>
                  </div>
                  <p className="text-gray-900 font-semibold">{measurements?.propertyAddress || 'N/A'}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <svg className="w-5 h-5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Proposal Date</span>
                  </div>
                  <p className="text-gray-900 font-semibold">{new Date().toLocaleDateString()}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <svg className="w-5 h-5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-sm font-medium">Roofing System</span>
                  </div>
                  <p className="text-gray-900 font-semibold">GAF Premium Package</p>
                </div>
              </div>

              {/* Scope of Work */}
              <Card className="border-gray-200 bg-white shadow-lg mb-8">
                <CardHeader className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <FileText className="h-6 w-6" />
                    Scope of Work
                  </CardTitle>
                  <p className="text-lime-50 mt-2">
                    Complete GAF Roofing System Installation with Premium Materials & Warranty Protection
                  </p>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-white">
                  <div className="space-y-6">
                    {/* Preparation Phase */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <TreePine className="h-5 w-5 text-lime-600" />
                        Property Protection & Preparation
                      </h3>
                      <ol className="space-y-2 text-gray-700 ml-7">
                        <li>1. Set up comprehensive perimeter protection for landscaping & property</li>
                        <li>2. Ensure property is kept clean and organized throughout the project</li>
                        <li>3. Protect landscaping, screen enclosures, pools, and exterior features</li>
                        <li>4. Strategic dumpster placement to minimize property impact</li>
                      </ol>
                    </div>
                    
                    {/* Removal & Inspection */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-orange-400" />
                        Removal & Deck Inspection
                      </h3>
                      <ol className="space-y-2 text-gray-700 ml-7" start={5}>
                        <li>5. Complete removal of existing roofing materials down to deck</li>
                        <li>6. Thorough inspection of entire roof deck for structural integrity</li>
                        <li>7. Inspect and replace damaged or deteriorated roof decking as needed</li>
                        <li>8. Re-nail entire deck surface every 6" per Florida Building Code</li>
                      </ol>
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 ml-7">
                        <p className="text-sm text-amber-800">
                          <strong>Note:</strong> Wood decking replacement as needed at $80.00/sheet. 
                          Fascia/trim work at $10.00/linear foot if required.
                        </p>
                      </div>
                    </div>
                    
                    {/* GAF Installation */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Award className="h-5 w-5 text-blue-600" />
                        GAF Premium Roofing System Installation
                      </h3>
                      <ol className="space-y-2 text-gray-700 ml-7" start={9}>
                        <li>9. Install GAF Timberline HDZ™ Shingles - America's #1 selling shingle</li>
                        <li>10. Install GAF Pro-Start™ Starter Strip Shingles for enhanced edge protection</li>
                        <li>11. Install GAF WeatherWatch® Leak Barrier in critical areas</li>
                        <li>12. Install GAF Roof Deck Protection underlayment system</li>
                        <li>13. Install GAF Cobra® Ridge Vents for optimal attic ventilation</li>
                        <li>14. Install all new pipe boots, flashings, and accessories to GAF specifications</li>
                      </ol>
                    </div>
                    
                    {/* Ventilation & Warranty */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-purple-600" />
                        Ventilation & Warranty Protection
                      </h3>
                      <ol className="space-y-2 text-gray-700 ml-7" start={15}>
                        <li>15. Maximize roof ventilation for optimal performance and longevity</li>
                        <li>16. Final inspection and quality assurance check</li>
                        <li>17. Complete property cleanup and magnetic nail sweep</li>
                      </ol>
                    </div>
                    
                    {/* Warranty Information */}
                    <div className="mt-6 bg-gradient-to-r from-lime-50 to-green-50 border border-lime-300 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-lime-600" />
                        Comprehensive Warranty Protection
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-lime-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-lime-600" />
                            <h4 className="font-semibold text-gray-900">GAF Manufacturer Warranty</h4>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {jobWorksheet?.shingle_roof?.warranty_type === 'GAF Silver Pledge' ? '50-Year' : '25-Year'} Limited Warranty on materials
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-lime-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-lime-600" />
                            <h4 className="font-semibold text-gray-900">3MG Workmanship Warranty</h4>
                          </div>
                          <p className="text-gray-600 text-sm">
                            5-Year comprehensive workmanship protection
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Investment Summary */}
              <Card className="border-lime-300 bg-white shadow-xl">
                <CardContent className="p-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Total Investment</h2>
                    <div className="text-5xl font-bold text-lime-600 mb-4">
                      ${formatNumberWithCommas(grandTotal)}
                    </div>
                    <Badge className="bg-lime-100 text-lime-700 border-lime-300 px-6 py-2">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      All-Inclusive Price - No Hidden Fees
                    </Badge>
                  </div>
                  
                  <div className="mt-8 grid md:grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Estimated Timeline</p>
                      <p className="text-gray-900 font-semibold">1-2 Days</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <Truck className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Material Delivery</p>
                      <p className="text-gray-900 font-semibold">Next Day Available</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">GAF Certified</p>
                      <p className="text-gray-900 font-semibold">Master Elite Contractor</p>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-center">
                    <p className="text-gray-600 text-sm">
                      This proposal is valid for 30 days from the date above. 
                      Prices subject to change based on material availability.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 mt-12 justify-center px-4">
                {/* Email Button with 3D effect */}
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-lime-600 to-green-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse"></div>
                  
                  <Button 
                    size="lg" 
                    className="relative bg-gradient-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 text-white font-bold px-10 py-7 text-lg shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl border-b-4 border-lime-800 hover:border-b-2 hover:translate-y-1"
                    onClick={() => {
                      // TODO: Implement email signature collection
                      console.log('Email to collect signature clicked');
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-xl">Email to collect signature</span>
                    </span>
                    
                    {/* Shine effect */}
                    <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                  </Button>
                </div>
                
                {/* Download Button with 3D effect */}
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition duration-500 group-hover:duration-200"></div>
                  
                  <Button 
                    size="lg" 
                    className="relative bg-white hover:bg-gray-50 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold px-10 py-7 text-lg shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl border-2 border-gradient-to-r from-blue-600 to-purple-600 hover:shadow-purple-500/25"
                    style={{
                      background: 'white',
                      boxShadow: '0 10px 0 0 rgb(147 51 234 / 0.3), 0 20px 25px -5px rgb(147 51 234 / 0.3)',
                    }}
                    onClick={() => {
                      generatePDF();
                    }}
                    disabled={isGeneratingPDF}
                  >
                    <span className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-xl font-bold">
                        {isGeneratingPDF ? 'Generating PDF...' : 'Download Estimate'}
                      </span>
                    </span>
                    
                    {/* Floating animation */}
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-md opacity-50 group-hover:w-full transition-all duration-300"></div>
                  </Button>
                </div>
              </div>
              
              {/* Additional CTA text */}
              <div className="text-center mt-8">
                <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                  Choose your preferred option to proceed with your new roof
                  <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 