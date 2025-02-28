
import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { MeasurementForm } from "@/components/estimates/MeasurementForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Estimates = () => {
  const [activeTab, setActiveTab] = useState("upload");

  const handleGoToMeasurements = () => {
    setActiveTab("measurements");
  };

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

        <Card>
          <CardHeader>
            <CardTitle>Create New Estimate</CardTitle>
            <CardDescription>
              Follow the steps below to create a complete estimate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-8">
                <TabsTrigger value="upload">1. Upload EagleView</TabsTrigger>
                <TabsTrigger value="measurements">2. Enter Measurements</TabsTrigger>
                <TabsTrigger value="materials">3. Select Materials</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <PdfUploader />
                    <div className="mt-6 flex justify-end">
                      <Button onClick={handleGoToMeasurements} className="flex items-center gap-2">
                        Continue to Measurements
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Estimate Workflow</CardTitle>
                      <CardDescription>
                        Follow these steps to create a complete estimate
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ol className="list-decimal pl-5 space-y-3">
                        <li className="text-foreground font-medium">
                          <span className="font-medium text-foreground">Upload EagleView PDF</span> - 
                          Start by uploading a roof measurement report
                        </li>
                        <li className="text-muted-foreground">
                          <span className="font-medium text-muted-foreground">Review Measurements</span> - 
                          Verify or enter the roof measurements
                        </li>
                        <li className="text-muted-foreground">
                          <span className="font-medium text-muted-foreground">Select Materials</span> - 
                          Choose roofing materials and options
                        </li>
                        <li className="text-muted-foreground">
                          <span className="font-medium text-muted-foreground">Calculate Pricing</span> - 
                          Generate accurate cost estimates
                        </li>
                        <li className="text-muted-foreground">
                          <span className="font-medium text-muted-foreground">Create Proposal</span> - 
                          Finalize and send to customer for approval
                        </li>
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="measurements">
                <MeasurementForm />
              </TabsContent>
              
              <TabsContent value="materials">
                <div className="p-6 text-center">
                  <h3 className="text-lg font-medium mb-2">Material Selection Coming Soon</h3>
                  <p className="text-muted-foreground">
                    This section will allow you to select roofing materials based on measurements
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Estimates;
