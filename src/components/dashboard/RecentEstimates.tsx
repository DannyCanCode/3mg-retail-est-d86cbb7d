import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { EstimateCard } from "@/components/ui/EstimateCard";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { getEstimates, EstimateStatus, Estimate, updateEstimateStatus, markEstimateAsSold, updateEstimateCustomerDetails } from "@/api/estimatesFacade";
import { withTimeout } from "@/lib/withTimeout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { useRealTimeEstimates } from "@/hooks/useRealTimeEstimates";
import { WifiOff, Wifi } from "lucide-react";

const INITIAL_VISIBLE_COUNT = 12; // Show 12 estimates initially

export function RecentEstimates() {
  const { estimates, isLoading, error: realtimeError, refreshEstimates } = useRealTimeEstimates();
  const [filteredEstimates, setFilteredEstimates] = useState<Estimate[]>([]);
  const [activeFilter, setActiveFilter] = useState<EstimateStatus | "all">("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState<{[key: string]: boolean}>({});
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // --- State for Mark as Sold Dialogs --- 
  const [estimateToMarkSold, setEstimateToMarkSold] = useState<Estimate | null>(null);
  const [isSoldConfirmDialogOpen, setIsSoldConfirmDialogOpen] = useState(false);
  const [jobType, setJobType] = useState<'Retail' | 'Insurance'>('Retail');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  // --- End State --- 

  // --- State for Add Customer Info Dialog --- 
  const [isCustomerInfoDialogOpen, setIsCustomerInfoDialogOpen] = useState(false);
  const [estimateForCustomerInfo, setEstimateForCustomerInfo] = useState<Estimate | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSavingCustomerInfo, setIsSavingCustomerInfo] = useState(false);
  // --- End State --- 

  // --- State for Load More --- 
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  // --- End State ---

  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredEstimates(estimates);
    } else {
      setFilteredEstimates(estimates.filter(est => est.status === activeFilter));
    }
  }, [activeFilter, estimates]);

  // Handle real-time connection errors
  useEffect(() => {
    if (realtimeError) {
      toast({
        title: "Connection Issue",
        description: "Real-time updates disconnected. Click refresh to reconnect.",
        variant: "destructive"
      });
    }
  }, [realtimeError, toast]);

  // Removed manual fetchEstimates - now using real-time hook
  
  const formatEstimateDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const formatSquares = (sqFt?: number) => {
    if (!sqFt) return "N/A";
    // Convert square feet to roofing squares (1 square = 100 sqft)
    const squares = sqFt / 100;
    return `${squares.toFixed(1)} squares`;
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    setIsSubmitting(prev => ({ ...prev, [id]: true }));
    try {
      await updateEstimateStatus(id, status);
      toast({ title: "Success", description: `Estimate ${status}.` });
      // Real-time updates will automatically refresh the list
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to update status: ${err.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleGeneratePdf = async (estimate: Estimate) => {
    if (!estimate || !estimate.id) return;
    const estimateId = estimate.id;

    // Check for required customer info
    if (!estimate.customer_name || !estimate.customer_email || !estimate.customer_phone) {
      console.log("Customer info missing for estimate:", estimate.id);
      // Set state for the dialog
      setEstimateForCustomerInfo(estimate);
      setCustomerName(estimate.customer_name || '');
      setCustomerEmail(estimate.customer_email || '');
      setCustomerPhone(estimate.customer_phone || '');
      setIsCustomerInfoDialogOpen(true);
      toast({ title: "Missing Info", description: "Please add customer details before generating the PDF." }); 
      return; // Stop here, open dialog instead
    }

    // If info exists, generate PDF client-side
    console.log("Generating PDF client-side for estimate:", estimateId);
    setGeneratingPdfId(estimateId);
    
    try {
      // --- PDF Generation Logic --- 
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([612, 792]);
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const greenColor = rgb(0.173, 0.706, 0.424); // 3MG Brand Green #2cb46c
      const margin = 50;
      let currentY = height - margin;

      // --- PDF Content (Mimic structure from Edge Function) --- 
      // Header
      page.drawText('3MG Roofing', { x: margin, y: currentY, font: boldFont, size: 16, color: greenColor });
      currentY -= 15;
      page.drawText('152 N. Hwy 17-92 Ste 100', { x: margin, y: currentY, font: font, size: 9 });
      currentY -= 11;
      page.drawText('Winter Park, FL 32789', { x: margin, y: currentY, font: font, size: 9 });
      currentY -= 11;
      page.drawText('Phone: 407-xxx-xxxx', { x: margin, y: currentY, font: font, size: 9 }); // TODO: Real phone

      // Date and Job Type
      const dateText = `Date: ${new Date(estimate.created_at || Date.now()).toLocaleDateString()}`;
      const dateWidth = boldFont.widthOfTextAtSize(dateText, 10);
      page.drawText(dateText, { x: width - margin - dateWidth, y: height - margin, font: boldFont, size: 10 });

      const jobText = `Job Type: ${estimate.job_type || 'RETAIL'}`; // Use job_type if available from estimate data
      const jobWidth = font.widthOfTextAtSize(jobText, 9);
      page.drawText(jobText, { x: width - margin - jobWidth, y: height - margin - 15, font: font, size: 9 });

      currentY -= 30;

      // Customer Info
      page.drawText('Customer Information', { x: margin, y: currentY, font: boldFont, size: 12, color: greenColor });
      currentY -= 15;
      page.drawText(estimate.customer_name || 'N/A', { x: margin, y: currentY, font: boldFont, size: 10 });
      page.drawText(estimate.customer_address || 'N/A', { x: margin + 5, y: currentY, font: font, size: 10 });
      page.drawText(`Email: ${estimate.customer_email || 'N/A'}`, { x: margin + 5, y: currentY, font: font, size: 10 });
      page.drawText(`Phone: ${estimate.customer_phone || 'N/A'}`, { x: margin + 5, y: currentY, font: font, size: 10 });

      currentY -= 30;

      // Itemized Section Header
      page.drawText('3MG Roof Replacement Section', { x: margin, y: currentY, font: boldFont, size: 12, color: greenColor });
      currentY -= 15;
      const itemStartX = margin + 10;
      const qtyX = width - 150;
      const unitX = width - 100;

      page.drawText('Item Description', { x: itemStartX, y: currentY, font: boldFont, size: 10 });
      page.drawText('Qty', { x: qtyX, y: currentY, font: boldFont, size: 10 });
      page.drawText('Unit', { x: unitX, y: currentY, font: boldFont, size: 10 });
      currentY -= 5;
      page.drawLine({ start: { x: margin, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      currentY -= 15;

      // Materials List (No Prices)
      const materials = estimate.materials as Record<string, { name: string; unit: string; price?: number; }>; // Type assertion
      const quantities = estimate.quantities as Record<string, number>; 
      if (materials && quantities) {
        for (const materialId in quantities) {
          const material = materials[materialId];
          const quantity = quantities[materialId];
          if (material && quantity > 0 && material.price !== 0) { 
              // Basic word wrapping (same as before)
              const maxLineWidth = qtyX - itemStartX - 10;
              const words = material.name.split(' ');
              let currentLine = '';
              for (const word of words) {
                  const testLine = currentLine + (currentLine ? ' ' : '') + word;
                  if (font.widthOfTextAtSize(testLine, 10) > maxLineWidth) {
                      page.drawText(currentLine, { x: itemStartX, y: currentY, font: font, size: 10 });
                      currentY -= 12;
                      currentLine = word;
                  } else {
                      currentLine = testLine;
                  }
              }
              page.drawText(currentLine, { x: itemStartX, y: currentY, font: font, size: 10 });
              
              page.drawText(quantity.toString(), { x: qtyX, y: currentY, font: font, size: 10 });
              page.drawText(material.unit, { x: unitX, y: currentY, font: font, size: 10 });
              currentY -= 12; 
              if (currentY < 150) { 
                  page = pdfDoc.addPage([612, 792])
                  currentY = height - margin; 
              }
          }
        }
      }
      
      currentY -= 15;
      page.drawLine({ start: { x: margin, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      currentY -= 20;

      // Total Section
      const totalLabel = 'TOTAL';
      const totalValue = (estimate.total_price ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      const totalLabelWidth = boldFont.widthOfTextAtSize(totalLabel, 12);
      const totalValueWidth = boldFont.widthOfTextAtSize(totalValue, 12);
      page.drawText(totalLabel, { x: width - margin - totalValueWidth - totalLabelWidth - 10, y: currentY, font: boldFont, size: 12 });
      page.drawText(totalValue, { x: width - margin - totalValueWidth, y: currentY, font: boldFont, size: 12 });

      currentY -= 40;

      // Disclaimer section
      page.drawText('ESTIMATE DISCLAIMER:', { x: margin, y: currentY, font: boldFont, size: 12, color: rgb(0.2, 0.2, 0.2) });
      currentY -= 20;
      
      // Disclaimer text
      const disclaimerText = "A written contract, issued after mutual agreement on the scope of work and inspection findings, will govern the total price, payment terms, timeline, and all other obligations, and will supersede and render of no legal effect any figures contained in this estimate. Until that contract is executed, all amounts should be viewed as preliminary and subject to revision. Pricing may change based on on-site inspection findings; adjustments to project scope, materials, or requested services; fluctuations in labor, material, and permit costs; and unforeseen conditions.";
      
      // Word wrap the disclaimer text
      const disclaimerMaxWidth = width - 2 * margin;
      const disclaimerWords = disclaimerText.split(' ');
      let disclaimerLine = '';
      
      for (let i = 0; i < disclaimerWords.length; i++) {
        const testLine = disclaimerLine + disclaimerWords[i] + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, 10);
        
        if (testWidth > disclaimerMaxWidth && disclaimerLine !== '') {
          page.drawText(disclaimerLine.trim(), { x: margin, y: currentY, font: font, size: 10 });
          disclaimerLine = disclaimerWords[i] + ' ';
          currentY -= 12;
          
          // Check if we need a new page
          if (currentY < 100) {
            page = pdfDoc.addPage([612, 792]);
            currentY = height - margin;
          }
        } else {
          disclaimerLine = testLine;
        }
      }
      
      // Draw remaining disclaimer text
      if (disclaimerLine.trim()) {
        page.drawText(disclaimerLine.trim(), { x: margin, y: currentY, font: font, size: 10 });
        currentY -= 12;
      }
      
      currentY -= 20;
      
      // Signature section
      page.drawText('Customer Acceptance', { x: margin, y: currentY, font: boldFont, size: 12 });
      currentY -= 30;
      
      // Customer signature line
      page.drawLine({ start: { x: margin, y: currentY }, end: { x: margin + 200, y: currentY }, thickness: 1 });
      page.drawText('Customer Signature', { x: margin, y: currentY - 15, font: font, size: 9 });
      
      // Date line
      page.drawLine({ start: { x: margin + 250, y: currentY }, end: { x: margin + 350, y: currentY }, thickness: 1 });
      page.drawText('Date', { x: margin + 250, y: currentY - 15, font: font, size: 9 });
      
      currentY -= 50;
      
      // Company signature line
      page.drawLine({ start: { x: margin, y: currentY }, end: { x: margin + 200, y: currentY }, thickness: 1 });
      page.drawText('3MG Representative', { x: margin, y: currentY - 15, font: font, size: 9 });
      
      // Date line
      page.drawLine({ start: { x: margin + 250, y: currentY }, end: { x: margin + 350, y: currentY }, thickness: 1 });
      page.drawText('Date', { x: margin + 250, y: currentY - 15, font: font, size: 9 });

      // --- End PDF Content ---

      // Save PDF to bytes
      const pdfBytes = await pdfDoc.save();

      // Trigger download using file-saver
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `3MG-Estimate-${estimateId.substring(0,8)}.pdf`);

      toast({ title: "PDF Generated", description: "Download started." });

    } catch (err: any) {
      console.error("Error generating PDF client-side:", err);
      toast({ title: "Error Generating PDF", description: `Failed: ${err.message}`, variant: "destructive" });
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // --- New Handler: Saves customer details --- 
  const handleSaveCustomerDetails = async () => {
    if (!estimateForCustomerInfo?.id) return;
    const estimateId = estimateForCustomerInfo.id;

    // Simple validation
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      toast({ title: "Validation Error", description: "Please fill in all customer details.", variant: "destructive" });
      return;
    }

    setIsSavingCustomerInfo(true);
    try {
      const { data: updatedEstimateData, error } = await updateEstimateCustomerDetails(estimateId, {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim(),
      });

      if (error) throw error;

      // Real-time updates will handle the state automatically
      
      toast({ title: "Success", description: "Customer details updated." });
      setIsCustomerInfoDialogOpen(false);
      setEstimateForCustomerInfo(null);

      // Optional: Automatically trigger PDF generation again now that details are saved
      // Find the updated estimate data to pass to the function
      const updatedEstimate = estimates.find(est => est.id === estimateId);
      if (updatedEstimate) {
         console.log("Retrying PDF generation after saving customer info...");
         // Use setTimeout to allow state updates to potentially settle, though may not be needed
         setTimeout(() => handleGeneratePdf(updatedEstimate), 100); 
      } else {
         console.warn("Could not find updated estimate in state to re-trigger PDF gen.");
      }

    } catch (err: any) {
      console.error("Error saving customer details:", err);
      toast({ title: "Error", description: `Failed to save details: ${err.message}`, variant: "destructive" });
    } finally {
      setIsSavingCustomerInfo(false);
    }
  };
  // --- End New Handler --- 

  // --- New Handlers for Mark as Sold --- 
  const handleOpenSoldDialog = (estimate: Estimate) => {
     setEstimateToMarkSold(estimate);
     setJobType('Retail');
     setInsuranceCompany('');
     setIsSoldConfirmDialogOpen(true);
  };

  const handleConfirmSale = async () => {
    if (!estimateToMarkSold?.id) return;
    const estimateId = estimateToMarkSold.id;

    if (jobType === 'Insurance' && !insuranceCompany.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please enter the Insurance Company name." });
        return;
    }

    setIsSubmitting(prev => ({ ...prev, [estimateId]: true }));
    setIsSoldConfirmDialogOpen(false); 

    try {
      await markEstimateAsSold(estimateId, jobType, insuranceCompany.trim());
      toast({ title: "Success", description: `Estimate #${estimateId.substring(0, 8)} marked as ${jobType} Sale.` });
      setEstimateToMarkSold(null);
      // Real-time updates will automatically refresh the list
    } catch (err: any) {
      console.error("Error marking estimate as sold:", err);
      toast({ title: "Error", description: `Failed to mark estimate as sold: ${err.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [estimateId]: false }));
    }
  };
  // --- End New Handlers --- 

  // --- Handler for Load More --- 
  const handleLoadMore = () => {
      // Option 1: Show all remaining
      setVisibleCount(filteredEstimates.length);
      // Option 2: Load next batch (e.g., 12 more)
      // setVisibleCount(prev => prev + INITIAL_VISIBLE_COUNT);
  };
  // --- End Handler --- 

  return (
    <>
      <Card className="animate-slide-in-up" style={{ animationDelay: "0.2s" }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Estimates
              {realtimeError ? (
                <WifiOff className="h-4 w-4 text-red-500" />
              ) : (
                <Wifi className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
            <CardDescription>
              View and manage your roofing estimates {realtimeError ? '(offline mode)' : '(live updates)'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={refreshEstimates}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button asChild>
              <Link to="/estimates">New Estimate</Link>
            </Button>
          </div>
        </CardHeader>
        
        <div className="px-6 mb-4">
          <Tabs
            defaultValue="all"
            value={activeFilter}
            onValueChange={(value) => setActiveFilter(value as EstimateStatus | "all")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Accepted</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-36" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-6 w-28" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredEstimates.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEstimates.slice(0, visibleCount).map((estimate) => {
                // Determine creator info and role-based styling
                const creatorName = estimate.creator_name || estimate.customer_name || 'Unknown Creator';
                const creatorRole = estimate.creator_role || 'rep'; // fallback to rep if no role
                
                // Get territory name from estimate
                const territoryName = (estimate as any).territory_name;
                
                // 🎨 TERRITORY-BASED COLOR SYSTEM
                const getTerritoryTheme = (territoryName?: string, role?: string) => {
                  // 🔒 Admin cards remain blue regardless of territory
                  if (role === 'admin') {
                    return {
                      border: 'border-blue-200',
                      headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100',
                      titleColor: 'text-blue-900',
                      accentColor: 'text-blue-600',
                      badgeColors: 'bg-blue-100 text-blue-800 border-blue-300',
                      territoryLabel: 'Admin'
                    };
                  }

                  // 🏢 Territory-based colors for managers and reps
                  switch (territoryName?.toLowerCase()) {
                    case 'tampa':
                      return {
                        border: 'border-emerald-200',
                        headerBg: 'bg-gradient-to-r from-emerald-50 to-emerald-100',
                        titleColor: 'text-emerald-900',
                        accentColor: 'text-emerald-600',
                        badgeColors: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                        territoryLabel: 'Tampa'
                      };
                    case 'ocala':
                      return {
                        border: 'border-cyan-200',
                        headerBg: 'bg-gradient-to-r from-cyan-50 to-cyan-100',
                        titleColor: 'text-cyan-900',
                        accentColor: 'text-cyan-600',
                        badgeColors: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                        territoryLabel: 'Ocala'
                      };
                    case 'winter park':
                      return {
                        border: 'border-purple-200',
                        headerBg: 'bg-gradient-to-r from-purple-50 to-purple-100',
                        titleColor: 'text-purple-900',
                        accentColor: 'text-purple-600',
                        badgeColors: 'bg-purple-100 text-purple-800 border-purple-300',
                        territoryLabel: 'Winter Park'
                      };
                    case 'miami':
                      return {
                        border: 'border-pink-200',
                        headerBg: 'bg-gradient-to-r from-pink-50 to-pink-100',
                        titleColor: 'text-pink-900',
                        accentColor: 'text-pink-600',
                        badgeColors: 'bg-pink-100 text-pink-800 border-pink-300',
                        territoryLabel: 'Miami'
                      };
                    case 'stuart':
                      return {
                        border: 'border-amber-200',
                        headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100',
                        titleColor: 'text-amber-900',
                        accentColor: 'text-amber-600',
                        badgeColors: 'bg-amber-100 text-amber-800 border-amber-300',
                        territoryLabel: 'Stuart'
                      };
                    case 'jacksonville':
                      return {
                        border: 'border-indigo-200',
                        headerBg: 'bg-gradient-to-r from-indigo-50 to-indigo-100',
                        titleColor: 'text-indigo-900',
                        accentColor: 'text-indigo-600',
                        badgeColors: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                        territoryLabel: 'Jacksonville'
                      };
                    default:
                      // Fallback for unknown territories
                      return {
                        border: 'border-gray-200',
                        headerBg: 'bg-gradient-to-r from-gray-50 to-gray-100',
                        titleColor: 'text-gray-900',
                        accentColor: 'text-gray-600',
                        badgeColors: 'bg-gray-100 text-gray-800 border-gray-300',
                        territoryLabel: 'Unknown'
                      };
                  }
                };
                
                const theme = getTerritoryTheme(territoryName, creatorRole);
                
                return (
                  <Card key={estimate.id} className={`overflow-hidden transition-all duration-200 hover:shadow-md ${theme.border}`}>
                    <CardHeader className={`p-3 ${theme.headerBg}`}>
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <CardTitle className={`text-sm font-semibold ${theme.titleColor} truncate`}>
                            {creatorName}
                          </CardTitle>
                          <p className={`text-xs ${theme.accentColor} mt-1`}>
                            {creatorRole === 'admin' ? 'Administrator' : 
                             creatorRole === 'manager' ? `Territory Manager - ${theme.territoryLabel}` : 
                             `Sales Rep - ${theme.territoryLabel}`}
                          </p>
                        </div>
                        <Badge 
                          variant="outline"
                          className={`text-xs ${theme.badgeColors} ml-2`}
                        >
                          {estimate.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Property Address</p>
                          <p className="text-sm font-medium truncate">{estimate.customer_address || 'Address N/A'}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-medium">{formatEstimateDate(estimate.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Area</p>
                            <p className="font-medium">{formatSquares(estimate.measurements?.totalArea)}</p>
                          </div>
                        </div>
                        
                        <div className="pt-1 border-t">
                          <p className="text-xs text-muted-foreground">Total Amount</p>
                          <p className={`text-lg font-bold ${theme.accentColor}`}>
                            {formatCurrency(estimate.total_price || 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 p-2 flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs flex-1"
                        onClick={() => navigate(`/estimates/${estimate.id}`)}
                      >
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs flex-1"
                        onClick={() => handleGeneratePdf(estimate)} 
                        disabled={generatingPdfId === estimate.id}
                      >
                        {generatingPdfId === estimate.id ? 'PDF...' : 'PDF'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No estimates found</p>
              <Button className="mt-4" asChild>
                <Link to="/estimates">Create New Estimate</Link>
              </Button>
            </div>
          )}

          {/* --- Load More Button --- */} 
          {!isLoading && filteredEstimates.length > visibleCount && (
              <div className="mt-6 text-center">
                  <Button variant="outline" onClick={handleLoadMore}>Load More</Button>
              </div>
          )}
          {/* --- End Load More Button --- */} 

        </CardContent>
      </Card>

      <Dialog open={isSoldConfirmDialogOpen} onOpenChange={setIsSoldConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Sale Details</DialogTitle>
            <DialogDescription>
               Select the job type (Retail or Insurance) and provide the insurance company name if applicable.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {estimateToMarkSold && 
                <p className="text-sm text-muted-foreground">
                    Estimate ID: {estimateToMarkSold.id?.substring(0,8)}... <br/>
                    Address: {estimateToMarkSold.customer_address}
                </p> 
             }
             <div className="space-y-2">
                <Label>Job Type</Label>
                <RadioGroup value={jobType} onValueChange={(value: 'Retail' | 'Insurance') => setJobType(value)} className="flex space-x-4">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                  <RadioGroupItem value="Retail" />
                  <span>Retail</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <RadioGroupItem value="Insurance" />
                  <span>Insurance</span>
                </label>
                </RadioGroup>
             </div>
             {jobType === 'Insurance' && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="dashboard-insurance-company">Insurance Company Name</Label>
                  <Input 
                    id="dashboard-insurance-company" 
                    value={insuranceCompany} 
                    onChange={(e) => setInsuranceCompany(e.target.value)} 
                    placeholder="Enter company name" 
                  />
                </div>
             )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
               <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
               type="button" 
               onClick={handleConfirmSale}
               disabled={isSubmitting[estimateToMarkSold?.id || ''] || (jobType === 'Insurance' && !insuranceCompany.trim())}
            >
               {isSubmitting[estimateToMarkSold?.id || ''] ? "Confirming..." : "Confirm Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomerInfoDialogOpen} onOpenChange={setIsCustomerInfoDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Customer Information</DialogTitle>
            <DialogDescription>
              Customer name, email, and phone are required to generate the estimate PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="dashboard-customer-name">Customer Name</Label>
              <Input 
                id="dashboard-customer-name" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dashboard-customer-email">Customer Email</Label>
              <Input 
                id="dashboard-customer-email" 
                type="email"
                value={customerEmail} 
                onChange={(e) => setCustomerEmail(e.target.value)} 
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dashboard-customer-phone">Customer Phone</Label>
              <Input 
                id="dashboard-customer-phone" 
                type="tel"
                value={customerPhone} 
                onChange={(e) => setCustomerPhone(e.target.value)} 
                placeholder="Enter phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleSaveCustomerDetails}
              disabled={isSavingCustomerInfo || !customerName.trim() || !customerEmail.trim() || !customerPhone.trim()} 
            >
              {isSavingCustomerInfo ? "Saving..." : "Save & Generate PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
