
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { EstimateCard, EstimateStatus } from "@/components/ui/EstimateCard";
import { Button } from "@/components/ui/button";

interface Estimate {
  id: string;
  address: string;
  date: string;
  amount: string;
  status: EstimateStatus;
  roofArea: string;
}

const recentEstimates: Estimate[] = [
  {
    id: "EST-1024",
    address: "123 Maple Street, Portland, OR",
    date: "May 15, 2023",
    amount: "$12,450",
    status: "approved",
    roofArea: "28 squares"
  },
  {
    id: "EST-1023",
    address: "456 Oak Avenue, Seattle, WA",
    date: "May 12, 2023",
    amount: "$9,875",
    status: "pending",
    roofArea: "22 squares"
  },
  {
    id: "EST-1022",
    address: "789 Pine Lane, Vancouver, BC",
    date: "May 10, 2023",
    amount: "$15,320",
    status: "completed",
    roofArea: "34 squares"
  },
  {
    id: "EST-1021",
    address: "321 Cedar Road, San Francisco, CA",
    date: "May 8, 2023",
    amount: "$7,990",
    status: "draft",
    roofArea: "18 squares"
  }
];

export function RecentEstimates() {
  return (
    <Card className="animate-slide-in-up" style={{ animationDelay: "0.2s" }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Estimates</CardTitle>
          <CardDescription>
            View and manage your latest roofing estimates
          </CardDescription>
        </div>
        <Button>New Estimate</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recentEstimates.map((estimate) => (
            <EstimateCard
              key={estimate.id}
              id={estimate.id}
              address={estimate.address}
              date={estimate.date}
              amount={estimate.amount}
              status={estimate.status}
              roofArea={estimate.roofArea}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
