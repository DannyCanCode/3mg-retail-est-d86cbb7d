import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { RecentEstimates } from "@/components/dashboard/RecentEstimates";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const Index = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back to 3MG Retail Roofing Estimator
            </p>
          </div>
          <Button asChild>
            <Link to="/estimates" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>New Estimate</span>
            </Link>
          </Button>
        </div>

        <DashboardOverview />
        
        <div className="grid grid-cols-1">
          <div className="lg:col-span-1">
            <RecentEstimates />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
