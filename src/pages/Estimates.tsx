
import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Estimates = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Estimates</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage roofing estimates for your customers
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>New Estimate</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload EagleView PDF</CardTitle>
              <CardDescription>
                Start by uploading an EagleView report to create a new estimate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PdfUploader />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Estimate Workflow</CardTitle>
              <CardDescription>
                Follow these steps to create a complete estimate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-3">
                <li className="text-muted-foreground">
                  <span className="font-medium text-foreground">Upload EagleView PDF</span> - 
                  Start by uploading a roof measurement report
                </li>
                <li className="text-muted-foreground">
                  <span className="font-medium text-foreground">Review Measurements</span> - 
                  Verify the extracted measurements
                </li>
                <li className="text-muted-foreground">
                  <span className="font-medium text-foreground">Select Materials</span> - 
                  Choose roofing materials and options
                </li>
                <li className="text-muted-foreground">
                  <span className="font-medium text-foreground">Calculate Pricing</span> - 
                  Generate accurate cost estimates
                </li>
                <li className="text-muted-foreground">
                  <span className="font-medium text-foreground">Create Proposal</span> - 
                  Finalize and send to customer for approval
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Estimates;
