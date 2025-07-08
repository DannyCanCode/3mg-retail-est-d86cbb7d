import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, RefreshCw, ArrowLeft, Loader2, Shield, Info, EyeOff } from "lucide-react";

import { SimplifiedReviewTab } from "@/components/estimates/measurement/SimplifiedReviewTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialsSelectionTab } from "@/components/estimates/materials/MaterialsSelectionTab";
import { MeasurementValues, AreaByPitch } from "@/components/estimates/measurement/types";
import { Material } from "@/components/estimates/materials/types";
import { useToast } from "@/hooks/use-toast";
import { LaborProfitTab, LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { EstimateSummaryTab } from "@/components/estimates/pricing/EstimateSummaryTab";
import { ParsedMeasurements } from "@/api/measurements";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAutoSave, useEstimateId } from "@/hooks/useAutoSave";
import { useLocalStorageMigration } from "@/hooks/useLocalStorageMigration";
import { isFeatureEnabled } from "@/utils/feature-flags";
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
import { trackEvent, trackEstimateCreated } from "@/lib/posthog";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

// Convert from ParsedMeasurements to MeasurementValues
const convertToMeasurementValues = (parsedDataRaw: any): MeasurementValues => {
  // Allow both direct ParsedMeasurements and the wrapper { measurements, parsedMeasurements }
  const parsedData: ParsedMeasurements | null = parsedDataRaw?.parsedMeasurements ?? parsedDataRaw ?? null;
  console.log("🔄 [CORRUPTION FIX] Converting PDF data to measurement values");
  console.log("🔄 [CORRUPTION FIX] Input data:", parsedData);
  
  // Handle null/undefined data safely
  if (!parsedData) {
    console.warn("⚠️ [CORRUPTION FIX] parsedData is null or undefined, returning default measurement values");
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
  
  console.log("🔄 [CORRUPTION FIX] Raw areasByPitch data:", parsedData.areasByPitch);
  console.log("🔄 [CORRUPTION FIX] Type check - Is array:", Array.isArray(parsedData.areasByPitch));
  
  // CRITICAL FIX: Process the areas by pitch data safely - preserve original format
  let areasByPitch: any[] = [];
  
  if (parsedData.areasByPitch) {
    if (Array.isArray(parsedData.areasByPitch)) {
      // Data is already in correct array format - preserve it exactly
      console.log("✅ [CORRUPTION FIX] areasByPitch is already in correct array format, preserving as-is");
      areasByPitch = parsedData.areasByPitch.map(pitchData => ({
        pitch: pitchData.pitch, // Preserve original pitch format exactly
        area: typeof pitchData.area === 'number' ? pitchData.area : 0,
        percentage: pitchData.percentage || 
          (parsedData.totalArea > 0 ? (pitchData.area / parsedData.totalArea) * 100 : 0)
      })).filter(item => item.area > 0);
    } else if (typeof parsedData.areasByPitch === 'object' && !Array.isArray(parsedData.areasByPitch)) {
      // Data is in TRUE object format (not array) - convert carefully without corrupting pitch values
      console.log("🔄 [CORRUPTION FIX] Converting TRUE object format to array format safely");
      areasByPitch = Object.entries(parsedData.areasByPitch).map(([pitch, areaValue]) => {
        const area = typeof areaValue === 'number' ? areaValue : 
                    (typeof areaValue === 'object' && areaValue !== null ? (areaValue as any).area : 0);
        const percentage = typeof areaValue === 'object' && areaValue !== null ? 
                          (areaValue as any).percentage : 
                          (parsedData.totalArea > 0 ? (area / parsedData.totalArea) * 100 : 0);
        
        return {
          pitch: pitch, // Preserve original pitch format exactly
          area: area,
          percentage: percentage
        };
      }).filter(item => item.area > 0);
    } else {
      console.warn("🚫 [CORRUPTION FIX] Unexpected areasByPitch format:", typeof parsedData.areasByPitch, parsedData.areasByPitch);
      areasByPitch = [];
    }
  }

  console.log("✅ [CORRUPTION FIX] Final processed areasByPitch:", areasByPitch);
  
  // Return complete measurement values with preserved pitch data
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
  
  // Admin edit mode detection
  const isAdminEditMode = searchParams.get("adminEdit") === "true";
  const originalCreator = searchParams.get("originalCreator");
  const originalCreatorRole = searchParams.get("originalCreatorRole");
  
  const { profile, user } = useAuth();
  
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
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
    permitRate: 450,        // ✅ Fixed to match Orlando default
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
    includeSkylights2x2: false,    // ✅ Added missing fields
    skylights2x2Count: 0,
    skylights2x2Rate: 280,
    includeSkylights2x4: false,
    skylights2x4Count: 0,
    skylights2x4Rate: 370,
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
  // FORCE CLEAR CORRUPTED MEASUREMENTS DATA - DO NOT USE LOCALSTORAGE FOR MEASUREMENTS
  const [storedMeasurements, setStoredMeasurements] = useState<MeasurementValues | null>(null);
  
  // 🚨 EMERGENCY FIX: Clear corrupted PDF URL from localStorage on mount
  useEffect(() => {
    const storedPdfUrl = localStorage.getItem("estimatePdfUrl");
    if (storedPdfUrl === "null" || storedPdfUrl === "undefined") {
      console.log("🧹 [EMERGENCY] Clearing corrupted PDF URL from localStorage");
      localStorage.removeItem("estimatePdfUrl");
    }
  }, []);
  
  // AUTOMATIC CORRUPTION DETECTION AND CLEANUP - No user action required
  useEffect(() => {
    const detectAndCleanCorruptedData = () => {
      console.log("🔍 Running automatic corruption detection...");
      
      // List of all localStorage keys that might contain corrupted data
      const keysToCheck = [
        "estimateMeasurements",
        "3mg_stored_measurements", 
        "estimateExtractedPdfData"
      ];
      
      let corruptionDetected = false;
      
      keysToCheck.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            
            // Check for pitch corruption in measurements
            if (parsed?.areasByPitch) {
              if (Array.isArray(parsed.areasByPitch)) {
                // Check if any pitch looks like array indices
                const hasCorruptedPitches = parsed.areasByPitch.some((item: any) => {
                  const pitch = item.pitch;
                  // Detect corruption: pure numbers like "0", "1", "2" without "/" or ":"
                  return pitch && /^\d+$/.test(pitch) && !pitch.includes('/') && !pitch.includes(':');
                });
                
                if (hasCorruptedPitches) {
                  console.log(`❌ CORRUPTION DETECTED in ${key}:`, parsed.areasByPitch);
                  localStorage.removeItem(key);
                  corruptionDetected = true;
                }
              }
            }
            
            // Check for other corruption patterns in extracted PDF data
            if (key === "estimateExtractedPdfData" && parsed?.areasByPitch) {
              if (Array.isArray(parsed.areasByPitch)) {
                const hasCorruptedPitches = parsed.areasByPitch.some((item: any) => {
                  return item.pitch && /^\d+$/.test(item.pitch);
                });
                
                if (hasCorruptedPitches) {
                  console.log(`❌ CORRUPTION DETECTED in PDF data:`, parsed.areasByPitch);
                  localStorage.removeItem(key);
                  corruptionDetected = true;
                }
              }
            }
          }
        } catch (error) {
          // If we can't parse the data, it's corrupted - remove it
          console.log(`❌ PARSE ERROR in ${key}, removing:`, error);
          localStorage.removeItem(key);
          corruptionDetected = true;
        }
      });
      
      if (corruptionDetected) {
        console.log("🧹 AUTOMATIC CLEANUP: Corrupted data detected and removed");
        // Show user-friendly notification
        setTimeout(() => {
          toast({
            title: "🔧 Data Restored",
            description: "We detected and fixed some corrupted data from your previous session.",
            duration: 3000,
          });
        }, 1000);
      } else {
        console.log("✅ No corruption detected - localStorage is clean");
      }
    };
    
    // Run corruption detection on component mount
    detectAndCleanCorruptedData();
  }, [toast]);

  const [storedFileName, setStoredFileName] = useLocalStorage<string>("estimatePdfFileName", "");
  const [storedPdfUrl, setStoredPdfUrl] = useLocalStorage<string | null>("estimatePdfUrl", null);
  
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
    permitRate: 450,        // ✅ FIXED: 550 → 450
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
    includeSkylights2x2: false,    // ✅ ADDED: Missing skylight fields
    skylights2x2Count: 0,
    skylights2x2Rate: 280,
    includeSkylights2x4: false,
    skylights2x4Count: 0,
    skylights2x4Rate: 370,
    includeLowSlopeLabor: true,
    includeSteepSlopeLabor: true,
  });
  const [storedProfitMargin, setStoredProfitMargin] = useLocalStorage<number>("estimateProfitMargin", 25);
  const [storedEstimateType, setStoredEstimateType] = useLocalStorage<'roof_only' | 'with_subtrades' | null>("estimateType", null);
  const [storedSelectedSubtrades, setStoredSelectedSubtrades] = useLocalStorage<string[]>("estimateSelectedSubtrades", []);
  const [storedActiveTab, setStoredActiveTab] = useLocalStorage<string>("estimateActiveTab", "type-selection");
  const [storedPeelStickCost, setStoredPeelStickCost] = useLocalStorage<string>("estimatePeelStickCost", "0.00");
  
  // PHASE 2.5: AUTO-SAVE INTEGRATION - Gradual migration from localStorage to server storage
  const [autoSaveEstimateId, setAutoSaveEstimateId] = useState(() => crypto.randomUUID()); // Generate UUID for this estimate
  const [isStartingFresh, setIsStartingFresh] = useState(false); // Track when we're in "Start Fresh" mode
  const stableEstimateIdRef = useRef(autoSaveEstimateId);
  
  // PHASE 4: LOCALSTORAGE CLEANUP MIGRATION
  const migration = useLocalStorageMigration();

  // PHASE 4: AUTO-MIGRATION ON MOUNT
  useEffect(() => {
    // Auto-run migration after a short delay to ensure auto-save system is initialized
    const migrationTimer = setTimeout(() => {
      if (isFeatureEnabled('AUTO_SAVE_ENABLED') && !migration.isComplete && !migration.isInProgress) {
        console.log('🔄 [AUTO-MIGRATION] Starting automatic localStorage cleanup...');
        migration.startMigration();
      }
    }, 2000); // 2 second delay to ensure auto-save is ready

    return () => clearTimeout(migrationTimer);
  }, [migration]); // Stable reference to prevent loops
  
  // 🔧 STABILITY FIX: Prevent estimate ID changes during normal workflow to avoid auto-save conflicts
  useEffect(() => {
    if (stableEstimateIdRef.current !== autoSaveEstimateId) {
      // Only allow ID changes when we're intentionally starting fresh
      if (isStartingFresh) {
        console.log("🔄 [ESTIMATE ID] Start Fresh: Changed from", stableEstimateIdRef.current, "to", autoSaveEstimateId);
      stableEstimateIdRef.current = autoSaveEstimateId;
      } else {
        // 🛑 PREVENT UNINTENTIONAL ID CHANGES: Block estimate ID changes during normal workflow
        console.log("🛑 [ESTIMATE ID] Blocked unintentional change during workflow. Keeping:", stableEstimateIdRef.current);
        // Reset the state back to the stable ID to prevent conflicts
        setAutoSaveEstimateId(stableEstimateIdRef.current);
    }
    }
  }, [autoSaveEstimateId, isStartingFresh]);
  
  // Auto-save hook for critical data (replaces localStorage for major objects)
  const autoSaveData = useMemo(() => {
    if (!isFeatureEnabled('AUTO_SAVE_ENABLED') || isStartingFresh) {
      return null;
    }
    
    return {
      id: stableEstimateIdRef.current, // Use stable ref instead of state
      extractedPdfData: extractedPdfData,
      pdfFileName: pdfFileName,
      pdfUrl: pdfUrl,  // Include PDF URL in auto-save
      selectedMaterials: selectedMaterials,
      quantities: quantities,
      laborRates: laborRates,
      profitMargin: profitMargin,
      estimateType: estimateType,
      selectedSubtrades: selectedSubtrades,
      activeTab: activeTab,
      peelStickCost: peelStickAddonCost,
      version: 1,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }, [
    // Remove autoSaveEstimateId from dependencies to prevent loops
    extractedPdfData,
    pdfFileName, 
    selectedMaterials,
    quantities,
    laborRates,
    profitMargin,
    estimateType,
    selectedSubtrades,
    activeTab,
    peelStickAddonCost,
    isStartingFresh,
    pdfUrl
  ]);
  
  const {
    status: autoSaveStatus,
    lastSaved: autoSaveLastSaved,
    isDirty: autoSaveIsDirty,
    isLeader: autoSaveIsLeader,
    hydratedData: autoSaveHydratedData,
    isHydrating: autoSaveIsHydrating,
    save: autoSaveManualSave,
    flush: autoSaveFlush,
    error: autoSaveError
  } = useAutoSave(
    !isViewMode && !isStartingFresh ? stableEstimateIdRef.current : null, // Use stable ref to prevent ID changes from causing re-initialization
    !isViewMode && !isStartingFresh ? autoSaveData : null,
    {
      debounceMs: 10000,        // 10 second debounce
      maxDeferralMs: 60000,     // Force save after 60 seconds
      enableOfflineQueue: true,
      enableConflictResolution: true
    }
  );
  
  // PHASE 2: Smart State Management - Recovery tracking and conflict prevention
  const [isRecoveringState, setIsRecoveringState] = useState(false);
  const [hasRecoveredData, setHasRecoveredData] = useState(false);
  const [stateRecoveryAttempts, setStateRecoveryAttempts] = useState(0);
  const [userWantsFreshStart, setUserWantsFreshStart] = useState(false); // NEW: Prevent recovery when user wants fresh start
  const isInternalStateChange = useRef(false); // Prevent save loops during recovery
  const lastRecoveryTimestamp = useRef<number>(0);
  const [recoveryStats, setRecoveryStats] = useState({
    materialsRecovered: false,
    quantitiesRecovered: false,
    laborRatesRecovered: false,
    tabPositionRecovered: false,
    estimateTypeRecovered: false
  });
  
  // AUTO-SAVE HYDRATION: Load saved data from Supabase and populate form
  const [hasHydratedFromAutoSave, setHasHydratedFromAutoSave] = useState(false);
  
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
  // FIXED: Territory Managers should be able to edit existing estimates
  useEffect(() => {
    if (estimateId) {
      // Only set view mode for non-managers and non-admins, or when explicitly in admin edit mode
      const canEditEstimates = profile?.role === 'admin' || profile?.role === 'manager' || isAdminEditMode;
      setIsViewMode(!canEditEstimates);
      fetchEstimateData(estimateId);
    } else {
      setIsViewMode(false);
      // For a new estimate, ensure we start clean - BUT DELAY TO AVOID RACE CONDITIONS
      // and don't load from localStorage unless specified by a measurementId
      if (!measurementId) {
        // 🔧 CRITICAL FIX: Delay fresh start check to allow localStorage values to be read first
        setTimeout(() => {
          // 🔧 COMPREHENSIVE DATA CHECK: Include localStorage data AND React state
          const hasSignificantData = extractedPdfData || pdfFileName || 
            Object.keys(selectedMaterials).length > 0 || 
            Object.keys(quantities).length > 0 ||
            estimateType ||
            storedPdfData || // ✅ CHECK STORED DATA TOO
            (storedSelectedMaterials && Object.keys(storedSelectedMaterials).length > 0) ||
            (storedQuantities && Object.keys(storedQuantities).length > 0) ||
            storedEstimateType ||
            (storedActiveTab && storedActiveTab !== "type-selection");
          
          // Only trigger Start Fresh if NO data exists anywhere AND we haven't recovered yet
          if (!hasSignificantData && activeTab === "type-selection" && !hasRecoveredData) {
            console.log("NEW ESTIMATE: Starting fresh workflow - no existing data");
        setUserWantsFreshStart(true);
        setActiveTab("type-selection");
        setStoredActiveTab("type-selection");
        setHasRecoveredData(true); // Mark as recovered to prevent further attempts
        
        // Clear localStorage data for fresh start
        setTimeout(() => {
          setStoredSelectedMaterials({});
          setStoredQuantities({});
          setStoredPeelStickCost("0.00");
          setStoredEstimateType(null);
          setStoredSelectedSubtrades([]);
          
          // Reset fresh start flag after component stabilizes
          setUserWantsFreshStart(false);
        }, 100);
          } else if (hasSignificantData) {
            console.log("NEW ESTIMATE: User has existing data - preserving current workflow state");
            // Don't force type-selection if user is in middle of estimate workflow
      }
        }, 100); // 100ms delay to allow localStorage to be read first
    }
    }
  }, [estimateId, measurementId, hasRecoveredData]);
  
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
  
  // PHASE 2: Smart Recovery Logic with Validation and Conflict Prevention
  useEffect(() => {
    // Skip recovery if in view mode, already recovering/recovered, OR user wants fresh start, OR during internal state changes
    if (isViewMode || isRecoveringState || hasRecoveredData || userWantsFreshStart || isInternalStateChange.current) return;
    
    // 🔧 CRITICAL FIX: Skip recovery if no user profile (prevents cross-user contamination)
    if (!profile?.id) {
      console.log("⏭️ [RECOVERY] Skipping recovery - no user profile available");
      return;
    }
    
    // 🔧 SMART RECOVERY FIX: Only skip recovery if user explicitly wants fresh start OR no significant data exists
    // Don't skip recovery just because it's a new estimate - users may have uploaded PDFs that need recovery
    if (!estimateId && !measurementId && userWantsFreshStart) {
      console.log("⏭️ [RECOVERY] Skipping recovery - user explicitly wants fresh start");
      console.log("⏭️ [RECOVERY] Current estimate context:", {
        urlEstimateId: estimateId,
        urlMeasurementId: measurementId, 
        inMemoryEstimateId: stableEstimateIdRef.current,
        userWantsFreshStart
      });
      return;
    }
    
    // Prevent excessive recovery attempts
    const now = Date.now();
    if (stateRecoveryAttempts >= 3 || (now - lastRecoveryTimestamp.current) < 1000) {
      return;
    }
    
    // Check if we have significant localStorage data to recover
    const hasSignificantData = storedPdfData || 
      (storedSelectedMaterials && Object.keys(storedSelectedMaterials).length > 0) ||
      (storedQuantities && Object.keys(storedQuantities).length > 0) ||
      (storedLaborRates && storedLaborRates.laborRate !== 85) ||
      (storedEstimateType) ||
      (storedActiveTab && storedActiveTab !== "type-selection");
    
    if (!hasSignificantData) return;
    
    // Begin smart recovery process
    setIsRecoveringState(true);
    setStateRecoveryAttempts(prev => prev + 1);
    lastRecoveryTimestamp.current = now;
    isInternalStateChange.current = true;
    
    console.log("🔄 PHASE 2: Starting smart state recovery...");
    
    const recoveryResults = {
      materialsRecovered: false,
      quantitiesRecovered: false,
      laborRatesRecovered: false,
      tabPositionRecovered: false,
      estimateTypeRecovered: false
    };
    
    // Recovery Phase 1: Basic PDF & Measurement Data
      if (storedPdfData && !extractedPdfData) {
        setExtractedPdfData(storedPdfData);
      console.log("✅ Recovered PDF data:", storedPdfData.propertyAddress || 'Unknown address');
        console.log("🔧 [BACKUP RECOVERY] localStorage recovery successful - Supabase hydration not available or failed");
      }
      
      // DISABLED MEASUREMENTS RECOVERY: Causing pitch data corruption
      // The fresh PDF parsing works perfectly - don't override it with localStorage
      if (storedMeasurements && !measurements) {
        console.log("🚫 DISABLED measurements recovery to prevent pitch corruption");
        // Clear any stored measurements to prevent future corruption
        setStoredMeasurements(null);
      }
      
      if (storedFileName && !pdfFileName) {
        setPdfFileName(storedFileName);
      console.log("✅ Recovered filename:", storedFileName);
    }
      
      if (storedPdfUrl && !pdfUrl) {
        setPdfUrl(storedPdfUrl);
        console.log("✅ Recovered PDF URL:", storedPdfUrl.substring(0, 50) + "...");
      }
    
    // Recovery Phase 2: Advanced Estimate Data with Validation
    if (storedSelectedMaterials && Object.keys(storedSelectedMaterials).length > 0 && Object.keys(selectedMaterials).length === 0) {
             // Validate material data integrity
       const validMaterials = Object.fromEntries(
         Object.entries(storedSelectedMaterials).filter(([key, material]) => 
           material && material.name && typeof material.price === 'number'
         )
       );
      
      if (Object.keys(validMaterials).length > 0) {
        setSelectedMaterials(validMaterials);
        recoveryResults.materialsRecovered = true;
        console.log("✅ Recovered", Object.keys(validMaterials).length, "materials");
      }
    }
    
    if (storedQuantities && Object.keys(storedQuantities).length > 0 && Object.keys(quantities).length === 0) {
      // Validate quantities are positive numbers
      const validQuantities = Object.fromEntries(
        Object.entries(storedQuantities).filter(([key, qty]) => 
          typeof qty === 'number' && qty > 0 && !isNaN(qty)
        )
      );
      
      if (Object.keys(validQuantities).length > 0) {
        setQuantities(validQuantities);
        recoveryResults.quantitiesRecovered = true;
        console.log("✅ Recovered quantities for", Object.keys(validQuantities).length, "materials");
      }
    }
    
    if (storedLaborRates && Object.keys(storedLaborRates).length > 0 && !hasLaborRatesChanges(laborRates)) {
      // Validate labor rates are reasonable numbers
      const isValidLaborRate = storedLaborRates.laborRate > 0 && storedLaborRates.laborRate < 500;
      if (isValidLaborRate) {
        setLaborRates(storedLaborRates);
        recoveryResults.laborRatesRecovered = true;
        console.log("✅ Recovered labor rates and sub-field changes");
      }
    }
    
    if (storedProfitMargin && storedProfitMargin !== 25 && profitMargin === 25) {
      const isValidMargin = storedProfitMargin >= 0 && storedProfitMargin <= 100;
      if (isValidMargin) {
        setProfitMargin(storedProfitMargin);
        console.log("✅ Recovered profit margin:", storedProfitMargin + "%");
      }
    }
    
    if (storedEstimateType && !estimateType) {
      const validTypes = ['roof_only', 'with_subtrades'];
      if (validTypes.includes(storedEstimateType)) {
        setEstimateType(storedEstimateType);
        recoveryResults.estimateTypeRecovered = true;
        console.log("✅ Recovered estimate type:", storedEstimateType);
      }
    }
    
    if (storedSelectedSubtrades && storedSelectedSubtrades.length > 0 && selectedSubtrades.length === 0) {
      setSelectedSubtrades(storedSelectedSubtrades);
      console.log("✅ Recovered", storedSelectedSubtrades.length, "subtrades");
    }
    
    // Recovery Phase 3: UI State (Tab Position)
    if (storedActiveTab && storedActiveTab !== "type-selection" && activeTab === "type-selection") {
      const validTabs = ["type-selection", "upload", "measurements", "materials", "pricing", "summary"];
      if (validTabs.includes(storedActiveTab)) {
        setActiveTab(storedActiveTab);
        recoveryResults.tabPositionRecovered = true;
        console.log("✅ Recovered tab position:", storedActiveTab);
      }
    }
    
    if (storedPeelStickCost && storedPeelStickCost !== "0.00" && peelStickAddonCost === "0.00") {
      const cost = parseFloat(storedPeelStickCost);
      if (!isNaN(cost) && cost >= 0) {
        setPeelStickAddonCost(storedPeelStickCost);
        console.log("✅ Recovered peel stick cost:", storedPeelStickCost);
      }
    }
    
    // Finalize recovery process
    setTimeout(() => {
      setRecoveryStats(recoveryResults);
      setIsRecoveringState(false);
      setHasRecoveredData(true);
      isInternalStateChange.current = false;
      
      // Show recovery toast if significant data was recovered
      const recoveredCount = Object.values(recoveryResults).filter(Boolean).length;
      if (recoveredCount > 0) {
        toast({
          title: "📋 Estimate Data Recovered",
          description: `Successfully restored ${recoveredCount} sections from your previous session.`,
          duration: 4000,
        });
      }
      
      console.log("🎯 PHASE 2: Recovery complete!", recoveryResults);
    }, 100);
    
    }, [isViewMode, isRecoveringState, hasRecoveredData, userWantsFreshStart, stateRecoveryAttempts, estimateId, measurementId, profile, storedPdfData, storedMeasurements, storedFileName, storedSelectedMaterials, storedQuantities, storedLaborRates, storedProfitMargin, storedEstimateType, storedSelectedSubtrades, storedActiveTab, storedPeelStickCost, extractedPdfData, measurements, pdfFileName, selectedMaterials, quantities, laborRates, profitMargin, estimateType, selectedSubtrades, activeTab, peelStickAddonCost]);
  
  // CORRUPTION PREVENTION: Validate data before auto-saving
  const validateAndSave = <T,>(data: T, setter: (data: T) => void, dataType: string): boolean => {
    // Special validation for measurements
    if (dataType === 'measurements' && data) {
      const measurements = data as any;
      if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
        const hasCorruption = measurements.areasByPitch.some((item: any) => {
          const pitch = item.pitch;
          return pitch && /^\d+$/.test(pitch) && !pitch.includes('/') && !pitch.includes(':');
        });
        
        if (hasCorruption) {
          console.error(`❌ BLOCKED corrupted ${dataType} from auto-save:`, measurements.areasByPitch);
          return false;
        }
      }
    }
    
    setter(data);
    console.log(`💾 Auto-saved ${dataType}:`, typeof data === 'object' ? Object.keys(data as any).length : data);
    return true;
  };

  // PHASE 2: Smart Auto-Save Effects - Prevent save loops during recovery
  const lastLoggedMaterialsCount = useRef<number>(0);
  const lastLoggedQuantitiesCount = useRef<number>(0);
  
  useEffect(() => {
    // Don't save during recovery, view mode, or when user wants fresh start
    if (!isViewMode && !isInternalStateChange.current && !isRecoveringState && !userWantsFreshStart && Object.keys(selectedMaterials).length > 0) {
      validateAndSave(selectedMaterials, setStoredSelectedMaterials, 'materials');
      
      // Only log when count changes to reduce console spam
      const count = Object.keys(selectedMaterials).length;
      if (count !== lastLoggedMaterialsCount.current) {
        console.log("💾 Auto-saved materials:", count);
        lastLoggedMaterialsCount.current = count;
      }
    }
  }, [selectedMaterials, isViewMode, isRecoveringState, setStoredSelectedMaterials]);

  useEffect(() => {
    if (!isViewMode && !isInternalStateChange.current && !isRecoveringState && !userWantsFreshStart && Object.keys(quantities).length > 0) {
      setStoredQuantities(quantities);
      
      // Only log when count changes to reduce console spam
      const count = Object.keys(quantities).length;
      if (count !== lastLoggedQuantitiesCount.current) {
        console.log("💾 Auto-saved quantities for", count, "materials");
        lastLoggedQuantitiesCount.current = count;
      }
    }
  }, [quantities, isViewMode, isRecoveringState, setStoredQuantities]);

  // Helper function to detect if labor rates have meaningful changes from defaults
  const hasLaborRatesChanges = useCallback((rates: LaborRates): boolean => {
    const defaults = {
      laborRate: 85,
      tearOff: 0,
      installation: 0,
      isHandload: false,
      handloadRate: 15,
      dumpsterLocation: "orlando",
      dumpsterCount: 1,
      dumpsterRate: 400,
      includePermits: true,  // ✅ MISSING FIELD!
      permitRate: 450,       // ✅ MISSING FIELD!
      permitCount: 1,
      permitAdditionalRate: 450,  // ✅ MISSING FIELD!
      wastePercentage: 12,        // ✅ MISSING FIELD!
      includeGutters: false,
      gutterLinearFeet: 0,
      gutterRate: 8,              // ✅ MISSING FIELD!
      includeDownspouts: false,
      downspoutCount: 0,
      downspoutRate: 75,          // ✅ MISSING FIELD!
      includeDetachResetGutters: false,
      detachResetGutterLinearFeet: 0,
      detachResetGutterRate: 1,   // ✅ MISSING FIELD!
      includeSkylights2x2: false,
      skylights2x2Count: 0,
      skylights2x2Rate: 280,      // ✅ MISSING FIELD!
      includeSkylights2x4: false,
      skylights2x4Count: 0,
      skylights2x4Rate: 370,      // ✅ MISSING FIELD!
      includeLowSlopeLabor: true,
      includeSteepSlopeLabor: true
    };

    return (
      rates.laborRate !== defaults.laborRate ||
      rates.tearOff !== defaults.tearOff ||
      rates.installation !== defaults.installation ||
      rates.isHandload !== defaults.isHandload ||
      rates.handloadRate !== defaults.handloadRate ||
      rates.dumpsterLocation !== defaults.dumpsterLocation ||
      rates.dumpsterCount !== defaults.dumpsterCount ||
      rates.dumpsterRate !== defaults.dumpsterRate ||
      rates.includePermits !== defaults.includePermits ||  // ✅ NOW CHECKING!
      rates.permitRate !== defaults.permitRate ||          // ✅ NOW CHECKING!
      rates.permitCount !== defaults.permitCount ||
      rates.permitAdditionalRate !== defaults.permitAdditionalRate ||  // ✅ NOW CHECKING!
      rates.wastePercentage !== defaults.wastePercentage ||             // ✅ NOW CHECKING!
      rates.includeGutters !== defaults.includeGutters ||
      rates.gutterLinearFeet !== defaults.gutterLinearFeet ||
      rates.gutterRate !== defaults.gutterRate ||                       // ✅ NOW CHECKING!
      rates.includeDownspouts !== defaults.includeDownspouts ||
      rates.downspoutCount !== defaults.downspoutCount ||
      rates.downspoutRate !== defaults.downspoutRate ||                 // ✅ NOW CHECKING!
      rates.includeDetachResetGutters !== defaults.includeDetachResetGutters ||
      rates.detachResetGutterLinearFeet !== defaults.detachResetGutterLinearFeet ||
      rates.detachResetGutterRate !== defaults.detachResetGutterRate ||  // ✅ NOW CHECKING!
      rates.includeSkylights2x2 !== defaults.includeSkylights2x2 ||
      rates.skylights2x2Count !== defaults.skylights2x2Count ||
      rates.skylights2x2Rate !== defaults.skylights2x2Rate ||           // ✅ NOW CHECKING!
      rates.includeSkylights2x4 !== defaults.includeSkylights2x4 ||
      rates.skylights2x4Count !== defaults.skylights2x4Count ||
      rates.skylights2x4Rate !== defaults.skylights2x4Rate ||           // ✅ NOW CHECKING!
      rates.includeLowSlopeLabor !== defaults.includeLowSlopeLabor ||
      rates.includeSteepSlopeLabor !== defaults.includeSteepSlopeLabor ||
      Object.keys(rates.pitchRates || {}).length > 0
    );
  }, []);

  useEffect(() => {
    if (!isViewMode && !isInternalStateChange.current && !isRecoveringState && !userWantsFreshStart && laborRates && hasLaborRatesChanges(laborRates)) {
      setStoredLaborRates(laborRates);
      console.log("💾 Auto-saved labor rates with changes detected");
    }
  }, [laborRates, isViewMode, isRecoveringState, setStoredLaborRates, hasLaborRatesChanges]);

  useEffect(() => {
    if (!isViewMode && !isInternalStateChange.current && !isRecoveringState && !userWantsFreshStart && profitMargin !== 25) {
      setStoredProfitMargin(profitMargin);
      console.log("💾 Auto-saved profit margin:", profitMargin + "%");
    }
  }, [profitMargin, isViewMode, isRecoveringState, setStoredProfitMargin]);

  // Prevent duplicate estimate type saves
  const lastSavedEstimateType = useRef<string>("");
  
  useEffect(() => {
    if (!isViewMode && !isInternalStateChange.current && !isRecoveringState && !userWantsFreshStart && estimateType && estimateType !== lastSavedEstimateType.current) {
      setStoredEstimateType(estimateType);
      lastSavedEstimateType.current = estimateType;
      console.log("💾 Auto-saved estimate type:", estimateType);
    }
  }, [estimateType, isViewMode, isRecoveringState, setStoredEstimateType]);

  useEffect(() => {
    if (!isViewMode && !isInternalStateChange.current && !isRecoveringState && !userWantsFreshStart && selectedSubtrades.length > 0) {
      setStoredSelectedSubtrades(selectedSubtrades);
      console.log("💾 Auto-saved", selectedSubtrades.length, "subtrades");
    }
  }, [selectedSubtrades, isViewMode, isRecoveringState, setStoredSelectedSubtrades]);

  // Prevent duplicate tab position saves and prevent saving default tabs during mount
  const lastSavedTab = useRef<string>("");
  const hasComponentMounted = useRef(false);
  
  useEffect(() => {
    // Mark as mounted after a short delay to allow recovery logic to run first
    const mountTimer = setTimeout(() => {
      hasComponentMounted.current = true;
    }, 1000);
    
    return () => clearTimeout(mountTimer);
  }, []);
  
  useEffect(() => {
    // CRITICAL FIX: Don't save tab position until component has fully mounted and recovery is complete
    const shouldSaveTab = !isViewMode && 
                         !isInternalStateChange.current && 
                         !isRecoveringState && 
                         !userWantsFreshStart && 
                         hasComponentMounted.current && // NEW: Prevent saving during initial mount
                         activeTab !== "upload" && 
                         activeTab !== "type-selection" && // NEW: Don't save default tab
                         activeTab !== lastSavedTab.current;
    
    if (shouldSaveTab) {
      setStoredActiveTab(activeTab);
      lastSavedTab.current = activeTab;
      console.log("💾 Auto-saved tab position:", activeTab);
    } else if (!hasComponentMounted.current && activeTab === "type-selection") {
      console.log("🚫 Skipped saving default tab during mount:", activeTab);
    }
  }, [activeTab, isViewMode, isRecoveringState, setStoredActiveTab]);

  useEffect(() => {
    if (!isViewMode && !isInternalStateChange.current && !isRecoveringState && !userWantsFreshStart && peelStickAddonCost !== "0.00") {
      setStoredPeelStickCost(peelStickAddonCost);
      console.log("💾 Auto-saved peel stick cost:", peelStickAddonCost);
    }
  }, [peelStickAddonCost, isViewMode, isRecoveringState, setStoredPeelStickCost]);



  // Ensure measurements are properly set from extracted PDF data
  useEffect(() => {
    // If we have extracted PDF data, convert it to MeasurementValues format
    if (extractedPdfData) {
      console.log("🆕 Setting fresh measurements from extracted PDF data:", extractedPdfData);
      
      // CRITICAL: Force clear any potential localStorage corruption first
      localStorage.removeItem("estimateMeasurements");
      localStorage.removeItem("3mg_stored_measurements");
      
      const convertedMeasurements = convertToMeasurementValues(extractedPdfData);
      console.log("🆕 Fresh converted measurements:", convertedMeasurements);
      console.log("🆕 Pitch data check:", convertedMeasurements.areasByPitch);
      
      // ENHANCED VALIDATION: Check for corruption patterns
      if (convertedMeasurements.areasByPitch && convertedMeasurements.areasByPitch.length > 0) {
        // Check for corruption: pure numeric indices without pitch format
        const corruptedPitches = convertedMeasurements.areasByPitch.filter(p => 
          p.pitch && /^\d+$/.test(p.pitch) && !p.pitch.includes('/') && !p.pitch.includes(':')
        );
        
        if (corruptedPitches.length > 0) {
          console.error("❌ CORRUPTION DETECTED - Array indices as pitches:", corruptedPitches);
          toast({
            title: "Data Corruption Prevented",
            description: "Corrupted pitch data was detected and blocked. Please re-upload your PDF.",
            variant: "destructive"
          });
          return; // Don't set corrupted measurements
        }
        
        // Check if pitches look valid (contain '/' or ':' or are valid pitch formats)
        const validPitches = convertedMeasurements.areasByPitch.every(p => 
          p.pitch && (p.pitch.includes('/') || p.pitch.includes(':') || /^\d+(\.\d+)?$/.test(p.pitch))
        );
        
        if (validPitches) {
          console.log("✅ Pitch data validated - setting measurements");
          setMeasurements(convertedMeasurements);
        } else {
          console.error("❌ Invalid pitch data detected:", convertedMeasurements.areasByPitch);
          toast({
            title: "Invalid Pitch Data",
            description: "The pitch data format is invalid. Please check your PDF and try again.",
            variant: "destructive"
          });
          return; // Don't set invalid measurements
        }
      } else {
        console.warn("⚠️ No areas by pitch data found");
        setMeasurements(convertedMeasurements);
      }
      
      // Store PDF data only
      setStoredPdfData(extractedPdfData);
    }
    
    // If we have a measurementId, fetch the data
    if (measurementId) {
      console.log("Fetching measurements for ID:", measurementId);
      // TODO: Implement fetching data from storage
    }
  }, [extractedPdfData, measurementId]);

  // 🔍 DEBUG: Log PDF props when measurements tab is active
  useEffect(() => {
    if (activeTab === "measurements") {
      console.log("🔍 [Estimates] PDF Debug - Measurements tab active:", {
        pdfFileName: pdfFileName || "NULL",
        pdfUrl: pdfUrl || "NULL", 
        pdfUrlType: typeof pdfUrl,
        extractedPdfData: !!extractedPdfData ? "EXISTS" : "NULL",
        storedPdfUrl: localStorage.getItem("estimatePdfUrl") || "NULL"
      });
    }
  }, [activeTab, pdfFileName, pdfUrl, extractedPdfData]);

  // Save fileName changes to localStorage
  useEffect(() => {
    if (pdfFileName && !userWantsFreshStart) {
      setStoredFileName(pdfFileName);
    }
  }, [pdfFileName, userWantsFreshStart]);

  // Save PDF URL changes to localStorage
  useEffect(() => {
    if (pdfUrl && !userWantsFreshStart) {
      setStoredPdfUrl(pdfUrl);
    }
  }, [pdfUrl, userWantsFreshStart]);

  // 🔄 AUTO-SAVE HYDRATION: Load saved data from Supabase and populate form
  useEffect(() => {
    // Additional safety: Only hydrate if the hydrated data matches our current stable estimate ID
    const isValidHydration = autoSaveHydratedData?.id === stableEstimateIdRef.current;
    
    // 🔧 HYDRATION ORDERING: Log current state to verify proper ordering
    if (autoSaveHydratedData && !hasHydratedFromAutoSave) {
      console.log("🔄 [HYDRATION ORDER CHECK]", {
        hasHydratedData: !!autoSaveHydratedData,
        hasExtractedPdf: !!extractedPdfData,
        hasPdfFileName: !!pdfFileName,
        isValidHydration,
        userWantsFreshStart,
        isStartingFresh
      });
    }
    
    if (autoSaveHydratedData && !hasHydratedFromAutoSave && !isViewMode && !userWantsFreshStart && !isStartingFresh && !isInternalStateChange.current && isValidHydration) {
      console.log("🔄 [AUTO-SAVE HYDRATION] Loading saved data from Supabase:", autoSaveHydratedData);
      
      // Hydrate PDF and measurement data
      if (autoSaveHydratedData.extractedPdfData && !extractedPdfData) {
        setExtractedPdfData(autoSaveHydratedData.extractedPdfData);
        console.log("✅ [HYDRATION] Restored PDF data with roof pitch:", autoSaveHydratedData.extractedPdfData.predominantPitch);
        console.log("🔧 [BACKUP RECOVERY] Supabase hydration successful - localStorage backup not needed");
      }
      
      if (autoSaveHydratedData.pdfFileName && !pdfFileName) {
        setPdfFileName(autoSaveHydratedData.pdfFileName);
        console.log("✅ [HYDRATION] Restored PDF filename:", autoSaveHydratedData.pdfFileName);
      }
      
      if ((autoSaveHydratedData as any).pdfUrl && !pdfUrl) {
        setPdfUrl((autoSaveHydratedData as any).pdfUrl);
        console.log("✅ [HYDRATION] Restored PDF URL:", (autoSaveHydratedData as any).pdfUrl.substring(0, 50) + "...");
      }
      
      // Hydrate materials and quantities
      if (autoSaveHydratedData.selectedMaterials && Object.keys(autoSaveHydratedData.selectedMaterials).length > 0 && Object.keys(selectedMaterials).length === 0) {
        setSelectedMaterials(autoSaveHydratedData.selectedMaterials);
        console.log("✅ [HYDRATION] Restored", Object.keys(autoSaveHydratedData.selectedMaterials).length, "materials");
      }
      
      if (autoSaveHydratedData.quantities && Object.keys(autoSaveHydratedData.quantities).length > 0 && Object.keys(quantities).length === 0) {
        setQuantities(autoSaveHydratedData.quantities);
        console.log("✅ [HYDRATION] Restored quantities for", Object.keys(autoSaveHydratedData.quantities).length, "materials");
      }
      
      // Hydrate labor rates and profit margin
      if (autoSaveHydratedData.laborRates && !hasLaborRatesChanges(laborRates)) {
        setLaborRates(autoSaveHydratedData.laborRates);
        console.log("✅ [HYDRATION] Restored labor rates and sub-field changes from auto-save");
      }
      
      if (autoSaveHydratedData.profitMargin && profitMargin === 25) {
        setProfitMargin(autoSaveHydratedData.profitMargin);
        console.log("✅ [HYDRATION] Restored profit margin:", autoSaveHydratedData.profitMargin + "%");
      }
      
      // Hydrate estimate type and subtrades
      if (autoSaveHydratedData.estimateType && !estimateType) {
        setEstimateType(autoSaveHydratedData.estimateType);
        console.log("✅ [HYDRATION] Restored estimate type:", autoSaveHydratedData.estimateType);
      }
      
      if (autoSaveHydratedData.selectedSubtrades && autoSaveHydratedData.selectedSubtrades.length > 0 && selectedSubtrades.length === 0) {
        setSelectedSubtrades(autoSaveHydratedData.selectedSubtrades);
        console.log("✅ [HYDRATION] Restored", autoSaveHydratedData.selectedSubtrades.length, "subtrades");
      }
      
      // Hydrate UI state
      if (autoSaveHydratedData.activeTab && activeTab === "type-selection") {
        setActiveTab(autoSaveHydratedData.activeTab);
        console.log("✅ [HYDRATION] Restored tab position:", autoSaveHydratedData.activeTab);
      }
      
      if (autoSaveHydratedData.peelStickCost && peelStickAddonCost === "0.00") {
        setPeelStickAddonCost(autoSaveHydratedData.peelStickCost);
        console.log("✅ [HYDRATION] Restored peel stick cost:", autoSaveHydratedData.peelStickCost);
      }
      
      setHasHydratedFromAutoSave(true);
      
      toast({
        title: "🔄 Estimate Restored",
        description: "Your previous work has been restored from the database.",
        duration: 4000,
      });
      
      console.log("✅ [AUTO-SAVE HYDRATION] Form state successfully hydrated from Supabase");
    }
  }, [
    autoSaveHydratedData, 
    hasHydratedFromAutoSave, 
    isViewMode, 
    userWantsFreshStart,
    isStartingFresh,
    extractedPdfData,
    pdfFileName,
    selectedMaterials,
    quantities,
    laborRates,
    profitMargin,
    estimateType,
    selectedSubtrades,
    activeTab,
    peelStickAddonCost,
    toast
  ]);

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
            // If it's a TRUE object (not array) with pitch keys, convert to array
            else if (typeof data.measurements.areasByPitch === 'object' && !Array.isArray(data.measurements.areasByPitch)) {
              console.log("🔄 [FETCHMEASUREMENTS] Converting TRUE object to array format");
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
            } else {
              console.warn("🚫 [FETCHMEASUREMENTS] Unexpected areasByPitch format:", typeof data.measurements.areasByPitch, Array.isArray(data.measurements.areasByPitch));
              areasByPitchArray = [];
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

  const handlePdfDataExtracted = (data: ParsedMeasurements | null, fileName: string, fileUrl?: string | null) => {
    console.log("PDF data extracted:", data, fileName, fileUrl);
    
    // VALIDATION: Ensure extracted data is not corrupted before proceeding
    if (data?.areasByPitch && Array.isArray(data.areasByPitch)) {
      const hasCorruptedPitches = data.areasByPitch.some((item: any) => {
        const pitch = item.pitch;
        return pitch && /^\d+$/.test(pitch) && !pitch.includes('/') && !pitch.includes(':');
      });
      
      if (hasCorruptedPitches) {
        console.error("❌ CORRUPTED DATA detected in fresh PDF extraction:", data.areasByPitch);
        toast({
          title: "Data Corruption Detected",
          description: "The PDF extraction resulted in corrupted pitch data. Please try uploading again.",
          variant: "destructive"
        });
        return;
      }
    }
    
    // CRITICAL FIX: Mark this as fresh PDF data to prevent recovery conflicts
    const freshDataTimestamp = Date.now();
    setUserWantsFreshStart(false);
    
    setExtractedPdfData(data);
    setPdfFileName(fileName);
    setPdfUrl(fileUrl || null);  // Store the PDF URL
    
    if (!data) {
      toast({
        title: "Error",
        description: "Failed to extract data from PDF",
        variant: "destructive"
      });
      return;
    }
    
    // Track PDF upload in PostHog
    trackEvent('pdf_uploaded', {
      file_name: fileName,
      property_address: data.propertyAddress || "unknown",
      total_area: data.totalArea || 0,
      user_role: profile?.role || "unknown",
      creator_name: profile?.full_name || user?.email || "unknown",
      timestamp: new Date().toISOString()
    });
    
    // Force immediate conversion to ensure measurements are available
    const convertedMeasurements = convertToMeasurementValues(data);
    
    // CRITICAL FIX: Add timestamp to prevent old data recovery
    const freshMeasurementsWithTimestamp = {
      ...convertedMeasurements,
      _freshDataTimestamp: freshDataTimestamp,
      _dataSource: 'fresh_pdf_upload'
    };
    
    // Set state FIRST before localStorage to establish priority
    setMeasurements(convertedMeasurements);
    
    // CRITICAL FIX: Clear old localStorage data before storing fresh data
    console.log("🧹 Clearing old localStorage measurements to prevent conflicts");
    localStorage.removeItem("estimateMeasurements");
    localStorage.removeItem("estimateExtractedPdfData");
    
    // 🔧 IMMEDIATE SAVE FIX: Save PDF data to localStorage immediately to prevent loss on navigation
      setStoredPdfData(data);
      setStoredFileName(fileName);
    setStoredPdfUrl(fileUrl || null);  // Store PDF URL in localStorage
      // DISABLED: setStoredMeasurements(freshMeasurementsWithTimestamp); // Causes pitch corruption
      
    // 🔧 RAPID NAVIGATION PROTECTION: Use beforeunload to ensure persistence even on immediate navigation
    const handleBeforeUnload = () => {
      // Emergency backup save using synchronous localStorage (already done above)
      localStorage.setItem("estimateExtractedPdfData", JSON.stringify(data));
      localStorage.setItem("estimatePdfFileName", fileName);
      if (fileUrl) {
        localStorage.setItem("estimatePdfUrl", fileUrl);
      }
      console.log("🚨 Emergency PDF data save on page unload");
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clean up the listener after a short delay
    setTimeout(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }, 5000); // Remove after 5 seconds
    
    // 🔧 AUTO-SAVE MEASUREMENTS: Immediately save the extracted measurements (no user interaction required)
    console.log("🔄 [AUTO-SAVE MEASUREMENTS] Automatically saving extracted measurements");
    setMeasurements(freshMeasurementsWithTimestamp);
    
    // Mark as recovered to prevent interference with fresh data
      setHasRecoveredData(true);
    
    // 🔧 AUTO-NAVIGATION: Automatically navigate to simplified measurements review
    setActiveTab("measurements");
    
    console.log("🆕 Fresh PDF data and measurements auto-saved immediately - navigating to measurements review");
    
    // Calculate areaDisplay *after* conversion, using the reliable converted value
    const areaDisplay = convertedMeasurements.totalArea && !isNaN(convertedMeasurements.totalArea) && convertedMeasurements.totalArea > 0 
      ? convertedMeasurements.totalArea.toFixed(1) 
      : 'unknown';
    
    // Inform the user data was extracted and saved successfully
    toast({
      title: "Measurements extracted & saved",
      description: `Successfully parsed ${fileName} with ${areaDisplay} sq ft. Measurements auto-saved.`,
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
    console.log("🔄 Measurements saved from SimplifiedReviewTab:", savedMeasurements);
    
    // Simply update measurements state - navigation is now handled by SimplifiedReviewTab
    setMeasurements(savedMeasurements);
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
    
    // Get creator information from current user profile
    const creatorName = profile?.full_name || user?.email || "Unknown Creator";
    const creatorRole = profile?.role || "rep";
    
    // Check if we're editing an existing estimate
    const isEditingExisting = estimateId && estimateData;
    
    if (isEditingExisting) {
      console.log('🔄 [ESTIMATE UPDATE] Updating existing estimate:', estimateId);
      // Track estimate update in PostHog
      trackEvent('estimate_updated', {
        estimate_id: estimateId,
        creator_name: creatorName,
        creator_role: creatorRole,
        customer_address: measurements.propertyAddress || "Address not provided",
        total_price: liveTotal,
        material_count: Object.keys(selectedMaterials).length,
        roof_area: measurements.totalArea,
        estimate_type: estimateType,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('✨ [ESTIMATE CREATE] Creating new estimate');
    // Track estimate creation in PostHog
    trackEstimateCreated({
      territory: profile?.territory_id || "unknown",
      packageType: estimateType || "roof_only",
      estimateValue: liveTotal,
      userRole: creatorRole
    });
    
    // Track additional estimate details
    trackEvent('estimate_finalized', {
      creator_name: creatorName,
      creator_role: creatorRole,
      customer_address: measurements.propertyAddress || "Address not provided",
      total_price: liveTotal,
      material_count: Object.keys(selectedMaterials).length,
      roof_area: measurements.totalArea,
      estimate_type: estimateType,
      timestamp: new Date().toISOString()
    });
    }
    
    const estimatePayload: any = { // Use 'any' type to allow additional fields
      // Include ID for existing estimates to ensure update instead of create
      ...(isEditingExisting && { id: estimateId }),
      customer_address: measurements.propertyAddress || "Address not provided",
      total_price: liveTotal, // Use the live calculated total
      materials: selectedMaterials,
      quantities: quantities,
      labor_rates: laborRates,
      profit_margin: profitMargin,
      measurements: measurements,
      peel_stick_addon_cost: parseFloat(peelStickAddonCost) || 0,
      // Add creator information for dashboard display
      creator_name: creatorName,
      creator_role: creatorRole,
      created_by: profile?.id,
      // Add role-based fields for proper filtering (will be handled by database if columns exist)
      ...(profile?.territory_id && { territory_id: profile.territory_id }),
      ...(estimateType && { estimate_type: estimateType }),
      ...(selectedSubtrades.length > 0 && { selected_subtrades: selectedSubtrades }),
      // For existing estimates, preserve original status unless we want to change it
      ...(isEditingExisting && estimateData && { status: estimateData.status }),
      // status will be set to 'pending' by the saveEstimate API if it's a new record
    };
    
    console.log(`${isEditingExisting ? 'Updating existing' : 'Finalizing new'} estimate with payload:`, estimatePayload);
    saveEstimate(estimatePayload) // Ensure saveEstimate is called with ONE argument
      .then(({ data, error }) => {
        setIsSubmittingFinal(false);
        
        if (error) {
          // Log the detailed error
          console.error("Error saving estimate:", error);
          console.error("Error message:", error.message);
          
          // Show a more specific error message if possible
          let errorMessage = `Failed to ${isEditingExisting ? 'update' : 'save'} estimate. Please try again.`;
          
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
        console.log(`Estimate ${isEditingExisting ? 'updated' : 'saved'} successfully:`, data);
        
        if (isEditingExisting) {
          // For existing estimates, show update message and refresh the estimate data
          toast({
            title: "Estimate Updated",
            description: "Your estimate changes have been saved successfully.",
          });
          
          // Refresh the estimate data to show updated values
          if (estimateId) {
            fetchEstimateData(estimateId);
          }
          
          // Navigate back to view mode after a short delay
          setTimeout(() => {
            setIsViewMode(true);
          }, 1000);
        } else {
          // For new estimates, show creation message and navigate to dashboard
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
        }
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
  // 🔧 COMPREHENSIVE CLEAR FUNCTION: Clear all data sources
  const clearAllEstimateData = () => {
    console.log("🧹 [START FRESH] Clearing all localStorage and state data");
    
    // Clear all localStorage keys used by estimates
    const estimateKeys = [
      "estimateExtractedPdfData",
      "estimatePdfFileName", 
      "estimateSelectedMaterials",
      "estimateQuantities",
      "estimateLaborRates",
      "estimateProfitMargin",
      "estimateType",
      "estimateSelectedSubtrades",
      "estimateActiveTab",
      "estimatePeelStickCost"
    ];
    
    estimateKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ [START FRESH] Cleared ${key}`);
    });
    
    // Reset all state
    setExtractedPdfData(null);
    setPdfFileName(null);
    setPdfUrl(null);  // Clear PDF URL
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
      permitRate: 450,        // ✅ Fixed to match Orlando default
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
      includeSkylights2x2: false,    // ✅ Added missing fields
      skylights2x2Count: 0,
      skylights2x2Rate: 280,
      includeSkylights2x4: false,
      skylights2x4Count: 0,
      skylights2x4Rate: 370,
      includeLowSlopeLabor: true,
      includeSteepSlopeLabor: true,
    });
    setProfitMargin(25);
    setEstimateType(null);
    setSelectedSubtrades([]);
    setActiveTab("type-selection");
    setPeelStickAddonCost("0.00");
  };

  const handleClearEstimate = async () => {
    // PREVENT RECOVERY: Set flag to block recovery when user explicitly wants fresh start
    setUserWantsFreshStart(true);
    setIsStartingFresh(true); // Disable auto-save during fresh start
    
    // Flush any pending auto-save operations before clearing
    try {
      if (autoSaveFlush) {
        await autoSaveFlush();
      }
    } catch (error) {
      console.warn("⚠️ [START FRESH] Could not flush auto-save operations:", error);
    }
    
    // 🔧 FIXED: Clear auto-save data from Supabase to prevent re-hydration
    try {
      // Import and use storage adapter directly to delete auto-save data
      const { SupabaseStorageAdapter } = await import('@/adapters/SupabaseStorageAdapter');
      const storageAdapter = new SupabaseStorageAdapter();
      const estimateKey = `estimate:${stableEstimateIdRef.current}` as const;
      await storageAdapter.delete(estimateKey as any);
      console.log("🧹 [START FRESH] Auto-save data cleared from Supabase");
    } catch (error) {
      console.warn("⚠️ [START FRESH] Could not clear auto-save data:", error);
    }
    
    // 🆕 GENERATE NEW ESTIMATE ID: Ensure completely fresh auto-save session (batch state updates)
    const newEstimateId = crypto.randomUUID();
    console.log("🧹 [START FRESH] Generated new estimate ID:", newEstimateId);
    
    // Batch state updates to prevent multiple re-renders
    React.startTransition(() => {
      setAutoSaveEstimateId(newEstimateId);
    });
    
    // Reset hydration flag to allow fresh hydration with new ID
    setHasHydratedFromAutoSave(false);
    
    // PHASE 2: Reset recovery state flags FIRST to prevent recovery during clear
    setIsRecoveringState(false);
    setHasRecoveredData(true); // Mark as "already recovered" to prevent future recovery
    setStateRecoveryAttempts(0);
    lastRecoveryTimestamp.current = 0;
    isInternalStateChange.current = true; // Block auto-save during clearing
    setRecoveryStats({
      materialsRecovered: false,
      quantitiesRecovered: false,
      laborRatesRecovered: false,
      tabPositionRecovered: false,
      estimateTypeRecovered: false
    });
    
    // Clear localStorage FIRST, then state variables to avoid triggering recovery
    const defaultLaborRates: LaborRates = {
      laborRate: 85,
      tearOff: 0,
      installation: 0,
      isHandload: false,
      handloadRate: 15,
      dumpsterLocation: "orlando" as const,
      dumpsterCount: 1,
      dumpsterRate: 400,
      includePermits: true,
      permitRate: 450,        // ✅ Fixed to match Orlando default
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
      includeSkylights2x2: false,    // ✅ Added missing fields
      skylights2x2Count: 0,
      skylights2x2Rate: 280,
      includeSkylights2x4: false,
      skylights2x4Count: 0,
      skylights2x4Rate: 370,
      includeLowSlopeLabor: true,
      includeSteepSlopeLabor: true,
    };
    
    // FORCE CLEAR: Remove all localStorage keys directly to prevent any residual data
    console.log("🧹 [START FRESH] Clearing all localStorage keys");
    localStorage.removeItem("estimateExtractedPdfData");
    localStorage.removeItem("estimatePdfFileName");
    localStorage.removeItem("estimatePdfUrl");  // Clear PDF URL
    localStorage.removeItem("estimateSelectedMaterials");
    localStorage.removeItem("estimateQuantities");
    localStorage.removeItem("estimateLaborRates");
    localStorage.removeItem("estimateProfitMargin");
    localStorage.removeItem("estimateType");
    localStorage.removeItem("estimateSelectedSubtrades");
    localStorage.removeItem("estimateActiveTab");
    localStorage.removeItem("estimatePeelStickCost");
    localStorage.removeItem("estimateMeasurements");
    localStorage.removeItem("3mg_stored_measurements");
    
    // Clear ALL localStorage values using setters (double protection)
    setStoredPdfData(null);
    setStoredMeasurements(null);
    setStoredFileName("");
    setStoredPdfUrl(null);  // Clear stored PDF URL
    setStoredSelectedMaterials({});
    setStoredQuantities({});
    setStoredLaborRates(defaultLaborRates);
    setStoredProfitMargin(25);
    setStoredEstimateType(null);
    setStoredSelectedSubtrades([]);
    setStoredActiveTab("upload");
    setStoredPeelStickCost("0.00");
    
    // THEN clear state variables
    setActiveTab("upload");
    setExtractedPdfData(null);
    setPdfFileName(null);
    setPdfUrl(null);  // Clear PDF URL
    setMeasurements(null);
    setSelectedMaterials({});
    setQuantities({});
    setLaborRates(defaultLaborRates);
    setProfitMargin(25);
    setEstimateType(null);
    setSelectedSubtrades([]);
    setPeelStickAddonCost("0.00");
    
    // Clear any URL parameters and navigate to clean estimates page
    navigate("/estimates", { replace: true });
    
    toast({
      title: "🧹 Started Fresh",
      description: "All estimate data and recovery state has been cleared.",
    });
    
    // RESET FLAGS: Allow recovery again for future sessions (after a longer delay)
    setTimeout(() => {
      setUserWantsFreshStart(false);
      setIsStartingFresh(false); // Re-enable auto-save
      isInternalStateChange.current = false;
      console.log("🧹 [START FRESH] Reset complete - fresh start mode disabled");
    }, 2000); // Increased delay to ensure complete clearing
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
                    if (import.meta.env.DEV) {
                    console.log(`Tab changing from ${activeTab} to ${value}`);
                    }
                    
                    // CRITICAL FIX: Prevent white screen during tab switching
                    // Use requestAnimationFrame to ensure smooth transition
                    requestAnimationFrame(() => {
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
                      
                      // Batch state updates to prevent multiple renders
                      requestAnimationFrame(() => {
                        setActiveTab(value);
                        // Update stored tab for persistence
                        if (!isViewMode) {
                          setStoredActiveTab(value);
                        }
                        if (import.meta.env.DEV) {
                        console.log(`Tab changed, activeTab is now ${value}`);
                        }
                      });
                    });
                  }} 
                  className="w-full"
                  defaultValue={isViewMode ? "summary" : "type-selection"}
                >
                  <TabsList className="grid grid-cols-6 mb-8">
                    {!isViewMode && (
                      <TabsTrigger 
                        id="tab-trigger-type-selection"
                        value="type-selection" 
                        disabled={false}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        1. Estimate Type
                      </TabsTrigger>
                    )}
                    {!isViewMode && (
                      <TabsTrigger 
                        id="tab-trigger-upload"
                        value="upload" 
                        disabled={!estimateType}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        2. Upload EagleView
                      </TabsTrigger>
                    )}
                    <TabsTrigger 
                      id="tab-trigger-measurements"
                      value="measurements" 
                      disabled={!isViewMode && !extractedPdfData && !measurements}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {isViewMode ? "Measurements" : "3. Review Measurements"}
                    </TabsTrigger>
                    <TabsTrigger 
                      id="tab-trigger-materials"
                      value="materials" 
                      disabled={!isViewMode && !measurements}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {isViewMode ? "Materials" : "4. Select Materials"}
                    </TabsTrigger>
                    <TabsTrigger 
                      id="tab-trigger-pricing"
                      value="pricing" 
                      disabled={!isViewMode && (!measurements || Object.keys(selectedMaterials).length === 0)}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {isViewMode ? "Labor & Profit" : "5. Labor & Profit"}
                    </TabsTrigger>
                    <TabsTrigger 
                      id="tab-trigger-summary"
                      value="summary" 
                      disabled={!isViewMode && (!measurements || Object.keys(selectedMaterials).length === 0)}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
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
                      
                      <details className="mt-2">
                        <summary>localStorage Migration Status</summary>
                        <div className="mt-2 space-y-1">
                          <p>Migration Complete: {migration.isComplete ? '✅' : '❌'}</p>
                          <p>In Progress: {migration.isInProgress ? '🔄' : '💤'}</p>
                          {migration.report && (
                            <>
                              <p>Total Keys: {migration.report.totalKeys}</p>
                              <p>Redundant Keys: {migration.report.redundantKeys.length}</p>
                              <p>Legacy Keys: {migration.report.legacyKeys.length}</p>
                              <p>Auto-Save Keys: {migration.report.autoSaveKeys.length}</p>
                              <p>Total Size: {Math.round(migration.report.totalSize / 1024)}KB</p>
                            </>
                          )}
                          {migration.result && (
                            <>
                              <p>Migrated: {migration.result.migratedKeys.length}</p>
                              <p>Removed: {migration.result.removedKeys.length}</p>
                              <p>Space Freed: {Math.round(migration.result.totalSizeFreed / 1024)}KB</p>
                            </>
                          )}
                          {migration.error && (
                            <p className="text-red-600">Error: {migration.error}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <button 
                              onClick={migration.generateReport}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
                            >
                              Refresh Report
                            </button>
                            <button 
                              onClick={migration.startMigration}
                              disabled={migration.isInProgress}
                              className="px-2 py-1 bg-green-500 text-white text-xs rounded disabled:opacity-50"
                            >
                              Run Migration
                            </button>
                            <button 
                              onClick={migration.forceClean}
                              disabled={migration.isInProgress}
                              className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50"
                            >
                              Force Clean
                            </button>
                          </div>
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
                              <span>Review Measurements - Auto-saved measurements from your PDF</span>
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
                    <SimplifiedReviewTab
                      measurements={measurements || {
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
                        predominantPitch: "",
                        ridgeCount: 0,
                        hipCount: 0,
                        valleyCount: 0,
                        rakeCount: 0,
                        eaveCount: 0,
                        propertyAddress: "",
                        latitude: "",
                        longitude: "",
                        areasByPitch: []
                      }}
                      onMeasurementsUpdate={handleMeasurementsSaved}
                      onBack={() => setActiveTab("upload")}
                      onContinue={() => setActiveTab("materials")}
                      extractedFileName={pdfFileName || undefined}
                      pdfUrl={pdfUrl}
                    />
                  </TabsContent>
                  
                  <TabsContent value="materials">
                    {(() => {
                      // Memoize measurements check to prevent excessive re-renders
                      const hasMeasurements = measurements && measurements.areasByPitch && Array.isArray(measurements.areasByPitch);
                      
                      if (!hasMeasurements) {
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
                            
                            {/* MaterialsSelectionTab component with optimized props */}
                            <MaterialsSelectionTab
                              key={`materials-tab-${lastTemplateApplied || selectedTemplateId || "no-template"}`}
                              measurements={measurements}
                              selectedMaterials={selectedMaterials}
                              quantities={quantities}
                              onMaterialsUpdate={handleMaterialsUpdate}
                              readOnly={isViewMode}
                              isAdminEditMode={isAdminEditMode}
                              originalCreator={originalCreator}
                              originalCreatorRole={originalCreatorRole}
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
                      isAdminEditMode={isAdminEditMode}
                      originalCreator={originalCreator}
                      originalCreatorRole={originalCreatorRole}
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
                      onBack={() => setActiveTab("pricing")}
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

                        if (import.meta.env.DEV) {
                        console.log(`Main Continue button: Navigating from ${activeTab} to ${nextTab}`);
                        }
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
                    <RadioGroupItem value="Retail" id="estimates-sold-r1" />
                    <Label htmlFor="estimates-sold-r1">Retail</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Insurance" id="estimates-sold-r2" />
                    <Label htmlFor="estimates-sold-r2">Insurance</Label>
                  </div>
                </RadioGroup>
             </div>

             {jobType === 'Insurance' && (
                <div className="space-y-2 animate-fade-in"> {/* Simple fade-in */} 
                  <Label htmlFor="estimates-insurance-company">Insurance Company Name</Label>
                  <Input 
                    id="estimates-insurance-company"
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
                      <SelectTrigger id="presetPackageType">
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
