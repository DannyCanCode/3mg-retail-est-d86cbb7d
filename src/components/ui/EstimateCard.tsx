import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Estimate,
  EstimateStatus, 
  updateEstimateStatus, 
  markEstimateAsSold,
  generateEstimatePdf
} from "@/api/estimates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Check, FileDown, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface EstimateCardProps {
  id: string;
  address: string;
  date: string;
  amount: string;
  status: EstimateStatus;
  roofArea: string;
  className?: string;
  onClick?: () => void;
  estimateData?: Estimate;
}

export function EstimateCard({
  id,
  address,
  date,
  amount,
  status,
  roofArea,
  className,
  onClick,
  estimateData,
}: EstimateCardProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleUpdateStatus = async (newStatus: EstimateStatus) => {
    if (!estimateData?.id) {
      toast({
        title: "Error",
        description: "Cannot update estimate without ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await updateEstimateStatus(estimateData.id, newStatus, notes);
      
      if (error) throw error;
      
      toast({
        title: `Estimate ${newStatus}`,
        description: `The estimate has been ${newStatus} successfully.`,
      });
      
      // Close dialogs
      setIsApproveDialogOpen(false);
      setIsRejectDialogOpen(false);
      
      // Reload the page to refresh the estimates
      window.location.reload();
    } catch (error) {
      console.error(`Error ${newStatus} estimate:`, error);
      toast({
        title: "Error",
        description: `Failed to ${newStatus} estimate.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!estimateData?.id) {
      toast({
        title: "Error",
        description: "Cannot generate PDF without estimate ID",
        variant: "destructive"
      });
      return;
    }

    setIsPdfLoading(true);
    try {
      const { data, error } = await generateEstimatePdf(estimateData.id);
      
      if (error) throw error;
      
      if (data?.url) {
        // Open the PDF in a new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "PDF Generated",
          description: "The estimate PDF has been generated successfully.",
        });
      } else {
        throw new Error("No PDF URL returned");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive"
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (estimateData?.id) {
      navigate(`/estimates/view/${estimateData.id}`);
    }
  };

  return (
    <>
      <Card 
        className={cn("overflow-hidden transition-all duration-200 card-hover", className)}
        onClick={handleCardClick}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Estimate #{id.substring(0, 8)}</span>
              <h3 className="font-medium text-base mt-1 line-clamp-1">{address}</h3>
            </div>
            <Badge 
              variant={
                status === "approved" ? "default" :
                status === "pending" ? "secondary" :
                status === "rejected" ? "destructive" :
                status === "draft" ? "outline" : "default"
              }
              className={cn(
                "capitalize",
                status === "approved" && "bg-[#10b981] hover:bg-[#10b981]/80",
                status === "pending" && "bg-[#f59e0b] hover:bg-[#f59e0b]/80",
                status === "rejected" && "bg-destructive hover:bg-destructive/80",
                status === "draft" && "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium">{date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Area</p>
              <p className="text-sm font-medium">{roofArea}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-lg font-semibold">{amount}</p>
          </div>
        </CardContent>
        <CardFooter className="px-6 py-4 bg-secondary/30 flex justify-between">
          {status === "pending" ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsApproveDialogOpen(true);
                }}
              >
                Accept
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs bg-red-50 hover:bg-red-100 hover:text-red-700 border-red-200 text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRejectDialogOpen(true);
                }}
              >
                Reject
              </Button>
            </>
          ) : status === "approved" ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleGeneratePdf();
              }}
              disabled={isPdfLoading}
            >
              {isPdfLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="h-3 w-3 mr-1" />
                  Generate PDF
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs w-full"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              View Details
            </Button>
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
              className="resize-none"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleUpdateStatus("approved")}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Accept
                </>
              )}
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
              Please provide a reason for rejecting this estimate. This information will be saved for reference.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Reason for rejection"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleUpdateStatus("rejected")}
              disabled={isLoading || !notes.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
