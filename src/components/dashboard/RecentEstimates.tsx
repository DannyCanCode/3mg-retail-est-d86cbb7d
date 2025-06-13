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

const INITIAL_VISIBLE_COUNT = 12; // Show 12 estimates initially

export function RecentEstimates() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    fetchEstimates();
  }, []);

  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredEstimates(estimates);
    } else {
      setFilteredEstimates(estimates.filter(est => est.status === activeFilter));
    }
  }, [activeFilter, estimates]);

  const fetchEstimates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getEstimates();
      
      if (error) {
        throw error;
      }
      
      setEstimates(data);
      setFilteredEstimates(data);
    } catch (error) {
      console.error("Error fetching estimates:", error);
      toast({
        title: "Error",
        description: "Failed to load estimates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
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
      fetchEstimates(); // Refresh list
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
      const greenColor = rgb(0, 0.5, 0);
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
      currentY -= 12;
      page.drawText(estimate.customer_address || 'N/A', { x: margin + 5, y: currentY, font: font, size: 10 });
      currentY -= 12;
      page.drawText(`Email: ${estimate.customer_email || 'N/A'}`, { x: margin + 5, y: currentY, font: font, size: 10 });
      currentY -= 12;
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

      // TODO: Add Static Text Sections (Terms, Warnings, Signatures) here
      // This will require copying the text and drawing it, likely spanning multiple pages.
      page.drawText('GENERAL TERMS AND CONDITIONS - PLACEHOLDER', { x: margin, y: currentY, font: boldFont, size: 10 });
      // ... more drawText calls ...

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

      // Update local estimates state
      setEstimates(prev => prev.map(est => est.id === estimateId ? { ...est, ...updatedEstimateData } : est));
      
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
      fetchEstimates(); // Refresh the list to show updated status
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
            <CardTitle>Estimates</CardTitle>
            <CardDescription>
              View and manage your roofing estimates
            </CardDescription>
          </div>
          <Button asChild>
            <Link to="/estimates">New Estimate</Link>
          </Button>
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
              <TabsTrigger value="approved">Approved</TabsTrigger>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {filteredEstimates.slice(0, visibleCount).map((estimate) => (
                <Card key={estimate.id} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-semibold">
                          Estimate #{estimate.id?.substring(0, 8)}...
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {estimate.customer_address || 'Address N/A'}
                        </p>
                      </div>
                      <Badge 
                        variant={ 
                           estimate.status === 'approved' ? 'secondary' :
                           estimate.status === 'rejected' ? 'destructive' : 
                           estimate.status === 'Sold' ? 'outline' :
                           'default'
                        }
                      >
                        {estimate.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 text-sm">
                    <div className="flex justify-between mb-2">
                      <span>Date:</span>
                      <span>{formatEstimateDate(estimate.created_at)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Area:</span>
                      <span>{formatSquares(estimate.measurements?.totalArea)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(estimate.total_price || 0)}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 p-3 flex flex-wrap gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/estimates/${estimate.id}`)}>View Details</Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleGeneratePdf(estimate)} 
                      disabled={generatingPdfId === estimate.id}
                    >
                      {generatingPdfId === estimate.id ? 'Generating...' : 'Generate PDF'}
                    </Button>
                    {estimate.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(estimate.id!, 'approved')} disabled={isSubmitting[estimate.id!]}>Approve</Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:bg-red-50 border-red-300 hover:text-red-700"
                          onClick={() => handleStatusUpdate(estimate.id!, 'rejected')}
                          disabled={isSubmitting[estimate.id!]}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {estimate.status === 'approved' && !estimate.is_sold && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="secondary" size="sm" disabled={isSubmitting[estimate.id || '']}>
                              Mark as Sold
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Mark Estimate as Sold?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This estimate will be marked as sold. You will be asked for sale details next. Are you sure?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleOpenSoldDialog(estimate)}>
                                Yes, Proceed
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))}
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
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Retail" id="r1" />
                    <Label htmlFor="r1">Retail</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Insurance" id="r2" />
                    <Label htmlFor="r2">Insurance</Label>
                  </div>
                </RadioGroup>
             </div>
             {jobType === 'Insurance' && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="insurance-company">Insurance Company Name</Label>
                  <Input 
                    id="insurance-company" 
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
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input 
                id="customer-name" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-email">Customer Email</Label>
              <Input 
                id="customer-email" 
                type="email"
                value={customerEmail} 
                onChange={(e) => setCustomerEmail(e.target.value)} 
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">Customer Phone</Label>
              <Input 
                id="customer-phone" 
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
