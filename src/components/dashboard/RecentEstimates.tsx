import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { EstimateCard } from "@/components/ui/EstimateCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getEstimates, EstimateStatus, Estimate } from "@/api/estimates";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export function RecentEstimates() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<EstimateStatus | "all">("all");
  const { toast } = useToast();

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

  return (
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
              <EstimateCard
                key={estimate.id}
                id={estimate.id || "N/A"}
                address={estimate.customer_address || "No address"}
                date={formatEstimateDate(estimate.created_at)}
                amount={formatCurrency(estimate.total_price)}
                status={estimate.status}
                roofArea={formatSquares(estimate.measurements?.totalArea)}
                estimateData={estimate}
              />
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
  );
}
