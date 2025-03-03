
import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type EstimateStatus = "draft" | "pending" | "approved" | "completed";

export interface EstimateCardProps {
  id: string;
  address: string;
  date: string;
  amount: string;
  status: EstimateStatus;
  roofArea: string;
  className?: string;
  onClick?: () => void;
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
}: EstimateCardProps) {
  return (
    <Card 
      className={cn("overflow-hidden transition-all duration-200 card-hover", className)}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Estimate #{id}</span>
            <h3 className="font-medium text-base mt-1 line-clamp-1">{address}</h3>
          </div>
          <Badge 
            variant={
              status === "approved" ? "default" :
              status === "pending" ? "secondary" :
              status === "completed" ? "outline" : "destructive"
            }
            className={cn(
              "capitalize",
              status === "approved" && "bg-[#10b981] hover:bg-[#10b981]/80",
              status === "pending" && "bg-[#f59e0b] hover:bg-[#f59e0b]/80",
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
        <Button variant="outline" size="sm" className="text-xs">
          View Details
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
}
