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
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Convert ParsedMeasurements to MeasurementValues format
const convertToMeasurementValues = (parsedData: ParsedMeasurements | null): MeasurementValues => {
  console.log("Converting PDF data to measurement values");
  
  // Handle null/undefined data safely
  if (!parsedData) {
    console.warn("Warning: parsedData is null or undefined, returning default measurement values");
    return {
      totalArea: 0,
      ridgeLength: 0,
      hipLength: 0,
      valleyLength: 0,
      eaveLength: 0,
      rakeLength: 0,
      stepFlashingLength: 0,
      flashingLength: 0,
      dripEdgeLength: 0,
      penetrationsArea: 0,
      penetrationsPerimeter: 0,
      predominantPitch: "6:12",
      roofPitch: undefined,
      ridgeCount: 0,
      hipCount: 0,
      valleyCount: 0,
      rakeCount: 0,
      eaveCount: 0,
      propertyAddress: "",
      latitude: "",
      longitude: "",
      areasByPitch: []
    };
  }
  
  console.log("Raw areasByPitch data:", parsedData.areasByPitch);
  
  // Process the areas by pitch data
  const areasByPitch = parsedData.areasByPitch.map(pitchData => ({
    ...pitchData,
    // Ensure area is a number
    area: typeof pitchData.area === 'number' ? pitchData.area : 0,
    // Calculate percentage if not provided
    percentage: pitchData.percentage || 
      (parsedData.totalArea > 0 ? (pitchData.area / parsedData.totalArea) * 100 : 0)
  })).filter(item => item.area > 0);

  console.log("Processed areasByPitch:", areasByPitch);
  
  // Return complete measurement values
  return {
    totalArea: parsedData.totalArea || 0,
    ridgeLength: parsedData.ridgeLength || 0,
    hipLength: parsedData.hipLength || 0,
    valleyLength: parsedData.valleyLength || 0,
    eaveLength: parsedData.eaveLength || 0,
    rakeLength: parsedData.rakeLength || 0,
    stepFlashingLength: parsedData.stepFlashingLength || 0,
    flashingLength: parsedData.flashingLength || 0,
    dripEdgeLength: parsedData.dripEdgeLength || 0,
    penetrationsArea: parsedData.penetrationsArea || 0,
    penetrationsPerimeter: parsedData.penetrationsPerimeter || 0,
    predominantPitch: parsedData.predominantPitch || "6:12",
    roofPitch: parsedData.roofPitch,
    ridgeCount: parsedData.ridgeCount || 0,
    hipCount: parsedData.hipCount || 0,
    valleyCount: parsedData.valleyCount || 0,
    rakeCount: parsedData.rakeCount || 0,
    eaveCount: parsedData.eaveCount || 0,
    propertyAddress: parsedData.propertyAddress || "",
    latitude: parsedData.latitude || "",
    longitude: parsedData.longitude || "",
    areasByPitch
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
    isHandload: false,
    handloadRate: 15,
    dumpsterLocation: "orlando",
    dumpsterCount: 1,
    dumpsterRate: 400,
    pitchRates: {},
    wastePercentage: 12
  });
  const [profitMargin, setProfitMargin] = useState(25);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  
  // Add localStorage hooks to persist state across refreshes and tabs
  const [storedPdfData, setStoredPdfData] = useLocalStorage<ParsedMeasurements | null>("estimateExtractedPdfData", null);
  const [storedMeasurements, setStoredMeasurements] = useLocalStorage<MeasurementValues | null>("estimateMeasurements", null);
  const [storedFileName, setStoredFileName] = useLocalStorage<string>("estimatePdfFileName", "");
  
  // Load persisted data on initial load
  useEffect(() => {
    if (storedPdfData && !extractedPdfData) {
      setExtractedPdfData(storedPdfData);
      console.log("Loaded PDF data from localStorage:", storedPdfData);
    }
    
    if (storedMeasurements && !measurements) {
      setMeasurements(storedMeasurements);
      console.log("Loaded measurements from localStorage:", storedMeasurements);
    }
    
    if (storedFileName && !pdfFileName) {
      setPdfFileName(storedFileName);
    }
  }, []);

  // Ensure measurements are properly set from extracted PDF data
  useEffect(() => {
    // If we have extracted PDF data, convert it to MeasurementValues format
    if (extractedPdfData) {
      console.log("Setting initial measurements from extracted PDF data:", extractedPdfData);
      const convertedMeasurements = convertToMeasurementValues(extractedPdfData);
      setMeasurements(convertedMeasurements);
      
      // Store in localStorage
      setStoredPdfData(extractedPdfData);
      setStoredMeasurements(convertedMeasurements);
      
      // Debug measurements conversion
      console.log("Converted measurements:", convertedMeasurements);
    }
    
    // If we have a measurementId, fetch the data
    if (measurementId) {
      console.log("Fetching measurements for ID:", measurementId);
      // TODO: Implement fetching data from storage
    }
  }, [extractedPdfData, measurementId]);

  // Save fileName changes to localStorage
  useEffect(() => {
    if (pdfFileName) {
      setStoredFileName(pdfFileName);
    }
  }, [pdfFileName]);

  const handlePdfDataExtracted = (data: ParsedMeasurements, fileName: string) => {
    console.log("PDF data extracted:", data);
    
    // Ensure areasByPitch is preserved (even if server-side processing loses it)
    if (!data.areasByPitch || data.areasByPitch.length === 0) {
      console.log("areasByPitch is missing or empty, trying to retrieve from client-side data");
      // Try to get the client-side parsed pitch areas
      const clientSidePitchData = document.querySelector('[data-debug-pitch-data]')?.getAttribute('data-pitch-data');
      if (clientSidePitchData) {
        try {
          const parsedPitchData = JSON.parse(clientSidePitchData);
          if (Array.isArray(parsedPitchData) && parsedPitchData.length > 0) {
            console.log("Found client-side pitch data:", parsedPitchData);
            data.areasByPitch = parsedPitchData;
          }
        } catch (e) {
          console.error("Error parsing client-side pitch data:", e);
        }
      }
    }
    
    setExtractedPdfData(data);
    setPdfFileName(fileName);
    
    // Store in localStorage
    setStoredPdfData(data);
    setStoredFileName(fileName);
    
    // Force immediate conversion to ensure measurements are available
    const convertedMeasurements = convertToMeasurementValues(data);
    setMeasurements(convertedMeasurements);
    setStoredMeasurements(convertedMeasurements);
    
    // Inform the user data was extracted successfully
    toast({
      title: "Measurements extracted",
      description: `Successfully parsed ${fileName} with ${data.totalArea || 0} sq ft of roof area.`,
    });
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
    console.log("handleMaterialsSelected called, setting materials:", Object.keys(materials).length);
    setSelectedMaterials(materials);
    setQuantities(quantities);
    console.log("About to set activeTab to 'pricing'");
    setActiveTab("pricing");
    console.log("activeTab should now be 'pricing'");
    
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
      handleClearEstimate();
    }, 1500);
  };
  
  // Function to start fresh and clear all state
  const handleClearEstimate = () => {
    setActiveTab("upload");
    setExtractedPdfData(null);
    setPdfFileName(null);
    setMeasurements(null);
    setSelectedMaterials({});
    setQuantities({});
    setLaborRates({
      tearOff: 55,
      installation: 125,
      isHandload: false,
      handloadRate: 15,
      dumpsterLocation: "orlando",
      dumpsterCount: 1,
      dumpsterRate: 400,
      pitchRates: {},
      wastePercentage: 12
    });
    setProfitMargin(25);
    
    // Clear localStorage values too
    setStoredPdfData(null);
    setStoredMeasurements(null);
    setStoredFileName("");
    
    // Clear any URL parameters
    navigate("/estimates");
    
    // Force a page reload to ensure all components reset properly
    window.location.reload();
    
    toast({
      title: "Started fresh",
      description: "All estimate data has been cleared.",
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Create New Estimate</h1>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClearEstimate} 
                className="flex items-center gap-2" 
                title="Clear this estimate and start over"
              >
                <RefreshCw className="h-4 w-4" /> Start Fresh
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">Follow the steps below to create a complete estimate</p>
          
          <Card>
            <CardContent className="p-6">
              <Tabs 
                value={activeTab} 
                onValueChange={(value) => {
                  console.log(`Tab changing from ${activeTab} to ${value}`);
                  setActiveTab(value);
                  console.log(`Tab changed, activeTab is now ${value}`);
                }} 
                className="w-full"
                defaultValue="upload"
              >
                <TabsList className="grid grid-cols-5 mb-8">
                  <TabsTrigger value="upload" disabled={false}>
                    1. Upload EagleView
                  </TabsTrigger>
                  <TabsTrigger 
                    value="measurements" 
                    disabled={!extractedPdfData && !measurements}
                  >
                    2. Enter Measurements
                  </TabsTrigger>
                  <TabsTrigger 
                    value="materials" 
                    disabled={!measurements}
                  >
                    3. Select Materials
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pricing" 
                    disabled={!measurements || Object.keys(selectedMaterials).length === 0}
                  >
                    4. Labor & Profit
                  </TabsTrigger>
                  <TabsTrigger 
                    value="summary" 
                    disabled={!measurements || Object.keys(selectedMaterials).length === 0}
                  >
                    5. Summary
                  </TabsTrigger>
                </TabsList>

                {/* Debug measurements info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-4 p-2 bg-gray-100 text-xs border rounded">
                    <details>
                      <summary>Debug Info</summary>
                      <div className="mt-2 overflow-auto">
                        <p>Active Tab: {activeTab}</p>
                        <p>PDF Filename: {pdfFileName}</p>
                        <p>Extracted Data: {extractedPdfData ? '✅' : '❌'}</p>
                        <p>Measurements: {measurements ? '✅' : '❌'}</p>
                        <p>Materials Selected: {Object.keys(selectedMaterials).length}</p>
                        {measurements && (
                          <pre>{JSON.stringify(measurements, null, 2)}</pre>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                <TabsContent value="upload" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <PdfUploader onDataExtracted={handlePdfDataExtracted} savedFileName={pdfFileName} />
                      
                      {/* Display extracted measurements right after upload */}
                      {extractedPdfData && (
                        <div className="mt-6 bg-slate-50 p-4 rounded border border-slate-200">
                          <h3 className="text-md font-medium mb-2">Extracted Measurements from {pdfFileName}</h3>
                          <div className="text-sm space-y-1">
                            <p><strong>Total Area:</strong> {extractedPdfData.totalArea || 0} sq ft</p>
                            <p><strong>Predominant Pitch:</strong> {extractedPdfData.predominantPitch || 'Not detected'}</p>
                            {extractedPdfData.ridgeLength > 0 && <p><strong>Ridge Length:</strong> {extractedPdfData.ridgeLength} ft</p>}
                            {extractedPdfData.hipLength > 0 && <p><strong>Hip Length:</strong> {extractedPdfData.hipLength} ft</p>}
                            {extractedPdfData.valleyLength > 0 && <p><strong>Valley Length:</strong> {extractedPdfData.valleyLength} ft</p>}
                            {extractedPdfData.eaveLength > 0 && <p><strong>Eave Length:</strong> {extractedPdfData.eaveLength} ft</p>}
                            {extractedPdfData.rakeLength > 0 && <p><strong>Rake Length:</strong> {extractedPdfData.rakeLength} ft</p>}
                            {extractedPdfData.penetrationsArea > 0 && <p><strong>Penetrations Area:</strong> {extractedPdfData.penetrationsArea} sq ft</p>}
                            
                            {/* Show areas by pitch if available */}
                            {Object.keys(extractedPdfData.areasByPitch || {}).length > 0 && (
                              <div className="mt-2">
                                <p className="font-medium">Areas by Pitch:</p>
                                <ul className="list-disc list-inside pl-2">
                                  {Object.entries(extractedPdfData.areasByPitch || {}).map(([pitch, area]) => (
                                    <li key={pitch}>{pitch}: {typeof area === 'number' ? area : parseFloat(String(area))} sq ft</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
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
                    measurements={measurements}
                    onContinue={handleMaterialsSelected}
                    onBack={() => setActiveTab("measurements")}
                  />
                </TabsContent>
                
                <TabsContent value="pricing">
                  <LaborProfitTab 
                    key={`labor-profit-${activeTab === 'pricing' ? 'active' : 'inactive'}`}
                    onBack={() => setActiveTab("materials")}
                    onContinue={handleLaborProfitContinue}
                    initialLaborRates={laborRates}
                    initialProfitMargin={profitMargin}
                    measurements={measurements}
                  />
                </TabsContent>
                
                <TabsContent value="summary">
                  <EstimateSummaryTab 
                    measurements={measurements || undefined}
                    materials={selectedMaterials}
                    quantities={quantities}
                    laborRates={laborRates}
                    profitMargin={profitMargin}
                    onFinalize={handleFinalizeEstimate}
                    isSubmitting={isSubmittingFinal}
                    onBack={() => setActiveTab("pricing")}
                  />
                </TabsContent>
              </Tabs>

              {/* Add Continue buttons at the bottom of each tab */}
              <div className="flex justify-between mt-8">
                {activeTab !== "upload" && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const tabOrder = ["upload", "measurements", "materials", "pricing", "summary"];
                      const currentIndex = tabOrder.indexOf(activeTab);
                      if (currentIndex > 0) {
                        setActiveTab(tabOrder[currentIndex - 1]);
                      }
                    }}
                  >
                    Back
                  </Button>
                )}
                
                {activeTab !== "summary" && (
                  <Button 
                    className="ml-auto"
                    onClick={() => {
                      const tabOrder = ["upload", "measurements", "materials", "pricing", "summary"];
                      const currentIndex = tabOrder.indexOf(activeTab);
                      if (currentIndex < tabOrder.length - 1) {
                        setActiveTab(tabOrder[currentIndex + 1]);
                      }
                    }}
                    disabled={
                      (activeTab === "upload" && !extractedPdfData) ||
                      (activeTab === "measurements" && !measurements) ||
                      (activeTab === "materials" && Object.keys(selectedMaterials).length === 0)
                    }
                  >
                    Continue
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Estimates;
