import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, RefreshCw, ArrowLeft, Loader2, Shield, Info, EyeOff } from "lucide-react";
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
import { saveEstimate, calculateEstimateTotal as calculateEstimateTotalFromAPI, getEstimateById, Estimate as EstimateType, markEstimateAsSold, getEstimates, updateEstimateStatus, updateEstimateCustomerDetails, EstimateStatus } from "@/api/estimatesFacade";
import { getMeasurementById } from "@/api/measurements";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPricingTemplates, getPricingTemplateById, PricingTemplate, createPricingTemplate, updatePricingTemplate } from "@/api/pricing-templates";
import { Checkbox } from "@/components/ui/checkbox";
import { ROOFING_MATERIALS } from "@/components/estimates/materials/data";
import { calculateMaterialQuantity } from "@/components/estimates/materials/utils";
import { withTimeout } from "@/lib/withTimeout";
import { EstimateTypeSelector } from "@/components/estimates/EstimateTypeSelector";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

// Convert ParsedMeasurements to MeasurementValues format
const convertToMeasurementValues = (parsedDataRaw: any): MeasurementValues => {
  // Allow both direct ParsedMeasurements and the wrapper { measurements, parsedMeasurements }
  const parsedData: ParsedMeasurements | null = parsedDataRaw?.parsedMeasurements ?? parsedDataRaw ?? null;
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
  const { profile } = useAuth();
  
  // State for view mode
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [estimateData, setEstimateData] = useState<EstimateType | null>(null);

  // Workflow state 
  const [activeTab, setActiveTab] = useState("type-selection");
  
  // Estimate type selection state
  const [estimateType, setEstimateType] = useState<'roof_only' | 'with_subtrades' | null>(null);
  const [selectedSubtrades, setSelectedSubtrades] = useState<string[]>([]);
  
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
    detachResetGutterRate: 1,
    includeLowSlopeLabor: true,
    includeSteepSlopeLabor: true,
  });
  const [profitMargin, setProfitMargin] = useState(25);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [peelStickAddonCost, setPeelStickAddonCost] = useState<string>("0.00");
  
  // NEW STATE: Pricing Templates
  const [templates, setTemplates] = useState<PricingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateData, setSelectedTemplateData] = useState<PricingTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [lastTemplateApplied, setLastTemplateApplied] = useState<string | null>(null);
  
  // Add localStorage hooks to persist state across refreshes and tabs
  const [storedPdfData, setStoredPdfData] = useLocalStorage<ParsedMeasurements | null>("estimateExtractedPdfData", null);
  const [storedMeasurements, setStoredMeasurements] = useLocalStorage<MeasurementValues | null>("estimateMeasurements", null);
  const [storedFileName, setStoredFileName] = useLocalStorage<string>("estimatePdfFileName", "");
  
  // Additional state persistence for complete estimate recovery
  const [storedSelectedMaterials, setStoredSelectedMaterials] = useLocalStorage<{[key: string]: Material}>("estimateSelectedMaterials", {});
  const [storedQuantities, setStoredQuantities] = useLocalStorage<{[key: string]: number}>("estimateQuantities", {});
  const [storedLaborRates, setStoredLaborRates] = useLocalStorage<LaborRates>("estimateLaborRates", {
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
    detachResetGutterRate: 1,
    includeLowSlopeLabor: true,
    includeSteepSlopeLabor: true,
  });
  const [storedProfitMargin, setStoredProfitMargin] = useLocalStorage<number>("estimateProfitMargin", 25);
  const [storedEstimateType, setStoredEstimateType] = useLocalStorage<'roof_only' | 'with_subtrades' | null>("estimateType", null);
  const [storedSelectedSubtrades, setStoredSelectedSubtrades] = useLocalStorage<string[]>("estimateSelectedSubtrades", []);
  const [storedActiveTab, setStoredActiveTab] = useLocalStorage<string>("estimateActiveTab", "type-selection");
  const [storedPeelStickCost, setStoredPeelStickCost] = useLocalStorage<string>("estimatePeelStickCost", "0.00");
  
  const [estimates, setEstimates] = useState<EstimateType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<{[key: string]: boolean}>({});
  const [estimateToMarkSold, setEstimateToMarkSold] = useState<EstimateType | null>(null);
  const [isSoldConfirmDialogOpen, setIsSoldConfirmDialogOpen] = useState(false);
  const [jobType, setJobType] = useState<'Retail' | 'Insurance'>('Retail');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  
  // NEW STATE: Template Edit Dialog
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateDialogMode, setTemplateDialogMode] = useState<'create' | 'edit' | 'copy'>('create');
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);
  const [templateFormData, setTemplateFormData] = useState<{
    name: string;
    description: string;
    is_default: boolean;
    saveAsNew?: boolean;
    materials: Record<string, Material>;
    quantities: Record<string, number>;
    usePresetPackage: boolean;
    presetPackageType: string;
  }>({
    name: '',
    description: '',
    is_default: false,
    saveAsNew: false,
    materials: {},
    quantities: {},
    usePresetPackage: false,
    presetPackageType: ''
  });
  
  // Check if we're in view mode (estimateId is present) and fetch the estimate data
  useEffect(() => {
    if (estimateId) {
      setIsViewMode(true);
      fetchEstimateData(estimateId);
    } else {
      setIsViewMode(false);
      // For a new estimate, ensure we start clean
      // and don't load from localStorage unless specified by a measurementId
      if (!measurementId) {
        setActiveTab("type-selection");
    }
    }
  }, [estimateId, measurementId]);
  
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
  
  // Enhanced recovery logic - load persisted data when not in view mode
  useEffect(() => {
    if (!isViewMode) {
      // Always attempt to recover these basic items
      if (storedPdfData && !extractedPdfData) {
        setExtractedPdfData(storedPdfData);
        console.log("Recovered PDF data from localStorage:", storedPdfData);
      }
      
      if (storedMeasurements && !measurements) {
        setMeasurements(storedMeasurements);
        console.log("Recovered measurements from localStorage:", storedMeasurements);
      }
      
      if (storedFileName && !pdfFileName) {
        setPdfFileName(storedFileName);
        console.log("Recovered filename from localStorage:", storedFileName);
      }
      
      // Recover additional estimate data for complete state restoration
      if (storedSelectedMaterials && Object.keys(storedSelectedMaterials).length > 0 && Object.keys(selectedMaterials).length === 0) {
        setSelectedMaterials(storedSelectedMaterials);
        console.log("Recovered selected materials from localStorage:", Object.keys(storedSelectedMaterials).length, "materials");
      }
      
      if (storedQuantities && Object.keys(storedQuantities).length > 0 && Object.keys(quantities).length === 0) {
        setQuantities(storedQuantities);
        console.log("Recovered quantities from localStorage:", storedQuantities);
      }
      
      if (storedLaborRates && Object.keys(storedLaborRates).length > 0 && laborRates.laborRate === 85) {
        setLaborRates(storedLaborRates);
        console.log("Recovered labor rates from localStorage:", storedLaborRates);
      }
      
      if (storedProfitMargin && storedProfitMargin !== 25 && profitMargin === 25) {
        setProfitMargin(storedProfitMargin);
        console.log("Recovered profit margin from localStorage:", storedProfitMargin);
      }
      
      if (storedEstimateType && !estimateType) {
        setEstimateType(storedEstimateType);
        console.log("Recovered estimate type from localStorage:", storedEstimateType);
      }
      
      if (storedSelectedSubtrades && storedSelectedSubtrades.length > 0 && selectedSubtrades.length === 0) {
        setSelectedSubtrades(storedSelectedSubtrades);
        console.log("Recovered selected subtrades from localStorage:", storedSelectedSubtrades);
      }
      
      if (storedActiveTab && storedActiveTab !== "type-selection" && activeTab === "type-selection") {
        setActiveTab(storedActiveTab);
        console.log("Recovered active tab from localStorage:", storedActiveTab);
      }
      
      if (storedPeelStickCost && storedPeelStickCost !== "0.00" && peelStickAddonCost === "0.00") {
        setPeelStickAddonCost(storedPeelStickCost);
        console.log("Recovered peel stick cost from localStorage:", storedPeelStickCost);
      }
    }
    }, [isViewMode, storedPdfData, storedMeasurements, storedFileName, storedSelectedMaterials, storedQuantities, storedLaborRates, storedProfitMargin, storedEstimateType, storedSelectedSubtrades, storedActiveTab, storedPeelStickCost, extractedPdfData, measurements, pdfFileName, selectedMaterials, quantities, laborRates, profitMargin, estimateType, selectedSubtrades, activeTab, peelStickAddonCost]);
  
  // Auto-save effects - persist state changes to localStorage for seamless recovery
  useEffect(() => {
    if (!isViewMode && Object.keys(selectedMaterials).length > 0) {
      setStoredSelectedMaterials(selectedMaterials);
    }
  }, [selectedMaterials, isViewMode, setStoredSelectedMaterials]);

  useEffect(() => {
    if (!isViewMode && Object.keys(quantities).length > 0) {
      setStoredQuantities(quantities);
    }
  }, [quantities, isViewMode, setStoredQuantities]);

  useEffect(() => {
    if (!isViewMode && laborRates && laborRates.laborRate !== 85) {
      setStoredLaborRates(laborRates);
    }
  }, [laborRates, isViewMode, setStoredLaborRates]);

  useEffect(() => {
    if (!isViewMode && profitMargin !== 25) {
      setStoredProfitMargin(profitMargin);
    }
  }, [profitMargin, isViewMode, setStoredProfitMargin]);

  useEffect(() => {
    if (!isViewMode && estimateType) {
      setStoredEstimateType(estimateType);
    }
  }, [estimateType, isViewMode, setStoredEstimateType]);

  useEffect(() => {
    if (!isViewMode && selectedSubtrades.length > 0) {
      setStoredSelectedSubtrades(selectedSubtrades);
    }
  }, [selectedSubtrades, isViewMode, setStoredSelectedSubtrades]);

  useEffect(() => {
    if (!isViewMode && activeTab !== "type-selection") {
      setStoredActiveTab(activeTab);
    }
  }, [activeTab, isViewMode, setStoredActiveTab]);

  useEffect(() => {
    if (!isViewMode && peelStickAddonCost !== "0.00") {
      setStoredPeelStickCost(peelStickAddonCost);
    }
  }, [peelStickAddonCost, isViewMode, setStoredPeelStickCost]);
  
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

  const handleEstimateTypeSelection = (selection: { type: 'roof_only' | 'with_subtrades'; selectedSubtrades: string[] }) => {
    setEstimateType(selection.type);
    setSelectedSubtrades(selection.selectedSubtrades);
    setActiveTab("upload");
    
    toast({
      title: "Estimate Type Selected",
      description: selection.type === 'roof_only' 
        ? "Standard roofing estimate workflow selected"
        : `Roof + ${selection.selectedSubtrades.length} subtrade(s) selected`,
    });
  };

  const handleMeasurementsSaved = (savedMeasurements: MeasurementValues) => {
    // Update measurements state first
    setMeasurements(savedMeasurements);
    
    // Check for low-slope areas in the measurements
    const hasLowPitch = savedMeasurements.areasByPitch?.some(
      area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch)
    );
    
    // If there are low-slope areas, we'll display a special message in the toast
    const lowSlopeMessage = hasLowPitch ? 
      " Required materials for low-slope areas will be automatically added." : 
      "";
    
    // Add a small delay to ensure state is updated before navigation and toast
    setTimeout(() => {
      handleGoToMaterials();
      
      toast({
        title: "Measurements saved",
        description: `Now you can select materials for your estimate.${lowSlopeMessage}`,
      });
    }, 100);
  };

  const handleMaterialsUpdate = (update: { 
    selectedMaterials: {[key: string]: Material}, 
    quantities: {[key: string]: number},
    peelStickPrice: string;
    warrantyCost?: number; 
    warrantyDetails?: any | null; 
    isNavigatingBack?: boolean;
  }) => {
    console.log("handleMaterialsUpdate called with update:", update);
    
    if (update.isNavigatingBack) {
      console.log("Navigation back to measurements tab initiated from Materials Tab.");
      setActiveTab("measurements");
      return;
    }
    
    // This function will now ONLY update state. 
    // Navigation forward will be handled by the main "Continue" button in Estimates.tsx render.
    setSelectedMaterials(update.selectedMaterials);
    setQuantities(update.quantities);
    setPeelStickAddonCost(update.peelStickPrice); 
    // TODO: Handle warrantyDetails update if necessary
    // if (update.warrantyDetails !== undefined) { /* set warranty state */ }
    
    console.log("Materials/Cost updated in Estimates.tsx. Quantities count:", Object.keys(update.quantities).length);

    // REMOVED NAVIGATION BLOCK FROM HERE
    // if (activeTab === 'materials' && !update.isNavigatingBack /* && update.isContinueAction */) {
    //   if (Object.keys(update.selectedMaterials).length === 0) {
    //     toast({ 
    //       title: "No Materials Selected", 
    //       description: "Please select at least one material to continue.",
    //       variant: "destructive"
    //     });
    //     return; 
    //   }
      
    //   if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch) || measurements.areasByPitch.length === 0) {
    //     toast({
    //       title: "Missing Measurements Data",
    //       description: "Cannot proceed to labor/profit without valid pitch information.",
    //       variant: "destructive"
    //     });
    //     return;
    //   }

    //   console.log("Navigating from Materials to Pricing (Labor & Profit) tab.");
    //   setActiveTab("pricing"); 
    // }
  };

  const handleLaborProfitContinue = (updatedLaborRates: LaborRates, updatedProfitMargin: number) => {
    // Validate that we have proper laborRates and measurements before just updating state
    if (!updatedLaborRates || (!updatedLaborRates.laborRate && !updatedLaborRates.tearOff && !updatedLaborRates.installation)) {
      console.error("Missing valid labor rates, not updating state in Estimates.tsx", updatedLaborRates);
      // Toast is optional here, as this is more of a data sync. 
      // The main "Continue" button will do a more user-facing validation.
      return;
    }
    
    // if (!measurements) { // This validation might be too strict if just syncing data
    //   console.error("Missing measurements, not updating state in Estimates.tsx");
    //   return;
    // }
    
    console.log("Estimates.tsx: Updating laborRates and profitMargin state.", { updatedLaborRates, updatedProfitMargin });
    setLaborRates(updatedLaborRates);
    setProfitMargin(updatedProfitMargin);
    
    // DO NOT NAVIGATE HERE. Navigation is handled by the main generic "Continue" button.
    // setActiveTab("summary"); 
    
    // toast({ // Toast on data sync might be too noisy.
    //   title: "Labor rates & profit margin synced",
    //   description: "Data updated for summary review.",
    // });
  };

  const handleFinalizeEstimate = () => {
    setIsSubmittingFinal(true);
    if (!measurements || Object.keys(selectedMaterials).length === 0) {
      toast({ title: "Missing Data", /* ... */ variant: "destructive" });
      setIsSubmittingFinal(false);
      return;
    }
    const liveTotal = calculateLiveEstimateTotal(); // Calculate the total using the live function
    
    const estimatePayload: any = { // Use 'any' type to allow additional fields
      customer_address: measurements.propertyAddress || "Address not provided",
      total_price: liveTotal, // Use the live calculated total
      materials: selectedMaterials,
      quantities: quantities,
      labor_rates: laborRates,
      profit_margin: profitMargin,
      measurements: measurements,
      peel_stick_addon_cost: parseFloat(peelStickAddonCost) || 0,
      // Add role-based fields for proper filtering (will be handled by database if columns exist)
      ...(profile?.id && { created_by: profile.id }),
      ...(profile?.territory_id && { territory_id: profile.territory_id }),
      ...(estimateType && { estimate_type: estimateType }),
      ...(selectedSubtrades.length > 0 && { selected_subtrades: selectedSubtrades }),
      // status will be set to 'pending' by the saveEstimate API if it's a new record
    };
    
    console.log("Finalizing new estimate with payload:", estimatePayload);
    saveEstimate(estimatePayload) // Ensure saveEstimate is called with ONE argument
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
  
  // Ensure calculateTotalEstimate is defined and accessible in this scope
  // It might already be defined as it was used in handleFinalizeEstimate
  const calculateTotalEstimate = (): number => {
    let total = calculateEstimateTotalFromAPI(selectedMaterials, quantities, laborRates, profitMargin); // Renamed to avoid conflict
    const numericAddonCost = parseFloat(peelStickAddonCost) || 0;
    if (numericAddonCost > 0) {
      total += numericAddonCost;
    }
    return total;
  };
  
  // Function to start fresh and clear all state
  const handleClearEstimate = () => {
    setActiveTab("type-selection");
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
      detachResetGutterRate: 1,
      includeLowSlopeLabor: true,
      includeSteepSlopeLabor: true,
    });
    setProfitMargin(25);
    setEstimateType(null);
    setSelectedSubtrades([]);
    setPeelStickAddonCost("0.00");
    
    // Clear ALL localStorage values for complete fresh start
    setStoredPdfData(null);
    setStoredMeasurements(null);
    setStoredFileName("");
    setStoredSelectedMaterials({});
    setStoredQuantities({});
    setStoredLaborRates({
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
      detachResetGutterRate: 1,
      includeLowSlopeLabor: true,
      includeSteepSlopeLabor: true,
    });
    setStoredProfitMargin(25);
    setStoredEstimateType(null);
    setStoredSelectedSubtrades([]);
    setStoredActiveTab("type-selection");
    setStoredPeelStickCost("0.00");
    
    // Clear any URL parameters and navigate to clean estimates page
    navigate("/estimates", { replace: true });
    
    toast({
      title: "Started fresh",
      description: "All estimate data has been cleared.",
    });
  };

  const fetchEstimatesData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await withTimeout(getEstimates(), 5000);
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

  // Safety guard: ensure isLoading cannot remain true longer than 6 s
  useEffect(() => {
    if (!isLoading) return;
    const id = setTimeout(() => setIsLoading(false), 6000);
    return () => clearTimeout(id);
  }, [isLoading]);

  const handleApprove = async (id: string) => {
    // ... existing approve logic ...
  };

  const handleReject = async (id: string) => {
    // ... existing reject logic ...
  };

  const handleOpenSoldDialog = (estimate: EstimateType) => {
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

  // NEW EFFECT: Fetch pricing templates when component mounts
  useEffect(() => {
    const fetchPricingTemplates = async () => {
      if (isViewMode) return; // Don't fetch templates in view mode
      
      setIsLoadingTemplates(true);
      try {
        const { data, error } = await getPricingTemplates();
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          setTemplates(data);
          
          // Find the default template to set as initial selected template
          const defaultTemplate = data.find(template => template.is_default);
          if (defaultTemplate) {
            setSelectedTemplateId(defaultTemplate.id);
            setSelectedTemplateData(defaultTemplate);
          } else {
            // If no default, select the first template
            setSelectedTemplateId(data[0].id);
            setSelectedTemplateData(data[0]);
          }
        } else {
          toast({
            title: "No Templates Found",
            description: "No pricing templates are available. Please create a template first.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching pricing templates:", error);
        toast({
          title: "Error",
          description: "Failed to load pricing templates",
          variant: "destructive"
        });
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    if (!isViewMode) {
      fetchPricingTemplates();
    }
  }, [isViewMode, toast]);
  
  // NEW EFFECT: Fetch selected template data when template ID changes
  useEffect(() => {
    const fetchTemplateData = async () => {
      if (!selectedTemplateId || isViewMode) return;
      
      setIsLoadingTemplates(true);
      try {
        const { data, error } = await getPricingTemplateById(selectedTemplateId);
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setSelectedTemplateData(data);
          // Don't automatically update selectedMaterials here - let the user decide when to apply the template
        } else {
          toast({
            title: "Template Not Found",
            description: "The selected pricing template could not be found.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error(`Error fetching template with ID ${selectedTemplateId}:`, error);
        toast({
          title: "Error",
          description: "Failed to load the selected template",
          variant: "destructive"
        });
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    if (selectedTemplateId && !isViewMode) {
      fetchTemplateData();
    }
  }, [selectedTemplateId, isViewMode, toast]);
  
  // NEW FUNCTION: Handle applying the selected template
  const handleApplyTemplate = () => {
    if (!selectedTemplateData || !selectedTemplateData.materials) {
      toast({
        title: "No Template Selected",
        description: "Please select a valid pricing template first.",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Applying template:", {
      templateName: selectedTemplateData.name,
      materialsCount: Object.keys(selectedTemplateData.materials || {}).length,
      quantitiesCount: Object.keys(selectedTemplateData.quantities || {}).length
    });
    
    // Apply the template's materials and quantities
    const templateMaterials = selectedTemplateData.materials || {};
    const templateQuantities = selectedTemplateData.quantities || {};
    
    // Check if this is a predefined package template
    const isGafBasicPackage = selectedTemplateData.name.toLowerCase().includes("gaf 1") || 
                             selectedTemplateData.name.toLowerCase().includes("basic package");
    
    const isPremiumGafPackage = selectedTemplateData.name.toLowerCase().includes("premium gaf") || 
                               selectedTemplateData.name.toLowerCase().includes("enhanced protection");
    
    if (isGafBasicPackage || isPremiumGafPackage) {
      // This is a special package template, so we'll auto-populate specific materials
      // based on the package type instead of using stored materials from the template
      const newMaterials: Record<string, Material> = {};
      const newQuantities: Record<string, number> = {};
      
      // Find materials from ROOFING_MATERIALS based on IDs
      let packageMaterialIds: string[] = [];
      
      if (isGafBasicPackage) {
        // GAF 1 Basic Package materials
        packageMaterialIds = [
          "gaf-timberline-hdz-sg",           // GAF Timberline HDZ
          "gaf-seal-a-ridge",                // GAF Seal-A-Ridge
          "gaf-prostart-starter-shingle-strip", // GAF ProStart Starter
          "abc-pro-guard-20",                // Underlayment
          "gaf-weatherwatch-ice-water-shield" // Ice & Water (valleys only)
        ];
      } else if (isPremiumGafPackage) {
        // Premium GAF Package materials
        packageMaterialIds = [
          "gaf-timberline-hdz-sg",           // GAF Timberline HDZ
          "gaf-seal-a-ridge",                // GAF Seal-A-Ridge
          "gaf-prostart-starter-shingle-strip", // GAF ProStart Starter
          "gaf-feltbuster-synthetic-underlayment", // GAF FeltBuster
          "gaf-weatherwatch-ice-water-shield" // Ice & Water (valleys only)
        ];
      }
      
      // Calculate quantities based on measurements for each material
      if (measurements) {
        const effectiveWasteFactorGeneral = 0.1; // 10% waste factor
        const effectiveWasteFactorTimberline = 0.12; // 12% waste factor for Timberline HDZ

        packageMaterialIds.forEach(materialId => {
          const material = ROOFING_MATERIALS.find(m => m.id === materialId);
          
          if (material) {
            // Calculate quantity with appropriate waste factor
            const effectiveWasteFactor = material.id === "gaf-timberline-hdz-sg" ? 
              effectiveWasteFactorTimberline : effectiveWasteFactorGeneral;
              
            let quantity = 0;
            
            // Special handling for WeatherWatch in valleys only
            if (materialId === "gaf-weatherwatch-ice-water-shield") {
              const valleyLength = measurements.valleyLength || 0;
              if (valleyLength > 0) {
                // Modify the name to indicate "valleys only"
                const modifiedMaterial = { 
                  ...material,
                  name: "GAF WeatherWatch Ice & Water Shield (valleys only)"
                };
                
                // Calculate based on valley length
                quantity = Math.ceil(valleyLength / 45.5);
                newMaterials[materialId] = modifiedMaterial;
                newQuantities[materialId] = quantity;
              }
            } else {
              // Standard calculation for other materials
              const { quantity: newQty } = calculateMaterialQuantity(material, measurements, effectiveWasteFactor);
              quantity = newQty;
              newMaterials[materialId] = material;
              newQuantities[materialId] = quantity;
            }
          }
        });
        
        // Check for low slope areas and add required materials if needed
        const hasLowSlopeAreas = measurements.areasByPitch?.some(
          area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch)
        );
        
        if (hasLowSlopeAreas) {
          // Add low slope materials (e.g., Polyglass SBS Base and APP Cap)
          const baseMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-elastoflex-sbs");
          const capMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-polyflex-app");
          
          if (baseMaterial && capMaterial) {
            // Calculate low slope area
            const lowSlopeArea = measurements.areasByPitch
              ?.filter(area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch))
              .reduce((sum, area) => sum + (area.area || 0), 0) || 0;
              
            if (lowSlopeArea > 0) {
              const squaresNeeded = lowSlopeArea / 100;
              const squaresWithWaste = squaresNeeded * 1.1; // 10% waste
              
              // Add cap sheet first
              const capQuantity = Math.ceil(squaresWithWaste / 0.8);
              const mandatoryCap = {
                ...capMaterial,
                name: `${capMaterial.name} (Required for <= 2/12 pitch - cannot be removed)`
              };
              newMaterials["polyglass-polyflex-app"] = mandatoryCap;
              newQuantities["polyglass-polyflex-app"] = capQuantity;
              
              // Calculate base sheet as half of cap quantity, rounded up
              const baseQuantity = Math.ceil(capQuantity / 2);
              const mandatoryBase = {
                ...baseMaterial,
                name: `${baseMaterial.name} (Required for <= 2/12 pitch - cannot be removed)`
              };
              newMaterials["polyglass-elastoflex-sbs"] = mandatoryBase;
              newQuantities["polyglass-elastoflex-sbs"] = baseQuantity;
            }
          }
        }
        
        // Set the calculated materials and quantities
        setSelectedMaterials(newMaterials);
        setQuantities(newQuantities);
      } else {
        // No measurements available, just use the materials list without quantities
        toast({
          title: "Warning",
          description: "No measurements available. Materials added without quantities.",
          variant: "destructive"
        });
        
        // Use empty quantities or defaults
        setSelectedMaterials(templateMaterials);
        setQuantities(templateQuantities);
      }
    } else {
      // Standard template (not a predefined package)
      // Just use the materials and quantities stored in the template
      setSelectedMaterials(templateMaterials);
      setQuantities(templateQuantities);
    }
    
    // Force a complete re-render of the MaterialsSelectionTab by setting a timestamp
    setLastTemplateApplied(Date.now().toString());
    
    // If the template has labor rates, apply those too
    if (selectedTemplateData.labor_rates) {
      setLaborRates({...selectedTemplateData.labor_rates});
    }
    
    toast({
      title: "Template Applied",
      description: `${selectedTemplateData.name} has been applied to your estimate.`,
    });
  };

  // NEW FUNCTION: Open the template dialog in create/edit/copy mode
  const handleOpenTemplateDialog = (mode: 'create' | 'edit' | 'copy') => {
    setTemplateDialogMode(mode);
    
    if (mode === 'create') {
      // Initialize with empty template data for creation
      setTemplateFormData({
        name: '',
        description: '',
        is_default: false,
        saveAsNew: false,
        materials: {},
        quantities: {},
        usePresetPackage: false,
        presetPackageType: ''
      });
    } else if (mode === 'edit' && selectedTemplateData) {
      // Populate form with selected template data for editing
      setTemplateFormData({
        name: selectedTemplateData.name,
        description: selectedTemplateData.description || '',
        is_default: selectedTemplateData.is_default || false,
        saveAsNew: false,
        materials: selectedTemplateData.materials || {},
        quantities: selectedTemplateData.quantities || {},
        usePresetPackage: false,
        presetPackageType: ''
      });
    } else if (mode === 'copy' && selectedTemplateData) {
      // Populate form with selected template data for copying, but with different name
      setTemplateFormData({
        name: `Copy of ${selectedTemplateData.name}`,
        description: selectedTemplateData.description || '',
        is_default: false, // Copies are never default by default
        saveAsNew: false,
        materials: selectedTemplateData.materials || {},
        quantities: selectedTemplateData.quantities || {},
        usePresetPackage: false,
        presetPackageType: ''
      });
    }
    
    setIsTemplateDialogOpen(true);
  };
  
  // NEW FUNCTION: Handle saving the template
  const handleSaveTemplate = async () => {
    // Validate template data
    if (!templateFormData.name.trim()) {
      toast({
        title: "Missing Name",
        description: "Please provide a name for your template.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmittingTemplate(true);
    
    try {
      // Determine if we need to create or update based on the mode and form state
      const isCreating = templateDialogMode === 'create';
      const isCopying = templateDialogMode === 'copy';
      const isSavingAsNew = templateDialogMode === 'edit' && templateFormData.saveAsNew;
      
      // Prepare template data to save
      let templateToSave: Partial<PricingTemplate> = {
        name: templateFormData.name.trim(),
        description: templateFormData.description.trim(),
        is_default: templateFormData.is_default
      };
      
      // Handle predefined packages for new templates
      if (isCreating && templateFormData.usePresetPackage && templateFormData.presetPackageType) {
        // Create a template with predefined materials based on the package type
        let packageMaterialIds: string[] = [];
        
        if (templateFormData.presetPackageType === 'gaf-basic') {
          // GAF 1 Basic Package materials
          packageMaterialIds = [
            "gaf-timberline-hdz-sg",
            "gaf-seal-a-ridge",
            "gaf-prostart-starter-shingle-strip",
            "abc-pro-guard-20",
            "gaf-weatherwatch-ice-water-shield"
          ];
        } else if (templateFormData.presetPackageType === 'gaf-premium') {
          // Premium GAF materials
          packageMaterialIds = [
            "gaf-timberline-hdz-sg",
            "gaf-seal-a-ridge",
            "gaf-prostart-starter-shingle-strip",
            "gaf-feltbuster-synthetic-underlayment",
            "gaf-weatherwatch-ice-water-shield"
          ];
        }
        
        // Get material objects for each ID and create materials & quantities objects
        const materials: Record<string, Material> = {};
        const quantities: Record<string, number> = {};
        
        packageMaterialIds.forEach(id => {
          const material = ROOFING_MATERIALS.find(m => m.id === id);
          if (material) {
            materials[id] = material;
            quantities[id] = 1; // Set default quantity (will be recalculated when applied to an estimate)
          }
        });
        
        templateToSave.materials = materials;
        templateToSave.quantities = quantities;
      }
      else if (isCreating) {
        // Creating a new template from scratch - start with current materials if any
        templateToSave.materials = selectedMaterials;
        templateToSave.quantities = quantities;
      }
      else if (templateDialogMode === 'edit' || templateDialogMode === 'copy') {
        // Editing or copying should maintain existing materials
        if (selectedTemplateData) {
          templateToSave.materials = selectedTemplateData.materials;
          templateToSave.quantities = selectedTemplateData.quantities;
          
          if (selectedTemplateData.labor_rates) {
            templateToSave.labor_rates = selectedTemplateData.labor_rates;
          }
        }
      }
      
      // Execute the appropriate API call based on mode
      let result;
      
      if (isCopying || isSavingAsNew) {
        // Save as new
        result = await createPricingTemplate(templateToSave as PricingTemplate);
      } else {
        // Update existing - fix the function call with the proper parameters
        if (!selectedTemplateData?.id) {
          throw new Error("Missing template ID for update");
        }
        
        // Combine the template ID with the update data
        const templateWithId = {
          ...templateToSave,
          id: selectedTemplateData.id
        };
        
        result = await updatePricingTemplate(templateWithId as PricingTemplate);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Success - refresh templates list and update state
      const { data: refreshedTemplates, error: refreshError } = await getPricingTemplates();
      
      if (refreshError) {
        console.error("Error refreshing templates after save:", refreshError);
        // Continue anyway, as the save was successful
      }
      
      if (refreshedTemplates) {
        setTemplates(refreshedTemplates);
        
        // If we just created or updated the default template, select it
        if (templateFormData.is_default) {
          const newDefaultTemplate = refreshedTemplates.find(t => t.is_default);
          if (newDefaultTemplate) {
            setSelectedTemplateId(newDefaultTemplate.id);
            setSelectedTemplateData(newDefaultTemplate);
          }
        }
        // Otherwise if we just created a new template, select it
        else if (result.data) {
          setSelectedTemplateId(result.data.id);
          setSelectedTemplateData(result.data);
        }
      }
      
      // Close dialog and show success message
      setIsTemplateDialogOpen(false);
      toast({
        title: isCreating ? "Template Created" : "Template Updated",
        description: `The template "${templateFormData.name}" has been ${isCreating ? 'created' : 'updated'} successfully.`,
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: `Failed to save the template: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  // This is the live calculator using current component state
  const calculateLiveEstimateTotal = (): number => {
    if (!measurements || measurements.totalArea === undefined || measurements.totalArea === null || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch) /* || measurements.areasByPitch.length === 0 */ ) {
      // Allow areasByPitch to be empty if totalArea itself is 0 (e.g., before any measurements are loaded)
      // but if totalArea > 0, areasByPitch should ideally not be empty.
      // For now, primary check is if measurements or totalArea are missing.
      console.warn("CALCULATE_LIVE_TOTAL (Estimates.tsx): Called with null/incomplete measurements. Current measurements state:", JSON.stringify(measurements, null, 2));
      return 0; 
    }

    console.log("CALCULATE_LIVE_TOTAL (Estimates.tsx): Calling API with measurements:", JSON.stringify(measurements, null, 2));
    console.log("CALCULATE_LIVE_TOTAL (Estimates.tsx): Calling API with laborRates:", JSON.stringify(laborRates, null, 2));
    console.log("CALCULATE_LIVE_TOTAL (Estimates.tsx): Calling API with profitMargin:", profitMargin);
    console.log("CALCULATE_LIVE_TOTAL (Estimates.tsx): Calling API with selectedMaterials count:", Object.keys(selectedMaterials).length);


    let total = calculateEstimateTotalFromAPI(
      selectedMaterials, 
      quantities, 
      laborRates, 
      profitMargin, 
      measurements, 
      parseFloat(peelStickAddonCost) || 0
    );
    console.log("CALCULATE_LIVE_TOTAL (Estimates.tsx): Total received from API_CALC_TOTAL:", total);
    return total;
  };

  // Role-based helper functions
  const getRoleIcon = () => {
    switch (profile?.role) {
      case 'admin': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'manager': return <Info className="h-4 w-4 text-green-600" />;
      case 'rep': return <EyeOff className="h-4 w-4 text-orange-600" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (profile?.role) {
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'manager': return 'bg-green-100 text-green-800 border-green-300';
      case 'rep': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleDescription = () => {
    switch (profile?.role) {
      case 'admin':
        return {
          title: 'Administrator Access',
          description: 'Full access to all estimates and pricing modifications',
          restrictions: ['Can modify material prices', 'Can set any profit margin', 'Can view all territories']
        };
      case 'manager':
        return {
          title: 'Territory Manager Access',
          description: 'Territory-specific estimate management with pricing restrictions',
          restrictions: ['Material prices are locked', 'Minimum 30% profit margin', 'Territory-specific data only']
        };
      case 'rep':
        return {
          title: 'Sales Representative Access',
          description: 'Package-based estimation with automatic pricing',
          restrictions: ['Package-based pricing only', 'Fixed profit margins', 'Own estimates only']
        };
      default:
        return {
          title: 'User Access',
          description: 'Standard estimation access',
          restrictions: []
        };
    }
  };

  // Add role-based banner component
  const RoleBanner = () => {
    const roleInfo = getRoleDescription();
    
    return (
      <Card className={`border-2 ${getRoleBadgeColor().replace('bg-', 'border-').replace('text-', 'bg-').replace('100', '200')} mb-6`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getRoleIcon()}
              <div>
                <h3 className="font-semibold text-sm">{roleInfo.title}</h3>
                <p className="text-xs text-muted-foreground">{roleInfo.description}</p>
              </div>
            </div>
            <Badge className={getRoleBadgeColor()}>
              {profile?.role?.toUpperCase() || 'USER'}
            </Badge>
          </div>
          {roleInfo.restrictions.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium mb-1">Role Restrictions:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {roleInfo.restrictions.map((restriction, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-current rounded-full"></span>
                    {restriction}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
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
          
          {/* Role-based banner */}
          <RoleBanner />
          
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
                  defaultValue={isViewMode ? "summary" : "type-selection"}
                >
                  <TabsList className="grid grid-cols-6 mb-8">
                    {!isViewMode && (
                      <TabsTrigger value="type-selection" disabled={false}>
                        1. Estimate Type
                      </TabsTrigger>
                    )}
                    {!isViewMode && (
                      <TabsTrigger value="upload" disabled={!estimateType}>
                        2. Upload EagleView
                      </TabsTrigger>
                    )}
                    <TabsTrigger 
                      value="measurements" 
                      disabled={!isViewMode && !extractedPdfData && !measurements}
                    >
                      {isViewMode ? "Measurements" : "3. Enter Measurements"}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="materials" 
                      disabled={!isViewMode && !measurements}
                    >
                      {isViewMode ? "Materials" : "4. Select Materials"}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="pricing" 
                      disabled={!isViewMode && (!measurements || Object.keys(selectedMaterials).length === 0)}
                    >
                      {isViewMode ? "Labor & Profit" : "5. Labor & Profit"}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="summary" 
                      disabled={!isViewMode && (!measurements || Object.keys(selectedMaterials).length === 0)}
                    >
                      {isViewMode ? "Summary" : "6. Summary"}
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

                  {activeTab === 'type-selection' && (
                    <EstimateTypeSelector 
                      onSelectionComplete={handleEstimateTypeSelection}
                    />
                  )}

                  {activeTab === 'upload' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <PdfUploader onDataExtracted={handlePdfDataExtracted} savedFileName={pdfFileName} />
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-md border border-slate-200">
                          <h3 className="text-lg font-medium mb-3">Estimate Workflow</h3>
                          <p className="text-sm text-slate-600 mb-4">
                            Follow these steps to create a complete estimate
                          </p>
                          
                          {/* Show selected estimate type */}
                          {estimateType && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="font-medium text-blue-900 mb-1">Selected Estimate Type</h4>
                              <p className="text-sm text-blue-800">
                                {estimateType === 'roof_only' ? '🏠 Roof Shingles Only' : `🔧 Roof + ${selectedSubtrades.length} Subtrade(s)`}
                              </p>
                              {estimateType === 'with_subtrades' && selectedSubtrades.length > 0 && (
                                <p className="text-xs text-blue-700 mt-1">
                                  Subtrades: {selectedSubtrades.join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                          
                          <ol className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">✓</span>
                              <span>Estimate Type Selected - {estimateType === 'roof_only' ? 'Standard roofing' : 'Roof + subtrades'}</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                              <span>Upload EagleView PDF - Start by uploading a roof measurement report</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="bg-slate-300 text-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                              <span>Review Measurements - Verify or enter the roof measurements</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="bg-slate-300 text-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
                              <span>Select Materials - Choose roofing materials and options</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="bg-slate-300 text-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">5</span>
                              <span>Set Labor & Profit - Define labor rates and profit margin</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="bg-slate-300 text-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">6</span>
                              <span>Review Summary - Finalize and prepare for customer approval</span>
                            </li>
                          </ol>
                        </div>
                      </div>
                  )}
                  
                  {activeTab !== 'upload' && (
                    <>
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
                          <>
                            {/* UPDATED: Template Selector Card with Management Options */}
                            {!isViewMode && (
                              <Card className="mb-6">
                                <CardHeader>
                                  <CardTitle>Select Pricing Template</CardTitle>
                                  <CardDescription>Choose a pricing template to apply to this estimate</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="flex items-end gap-4">
                                    <div className="flex-1">
                                      <Label htmlFor="template-select" className="mb-2 block">Pricing Template</Label>
                                      <Select
                                        value={selectedTemplateId || undefined}
                                        onValueChange={setSelectedTemplateId}
                                        disabled={isLoadingTemplates || templates.length === 0}
                                      >
                                        <SelectTrigger id="template-select" className="w-full">
                                          <SelectValue placeholder="Select a template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {templates.map(template => (
                                            <SelectItem key={template.id} value={template.id}>
                                              {template.name} {template.is_default && "(Default)"}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    {/* Template Action Buttons */}
                                    <div className="flex gap-2">
                                      <Button 
                                        onClick={handleApplyTemplate} 
                                        disabled={!selectedTemplateId || isLoadingTemplates}
                                      >
                                        Apply Template
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => handleOpenTemplateDialog('edit')}
                                        disabled={!selectedTemplateId || isLoadingTemplates}
                                      >
                                        Edit
                                      </Button>
                                      <Button 
                                        variant="secondary" 
                                        onClick={() => handleOpenTemplateDialog('create')}
                                        disabled={isLoadingTemplates}
                                      >
                                        New Template
                                      </Button>
                                    </div>
                                  </div>
                                  {isLoadingTemplates && (
                                    <div className="flex items-center justify-center py-2">
                                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2"></div>
                                      <p className="text-sm text-muted-foreground">Loading template data...</p>
                                    </div>
                                  )}
                                  {selectedTemplateData && (
                                    <div className="text-sm text-muted-foreground">
                                      <p>Template: <span className="font-medium">{selectedTemplateData.name}</span></p>
                                      <p>Materials: {selectedTemplateData.materials ? Object.keys(selectedTemplateData.materials).length : 0} items</p>
                                      {selectedTemplateData.description && (
                                        <p>Description: {selectedTemplateData.description}</p>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                            
                            {/* MaterialsSelectionTab component remains the same */}
                            <MaterialsSelectionTab
                              key={`materials-tab-${lastTemplateApplied || selectedTemplateId || "no-template"}`}
                              measurements={measurements}
                              selectedMaterials={selectedMaterials}
                              quantities={quantities}
                              onMaterialsUpdate={handleMaterialsUpdate}
                              readOnly={isViewMode}
                            />
                          </>
                        );
                      }
                    })()}
                  </TabsContent>
                  
                  <TabsContent value="pricing">
                    <LaborProfitTab
                      key={`labor-profit-${activeTab === 'pricing' ? Date.now() : 'inactive'}`}
                      measurements={measurements!}
                      selectedMaterials={selectedMaterials}
                      quantities={quantities}
                      initialLaborRates={laborRates}
                      initialProfitMargin={profitMargin}
                      onLaborProfitContinue={handleLaborProfitContinue}
                      onBack={() => setActiveTab("materials")}
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
                      peelStickAddonCost={parseFloat(peelStickAddonCost) || 0}
                      onFinalizeEstimate={handleFinalizeEstimate} 
                      isSubmitting={isSubmittingFinal} 
                      estimate={estimateData} 
                      isReviewMode={isViewMode}
                      calculateLiveTotal={calculateLiveEstimateTotal}
                      onEstimateUpdated={() => { 
                        fetchEstimatesData(); 
                        if (estimateId) { 
                          fetchEstimateData(estimateId);
                        }
                      }}
                    />
                  </TabsContent>
                    </>
                  )}
                </Tabs>
              )}

              {/* Add Continue buttons at the bottom of each tab */}
              <div className="flex justify-between mt-8">
                {activeTab !== "type-selection" && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const tabOrder = ["type-selection", "upload", "measurements", "materials", "pricing", "summary"];
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
                      const tabOrder = ["type-selection", "upload", "measurements", "materials", "pricing", "summary"];
                      const currentIndex = tabOrder.indexOf(activeTab);

                      if (currentIndex < tabOrder.length - 1) {
                        const nextTab = tabOrder[currentIndex + 1];
                        
                        // Validations before navigating FROM a specific tab
                        if (activeTab === 'type-selection') {
                          if (!estimateType) {
                            toast({ 
                              title: "No Estimate Type Selected", 
                              description: "Please select an estimate type to continue.",
                              variant: "destructive"
                            });
                            return; 
                          }
                        }
                        
                        if (activeTab === 'materials') {
                          if (Object.keys(selectedMaterials).length === 0) {
                            toast({ 
                              title: "No Materials Selected", 
                              description: "Please select at least one material to continue to Labor & Profit.",
                              variant: "destructive"
                            });
                            return; 
                          }
                          if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch) || measurements.areasByPitch.length === 0) {
                            toast({
                              title: "Missing Measurements Data",
                              description: "Cannot proceed to Labor & Profit without valid pitch information from measurements.",
                              variant: "destructive"
                            });
                            return; 
                          }
                        }
                        
                        if (activeTab === 'pricing') {
                           // Validation before leaving pricing tab to go to summary
                           if (!laborRates || (!laborRates.laborRate && !laborRates.tearOff && !laborRates.installation)) {
                            toast({
                                title: "Missing Labor Rates",
                                description: "Please ensure valid labor rates are set before proceeding to summary.",
                                variant: "destructive"
                            });
                            return;
                           }
                           // Ensure latest labor/profit are synced before moving to summary
                           if (handleLaborProfitContinue) {
                               handleLaborProfitContinue(laborRates, profitMargin);
                           }
                        }

                        console.log(`Main Continue button: Navigating from ${activeTab} to ${nextTab}`);
                        setActiveTab(nextTab);
                      }
                    }}
                    disabled={ // Review and adjust disabled logic as needed
                      (activeTab === "type-selection" && !estimateType) ||
                      (activeTab === "upload" && !extractedPdfData) ||
                      (activeTab === "measurements" && !measurements) ||
                      (activeTab === "materials" && Object.keys(selectedMaterials).length === 0) ||
                      (activeTab === "pricing" && (!laborRates || (!laborRates.laborRate && !laborRates.tearOff && !laborRates.installation)))
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

      {/* Template Editor/Creator Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {templateDialogMode === 'create' ? 'Create New Template' : 
              templateDialogMode === 'edit' ? 'Edit Template' : 'Save Template As...'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateFormData.name} 
                onChange={(e) => setTemplateFormData({...templateFormData, name: e.target.value})}
                placeholder="e.g., ABC Shingle Template"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description (Optional)</Label>
              <Input
                id="templateDescription"
                value={templateFormData.description} 
                onChange={(e) => setTemplateFormData({...templateFormData, description: e.target.value})}
                placeholder="e.g., Standard package with GAF materials"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isDefault" 
                checked={templateFormData.is_default}
                onCheckedChange={(checked) => 
                  setTemplateFormData({...templateFormData, is_default: !!checked})
                }
              />
              <Label htmlFor="isDefault">
                Set as default template for new estimates
              </Label>
            </div>
            
            {templateDialogMode === 'create' && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="usePresetPackage" 
                    checked={templateFormData.usePresetPackage}
                    onCheckedChange={(checked) => 
                      setTemplateFormData({...templateFormData, usePresetPackage: !!checked})
                    }
                  />
                  <Label htmlFor="usePresetPackage">
                    Create from predefined package
                  </Label>
                </div>
                
                {templateFormData.usePresetPackage && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="presetPackageType">Select Package Type</Label>
                    <Select 
                      value={templateFormData.presetPackageType} 
                      onValueChange={(value) => setTemplateFormData({
                        ...templateFormData, 
                        presetPackageType: value,
                        name: value === 'gaf-basic' ? 'GAF 1 Basic Package' : 
                              value === 'gaf-premium' ? 'Premium GAF materials with enhanced protection' : 
                              templateFormData.name
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a predefined package" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gaf-basic">GAF 1 Basic Package</SelectItem>
                        <SelectItem value="gaf-premium">Premium GAF materials with enhanced protection</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecting a predefined package will auto-populate standard materials.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {templateDialogMode === 'edit' && (
              <div className="border-t pt-4">
                <p className="text-sm">
                  <strong>Current Materials:</strong> {Object.keys(selectedTemplateData?.materials || {}).length || 0} items
                </p>
                <p className="text-xs text-muted-foreground">
                  Changes to this template will apply to any new estimates created using it.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplate} 
              disabled={isSubmittingTemplate || !templateFormData.name.trim()}
            >
              {isSubmittingTemplate ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Estimates;
