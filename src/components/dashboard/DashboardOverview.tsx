import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getEstimates, Estimate } from "@/api/estimates";
import { ClipboardCheck, Clock, CheckCircle2, X, Loader2 } from "lucide-react";

export function DashboardOverview() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getEstimates();
      
      if (error) {
        throw error;
      }
      
      setEstimates(data);
    } catch (error) {
      console.error("Error fetching estimates:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics from estimates
  const totalEstimates = estimates.length;
  const pendingCount = estimates.filter(est => est.status === "pending").length;
  const approvedCount = estimates.filter(est => est.status === "approved").length;
  const totalValue = estimates.reduce((sum, est) => sum + est.total_price, 0);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="animate-slide-in-up" style={{ animationDelay: "0s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Estimates
          </CardTitle>
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">{totalEstimates}</div>
              <p className="text-xs text-muted-foreground">
                Total estimate count
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card className="animate-slide-in-up" style={{ animationDelay: "0.1s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pending Approval
          </CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                Estimates awaiting review
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card className="animate-slide-in-up" style={{ animationDelay: "0.2s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Approved Estimates
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">
                Ready for production
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card className="animate-slide-in-up" style={{ animationDelay: "0.3s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Estimate Value
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                Combined value of all estimates
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
