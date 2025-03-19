import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, RefreshCw } from "lucide-react";
import { MeasurementForm } from "@/components/estimates/MeasurementForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialsSelectionTab } from "@/components/estimates/materials/MaterialsSelectionTab";
import { MeasurementValues } from "@/components/estimates/measurement/types";
import { Material } from "@/components/estimates/materials/types";
import { useToast } from "@/hooks/use-toast";
import { LaborProfitTab, LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { EstimateSummaryTab } from "@/components/estimates/pricing/EstimateSummaryTab";
import { ParsedMeasurements } from "@/api/measurements";
import { useSearchParams, useNavigate } from "react-router-dom";

// Convert ParsedMeasurements to MeasurementValues format
const convertToMeasurementValues = (parsedData: ParsedMeasurements): MeasurementValues => {
  console.log("Converting PDF data to measurement values. Raw areasByPitch:", parsedData.areasByPitch);
  
  // Convert areasByPitch from Record<string, number> to AreaByPitch[] format
  const areasByPitch = Object.entries(parsedData.areasByPitch || {})
    .filter(([pitch, area]) => {
      // Filter out any invalid entries (area must be a number > 0)
      const numArea = typeof area === 'number' ? area : parseFloat(String(area));
      return !isNaN(numArea) && numArea > 0;
    })
    .map(([pitch, area]) => {
      const numArea = typeof area === 'number' ? area : parseFloat(String(area));
      return {
        pitch: pitch.includes(':') ? pitch : pitch.replace('/', ':'), // Normalize format for UI
        area: numArea,
        percentage: parsedData.totalArea > 0 ? Math.round((numArea / parsedData.totalArea) * 100) : 0
      };
    });

  console.log("Converted areasByPitch to array format:", areasByPitch);

  // Special case: If we have no areas, use the predominant pitch
  let pitchAreas = areasByPitch;
  if (areasByPitch.length === 0 && parsedData.totalArea > 0 && parsedData.predominantPitch) {
    // Convert predominant pitch from "x:y" format to "x/y" if needed
    const predominantPitch = parsedData.predominantPitch.includes(':') 
      ? parsedData.predominantPitch 
      : parsedData.predominantPitch.replace('/', ':');
    
    console.log("No areas by pitch found, using predominant pitch:", predominantPitch);
    pitchAreas = [{
      pitch: predominantPitch,
      area: parsedData.totalArea,
      percentage: 100
    }];
  }

  // If we still have no pitch areas, use a default
  if (pitchAreas.length === 0) {
    console.log("Using default pitch (6:12) as fallback");
    pitchAreas = [{ pitch: "6:12", area: parsedData.totalArea || 0, percentage: 100 }];
  }

  return {
    totalArea: parsedData.totalArea || 0,
    ridgeLength: parsedData.ridgeLength || 0,
    hipLength: parsedData.hipLength || 0,
    valleyLength: parsedData.valleyLength || 0,
    eaveLength: parsedData.eaveLength || 0,
    rakeLength: parsedData.rakeLength || 0,
    stepFlashingLength: parsedData.stepFlashingLength || 0,
    flashingLength: parsedData.flashingLength || 0, 
    penetrationsArea: parsedData.penetrationsArea || 0,
    roofPitch: parsedData.predominantPitch || "6:12",
    areasByPitch: pitchAreas,
    // Include property location information
    propertyAddress: parsedData.propertyAddress || undefined,
    latitude: parsedData.latitude || undefined,
    longitude: parsedData.longitude || undefined
  };
};

const Estimates = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const measurementId = searchParams.get("measurementId");

  // Workflow state 
  const [activeTab, setActiveTab] = useState("upload");
  
  // Store extracted PDF data
  const [extractedPdfData, setExtractedPdfData] = useState<ParsedMeasurements | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  
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
  
  // Initialize measurements if we have extracted PDF data or a measurementId
  useEffect(() => {
    // If we have extracted PDF data, convert it to MeasurementValues format
    if (extractedPdfData) {
      console.log("Setting initial measurements from extracted PDF data:", extractedPdfData);
      setMeasurements(convertToMeasurementValues(extractedPdfData));
    }
    
    // If we have a measurementId, fetch the data (implement this functionality)
    if (measurementId) {
      console.log("Fetching measurements for ID:", measurementId);
      // TODO: Implement fetching data from storage
    }
  }, [extractedPdfData, measurementId]);

  const handlePdfDataExtracted = (data: ParsedMeasurements, fileName: string) => {
    console.log("PDF data extracted:", data);
    setExtractedPdfData(data);
    setPdfFileName(fileName);
  };

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
      handleStartFresh();
    }, 1500);
  };
  
  // Function to start fresh and clear all state
  const handleStartFresh = () => {
    setActiveTab("upload");
    setExtractedPdfData(null);
    setPdfFileName(null);
    setMeasurements(null);
    setSelectedMaterials({});
    setQuantities({});
    setLaborRates({
      tearOff: 55,
      installation: 125,
      cleanup: 35,
      supervision: 45
    });
    setProfitMargin(25);
    
    // Clear any URL parameters
    navigate("/estimates");
    
    toast({
      title: "Started fresh",
      description: "All estimate data has been cleared.",
    });
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
          <Button className="flex items-center gap-2" onClick={handleStartFresh}>
            <Plus className="h-4 w-4" />
            <span>New Estimate</span>
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Create New Estimate</CardTitle>
              <CardDescription>
                Follow the steps below to create a complete estimate
              </CardDescription>
            </div>
            {(extractedPdfData || pdfFileName) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleStartFresh}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Start Fresh
              </Button>
            )}
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
                    <PdfUploader onDataExtracted={handlePdfDataExtracted} savedFileName={pdfFileName} />
                    {extractedPdfData && (
                      <div className="mt-6 flex justify-end">
                        <Button onClick={handleGoToMeasurements} className="flex items-center gap-2">
                          Continue to Measurements
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-md border border-slate-200">
                    <h3 className="text-lg font-medium mb-3">Estimate Workflow</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Follow these steps to create a complete estimate
                    </p>
                    <ol className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                        <span>Upload EagleView PDF - Start by uploading a roof measurement report</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-slate-300 text-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                        <span>Review Measurements - Verify or enter the roof measurements</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-slate-300 text-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                        <span>Select Materials - Choose roofing materials and options</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-slate-300 text-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
                        <span>Set Labor & Profit - Define labor rates and profit margin</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-slate-300 text-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">5</span>
                        <span>Review Summary - Finalize and prepare for customer approval</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="measurements">
                <MeasurementForm 
                  onMeasurementsSaved={handleMeasurementsSaved} 
                  initialMeasurements={measurements || undefined}
                  extractedFileName={pdfFileName || undefined}
                  onBack={() => setActiveTab("upload")}
                />
              </TabsContent>
              
              <TabsContent value="materials">
                <MaterialsSelectionTab 
                  measurements={measurements || defaultMeasurements}
                  onContinue={handleMaterialsSelected}
                  onBack={() => setActiveTab("measurements")}
                />
              </TabsContent>
              
              <TabsContent value="labor-profit">
                <LaborProfitTab 
                  initialLaborRates={laborRates}
                  initialProfitMargin={profitMargin}
                  onContinue={handleLaborProfitContinue}
                  onBack={() => setActiveTab("materials")}
                />
              </TabsContent>
              
              <TabsContent value="summary">
                <EstimateSummaryTab 
                  measurements={measurements || defaultMeasurements}
                  materials={selectedMaterials}
                  quantities={quantities}
                  laborRates={laborRates}
                  profitMargin={profitMargin}
                  onFinalize={handleFinalizeEstimate}
                  isSubmitting={isSubmittingFinal}
                  onBack={() => setActiveTab("labor-profit")}
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
