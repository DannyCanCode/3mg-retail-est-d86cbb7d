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
import { getEstimates, EstimateStatus, Estimate, updateEstimateStatus, generateEstimatePdf, markEstimateAsSold } from "@/api/estimates";
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

  const handleGeneratePdf = async (id: string) => {
    setGeneratingPdfId(id);
    try {
      const { data, error } = await generateEstimatePdf(id);
      if (error) throw error;
      if (data?.url) {
        toast({ title: "PDF Generated", description: "Opening PDF..." });
        window.open(data.url, '_blank'); // Open in new tab
      } else {
        throw new Error("PDF URL not returned.");
      }
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to generate PDF: ${err.message}`, variant: "destructive" });
    } finally {
      setGeneratingPdfId(null);
    }
  };

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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEstimates.map((estimate) => (
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
                  <CardFooter className="bg-muted/50 p-3 flex gap-2 justify-end">
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
                        <Button variant="outline" size="sm" onClick={() => handleGeneratePdf(estimate.id!)} disabled={generatingPdfId === estimate.id}>{generatingPdfId === estimate.id ? 'Generating...' : 'Generate PDF'}</Button>
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
                    {(estimate.status === 'rejected' || estimate.status === 'Sold') && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/estimates/${estimate.id}`)}>View Details</Button>
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
    </>
  );
}
