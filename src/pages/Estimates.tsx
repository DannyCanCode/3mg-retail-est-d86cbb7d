import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, RefreshCw, ArrowLeft } from "lucide-react";
import { MeasurementForm } from "@/components/estimates/MeasurementForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialsSelectionTab } from "@/components/estimates/materials/MaterialsSelectionTab";
import { MeasurementValues } from "@/components/estimates/measurement/types";
import { Material } from "@/components/estimates/materials/types";
import { useToast } from "@/hooks/use-toast";
import { LaborProfitTab, LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { EstimateSummaryTab } from "@/components/estimates/pricing/EstimateSummaryTab";
import { ParsedMeasurements } from "@/api/measurements";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { saveEstimate, calculateEstimateTotal, getEstimateById, Estimate as EstimateType, markEstimateAsSold, getEstimates } from "@/api/estimates";
import { getMeasurementById } from "@/api/measurements";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Estimate } from "@/api/estimates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

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
  
  // Process the areas by pitch data - safely handle undefined or empty areasByPitch
  const areasByPitch = Array.isArray(parsedData.areasByPitch) ? parsedData.areasByPitch.map(pitchData => ({
    ...pitchData,
    // Ensure area is a number
    area: typeof pitchData.area === 'number' ? pitchData.area : 0,
    // Calculate percentage if not provided
    percentage: pitchData.percentage || 
      (parsedData.totalArea > 0 ? (pitchData.area / parsedData.totalArea) * 100 : 0)
  })).filter(item => item.area > 0) : [];

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
  const { estimateId } = useParams<{ estimateId: string }>();
  const measurementId = searchParams.get("measurementId") || searchParams.get("measurement");
  
  // State for view mode
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [estimateData, setEstimateData] = useState<EstimateType | null>(null);

  // Workflow state 
  const [activeTab, setActiveTab] = useState("upload");
  
  // Store extracted PDF data
  const [extractedPdfData, setExtractedPdfData] = useState<ParsedMeasurements | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  
  const [measurements, setMeasurements] = useState<MeasurementValues | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<{[key: string]: Material}>({});
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [laborRates, setLaborRates] = useState<LaborRates>({
    laborRate: 85,
    tearOff: 0,
    installation: 0,
    isHandload: false,
    handloadRate: 15,
    dumpsterLocation: "orlando",
    dumpsterCount: 1,
    dumpsterRate: 400,
    includePermits: true,
    permitRate: 550,
    permitCount: 1,
    permitAdditionalRate: 450,
    pitchRates: {},
    wastePercentage: 12,
    includeGutters: false,
    gutterLinearFeet: 0,
    gutterRate: 8,
    includeDownspouts: false,
    downspoutCount: 0,
    downspoutRate: 75,
    includeDetachResetGutters: false,
    detachResetGutterLinearFeet: 0,
    detachResetGutterRate: 1
  });
  const [profitMargin, setProfitMargin] = useState(25);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [peelStickAddonCost, setPeelStickAddonCost] = useState<string>("0.00");
  
  // Add localStorage hooks to persist state across refreshes and tabs
  const [storedPdfData, setStoredPdfData] = useLocalStorage<ParsedMeasurements | null>("estimateExtractedPdfData", null);
  const [storedMeasurements, setStoredMeasurements] = useLocalStorage<MeasurementValues | null>("estimateMeasurements", null);
  const [storedFileName, setStoredFileName] = useLocalStorage<string>("estimatePdfFileName", "");
  
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<{[key: string]: boolean}>({});
  const [estimateToMarkSold, setEstimateToMarkSold] = useState<Estimate | null>(null);
  const [isSoldConfirmDialogOpen, setIsSoldConfirmDialogOpen] = useState(false);
  const [jobType, setJobType] = useState<'Retail' | 'Insurance'>('Retail');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  
  // Check if we're in view mode (estimateId is present) and fetch the estimate data
  useEffect(() => {
    if (estimateId) {
      setIsViewMode(true);
      fetchEstimateData(estimateId);
    } else {
      setIsViewMode(false);
    }
  }, [estimateId]);
  
  // Fetch estimate data when in view mode
  const fetchEstimateData = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await getEstimateById(id);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setEstimateData(data);
        
        // Populate component state with the estimate data
        setMeasurements(data.measurements);
        setSelectedMaterials(data.materials || {});
        setQuantities(data.quantities || {});
        setLaborRates(data.labor_rates);
        setProfitMargin(data.profit_margin);
        
        // Set the active tab to summary in view mode by default
        setActiveTab("summary");
      }
    } catch (error) {
      console.error("Error fetching estimate:", error);
      toast({
        title: "Error",
        description: "Failed to load estimate data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Only load persisted data if not in view mode
  useEffect(() => {
    if (!isViewMode) {
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
    }
  }, [isViewMode, storedPdfData, storedMeasurements, storedFileName]);

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

  // Add new effect to fetch measurement data when measurementId changes
  useEffect(() => {
    const fetchMeasurementData = async () => {
      if (!measurementId) return;
      
      setIsLoading(true);
      try {
        console.log("Fetching measurement data for ID:", measurementId);
        const { data, error } = await getMeasurementById(measurementId);
        
        if (error) {
          throw error;
        }
        
        if (data && data.measurements) {
          console.log("Received measurement data:", data);
          console.log("Original areasByPitch:", data.measurements.areasByPitch);
          console.log("Type of areasByPitch:", typeof data.measurements.areasByPitch);
          if (data.measurements.areasByPitch) {
            console.log("Is array:", Array.isArray(data.measurements.areasByPitch));
          }
          
          // Ensure areasByPitch exists and is an array
          let areasByPitchArray = [];
          
          // Check if areasByPitch exists
          if (data.measurements.areasByPitch) {
            // If it's already an array, use it
            if (Array.isArray(data.measurements.areasByPitch)) {
              areasByPitchArray = data.measurements.areasByPitch;
            } 
            // If it's an object with pitch keys, convert to array
            else if (typeof data.measurements.areasByPitch === 'object') {
              areasByPitchArray = Object.entries(data.measurements.areasByPitch).map(([pitch, areaInfo]) => {
                // Handle different possible formats
                if (typeof areaInfo === 'number') {
                  // Simple {pitch: area} format
                  return {
                    pitch: pitch,
                    area: areaInfo,
                    percentage: 0 // Default, will be calculated below
                  };
                } else if (typeof areaInfo === 'object') {
                  // Format with nested structure {pitch: {area, percentage}}
                  const typedAreaInfo = areaInfo as any;
                  return {
                    pitch: pitch,
                    area: typedAreaInfo.area || 0,
                    percentage: typedAreaInfo.percentage || 0
                  };
                }
                return null;
              }).filter(Boolean); // Remove any null entries
              
              // Calculate percentages if missing
              const totalArea = areasByPitchArray.reduce((sum, area) => sum + area.area, 0);
              if (totalArea > 0) {
                areasByPitchArray = areasByPitchArray.map(area => ({
                  ...area,
                  percentage: area.percentage || Math.round((area.area / totalArea) * 100)
                }));
              }
            }
          }
          
          console.log("Transformed areasByPitch:", areasByPitchArray);
          
          // Create processed measurements with the corrected areasByPitch
          const processedMeasurements = {
            ...data.measurements,
            areasByPitch: areasByPitchArray
          };
          
          // Set measurements using the processed data
          setMeasurements(processedMeasurements);
          
          // First go to the measurements tab
          setActiveTab("measurements");
          
          // After a short delay, move to the materials tab to ensure the measurements have been loaded properly
          setTimeout(() => {
            setActiveTab("materials");
          }, 300);
          
          toast({
            title: "Measurement loaded",
            description: `Loaded measurement data for ${data.address}`,
          });
        } else {
          throw new Error("No measurement data found");
        }
      } catch (error) {
        console.error("Error fetching measurement data:", error);
        toast({
          title: "Error",
          description: "Failed to load measurement data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (measurementId && !isViewMode && !measurements) {
      fetchMeasurementData();
    }
  }, [measurementId, isViewMode, measurements, toast]);

  const handlePdfDataExtracted = (data: ParsedMeasurements | null, fileName: string) => {
    console.log("PDF data extracted:", data, fileName);
    setExtractedPdfData(data);
    setPdfFileName(fileName);
    
    if (!data) {
      toast({
        title: "Error",
        description: "Failed to extract data from PDF",
        variant: "destructive"
      });
      return;
    }
    
    // Store in localStorage
    setStoredPdfData(data);
    setStoredFileName(fileName);
    
    // Force immediate conversion to ensure measurements are available
    const convertedMeasurements = convertToMeasurementValues(data);
    setMeasurements(convertedMeasurements);
    setStoredMeasurements(convertedMeasurements);
    
    // Calculate areaDisplay *after* conversion, using the reliable converted value
    const areaDisplay = convertedMeasurements.totalArea && !isNaN(convertedMeasurements.totalArea) && convertedMeasurements.totalArea > 0 
      ? convertedMeasurements.totalArea.toFixed(1) 
      : 'unknown';
    
    // Inform the user data was extracted successfully
    toast({
      title: "Measurements extracted",
      description: `Successfully parsed ${fileName} with ${areaDisplay} sq ft of roof area.`,
    });
  };

  const handleGoToMeasurements = () => {
    setActiveTab("measurements");
  };

  const handleGoToMaterials = () => {
    setActiveTab("materials");
  };

  const handleMeasurementsSaved = (savedMeasurements: MeasurementValues) => {
    // Update measurements state first
    setMeasurements(savedMeasurements);
    
    // Add a small delay to ensure state is updated before navigation and toast
    setTimeout(() => {
      handleGoToMaterials();
      
      toast({
        title: "Measurements saved",
        description: "Now you can select materials for your estimate.",
      });
    }, 100);
  };

  const handleMaterialsUpdate = (update: { 
    selectedMaterials: {[key: string]: Material}, 
    quantities: {[key: string]: number},
    peelStickPrice: string
  }) => {
    console.log("handleMaterialsUpdate called, setting materials/quantities/price:", Object.keys(update.selectedMaterials).length, update.peelStickPrice);
    
    // Check if this is the "Back" button 
    if (Object.keys(update.selectedMaterials).length === 0 && Object.keys(update.quantities).length === 0 && update.peelStickPrice === "0.00") {
      console.log("Back button clicked in Materials Tab, setting activeTab to 'measurements'");
      setPeelStickAddonCost("0.00"); // Reset cost
      setSelectedMaterials({});
      setQuantities({});
      setActiveTab("measurements");
      return;
    }
    
    // Update state with all received data
    setSelectedMaterials(update.selectedMaterials);
    setQuantities(update.quantities);
    setPeelStickAddonCost(update.peelStickPrice); // Store the addon cost
    
    // Save the materials but DON'T navigate automatically
    console.log("Materials/Cost updated, but NOT navigating automatically");
    
    // Optional: Show toast only if materials actually changed?
    // toast({ ... });
  };

  const handleLaborProfitContinue = (laborRates: LaborRates, profitMargin: number) => {
    // Validate that we have proper laborRates and measurements before going to summary
    if (!laborRates || (!laborRates.laborRate && !laborRates.tearOff && !laborRates.installation)) {
      console.error("Missing valid labor rates, cannot continue to summary", laborRates);
      toast({
        title: "Error",
        description: "Missing labor rate information. Please set valid labor rates.",
        variant: "destructive"
      });
      return;
    }
    
    if (!measurements) {
      console.error("Missing measurements, cannot continue to summary");
      toast({
        title: "Error",
        description: "Missing measurement information. Please go back and set valid measurements.",
        variant: "destructive"
      });
      return;
    }
    
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
    
    // Validate that we have all required data
    if (!measurements) {
      toast({
        title: "Missing Data",
        description: "Measurements are required for the estimate.",
        variant: "destructive"
      });
      setIsSubmittingFinal(false);
      return;
    }
    
    if (Object.keys(selectedMaterials).length === 0) {
      toast({
        title: "Missing Data",
        description: "No materials selected for the estimate.",
        variant: "destructive"
      });
      setIsSubmittingFinal(false);
      return;
    }
    
    // Create the estimate object
    const estimateData = {
      customer_address: measurements.propertyAddress || "Address not provided",
      total_price: calculateTotalEstimate(),
      materials: selectedMaterials,
      quantities: quantities,
      labor_rates: laborRates,
      profit_margin: profitMargin,
      measurements: measurements,
    };
    
    // Save the estimate to the database
    console.log("Saving estimate data:", estimateData);
    saveEstimate(estimateData)
      .then(({ data, error }) => {
        setIsSubmittingFinal(false);
        
        if (error) {
          // Log the detailed error
          console.error("Error saving estimate:", error);
          console.error("Error message:", error.message);
          
          // Show a more specific error message if possible
          let errorMessage = "Failed to save estimate. Please try again.";
          
          // Check for specific Supabase error types
          if (error.message?.includes("not configured")) {
            errorMessage = "Database connection not configured properly.";
          } else if (error.message?.includes("violates foreign key constraint")) {
            errorMessage = "Invalid reference to another record.";
          } else if (error.message?.includes("violates not-null constraint")) {
            errorMessage = "Required fields are missing.";
          } else if (error.message?.includes("duplicate key")) {
            errorMessage = "An estimate with this ID already exists.";
          } else if (error.message?.includes("Could not find") && error.message?.includes("column")) {
            errorMessage = "Database schema error: The estimates table is missing required columns. Please contact support.";
          } else if (error.message?.includes("permission denied")) {
            errorMessage = "Database permission error: You don't have permission to save estimates. Please contact support.";
          }
          
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive"
          });
          return;
        }
        
        // Log the successful response
        console.log("Estimate saved successfully:", data);
        
        toast({
          title: "Estimate Finalized",
          description: "Your estimate has been saved and is pending approval.",
        });
        
        // Navigate to the dashboard after a short delay
        setTimeout(() => {
          // Reset the estimate form
          handleClearEstimate();
          
          // Navigate to the dashboard
          navigate("/");
        }, 1500);
      })
      .catch(unexpectedError => {
        // Catch any unexpected errors that might be thrown during the promise chain
        console.error("Unexpected error during save:", unexpectedError);
        setIsSubmittingFinal(false);
        
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      });
  };
  
  const calculateTotalEstimate = (): number => {
    // Base cost calculation using the existing API function
    let total = calculateEstimateTotal(selectedMaterials, quantities, laborRates, profitMargin);
    
    // Add the peel & stick addon cost stored in state
    const numericAddonCost = parseFloat(peelStickAddonCost) || 0;
    if (numericAddonCost > 0) {
      console.log(`[calculateTotalEstimate - FINAL] Adding Peel&Stick Addon Cost: ${numericAddonCost}`);
      total += numericAddonCost;
    }
    
    return total;
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
      laborRate: 85,
      tearOff: 0,
      installation: 0,
      isHandload: false,
      handloadRate: 15,
      dumpsterLocation: "orlando",
      dumpsterCount: 1,
      dumpsterRate: 400,
      includePermits: true,
      permitRate: 550,
      permitCount: 1,
      permitAdditionalRate: 450,
      pitchRates: {},
      wastePercentage: 12,
      includeGutters: false,
      gutterLinearFeet: 0,
      gutterRate: 8,
      includeDownspouts: false,
      downspoutCount: 0,
      downspoutRate: 75,
      includeDetachResetGutters: false,
      detachResetGutterLinearFeet: 0,
      detachResetGutterRate: 1
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

  const fetchEstimatesData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getEstimates();
      if (fetchError) {
        throw fetchError;
      }
      setEstimates(data || []);
    } catch (err: any) {
      console.error("Error fetching estimates:", err);
      setError("Failed to load estimates.");
      toast({
        variant: "destructive",
        title: "Error",
        description: `Could not fetch estimates: ${err.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEstimatesData();
  }, [fetchEstimatesData]);

  const handleApprove = async (id: string) => {
    // ... existing approve logic ...
  };

  const handleReject = async (id: string) => {
    // ... existing reject logic ...
  };

  const handleOpenSoldDialog = (estimate: Estimate) => {
    setEstimateToMarkSold(estimate);
    setJobType('Retail'); // Reset to default
    setInsuranceCompany(''); // Reset insurance company
    setIsSoldConfirmDialogOpen(true);
  };

  const handleConfirmSale = async () => {
    if (!estimateToMarkSold) return;

    const estimateId = estimateToMarkSold.id;
    if (!estimateId) {
        toast({ variant: "destructive", title: "Error", description: "Estimate ID missing." });
        return;
    }

    // Basic validation
    if (jobType === 'Insurance' && !insuranceCompany.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please enter the Insurance Company name." });
        return;
    }

    setIsSubmitting(prev => ({ ...prev, [estimateId]: true }));
    setIsSoldConfirmDialogOpen(false); // Close dialog optimisticly or after API call?

    try {
      // Call the modified API function
      const updatedEstimate = await markEstimateAsSold(estimateId, jobType, insuranceCompany.trim());
      
      // Update local state
      setEstimates(prevEstimates =>
        prevEstimates.map(est =>
          est.id === estimateId
            ? { 
                ...est, 
                is_sold: true, 
                status: 'Sold', 
                job_type: jobType, 
                insurance_company: jobType === 'Insurance' ? insuranceCompany.trim() : null 
              }
            : est
        )
      );
      toast({
        title: "Success",
        description: `Estimate #${estimateId.substring(0, 8)} marked as ${jobType} Sale.`,
      });
      setEstimateToMarkSold(null); // Clear selected estimate

    } catch (err: any) {
      console.error("Error marking estimate as sold:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to mark estimate as sold: ${err.message}`,
      });
      // Optional: Re-open dialog on error? depends on desired UX
      // setIsSoldConfirmDialogOpen(true); 
    } finally {
      setIsSubmitting(prev => ({ ...prev, [estimateId]: false }));
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">
              {isViewMode ? "Review Estimate" : "Create New Estimate"}
            </h1>
            <div className="flex gap-2">
              {isViewMode ? (
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleClearEstimate} 
                  className="flex items-center gap-2" 
                  title="Clear this estimate and start over"
                >
                  <RefreshCw className="h-4 w-4" /> Start Fresh
                </Button>
              )}
            </div>
          </div>
          
          {isViewMode ? (
            <p className="text-muted-foreground">
              {estimateData?.customer_address ? `Reviewing estimate for ${estimateData.customer_address}` : "Reviewing estimate details"}
            </p>
          ) : (
            <p className="text-muted-foreground">Follow the steps below to create a complete estimate</p>
          )}
          
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
                  <p className="text-muted-foreground">Loading estimate data...</p>
                </div>
              ) : (
                <Tabs 
                  value={activeTab} 
                  onValueChange={(value) => {
                    console.log(`Tab changing from ${activeTab} to ${value}`);
                    
                    // Special case for materials tab
                    if (value === "materials" && measurements) {
                      console.log("Validating measurements before navigating to materials tab");
                      // Make sure measurements and areasByPitch are properly set
                      if (!measurements.areasByPitch || !Array.isArray(measurements.areasByPitch) || measurements.areasByPitch.length === 0) {
                        console.warn("Measurements are missing areasByPitch data, staying on current tab");
                        toast({
                          title: "Missing Data",
                          description: "Please complete the measurements form before selecting materials.",
                          variant: "destructive"
                        });
                        return;
                      }
                    }
                    
                    setActiveTab(value);
                    console.log(`Tab changed, activeTab is now ${value}`);
                  }} 
                  className="w-full"
                  defaultValue={isViewMode ? "summary" : "upload"}
                >
                  <TabsList className="grid grid-cols-5 mb-8">
                    {!isViewMode && (
                      <TabsTrigger value="upload" disabled={false}>
                        1. Upload EagleView
                      </TabsTrigger>
                    )}
                    <TabsTrigger 
                      value="measurements" 
                      disabled={!isViewMode && !extractedPdfData && !measurements}
                    >
                      {isViewMode ? "Measurements" : "2. Enter Measurements"}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="materials" 
                      disabled={!isViewMode && !measurements}
                    >
                      {isViewMode ? "Materials" : "3. Select Materials"}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="pricing" 
                      disabled={!isViewMode && (!measurements || Object.keys(selectedMaterials).length === 0)}
                    >
                      {isViewMode ? "Labor & Profit" : "4. Labor & Profit"}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="summary" 
                      disabled={!isViewMode && (!measurements || Object.keys(selectedMaterials).length === 0)}
                    >
                      {isViewMode ? "Summary" : "5. Summary"}
                    </TabsTrigger>
                  </TabsList>

                  {/* Debug measurements info */}
                  {process.env.NODE_ENV === 'development' && !isViewMode && (
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

                  {!isViewMode && (
                    <TabsContent value="upload" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <PdfUploader onDataExtracted={handlePdfDataExtracted} savedFileName={pdfFileName} />
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
                  )}
                  
                  <TabsContent value="measurements">
                    <MeasurementForm
                      initialMeasurements={measurements || undefined}
                      onMeasurementsSaved={handleMeasurementsSaved}
                      extractedFileName={pdfFileName || undefined}
                      onBack={() => setActiveTab("upload")}
                      readOnly={isViewMode}
                    />
                  </TabsContent>
                  
                  <TabsContent value="materials">
                    {(() => {
                      // Debug measurements for MaterialsSelectionTab
                      console.log("About to render MaterialsSelectionTab with measurements:", measurements);
                      console.log("areasByPitch type:", measurements?.areasByPitch ? (Array.isArray(measurements.areasByPitch) ? "array" : typeof measurements.areasByPitch) : "undefined");
                      
                      if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch)) {
                        return (
                          <Card>
                            <CardHeader>
                              <CardTitle>Missing Measurements</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-muted-foreground">Please go back and enter roof measurements before selecting materials.</p>
                            </CardContent>
                            <CardFooter>
                              <Button onClick={() => setActiveTab("measurements")} variant="outline">Go to Measurements</Button>
                            </CardFooter>
                          </Card>
                        );
                      } else {
                        return (
                          <MaterialsSelectionTab
                            measurements={measurements}
                            selectedMaterials={selectedMaterials}
                            quantities={quantities}
                            onMaterialsUpdate={handleMaterialsUpdate}
                            readOnly={isViewMode}
                          />
                        );
                      }
                    })()}
                  </TabsContent>
                  
                  <TabsContent value="pricing">
                    <LaborProfitTab
                      key={`labor-profit-${activeTab === 'pricing' ? 'active' : 'inactive'}`}
                      measurements={measurements!}
                      selectedMaterials={selectedMaterials}
                      quantities={quantities}
                      initialLaborRates2={laborRates}
                      initialProfitMargin2={profitMargin}
                      onLaborProfitContinue={handleLaborProfitContinue}
                      onBack={() => setActiveTab("materials")}
                      onContinue={handleLaborProfitContinue}
                      readOnly={isViewMode}
                    />
                  </TabsContent>
                  
                  <TabsContent value="summary">
                    <EstimateSummaryTab
                      measurements={measurements || undefined}
                      selectedMaterials={selectedMaterials}
                      quantities={quantities}
                      laborRates={laborRates}
                      profitMargin={profitMargin}
                      totalAmount={calculateTotalEstimate()}
                      peelStickAddonCost={parseFloat(peelStickAddonCost) || 0}
                      onFinalizeEstimate={handleFinalizeEstimate}
                      isSubmitting={isSubmittingFinal}
                      estimate={estimateData}
                      isReviewMode={isViewMode}
                    />
                  </TabsContent>
                </Tabs>
              )}

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

      <Dialog open={isSoldConfirmDialogOpen} onOpenChange={setIsSoldConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Sale Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {/* Display estimate ID/Address if needed */}
             {estimateToMarkSold && 
                <p className="text-sm text-muted-foreground">
                    Estimate ID: {estimateToMarkSold.id?.substring(0,8)}... <br/>
                    Address: {estimateToMarkSold.customer_address}
                </p> 
             }

             <div className="space-y-2">
                <Label>Job Type</Label>
                <RadioGroup value={jobType} onValueChange={(value: 'Retail' | 'Insurance') => setJobType(value)} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Retail" id="r1" />
                    <Label htmlFor="r1">Retail</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Insurance" id="r2" />
                    <Label htmlFor="r2">Insurance</Label>
                  </div>
                </RadioGroup>
             </div>

             {jobType === 'Insurance' && (
                <div className="space-y-2 animate-fade-in"> {/* Simple fade-in */} 
                  <Label htmlFor="insurance-company">Insurance Company Name</Label>
                  <Input 
                    id="insurance-company" 
                    value={insuranceCompany} 
                    onChange={(e) => setInsuranceCompany(e.target.value)} 
                    placeholder="Enter company name" 
                  />
                </div>
             )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
               <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
               type="button" 
               onClick={handleConfirmSale}
               disabled={isSubmitting[estimateToMarkSold?.id || ''] || (jobType === 'Insurance' && !insuranceCompany.trim())}
            >
               {isSubmitting[estimateToMarkSold?.id || ''] ? "Confirming..." : "Confirm Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Estimates;
