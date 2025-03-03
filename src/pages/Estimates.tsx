
import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { MeasurementForm } from "@/components/estimates/MeasurementForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialsSelectionTab } from "@/components/estimates/materials/MaterialsSelectionTab";
import { MeasurementValues } from "@/components/estimates/measurement/types";
import { Material } from "@/components/estimates/materials/types";
import { useToast } from "@/hooks/use-toast";
import { LaborProfitTab, LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { EstimateSummaryTab } from "@/components/estimates/pricing/EstimateSummaryTab";

const Estimates = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upload");
  const [measurements, setMeasurements] = useState<MeasurementValues | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<{[key: string]: Material}>({});
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [laborRates, setLaborRates] = useState<LaborRates>({
    tearOff: 55,
    installation: 125,
    cleanup: 35,
    supervision: 45
  });
  const [profitMargin, setProfitMargin] = useState(25);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);

  const handleGoToMeasurements = () => {
    setActiveTab("measurements");
  };

  const handleGoToMaterials = () => {
    setActiveTab("materials");
  };

  const handleMeasurementsSaved = (savedMeasurements: MeasurementValues) => {
    setMeasurements(savedMeasurements);
    handleGoToMaterials();
    
    toast({
      title: "Measurements saved",
      description: "Now you can select materials for your estimate.",
    });
  };

  const handleMaterialsSelected = (materials: {[key: string]: Material}, quantities: {[key: string]: number}) => {
    setSelectedMaterials(materials);
    setQuantities(quantities);
    setActiveTab("labor-profit");
    
    toast({
      title: "Materials selected",
      description: "Now you can set labor rates and profit margin.",
    });
  };

  const handleLaborProfitContinue = (laborRates: LaborRates, profitMargin: number) => {
    setLaborRates(laborRates);
    setProfitMargin(profitMargin);
    setActiveTab("summary");
    
    toast({
      title: "Labor rates & profit margin saved",
      description: "Review your estimate summary.",
    });
  };

  const handleFinalizeEstimate = () => {
    setIsSubmittingFinal(true);
    
    // In a real implementation, we would save the complete estimate to the database
    setTimeout(() => {
      setIsSubmittingFinal(false);
      
      toast({
        title: "Estimate finalized",
        description: "Your estimate has been saved successfully.",
      });
      
      // Reset and go back to the beginning
      setActiveTab("upload");
    }, 1500);
  };

  // Default measurements for the materials tab if no measurements exist yet
  const defaultMeasurements: MeasurementValues = {
    totalArea: 3000,
    ridgeLength: 80,
    hipLength: 40,
    valleyLength: 30,
    eaveLength: 120,
    rakeLength: 60,
    stepFlashingLength: 20,
    flashingLength: 30,
    penetrationsArea: 20,
    roofPitch: "6:12",
    areasByPitch: [
      { pitch: "6:12", area: 2400, percentage: 80 },
      { pitch: "4:12", area: 600, percentage: 20 }
    ]
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
              <TabsList className="w-full grid grid-cols-5 mb-8">
                <TabsTrigger value="upload">1. Upload EagleView</TabsTrigger>
                <TabsTrigger value="measurements">2. Enter Measurements</TabsTrigger>
                <TabsTrigger value="materials">3. Select Materials</TabsTrigger>
                <TabsTrigger value="labor-profit">4. Labor & Profit</TabsTrigger>
                <TabsTrigger value="summary">5. Summary</TabsTrigger>
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
                          <span className="font-medium text-muted-foreground">Set Labor & Profit</span> - 
                          Define labor rates and profit margin
                        </li>
                        <li className="text-muted-foreground">
                          <span className="font-medium text-muted-foreground">Review Summary</span> - 
                          Finalize and prepare for customer approval
                        </li>
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="measurements">
                <MeasurementForm onMeasurementsSaved={handleMeasurementsSaved} />
              </TabsContent>
              
              <TabsContent value="materials">
                <MaterialsSelectionTab 
                  measurements={measurements || defaultMeasurements}
                  goToPreviousTab={() => setActiveTab("measurements")}
                  onContinue={handleMaterialsSelected}
                />
              </TabsContent>
              
              <TabsContent value="labor-profit">
                <LaborProfitTab 
                  initialLaborRates={laborRates}
                  initialProfitMargin={profitMargin}
                  goToPreviousTab={() => setActiveTab("materials")}
                  onContinue={handleLaborProfitContinue}
                />
              </TabsContent>
              
              <TabsContent value="summary">
                <EstimateSummaryTab 
                  measurements={measurements || defaultMeasurements}
                  selectedMaterials={selectedMaterials}
                  quantities={quantities}
                  laborRates={laborRates}
                  profitMargin={profitMargin}
                  goToPreviousTab={() => setActiveTab("labor-profit")}
                  onFinalize={handleFinalizeEstimate}
                  isSubmitting={isSubmittingFinal}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Estimates;
