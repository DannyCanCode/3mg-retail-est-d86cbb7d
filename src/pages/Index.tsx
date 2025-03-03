
import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { RecentEstimates } from "@/components/dashboard/RecentEstimates";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentEstimates />
          </div>
          <div>
            <PdfUploader />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
