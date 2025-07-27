import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Plus, Trash, ChevronDown, ChevronUp, Check, PackageOpen, Info } from "lucide-react";
import { MeasurementValues } from "../measurement/types";
import { ROOFING_MATERIALS } from "./data";
import { Material, MaterialCategory } from "./types";
import { calculateMaterialQuantity, calculateMaterialTotal, groupMaterialsByCategory, MaterialWastePercentages } from "./utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import PackageSelector from "../packages/PackageSelector";
import { WarrantySelector } from "../warranties/WarrantySelector";
import LowSlopeOptions from "../lowslope/LowSlopeOptions";
import { useToast } from "@/hooks/use-toast";
import { getDefaultPricingTemplate, PricingTemplate, createPricingTemplate, updatePricingTemplate } from "@/api/pricing-templates"; // Added createPricingTemplate, updatePricingTemplate
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAllMaterialWastePercentages, updateMaterialWastePercentage } from "@/lib/supabase/material-waste";
import { supabase } from "@/integrations/supabase/client"; // Added supabase import
import { determineWasteFactor } from "./utils";
import { useAuth } from '@/contexts/AuthContext';
import { useRoleAccess } from "@/components/RoleGuard";

// *** UPDATED LOG HERE ***
console.log("[MaterialsSelectionTab] Component Code Loaded - Version Check: WASTE FACTOR UPDATE v1"); 

interface MaterialsSelectionTabProps {
  measurements: MeasurementValues;
  selectedMaterials?: {[key: string]: Material};
  quantities?: {[key: string]: number};
  onMaterialsUpdate: (update: { 
    selectedMaterials: {[key: string]: Material}, 
    quantities: {[key: string]: number},
    peelStickPrice: string,
    warrantyCost: number,
    warrantyDetails?: WarrantyDetails | null;
    selectedWarranty?: string | null;
    selectedPackage?: string | null;
    isNavigatingBack?: boolean; // New optional flag
  }) => void;
  readOnly?: boolean;
  activePricingTemplate?: PricingTemplate | null; // Allow null
  allPricingTemplates?: PricingTemplate[];
  onTemplateChange?: (template: PricingTemplate) => void;
  // Admin edit mode props
  isAdminEditMode?: boolean;
  originalCreator?: string | null;
  originalCreatorRole?: string | null;
  jobWorksheet?: any; // Job worksheet data from previous step
  // Warranty and package state props (for sales rep flow)
  selectedWarranty?: string | null;
  selectedPackage?: string | null;
}

// Interface for warranty details
interface WarrantyDetails {
  name: string;
  price: number;
  calculation: string;
}

// Define a separate type for the editable template row state
interface EditableTemplateMaterial {
  id: string;
  name: string;
  price: number;
  coverageRule?: {
    description: string;
    calculation: string;
  };
  bundlesPerSquare?: number;
  approxPerSquare?: number;
  unit: string;
  category: MaterialCategory;
  wasteFactor?: number;
}

export function MaterialsSelectionTab({
  measurements,
  selectedMaterials = {}, // Default to empty object
  quantities = {}, // Default to empty object
  onMaterialsUpdate,
  readOnly,
  activePricingTemplate, // Assuming this prop is passed down with the currently selected template object
  allPricingTemplates, // Assuming this prop is passed down with all templates for the dropdown
  onTemplateChange, // Callback to parent when a template is selected/created/updated
  // Admin edit mode props
  isAdminEditMode = false,
  originalCreator = null,
  originalCreatorRole = null,
  jobWorksheet = null, // Default to null if not provided
  // Warranty and package state props
  selectedWarranty: propSelectedWarranty = null, // FIXED: Don't default to silver-pledge without package selection
  selectedPackage: propSelectedPackage = null,
}: MaterialsSelectionTabProps) { // Added activePricingTemplate, allPricingTemplates, onTemplateChange to props
  // Get auth context early to use in state initialization
  const { profile } = useAuth();
  const { isAdmin, isManager } = useRoleAccess();
  const userRole = profile?.role;
  
  // Safety check: If we're in the sales rep flow, force rep role
  // FIXED: Memoize effectiveUserRole to prevent re-calculation issues
  const effectiveUserRole = useMemo(() => {
    const location = window.location.pathname;
    // Double-check: If in sales estimate flow OR user role is rep, treat as rep
    if (location.includes('/sales-estimate') || userRole === 'rep') {
      return 'rep';
    }
    return userRole;
  }, [userRole]);
  
  // Always use dark theme for all users - matching the sick UI
  const isDarkTheme = true;
  
  // Theme-aware styles - updated for better readability in package section
  const cardStyles = "bg-white shadow-sm";
  const headerStyles = "border-b";
  const titleStyles = "text-gray-900";
  const descriptionStyles = "text-gray-600";
  
  // Debug logging to track role changes
  useEffect(() => {
    console.log('🔍 [MaterialsSelectionTab] User role:', userRole, 'Effective role:', effectiveUserRole, 'Path:', window.location.pathname, 'Profile:', profile);
  }, [userRole, effectiveUserRole, profile]);

  const [materials, setMaterials] = useState<Record<string, Material>>({});
  
  // Debug logging refs
  const measurementsKey = measurements?.predominantPitch || 'no-measurements';
  const prevMeasurementsKey = useRef<string>('');
  const prevMaterialCount = useRef<number>(0);
  
  if (prevMeasurementsKey.current !== measurementsKey) {
    console.log(`MaterialsSelectionTab rendering with measurements (key: ${measurementsKey})`);
    console.log("areasByPitch:", measurements?.areasByPitch);
    console.log("Received selectedMaterials:", {
      count: Object.keys(selectedMaterials).length,
      ids: Object.keys(selectedMaterials)
    });
    prevMeasurementsKey.current = measurementsKey;
  }

  // Local state for managing selected materials
  const [localSelectedMaterials, setLocalSelectedMaterials] = useState<{[key: string]: Material}>(selectedMaterials);
  const [localQuantities, setLocalQuantities] = useState<{[key: string]: number}>(quantities);
  // 🔧 FIX: Maintain stable order for material cards to prevent movement during navigation
  const [materialOrder, setMaterialOrder] = useState<string[]>(() => Object.keys(selectedMaterials));
  const [materialWasteFactors, setMaterialWasteFactors] = useState<Record<string, number>>({}); // State to store waste factors per material
  const [userOverriddenWaste, setUserOverriddenWaste] = useState<Record<string, boolean>>({}); // Tracks user per-item overrides
  const [wasteFactor, setWasteFactor] = useState(10); // Default 10% waste
  const [wasteFactorInput, setWasteFactorInput] = useState("10"); // Input state for waste factor
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    // Start with all accordions closed by default - users can open as needed
  ]);
  const [showLowSlope, setShowLowSlope] = useState(false);
  // Special waste factor for GAF Timberline HDZ
  const [gafTimberlineWasteFactor, setGafTimberlineWasteFactor] = useState(12); // Minimum 12%
  
  // CRITICAL FIX: Add loading state to prevent white screens during material population
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [autoPopulationError, setAutoPopulationError] = useState<string | null>(null);
  
  // State for preset menu dropdown
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  
  // Track if we've auto-populated for sales reps
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);
  
  // Track if we've auto-populated ventilation materials (removed blocking logic)
  // Note: Ventilation auto-population now works additively and doesn't need blocking
  
  // State for GAF packages and warranty options
  const [selectedPackage, setSelectedPackage] = useState<string | null>(() => {
    // Use prop value if provided, otherwise default to null
    return propSelectedPackage;
  });
  const [selectedWarranty, setSelectedWarranty] = useState<string | null>(() => {
    // Use prop value if provided, otherwise default to null (no warranty without package)
    return propSelectedWarranty;
  });
  const [isPeelStickSelected, setIsPeelStickSelected] = useState<boolean>(false);
  const [includeIso, setIncludeIso] = useState<boolean>(false);
  const [peelStickPrice, setPeelStickPrice] = useState<string>("0.00");
  const [warrantyDetails, setWarrantyDetails] = useState<WarrantyDetails | null>(null);
  
  // State for display quantities (e.g., Squares for Timberline)
  const [displayQuantities, setDisplayQuantities] = useState<Record<string, string>>({});
  
  // Ref to track if changes are from internal state or external props
  const isInternalChange = useRef(false);
  const prevSelectedMaterialsCount = useRef(Object.keys(selectedMaterials).length);
  const skipNextParentUpdate = useRef(false);

  // Add state to track currently selected preset (if any)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Get toast function
  const { toast } = useToast();

  // New state for database waste percentages
  const [dbWastePercentages, setDbWastePercentages] = useState<MaterialWastePercentages>({});
  const [isDbWasteLoading, setIsDbWasteLoading] = useState(false);
  
  // New state for the materials of the template currently being edited or viewed
  const [editableTemplateMaterials, setEditableTemplateMaterials] = useState<Record<string, Material>>({});
  
  // State for "Save As New Template" modal
  const [isSaveAsNewModalOpen, setIsSaveAsNewModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  
  // Determine if user can edit material prices based on role
  const canEditMaterialPrices = () => {
    // Admin override: If in admin edit mode and current user is admin, allow editing
    if (isAdminEditMode && userRole === 'admin') {
      return true; // Admins can edit any estimate when in admin edit mode
    }
    
    // Normal role-based permissions (unchanged from original logic)
    switch (userRole) {
      case 'admin':
        return true; // Admins can edit material prices
      case 'manager':
        return false; // Territory managers CANNOT edit material prices
      case 'rep':
        return false; // Sales reps cannot edit material prices
      default:
        return false;
    }
  };

  // Sync waste factor input state with actual waste factor
  useEffect(() => {
    setWasteFactorInput(wasteFactor.toString());
  }, [wasteFactor]);

  // Load database waste percentages on component mount
  useEffect(() => {
    const loadDbWastePercentages = async () => {
      setIsDbWasteLoading(true);
      try {
        const dbWaste = await getAllMaterialWastePercentages();
        setDbWastePercentages(dbWaste);
        if (import.meta.env.DEV) {
          console.log("Loaded waste percentages from DB:", Object.keys(dbWaste).length, "materials");
        }
      } catch (error) {
        console.error("Failed to load waste percentages from DB:", error);
      } finally {
        setIsDbWasteLoading(false);
      }
    };

    loadDbWastePercentages();
  }, []);

  // CRITICAL FIX: Only auto-select warranty from job worksheet, not materials
  // Materials should only auto-populate when user explicitly selects a package
  useEffect(() => {
    if (jobWorksheet && jobWorksheet.shingle_roof) {
      const { warranty_gaf } = jobWorksheet.shingle_roof;
      
      // REMOVED: Auto-selection of GAF Timberline HDZ based on manufacturer
      // This was causing unwanted material auto-population before package selection
      // Now materials only populate when user explicitly selects a package
      
      // Only auto-select warranty based on GAF warranty selection (if package is selected)
      if ((warranty_gaf === 'silver' || warranty_gaf === 'gold') && selectedPackage) {
        const warrantyValue = warranty_gaf === 'silver' ? 'silver-pledge' : 'gold-pledge';
        if (selectedWarranty !== warrantyValue) {
          console.log('Auto-selecting warranty based on job worksheet:', warranty_gaf);
          setSelectedWarranty(warrantyValue);
        }
      }
    }
  }, [jobWorksheet, selectedPackage]); // Also depend on selectedPackage for warranty logic // Only run when jobWorksheet changes, not on every render

  // Auto-populate ventilation materials based on job worksheet ventilation data
  useEffect(() => {
    // Always check if there are NEW ventilation items that need to be added
    if (!jobWorksheet?.ventilation || !measurements) {
      console.log('🔧 [Ventilation Auto-Population] Skipping:', {
        hasVentilation: !!jobWorksheet?.ventilation,
        ventilationData: jobWorksheet?.ventilation,
        hasMeasurements: !!measurements
      });
      return;
    }

    console.log('🔧 [Ventilation Auto-Population] Starting with data:', jobWorksheet.ventilation);

    const ventilationData = jobWorksheet.ventilation;
    const materialsToAdd: { [key: string]: { material: Material, quantity: number } } = {};

    // Map Job Worksheet fields to material IDs
    const ventilationMapping = {
      // Goosenecks
      'gooseneck_4_inch': { materialId: 'galvanized-gooseneck-4inch', count: Number(ventilationData.goosenecks?.['4_inch']) || 0 },
      'gooseneck_6_inch': { materialId: 'galvanized-gooseneck-4inch', count: Number(ventilationData.goosenecks?.['6_inch']) || 0 }, // Map 6" to 4" as we don't have 6" in materials
      'gooseneck_10_inch': { materialId: 'galvanized-gooseneck-10inch', count: Number(ventilationData.goosenecks?.['10_inch']) || 0 },
      'gooseneck_12_inch': { materialId: 'galvanized-gooseneck-10inch', count: Number(ventilationData.goosenecks?.['12_inch']) || 0 }, // Map 12" to 10" as we don't have 12" in materials
      
      // Boots (Bullet Boot Pipe Flashing)
      'boot_1_5_inch': { materialId: 'bullet-boot-1-5inch', count: Number(ventilationData.boots?.['1_5_inch']) || 0 },
      'boot_2_inch': { materialId: 'bullet-boot-2inch', count: Number(ventilationData.boots?.['2_inch']) || 0 },
      'boot_3_inch': { materialId: 'bullet-boot-3inch', count: Number(ventilationData.boots?.['3_inch']) || 0 },
      'boot_4_inch': { materialId: 'bullet-boot-4inch', count: Number(ventilationData.boots?.['4_inch']) || 0 },
      
      // Ridge Vents - special handling for linear feet (4 LF per piece)
      'ridge_vent': { 
        materialId: 'gaf-cobra-rigid-vent', 
        count: ventilationData.ridge_vents_lf ? Math.ceil(Number(ventilationData.ridge_vents_lf) / 4) : 0 // 4 LF per piece
      },
      
      // Off Ridge Vents 
      'off_ridge_2ft': { materialId: 'lomanco-750d-vent', count: Number(ventilationData.off_ridge_vents?.['2_ft']) || 0 },
      'off_ridge_4ft': { materialId: 'galvanized-steel-off-ridge-vent', count: Number(ventilationData.off_ridge_vents?.['4_ft']) || 0 }
    };

    console.log('🔧 [Ventilation] Processing ventilation mapping...');

    // Process each mapping and combine quantities for same material IDs
    Object.entries(ventilationMapping).forEach(([field, { materialId, count }]) => {
      if (count > 0) {
        const material = ROOFING_MATERIALS.find(m => m.id === materialId);
        if (material) {
          // Check if material is already in the selected materials with the correct quantity
          const currentQuantity = localQuantities[materialId] || 0;
          const isAlreadyPresent = localSelectedMaterials[materialId] && currentQuantity >= count;
          
          if (!isAlreadyPresent) {
            console.log(`🔧 [Ventilation] Field ${field}: Adding/Updating ${count} x ${material.name} (${materialId})`);
            // Use the higher quantity (existing or new)
            const finalQuantity = Math.max(currentQuantity, count);
            materialsToAdd[materialId] = { material, quantity: finalQuantity };
          } else {
            console.log(`🔧 [Ventilation] Field ${field}: Material ${materialId} already present with quantity ${currentQuantity}`);
          }
        } else {
          console.warn(`🔧 [Ventilation] Material not found: ${materialId}`);
        }
      }
    });

    // If there are materials to add, update the state
    if (Object.keys(materialsToAdd).length > 0) {
      console.log('🔧 [Ventilation] Updating state with materials:', Object.keys(materialsToAdd));
      isInternalChange.current = true; // Mark as internal change to prevent reset
      
      setLocalSelectedMaterials(prev => {
        const newMaterials = { ...prev };
        Object.entries(materialsToAdd).forEach(([materialId, { material }]) => {
          newMaterials[materialId] = material;
        });
        return newMaterials;
      });

      setLocalQuantities(prev => {
        const newQuantities = { ...prev };
        Object.entries(materialsToAdd).forEach(([materialId, { quantity }]) => {
          newQuantities[materialId] = quantity;
        });
        return newQuantities;
      });

      setDisplayQuantities(prev => {
        const newDisplayQuantities = { ...prev };
        Object.entries(materialsToAdd).forEach(([materialId, { quantity }]) => {
          newDisplayQuantities[materialId] = quantity.toString();
        });
        return newDisplayQuantities;
      });

      setMaterialWasteFactors(prev => {
        const newFactors = { ...prev };
        Object.keys(materialsToAdd).forEach(materialId => {
          newFactors[materialId] = 0; // Ventilation has 0% waste
        });
        return newFactors;
      });

      setUserOverriddenWaste(prev => {
        const newOverrides = { ...prev };
        Object.keys(materialsToAdd).forEach(materialId => {
          newOverrides[materialId] = false;
        });
        return newOverrides;
      });

      setMaterialOrder(prev => {
        const newOrder = [...prev];
        Object.keys(materialsToAdd).forEach(materialId => {
          if (!newOrder.includes(materialId)) {
            newOrder.push(materialId);
          }
        });
        return newOrder;
      });

      // Show toast notification
      const addedCount = Object.keys(materialsToAdd).length;
      toast({
        title: "Ventilation Materials Added",
        description: `Added ${addedCount} ventilation material${addedCount > 1 ? 's' : ''} based on Job Worksheet selections.`,
        duration: 3000,
      });
      
      console.log('🔧 [Ventilation] Ventilation materials successfully applied');
    } else {
      console.log('🔧 [Ventilation] No ventilation materials to add');
    }
  }, [jobWorksheet?.ventilation, measurements, Object.keys(localSelectedMaterials).length]);

  // Auto-populate accessories from Job Worksheet
  useEffect(() => {
    // Check if there are accessories to add
    if (!jobWorksheet?.accessories || !measurements) {
      console.log('🔧 [Accessories Auto-Population] Skipping:', {
        hasAccessories: !!jobWorksheet?.accessories,
        accessoriesData: jobWorksheet?.accessories,
        hasMeasurements: !!measurements
      });
      return;
    }

    console.log('🔧 [Accessories Auto-Population] Starting with data:', jobWorksheet.accessories);

    const accessoriesData = jobWorksheet.accessories;
    const materialsToAdd: { [key: string]: { material: Material, quantity: number } } = {};

    // Skylights
    if (accessoriesData.skylight) {
      if (accessoriesData.skylight.count_2x2 > 0) {
        const material = ROOFING_MATERIALS.find(m => m.id === 'skylight-2x2');
        if (material) {
          const count = Number(accessoriesData.skylight.count_2x2) || 0;
          const currentQuantity = localQuantities['skylight-2x2'] || 0;
          if (!localSelectedMaterials['skylight-2x2'] || currentQuantity < count) {
            console.log(`🔧 [Accessories] Adding ${count} x 2x2 Skylights`);
            materialsToAdd['skylight-2x2'] = { material, quantity: count };
          }
        }
      }
      
      if (accessoriesData.skylight.count_2x4 > 0) {
        const material = ROOFING_MATERIALS.find(m => m.id === 'skylight-2x4');
        if (material) {
          const count = Number(accessoriesData.skylight.count_2x4) || 0;
          const currentQuantity = localQuantities['skylight-2x4'] || 0;
          if (!localSelectedMaterials['skylight-2x4'] || currentQuantity < count) {
            console.log(`🔧 [Accessories] Adding ${count} x 2x4 Skylights`);
            materialsToAdd['skylight-2x4'] = { material, quantity: count };
          }
        }
      }
    }

    // Solar Attic Fans
    if (accessoriesData.solar_attic_fans) {
      if (accessoriesData.solar_attic_fans.kennedy_35w > 0) {
        const material = ROOFING_MATERIALS.find(m => m.id === 'kennedy-roof-mount-solar-fan-35w');
        if (material) {
          const count = Number(accessoriesData.solar_attic_fans.kennedy_35w) || 0;
                      const currentQuantity = localQuantities['kennedy-roof-mount-solar-fan-35w'] || 0;
            if (!localSelectedMaterials['kennedy-roof-mount-solar-fan-35w'] || currentQuantity < count) {
              console.log(`🔧 [Accessories] Adding ${count} x Kennedy 35W Solar Attic Fans`);
              materialsToAdd['kennedy-roof-mount-solar-fan-35w'] = { material, quantity: count };
          }
        }
      }
      
      if (accessoriesData.solar_attic_fans.attic_breeze_45w > 0) {
        const material = ROOFING_MATERIALS.find(m => m.id === 'attic-breeze-solar-fan-45w');
        if (material) {
          const count = Number(accessoriesData.solar_attic_fans.attic_breeze_45w) || 0;
          const currentQuantity = localQuantities['attic-breeze-solar-fan-45w'] || 0;
          if (!localSelectedMaterials['attic-breeze-solar-fan-45w'] || currentQuantity < count) {
            console.log(`🔧 [Accessories] Adding ${count} x Attic Breeze 45W Solar Attic Fans`);
            materialsToAdd['attic-breeze-solar-fan-45w'] = { material, quantity: count };
          }
        }
      }
    }

    // Satellite Dish Removal (from ventilation.accessories)
    if (jobWorksheet.ventilation?.accessories?.satellite_removal) {
      const material = ROOFING_MATERIALS.find(m => m.id === 'satellite-dish-removal');
      if (material) {
        const currentQuantity = localQuantities['satellite-dish-removal'] || 0;
        if (!localSelectedMaterials['satellite-dish-removal'] || currentQuantity < 1) {
          console.log(`🔧 [Accessories] Adding Satellite Dish Removal`);
          materialsToAdd['satellite-dish-removal'] = { material, quantity: 1 };
        }
      }
    }

    // Gutter Leaf Guards
    if (jobWorksheet.gutters?.leaf_guards?.install && jobWorksheet.gutters.leaf_guards.linear_feet > 0) {
      const material = ROOFING_MATERIALS.find(m => m.id === 'gutter-leaf-guards');
      if (material) {
        const linearFeet = Number(jobWorksheet.gutters.leaf_guards.linear_feet) || 0;
        const currentQuantity = localQuantities['gutter-leaf-guards'] || 0;
        if (!localSelectedMaterials['gutter-leaf-guards'] || currentQuantity < linearFeet) {
          console.log(`🔧 [Accessories] Adding ${linearFeet} LF of Gutter Leaf Guards`);
          materialsToAdd['gutter-leaf-guards'] = { material, quantity: linearFeet };
        }
      }
    }

    // If there are materials to add, update the state
    if (Object.keys(materialsToAdd).length > 0) {
      console.log('🔧 [Accessories] Updating state with materials:', Object.keys(materialsToAdd));
      isInternalChange.current = true; // Mark as internal change to prevent reset
      
      setLocalSelectedMaterials(prev => {
        const newMaterials = { ...prev };
        Object.entries(materialsToAdd).forEach(([materialId, { material }]) => {
          newMaterials[materialId] = material;
        });
        return newMaterials;
      });

      setLocalQuantities(prev => {
        const newQuantities = { ...prev };
        Object.entries(materialsToAdd).forEach(([materialId, { quantity }]) => {
          newQuantities[materialId] = quantity;
        });
        return newQuantities;
      });

      setDisplayQuantities(prev => {
        const newDisplayQuantities = { ...prev };
        Object.entries(materialsToAdd).forEach(([materialId, { quantity }]) => {
          newDisplayQuantities[materialId] = quantity.toString();
        });
        return newDisplayQuantities;
      });

      setMaterialWasteFactors(prev => {
        const newFactors = { ...prev };
        Object.keys(materialsToAdd).forEach(materialId => {
          newFactors[materialId] = 0; // Accessories have 0% waste
        });
        return newFactors;
      });

      setUserOverriddenWaste(prev => {
        const newOverrides = { ...prev };
        Object.keys(materialsToAdd).forEach(materialId => {
          newOverrides[materialId] = false;
        });
        return newOverrides;
      });

      setMaterialOrder(prev => {
        const newOrder = [...prev];
        Object.keys(materialsToAdd).forEach(materialId => {
          if (!newOrder.includes(materialId)) {
            newOrder.push(materialId);
          }
        });
        return newOrder;
      });

      // Show toast notification
      const addedCount = Object.keys(materialsToAdd).length;
      toast({
        title: "Accessories Added",
        description: `Added ${addedCount} accessor${addedCount > 1 ? 'ies' : 'y'} based on Job Worksheet selections.`,
        duration: 3000,
      });
      
      console.log('🔧 [Accessories] Accessories successfully applied');
    } else {
      console.log('🔧 [Accessories] No accessories to add');
    }
  }, [jobWorksheet?.accessories, jobWorksheet?.ventilation?.accessories, jobWorksheet?.gutters, measurements, Object.keys(localSelectedMaterials).length]);

  // Reset function to completely reset state from props
  const resetStateFromProps = useCallback(() => {
    console.log("Resetting state from props", {
      materials: Object.keys(selectedMaterials).length,
      quantities: Object.keys(quantities).length
    });
    
    skipNextParentUpdate.current = true;
    
    const materialsCopy = {...selectedMaterials};
    const quantitiesCopy = {...quantities};
    
    setLocalSelectedMaterials(materialsCopy);
    setLocalQuantities(quantitiesCopy);
    // 🔧 FIX: Don't reset material order here - it's handled in the useEffect
    // setMaterialOrder(Object.keys(materialsCopy));
    
    const initialDisplayQtys: Record<string, string> = {};
    const initialWasteFactors: Record<string, number> = {};
    const initialUserOverrides: Record<string, boolean> = {};

    for (const materialId in quantitiesCopy) {
      const material = materialsCopy[materialId];
      if (material && measurements) { 
        const overrideWaste = material.id === "gaf-timberline-hdz-sg" 
          ? gafTimberlineWasteFactor / 100 
          : wasteFactor / 100;
        const { quantity: calculatedQty, actualWasteFactor } = calculateMaterialQuantity(
          material,
          measurements,
          overrideWaste 
        );
        initialWasteFactors[materialId] = actualWasteFactor;
        initialUserOverrides[materialId] = false; 
        
        const bundleQuantity = quantitiesCopy[materialId] || 0; 
        const isGafTimberline = materialId === "gaf-timberline-hdz-sg";
        initialDisplayQtys[materialId] = isGafTimberline 
            ? (bundleQuantity / 3).toFixed(1) 
            : bundleQuantity.toString();
      }
    }
    setDisplayQuantities(initialDisplayQtys);
    setMaterialWasteFactors(initialWasteFactors); 
    setUserOverriddenWaste(initialUserOverrides); 
  }, [selectedMaterials, quantities, measurements, wasteFactor, gafTimberlineWasteFactor]);

  // Update local state when props change
  useEffect(() => {
    // Restoring logic
    console.log("MaterialsSelectionTab: Props changed", {
      selectedMaterialsCount: Object.keys(selectedMaterials).length,
      localSelectedMaterialsCount: Object.keys(localSelectedMaterials).length,
      isInternalChange: isInternalChange.current
    });
    
    if (isInternalChange.current) {
      console.log("Skipping prop update since it was triggered by internal change");
      isInternalChange.current = false;
      return;
    }
    
    // Don't reset if we have materials locally but props are empty (common for auto-population)
    const propsEmpty = Object.keys(selectedMaterials).length === 0;
    const localHasMaterials = Object.keys(localSelectedMaterials).length > 0;
    
    if (propsEmpty && localHasMaterials) {
      console.log("Props are empty but we have local materials - keeping local state");
      return;
    }
    
    const selectedMaterialsCount = Object.keys(selectedMaterials).length;
    const localMaterialsCount = Object.keys(localSelectedMaterials).length;
    let propsChanged = false;
    if (selectedMaterialsCount !== localMaterialsCount) {
        propsChanged = true;
    } else {
        for (const key in selectedMaterials) {
            if (!localSelectedMaterials[key] || selectedMaterials[key].id !== localSelectedMaterials[key].id) {
                propsChanged = true;
                break;
            }
        }
    }

    if (propsChanged) {
      console.log("Props for selectedMaterials or quantities changed, resetting state from props");
      skipNextParentUpdate.current = true; 
      
      // 🔧 FIX: Preserve material order when restoring from props
      // Check if we have an existing order that we should maintain
      const existingOrder = [...materialOrder];
      const newMaterialIds = Object.keys(selectedMaterials);
      
      // If we have an existing order and the materials are mostly the same, preserve order
      if (existingOrder.length > 0 && selectedMaterialsCount > 0) {
        // Keep materials in existing order if they still exist
        const preservedOrder = existingOrder.filter(id => newMaterialIds.includes(id));
        // Add any new materials at the end
        const newMaterials = newMaterialIds.filter(id => !existingOrder.includes(id));
        const finalOrder = [...preservedOrder, ...newMaterials];
        
        // Only update order if it's actually different
        if (JSON.stringify(finalOrder) !== JSON.stringify(materialOrder)) {
          setMaterialOrder(finalOrder);
        }
      } else {
        // No existing order or no materials, just use prop order
        setMaterialOrder(newMaterialIds);
      }
      
      resetStateFromProps();
      prevSelectedMaterialsCount.current = selectedMaterialsCount;
      return;
    }
    
    // This part of the original useEffect for handling only quantity changes might be redundant 
    // if resetStateFromProps correctly handles all scenarios based on selectedMaterials and quantities.
    // However, to be safe and restore previous more granular logic if needed:
    if (quantities && Object.keys(quantities).length > 0 && Object.keys(quantities).length !== Object.keys(localQuantities).length) {
        let quantitiesActuallyChanged = false;
        for(const key in quantities) {
            if (quantities[key] !== localQuantities[key]) {
                quantitiesActuallyChanged = true;
                break;
            }
        }
        if (Object.keys(quantities).length !== Object.keys(localQuantities).length) quantitiesActuallyChanged = true;

        if (quantitiesActuallyChanged) {
            console.log("Only quantities from props seem to have changed, updating selectively.");
            skipNextParentUpdate.current = true;
            const initialWasteFactors: Record<string, number> = {};
            const initialDisplayQtys: Record<string, string> = {};
            // We don't reset userOverriddenWaste here as materials themselves didn't change

            for (const materialId in quantities) {
                const material = localSelectedMaterials[materialId] || selectedMaterials[materialId];
                if (material && measurements) {
                    const overrideWaste = material.id === "gaf-timberline-hdz-sg" 
                        ? gafTimberlineWasteFactor / 100 
                        : wasteFactor / 100;
                    // If user has overridden waste for this item, that should be preserved unless material itself changes.
                    // calculateMaterialQuantity will use this if it's passed, otherwise default.
                    // The question is, what override to pass here if only quantity prop changes?
                    // Let's assume the existing materialWasteFactors[materialId] is still the source of truth for an override.
                    const currentOverride = userOverriddenWaste[materialId] ? materialWasteFactors[materialId] : overrideWaste;
                    
                    const { actualWasteFactor } = calculateMaterialQuantity(material, measurements, currentOverride);
                    initialWasteFactors[materialId] = actualWasteFactor;
                }
                const bundleQuantity = quantities[materialId] || 0;
                const isGafTimberline = materialId === "gaf-timberline-hdz-sg";
                initialDisplayQtys[materialId] = isGafTimberline 
                    ? (bundleQuantity / 3).toFixed(1) 
                    : bundleQuantity.toString();
            }
            setLocalQuantities(quantities); // Set to new quantities from props
            setDisplayQuantities(initialDisplayQtys); // Update display based on new quantities
            setMaterialWasteFactors(prev => ({...prev, ...initialWasteFactors})); // Update waste factors
        }
    }
    
    prevSelectedMaterialsCount.current = selectedMaterialsCount;
  }, [selectedMaterials, quantities]); 
  // 🔧 CRITICAL FIX: Removed resetStateFromProps callback to prevent hook order changes
  
  // Notify parent of changes when local state changes
  // 🔧 FIX: Reduce excessive logging to prevent re-render loops
  const lastLoggedMaterialCount = useRef(0);
  const lastParentSyncLogTime = useRef(0);
  const lastLogTime = useRef(0);
  
  useEffect(() => {
    // Only log if there are actual changes to report
    const hasChanges = Object.keys(localSelectedMaterials).length > 0 || Object.keys(localQuantities).length > 0;
    
    // Don't notify parent if we just updated from parent props
    if (skipNextParentUpdate.current) {
      // Only log once every 5 seconds to reduce console spam
      const now = Date.now();
      if (hasChanges && now - lastLogTime.current > 5000) {
        lastLogTime.current = now;
        console.log("🔒 [NotifyParentEffect] Skipping parent notification: skipNextParentUpdate is true.");
      }
      skipNextParentUpdate.current = false; // Reset for next potential update
      return;
    }
    
    // Only log when there are actual significant changes (reduce noise)
    const materialCount = Object.keys(localSelectedMaterials).length;
    const shouldLog = hasChanges && (
      materialCount !== lastLoggedMaterialCount.current ||
      warrantyDetails?.price !== 0
    );
    
    if (shouldLog) {
      lastLoggedMaterialCount.current = materialCount;
      // 🔧 PERFORMANCE FIX: Removed parent sync logging to prevent console spam
    }
    
    isInternalChange.current = true;
    
    onMaterialsUpdate({
      selectedMaterials: localSelectedMaterials,
      quantities: localQuantities,
      peelStickPrice,
      warrantyCost: warrantyDetails?.price || 0,
      warrantyDetails,
      selectedWarranty,
      selectedPackage,
      isNavigatingBack: false // Explicitly false for regular updates
    });

  }, [localSelectedMaterials, localQuantities, peelStickPrice, warrantyDetails, selectedWarranty, selectedPackage]); 
  // 🔧 PERFORMANCE FIX: Removed onMaterialsUpdate from dependency array to prevent infinite re-render loop
  // materialWasteFactors removed from dependency array as it's not sent to parent
  
  // Sync local warranty and package state with props (for restoration from localStorage)
  useEffect(() => {
    // Only sync when prop changes and avoid null values that would clear valid selections
    if (propSelectedWarranty !== null && propSelectedWarranty !== selectedWarranty) {
      console.log(`🔄 [WarrantySync] Updating selectedWarranty from prop: ${propSelectedWarranty}`);
      setSelectedWarranty(propSelectedWarranty);
    }
  }, [propSelectedWarranty]); // Only depend on prop, not local state to avoid loop

  useEffect(() => {
    if (propSelectedPackage !== null && propSelectedPackage !== selectedPackage) {
      console.log(`🔄 [PackageSync] Updating selectedPackage from prop: ${propSelectedPackage}`);
      setSelectedPackage(propSelectedPackage);
    }
  }, [propSelectedPackage]); // Only depend on prop, not local state to avoid loop
  
  // Set low slope visibility but keep all accordions closed by default per manager request
  useEffect(() => {
    if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch)) {
      setShowLowSlope(false);
      return;
    }
    
    // Calculate low slope area to determine if we should show low slope section
    const lowSlopeArea = measurements.areasByPitch
      .filter(area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch))
      .reduce((sum, area) => sum + (area.area || 0), 0);
    
    const hasFlatRoofAreas = lowSlopeArea > 0;
    setShowLowSlope(hasFlatRoofAreas);
    
    // Manager request: Keep all accordions closed by default - no auto-expansion
    console.log(`[CategoryVisibility] Low slope areas: ${hasFlatRoofAreas}, All accordions remain closed by default`);
  }, [measurements]);

  // Check for flat/low-slope areas and add required materials
  useEffect(() => {
    // Reduce excessive logging - only log when actually processing
    const hasValidMeasurements = measurements?.areasByPitch?.length > 0;
    const materialCount = Object.keys(localSelectedMaterials).length;
    
    if (hasValidMeasurements && materialCount === 0) {
    console.log("🔄 [LOW-SLOPE FIX] Checking for low-slope areas in measurements");
    }
    
    // CRITICAL FIX: Enhanced validation to prevent timing issues
    if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch) || measurements.areasByPitch.length === 0) {
      console.log("⚠️ [LOW-SLOPE FIX] No valid measurements or areasByPitch - skipping auto-population");
      return;
    }
    
    // CRITICAL FIX: Validate that measurements have proper pitch data
    const hasValidPitchData = measurements.areasByPitch.every(area => 
      area.pitch && 
      typeof area.area === 'number' && 
      area.area > 0 &&
      (area.pitch.includes('/') || area.pitch.includes(':'))
    );
    
    if (!hasValidPitchData) {
      console.warn("⚠️ [LOW-SLOPE FIX] Invalid pitch data detected, skipping auto-population");
      return;
    }
    
    setIsAutoPopulating(true);
    setAutoPopulationError(null);
    
    try {
      const hasLowPitch = measurements.areasByPitch.some(
        area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch)
      );
      
      console.log("✅ [LOW-SLOPE FIX] Has low pitch areas:", hasLowPitch);
      
      if (!hasLowPitch) {
        console.log("✅ [LOW-SLOPE FIX] No low slope areas found, skipping low slope material auto-add");
        setIsAutoPopulating(false);
        return;
      }
      
      // Calculate total low-slope area
      const lowSlopeArea = measurements.areasByPitch
        .filter(area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch))
        .reduce((sum, area) => sum + (area.area || 0), 0);
      
      console.log("📊 [LOW-SLOPE FIX] Total low slope area:", lowSlopeArea, "sq ft");
      
      if (lowSlopeArea <= 0) {
        console.log("⚠️ [LOW-SLOPE FIX] Low slope area is 0, skipping auto-add");
        setIsAutoPopulating(false);
        return;
      }
      
      // 🔧 FIXED: Separate areas by pitch and add appropriate materials
      // Calculate pitch-specific areas
      const zeroPitchArea = measurements.areasByPitch
        .filter(area => ["0:12", "0/12"].includes(area.pitch))
        .reduce((sum, area) => sum + (area.area || 0), 0);
        
      const oneToTwoPitchArea = measurements.areasByPitch
        .filter(area => ["1:12", "1/12", "2:12", "2/12"].includes(area.pitch))
        .reduce((sum, area) => sum + (area.area || 0), 0);
      
      console.log(`📊 [LOW-SLOPE FIX] Pitch breakdown: 0/12 area = ${zeroPitchArea.toFixed(1)} sq ft, 1-2/12 area = ${oneToTwoPitchArea.toFixed(1)} sq ft`);
      
      // Check if required materials are already added
      const hasIso = "gaf-poly-iso-4x8" in localSelectedMaterials;
      const hasBase = "polyglass-elastoflex-sbs" in localSelectedMaterials;
      const hasCap = "polyglass-polyflex-app" in localSelectedMaterials;
      
      // Skip if all required materials are already present
      const hasAllRequired0_12 = zeroPitchArea > 0 ? (hasIso && hasBase && hasCap) : true;
      const hasAllRequired1_2 = oneToTwoPitchArea > 0 ? (hasBase && hasCap) : true;
      
      if (hasAllRequired0_12 && hasAllRequired1_2) {
        console.log("✅ [LOW-SLOPE FIX] All required low-slope materials already present, skipping auto-add");
        setIsAutoPopulating(false);
        return;
      }
      
      console.log("🚀 [LOW-SLOPE FIX] Auto-adding required low slope materials");
      
      // Find required materials
      const isoMaterial = ROOFING_MATERIALS.find(m => m.id === "gaf-poly-iso-4x8");
      const baseMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-elastoflex-sbs");
      const capMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-polyflex-app");
      
      if (!isoMaterial || !baseMaterial || !capMaterial) {
        console.error("❌ [LOW-SLOPE FIX] Required low-slope materials not found in database");
        setAutoPopulationError("Required low-slope materials not found");
        setIsAutoPopulating(false);
        return;
      }
      
      // Calculate waste factor for auto-population
      const autoPopulationWasteFactor = wasteFactor / 100;
      
      // Create copies of the materials and mark them as mandatory
      const newSelectedMaterials = { ...localSelectedMaterials };
      const newQuantities = { ...localQuantities };
      const newDisplayQuantities = { ...displayQuantities };
      const newMaterialWasteFactors = { ...materialWasteFactors };
      const newUserOverriddenWaste = { ...userOverriddenWaste };
      
      let materialsUpdated = false;
      let addedMaterials: string[] = [];
      
      // Add ISO for 0/12 pitch areas only
      if (zeroPitchArea > 0 && !hasIso) {
        const { quantity: isoQuantity, actualWasteFactor: isoWasteFactor } = calculateMaterialQuantity(
          isoMaterial,
          measurements,
          autoPopulationWasteFactor,
          dbWastePercentages
        );
        
        const mandatoryIso = {
          ...isoMaterial,
          name: `${isoMaterial.name} (Required for 0/12 pitch - cannot be removed)`
        };
        newSelectedMaterials["gaf-poly-iso-4x8"] = mandatoryIso;
        newQuantities["gaf-poly-iso-4x8"] = isoQuantity;
        newDisplayQuantities["gaf-poly-iso-4x8"] = isoQuantity.toString();
        newMaterialWasteFactors["gaf-poly-iso-4x8"] = isoWasteFactor;
        newUserOverriddenWaste["gaf-poly-iso-4x8"] = false;
        materialsUpdated = true;
        addedMaterials.push(`ISO (${isoQuantity} squares)`);
        console.log("✅ [LOW-SLOPE FIX] Added GAF Poly ISO:", isoQuantity, "squares");
      }
      
      // Add Base Sheet for all low-slope areas (0/12, 1/12, 2/12)
      if ((zeroPitchArea > 0 || oneToTwoPitchArea > 0) && !hasBase) {
        const { quantity: baseQuantity, actualWasteFactor: baseWasteFactor } = calculateMaterialQuantity(
          baseMaterial,
          measurements,
          autoPopulationWasteFactor,
          dbWastePercentages
        );
        
        const mandatoryBase = {
          ...baseMaterial,
          name: `${baseMaterial.name} (Required for 0-2/12 pitch - cannot be removed)`
        };
        newSelectedMaterials["polyglass-elastoflex-sbs"] = mandatoryBase;
        newQuantities["polyglass-elastoflex-sbs"] = baseQuantity;
        newDisplayQuantities["polyglass-elastoflex-sbs"] = baseQuantity.toString();
        newMaterialWasteFactors["polyglass-elastoflex-sbs"] = baseWasteFactor;
        newUserOverriddenWaste["polyglass-elastoflex-sbs"] = false;
        materialsUpdated = true;
        addedMaterials.push(`Base (${baseQuantity} rolls)`);
        console.log("✅ [LOW-SLOPE FIX] Added SBS Base:", baseQuantity, "rolls");
      }
      
      // Add Cap Sheet for all low-slope areas (0/12, 1/12, 2/12)
      if ((zeroPitchArea > 0 || oneToTwoPitchArea > 0) && !hasCap) {
        const { quantity: capQuantity, actualWasteFactor: capWasteFactor } = calculateMaterialQuantity(
          capMaterial,
          measurements,
          autoPopulationWasteFactor,
          dbWastePercentages
        );
        
        const mandatoryCap = {
          ...capMaterial,
          name: `${capMaterial.name} (Required for 0-2/12 pitch - cannot be removed)`
        };
        newSelectedMaterials["polyglass-polyflex-app"] = mandatoryCap;
        newQuantities["polyglass-polyflex-app"] = capQuantity;
        newDisplayQuantities["polyglass-polyflex-app"] = capQuantity.toString();
        newMaterialWasteFactors["polyglass-polyflex-app"] = capWasteFactor;
        newUserOverriddenWaste["polyglass-polyflex-app"] = false;
        materialsUpdated = true;
        addedMaterials.push(`Cap (${capQuantity} rolls)`);
        console.log("✅ [LOW-SLOPE FIX] Added APP Cap:", capQuantity, "rolls");
      }
      
      if (materialsUpdated) {
        console.log("🔄 [LOW-SLOPE FIX] Applying updated materials and quantities");
        
        // Apply updates using React's setState batching
          setLocalSelectedMaterials(newSelectedMaterials);
          setLocalQuantities(newQuantities);
          setDisplayQuantities(newDisplayQuantities);
          setMaterialWasteFactors(newMaterialWasteFactors); 
          setUserOverriddenWaste(newUserOverriddenWaste);
          // 🔧 FIX: Update material order to maintain stable card positions
          setMaterialOrder(Object.keys(newSelectedMaterials));
        
        // Show success notification
        const materialsDescription = addedMaterials.join(', ');
        const pitchDescription = zeroPitchArea > 0 && oneToTwoPitchArea > 0 
          ? `${zeroPitchArea.toFixed(1)} sq ft 0/12 + ${oneToTwoPitchArea.toFixed(1)} sq ft 1-2/12`
          : zeroPitchArea > 0 
            ? `${zeroPitchArea.toFixed(1)} sq ft 0/12`
            : `${oneToTwoPitchArea.toFixed(1)} sq ft 1-2/12`;
        
        toast({
          title: "Low-Slope Materials Added",
          description: `Added ${materialsDescription} for ${pitchDescription} pitch areas.`,
        });
        
        console.log("✅ [LOW-SLOPE FIX] Low-slope materials successfully auto-populated");
      }
      
    } catch (error) {
      console.error("❌ [LOW-SLOPE FIX] Error during auto-population:", error);
      setAutoPopulationError(`Failed to auto-add materials: ${error.message}`);
    } finally {
      setIsAutoPopulating(false);
    }
    
  }, [
    // 🔧 CRITICAL FIX: Stable dependencies to prevent hook order violations
    measurements?.totalArea,
    measurements?.areasByPitch?.length,
    measurements?.predominantPitch, // Stable identifier for measurements changes
    Object.keys(localSelectedMaterials).length,
    wasteFactor,
    // Removed unstable references: toast, JSON.stringify, direct object references
  ]);

  // Auto-populate skylights from job worksheet
  useEffect(() => {
    if (!jobWorksheet?.accessories?.skylight) {
      return;
    }

    const skylightData = jobWorksheet.accessories.skylight;
    const newMaterials = { ...localSelectedMaterials };
    const newQuantities = { ...localQuantities };
    let materialsUpdated = false;

    // Handle 2x2 skylights
    if (skylightData.count_2x2 > 0) {
      const skylight2x2 = ROOFING_MATERIALS.find(m => m.id === "skylight-2x2");
      if (skylight2x2 && !newMaterials["skylight-2x2"]) {
        newMaterials["skylight-2x2"] = skylight2x2;
        newQuantities["skylight-2x2"] = skylightData.count_2x2;
        materialsUpdated = true;
        console.log(`[SKYLIGHT AUTO-ADD] Added 2x2 skylights: ${skylightData.count_2x2} units`);
      } else if (skylight2x2 && newMaterials["skylight-2x2"]) {
        // Update quantity if it changed
        if (newQuantities["skylight-2x2"] !== skylightData.count_2x2) {
          newQuantities["skylight-2x2"] = skylightData.count_2x2;
          materialsUpdated = true;
          console.log(`[SKYLIGHT UPDATE] Updated 2x2 skylights quantity: ${skylightData.count_2x2} units`);
        }
      }
    } else if (newMaterials["skylight-2x2"]) {
      // Remove if count becomes 0
      delete newMaterials["skylight-2x2"];
      delete newQuantities["skylight-2x2"];
      materialsUpdated = true;
      console.log(`[SKYLIGHT REMOVE] Removed 2x2 skylights`);
    }

    // Handle 2x4 skylights
    if (skylightData.count_2x4 > 0) {
      const skylight2x4 = ROOFING_MATERIALS.find(m => m.id === "skylight-2x4");
      if (skylight2x4 && !newMaterials["skylight-2x4"]) {
        newMaterials["skylight-2x4"] = skylight2x4;
        newQuantities["skylight-2x4"] = skylightData.count_2x4;
        materialsUpdated = true;
        console.log(`[SKYLIGHT AUTO-ADD] Added 2x4 skylights: ${skylightData.count_2x4} units`);
      } else if (skylight2x4 && newMaterials["skylight-2x4"]) {
        // Update quantity if it changed
        if (newQuantities["skylight-2x4"] !== skylightData.count_2x4) {
          newQuantities["skylight-2x4"] = skylightData.count_2x4;
          materialsUpdated = true;
          console.log(`[SKYLIGHT UPDATE] Updated 2x4 skylights quantity: ${skylightData.count_2x4} units`);
        }
      }
    } else if (newMaterials["skylight-2x4"]) {
      // Remove if count becomes 0
      delete newMaterials["skylight-2x4"];
      delete newQuantities["skylight-2x4"];
      materialsUpdated = true;
      console.log(`[SKYLIGHT REMOVE] Removed 2x4 skylights`);
    }

    if (materialsUpdated) {
      setLocalSelectedMaterials(newMaterials);
      setLocalQuantities(newQuantities);
    }
  }, [jobWorksheet?.accessories?.skylight, localSelectedMaterials, localQuantities]);

  // 🔧 CRITICAL FIX: Moved ref outside useMemo to prevent hook violations
  const prevMaterialCountRef = useRef<number>(0);

  // Group all available materials by category for rendering the accordion
  const materialsByCategory = useMemo(() => {
    // Only log when materials are first grouped or when they change significantly
    const materialCount = ROOFING_MATERIALS.length;
    
    if (prevMaterialCountRef.current !== materialCount) {
      console.log("[MaterialsByCategoryMemo] Grouping materials from ROOFING_MATERIALS.");
      prevMaterialCountRef.current = materialCount;
    }
    
    return groupMaterialsByCategory(ROOFING_MATERIALS);
  }, []);

  // Handle Peel & Stick system add-on
  useEffect(() => {
    // Temporarily commented out for debugging navigation issue
    
    const systemMaterialId = "full-peel-stick-system";
    const peelStickCostPerSquare = 60;
    const systemMaterial = ROOFING_MATERIALS.find(m => m.id === systemMaterialId);
    let newPeelStickCost = 0;
    let needsUpdate = false;
    let updatedMaterials = { ...localSelectedMaterials };
    let updatedQuantities = { ...localQuantities };
    let updatedDisplayQuantities = { ...displayQuantities }; 
    let updatedMaterialWasteFactors = { ...materialWasteFactors }; 
    let updatedUserOverriddenWaste = { ...userOverriddenWaste }; 

    if (!measurements?.totalArea || !systemMaterial) {
       setPeelStickPrice("0.00");
       return;
    }
    
    let steepSlopeArea = 0;
    if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
      steepSlopeArea = measurements.areasByPitch
        .filter(area => {
          const pitchParts = area.pitch.split(/[:\\/]/);
          const rise = parseInt(pitchParts[0] || '0');
          return !isNaN(rise) && rise >= 3;
        })
        .reduce((sum, area) => sum + (area.area || 0), 0);
    } else {
      steepSlopeArea = 0;
    }

    if (isPeelStickSelected) {
      if (steepSlopeArea > 0) {
        const steepSlopeSquares = steepSlopeArea / 100;
        newPeelStickCost = steepSlopeSquares * peelStickCostPerSquare;
        const { quantity: systemQuantity, actualWasteFactor: peelStickWaste } = calculateMaterialQuantity(
          systemMaterial,
          measurements,
          wasteFactor / 100 
        );
        const currentQuantity = updatedQuantities[systemMaterialId] || 0;
        if (!updatedMaterials[systemMaterialId] || currentQuantity !== systemQuantity) {
          updatedMaterials[systemMaterialId] = systemMaterial;
          updatedQuantities[systemMaterialId] = systemQuantity;
          updatedDisplayQuantities[systemMaterialId] = systemQuantity.toString();
          updatedMaterialWasteFactors[systemMaterialId] = peelStickWaste; 
          updatedUserOverriddenWaste[systemMaterialId] = false; 
          needsUpdate = true;
        }
      } else {
        newPeelStickCost = 0;
        if (updatedMaterials[systemMaterialId]) {
           delete updatedMaterials[systemMaterialId];
           delete updatedQuantities[systemMaterialId];
           delete updatedDisplayQuantities[systemMaterialId];
           delete updatedMaterialWasteFactors[systemMaterialId];
           delete updatedUserOverriddenWaste[systemMaterialId]; 
           needsUpdate = true;
        }
      }
    } else {
      newPeelStickCost = 0;
      if (updatedMaterials[systemMaterialId]) {
        delete updatedMaterials[systemMaterialId];
        delete updatedQuantities[systemMaterialId];
        delete updatedDisplayQuantities[systemMaterialId];
        delete updatedMaterialWasteFactors[systemMaterialId];
        delete updatedUserOverriddenWaste[systemMaterialId]; 
        needsUpdate = true;
      }
    }
    setPeelStickPrice(newPeelStickCost.toFixed(2));
    if (needsUpdate) {
      isInternalChange.current = true;
      setLocalSelectedMaterials(updatedMaterials);
      setLocalQuantities(updatedQuantities);
      setDisplayQuantities(updatedDisplayQuantities); 
      setMaterialWasteFactors(updatedMaterialWasteFactors); 
      setUserOverriddenWaste(updatedUserOverriddenWaste); 
    }
    
  }, [isPeelStickSelected, measurements, wasteFactor]); 
  // 🔧 CRITICAL FIX: Removed ROOFING_MATERIALS and toast from deps to prevent unstable references and hook order changes
  
  // Calculate and set warranty details
  useEffect(() => {
    // Only log when warranty is actually selected to reduce noise
    if (selectedWarranty) {
      console.log("[WarrantyEffect] Calculating warranty -", selectedWarranty, "Package:", selectedPackage);
    }

    if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch)) {
      setWarrantyDetails(null);
      return;
    }

    // If no warranty is selected, set warrantyDetails to null
    if (!selectedWarranty) {
      setWarrantyDetails(null);
      return;
    }

    const steepSlopeAreaSqFt = measurements.areasByPitch
      .filter(area => {
        const pitchParts = area.pitch.split(/[:\\/]/);
        const rise = parseInt(pitchParts[0] || '0');
        return !isNaN(rise) && rise >= 3;
      })
      .reduce((sum, area) => sum + (area.area || 0), 0);

    if (steepSlopeAreaSqFt === 0) {
      setWarrantyDetails(null); // No warranty cost if no steep slope area
      return;
    }

    const steepSlopeSquares = steepSlopeAreaSqFt / 100;
    const warrantyWasteFactor = 0.12; // 12% waste for warranty calculations
    const adjustedSteepSlopeSquares = steepSlopeSquares * (1 + warrantyWasteFactor);
    let calculatedWarrantyCost = 0;
    let warrantyName = "";
    let calculationString = "";

    console.log("[WarrantyEffect] Adjusted Steep Slope Squares (with 12% waste):", adjustedSteepSlopeSquares);

    if (selectedWarranty === "silver-pledge") {
      warrantyName = "Silver Pledge Warranty";
      const costPerBlock = 150;
      const squaresPerBlock = 50;
      const numberOfBlocks = Math.ceil(adjustedSteepSlopeSquares / squaresPerBlock);
      calculatedWarrantyCost = numberOfBlocks * costPerBlock;
      calculationString = `Steep Slope: ${steepSlopeSquares.toFixed(2)} sq, With 12% Waste: ${adjustedSteepSlopeSquares.toFixed(2)} sq. \n      Cost: ${numberOfBlocks} block(s) of ${squaresPerBlock} sq @ $${costPerBlock.toFixed(2)}/block = $${calculatedWarrantyCost.toFixed(2)}.`;
      console.log("[WarrantyEffect] Silver Pledge calculated:", { warrantyName, calculatedWarrantyCost, calculationString });

    } else if (selectedWarranty === "gold-pledge") {
      warrantyName = "Gold Pledge Warranty";
      const costPerSquare = 15;
      calculatedWarrantyCost = adjustedSteepSlopeSquares * costPerSquare;
      calculationString = `Steep Slope: ${steepSlopeSquares.toFixed(2)} sq, With 12% Waste: ${adjustedSteepSlopeSquares.toFixed(2)} sq. \n      Cost: ${adjustedSteepSlopeSquares.toFixed(2)} sq @ $${costPerSquare.toFixed(2)}/sq = $${calculatedWarrantyCost.toFixed(2)}.`;
      console.log("[WarrantyEffect] Gold Pledge calculated:", { warrantyName, calculatedWarrantyCost, calculationString });
    } else {
      console.log("[WarrantyEffect] No matching warranty selected or conditions not met.");
    }

    if (calculatedWarrantyCost > 0) {
      console.log("[WarrantyEffect] Setting warrantyDetails:", { name: warrantyName, price: calculatedWarrantyCost, calculation: calculationString });
      setWarrantyDetails({
        name: warrantyName,
        price: calculatedWarrantyCost,
        calculation: calculationString,
      });
    } else {
      console.log("[WarrantyEffect] Calculated warranty cost is 0 or less, setting warrantyDetails to null.");
      setWarrantyDetails(null);
    }
  }, [selectedWarranty, selectedPackage, measurements, wasteFactor]);
  
  // Add material to selection
  const addMaterial = (materialToAdd: Material) => {
    // Determine the override waste factor
    const overrideWaste = materialToAdd.id === "gaf-timberline-hdz-sg" 
      ? gafTimberlineWasteFactor / 100 
      : wasteFactor / 100;

    const { quantity: newQuantity, actualWasteFactor } = calculateMaterialQuantity(
      materialToAdd,
      measurements,
      overrideWaste,
      dbWastePercentages // Pass database waste percentages
    );

    console.log(`Adding material: ${materialToAdd.name}, Calculated Qty: ${newQuantity}, Actual WF: ${actualWasteFactor}`);

    // For ventilation and accessories, we should allow quantity 0 and set to 1 as default
    // because these are often manually specified and not tied to roof measurements
    let finalQuantity = newQuantity;
    if (finalQuantity <= 0 && (materialToAdd.category === MaterialCategory.VENTILATION || 
                              materialToAdd.category === MaterialCategory.ACCESSORIES)) {
      finalQuantity = 1; // Set minimum quantity to 1 for these categories
    }

    if (finalQuantity > 0) {
      isInternalChange.current = true;
      setLocalSelectedMaterials(prev => ({ ...prev, [materialToAdd.id]: materialToAdd }));
      setLocalQuantities(prev => ({ ...prev, [materialToAdd.id]: finalQuantity }));
      setMaterialWasteFactors(prev => ({ ...prev, [materialToAdd.id]: actualWasteFactor })); // Store actual waste factor
      setUserOverriddenWaste(prev => ({ ...prev, [materialToAdd.id]: false })); // Initialize as not overridden
      // 🔧 FIX: Add to material order if not already present
      setMaterialOrder(prev => prev.includes(materialToAdd.id) ? prev : [...prev, materialToAdd.id]);
      
      // Update display quantity
      if (materialToAdd.id === "gaf-timberline-hdz-sg") {
        setDisplayQuantities(prev => ({ ...prev, [materialToAdd.id]: (finalQuantity / 3).toFixed(1) }));
      } else {
        setDisplayQuantities(prev => ({ ...prev, [materialToAdd.id]: finalQuantity.toString() }));
      }
      
      // Clear selected preset if a material is manually added
      setSelectedPreset(null); 
      
    } else {
      toast({
        title: "Material Not Added",
        description: `${materialToAdd.name} quantity calculated to zero or less. Not added.`,
        variant: "destructive"
      });
    }
  };
  
  // Remove material from selection
  const removeMaterial = (materialId: string) => {
    console.log(`Removing material: ${materialId}`);
    isInternalChange.current = true;
    
    const material = localSelectedMaterials[materialId];
    
    // Do not allow removing mandatory materials
    if (material && material.name && material.name.includes("cannot be removed")) {
      return;
    }
    
    const newSelectedMaterials = { ...localSelectedMaterials };
    const newQuantities = { ...localQuantities };
    const newDisplayQuantities = { ...displayQuantities };
    const newMaterialWasteFactors = { ...materialWasteFactors }; // Initialize for this scope
    
    delete newSelectedMaterials[materialId];
    delete newQuantities[materialId];
    delete newDisplayQuantities[materialId];
    delete newMaterialWasteFactors[materialId];
    
    setLocalSelectedMaterials(newSelectedMaterials);
    setLocalQuantities(newQuantities);
    setDisplayQuantities(newDisplayQuantities);
    setMaterialWasteFactors(newMaterialWasteFactors); // Set updated waste factors
    // 🔧 FIX: Remove from material order
    setMaterialOrder(prev => prev.filter(id => id !== materialId));
    // Clear selected preset if a material is manually removed
    setSelectedPreset(null);
  };
  
  // Update quantity for a material
  const updateQuantity = (materialId: string, newQuantity: number) => {
    // Preserve scroll position by avoiding unnecessary re-renders
    // Set a flag to indicate this is an internal change to prevent parent updates
    isInternalChange.current = true;
    
    // Batch state updates to minimize renders
    const updates = () => {
      setLocalQuantities(prev => ({ ...prev, [materialId]: newQuantity }));
      
      // Note: actualWasteFactor is not recalculated on direct quantity update via input field.
      // It's set when the material is added or when global/GAF waste factors change.
      // This means manual quantity adjustments won't reflect a change in the *displayed* waste factor for that item
      // until a global waste factor change triggers a recalculation.
      
      // For GAF Timberline, update display quantity (squares)
      if (materialId === "gaf-timberline-hdz-sg") {
        setDisplayQuantities(prev => ({ ...prev, [materialId]: (newQuantity / 3).toFixed(1) }));
      } else {
        setDisplayQuantities(prev => ({ ...prev, [materialId]: newQuantity.toString() }));
      }
    };
    
    // Use requestAnimationFrame to make updates smoother and prevent scroll jumps
    window.requestAnimationFrame(updates);
  };
  
  // Toggle category expansion
  const toggleCategory = (category: string) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter(c => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };
  
  // Handle waste factor input change (lightweight - just update input state)
  const handleWasteFactorInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setWasteFactorInput(inputValue); // Allow any input during typing
  }, []); // Empty dependency array - this function never needs to change

  // Handle waste factor blur (heavy processing only when user finishes typing)
  const handleWasteFactorBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.trim();
    const newGlobalWastePercentage = parseFloat(inputValue);
    
    console.log(`🔧 [WasteFactorBlur] Input: "${inputValue}" → Parsed: ${newGlobalWastePercentage}%`);
    
    // Validate and clamp the value
    if (isNaN(newGlobalWastePercentage) || newGlobalWastePercentage < 0 || newGlobalWastePercentage > 50) {
      // Invalid input - revert to current waste factor
      console.log(`❌ [WasteFactorBlur] Invalid input, reverting to ${wasteFactor}%`);
      setWasteFactorInput(wasteFactor.toString());
      return;
    }
    
    const finalWasteValue = Math.round(newGlobalWastePercentage); // Round to integer
    
    // Only process if value actually changed
    if (finalWasteValue === wasteFactor) {
      console.log(`⏭️ [WasteFactorBlur] No change: ${finalWasteValue}% = ${wasteFactor}%`);
      setWasteFactorInput(finalWasteValue.toString()); // Normalize input display
      return;
    }

    console.log(`🎯 [WasteFactorBlur] Updating waste factor: ${wasteFactor}% → ${finalWasteValue}%`);
    setWasteFactor(finalWasteValue);
    setWasteFactorInput(finalWasteValue.toString()); // Normalize input display
      isInternalChange.current = true;
      
    const newGlobalWasteDecimal = finalWasteValue / 100;
      const updatedQuantities: { [key: string]: number } = {};
      const updatedDisplayQuantities: { [key: string]: string } = {};
      const updatedMaterialWasteFactors: { [key: string]: number } = {};
      // User override flags are not changed by global waste factor changes

      for (const materialId in localSelectedMaterials) {
        const material = localSelectedMaterials[materialId];
        
        if (material.id === "gaf-timberline-hdz-sg") {
          // GAF Timberline HDZ uses its own waste factor, skip it here
          updatedQuantities[materialId] = localQuantities[materialId]; 
          updatedDisplayQuantities[materialId] = displayQuantities[materialId]; 
          updatedMaterialWasteFactors[materialId] = materialWasteFactors[materialId];
          continue;
        }

        if (userOverriddenWaste[materialId]) {
          // User has set a specific waste for this item, so global does not apply
          updatedQuantities[materialId] = localQuantities[materialId];
          updatedDisplayQuantities[materialId] = displayQuantities[materialId];
          updatedMaterialWasteFactors[materialId] = materialWasteFactors[materialId];
          continue;
        }

        let overrideForCalc: number | undefined = newGlobalWasteDecimal;
        if (material.category === MaterialCategory.SHINGLES) {
          // For non-GAF, non-overridden shingles, global does not set an override, 
          // so they use their 12% default from utils.ts
          overrideForCalc = undefined;
        }
        // For VENTILATION and ACCESSORIES, they default to 0% waste. 
        // If global waste is applied, it will override this 0% unless they have a per-item override.
        // This behavior is implicitly handled by calculateMaterialQuantity if overrideForCalc is passed.
        
        const { quantity: newQuantity, actualWasteFactor } = calculateMaterialQuantity(
          material,
          measurements,
          overrideForCalc,
          dbWastePercentages // Pass database waste percentages
        );
        updatedQuantities[materialId] = newQuantity;
        updatedMaterialWasteFactors[materialId] = actualWasteFactor; 

        if (material.id === "gaf-timberline-hdz-sg") { 
          updatedDisplayQuantities[materialId] = (newQuantity / 3).toFixed(1);
        } else {
          updatedDisplayQuantities[materialId] = newQuantity.toString();
        }
      }
      console.log(`🔄 [WasteFactorBlur] Recalculated ${Object.keys(updatedQuantities).length} materials:`, updatedQuantities);
      setLocalQuantities(updatedQuantities);
      setDisplayQuantities(updatedDisplayQuantities);
      setMaterialWasteFactors(updatedMaterialWasteFactors);
      
      console.log(`✅ [WasteFactorBlur] State updates completed - new global waste: ${finalWasteValue}%`); 
  }, [wasteFactor, localSelectedMaterials, localQuantities, displayQuantities, materialWasteFactors, userOverriddenWaste, measurements, dbWastePercentages]); // Dependencies for useCallback
  
  // Handle GAF Timberline HDZ waste factor change
  const handleGafTimberlineWasteFactorChange = (newWasteFactorInput: number) => {
    const newWasteFactor = Math.max(0, Math.min(50, newWasteFactorInput)); // Clamp between 0 and 50
    setGafTimberlineWasteFactor(newWasteFactor);
    isInternalChange.current = true;
    
    // Only update GAF Timberline HDZ SG if it's selected
    const materialId = "gaf-timberline-hdz-sg";
    if (localSelectedMaterials[materialId]) {
      const { quantity: newQuantity, actualWasteFactor } = calculateMaterialQuantity(
        localSelectedMaterials[materialId],
        measurements,
        newWasteFactor / 100, // Pass the new GAF-specific waste factor
        dbWastePercentages // Pass database waste percentages
      );
      
      setLocalQuantities(prev => ({
        ...prev,
        [materialId]: newQuantity
      }));
      setMaterialWasteFactors(prev => ({ // Store new actual waste factor
        ...prev,
        [materialId]: actualWasteFactor 
      }));
      setDisplayQuantities(prev => ({
        ...prev,
        [materialId]: (newQuantity / 3).toFixed(1)
      }));
    }
  };
  
  // Apply material preset bundle
  const applyPresetBundle = (preset: string) => {
    console.log(`Applying preset bundle: ${preset}`);
    
    const PRESET_BUNDLES: { [key: string]: { id: string, description: string }[] } = {
      "GAF 1": [
        { id: "gaf-timberline-hdz-sg", description: "GAF Timberline HDZ SG (Shingles)" },
        { id: "gaf-prostart-starter-shingle-strip", description: "GAF ProStart Starter Shingle Strip" },
        { id: "gaf-seal-a-ridge", description: "GAF Seal-A-Ridge (Ridge Cap)" },
        { id: "gaf-weatherwatch-ice-water-shield", description: "GAF StormGuard Ice & Water Shield (Valleys)" },
        { id: "abc-pro-guard-20", description: "ABC Pro Guard 20 (Rhino Underlayment)" },
        { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
        { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" },
        { id: "cdx-plywood", description: "1/2\"x4'x8' CDX Plywood - 4-Ply" },
        // 🔧 NEW: Additional materials for steep slope areas
        { id: "millennium-galvanized-drip-edge", description: "Millennium Galvanized Steel Drip Edge - 26GA - 6\"" },
        { id: "karnak-flashing-cement", description: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)" },
        { id: "1inch-plastic-cap-nails", description: "1\" Plastic Cap Nails (3000/bucket)" },
        { id: "abc-electro-galvanized-coil-nails", description: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)" },
        { id: "coil-nails-ring-shank", description: "Coil Nails - Ring Shank - 2 3/8\"x.113\" (5000 Cnt)" }
      ],
      "GAF 2": [
        { id: "gaf-timberline-hdz-sg", description: "GAF Timberline HDZ SG (Shingles)" },
        { id: "gaf-prostart-starter-shingle-strip", description: "GAF ProStart Starter Shingle Strip" },
        { id: "gaf-seal-a-ridge", description: "GAF Seal-A-Ridge (Ridge Cap)" },
        { id: "gaf-feltbuster-synthetic-underlayment", description: "GAF FeltBuster Synthetic Underlayment" },
        { id: "gaf-weatherwatch-ice-water-shield", description: "GAF StormGuard Ice & Water Shield (Valleys)" },
        { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
        { id: "gaf-cobra-rigid-vent", description: "GAF Cobra Rigid Vent 3 Exhaust Ridge Vent" },
        { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" },
        { id: "cdx-plywood", description: "1/2\"x4'x8' CDX Plywood - 4-Ply" },
        // 🔧 NEW: Additional materials for steep slope areas
        { id: "millennium-galvanized-drip-edge", description: "Millennium Galvanized Steel Drip Edge - 26GA - 6\"" },
        { id: "karnak-flashing-cement", description: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)" },
        { id: "1inch-plastic-cap-nails", description: "1\" Plastic Cap Nails (3000/bucket)" },
        { id: "abc-electro-galvanized-coil-nails", description: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)" },
        { id: "coil-nails-ring-shank", description: "Coil Nails - Ring Shank - 2 3/8\"x.113\" (5000 Cnt)" }
      ],
      "OC 1": [
        { id: "oc-oakridge", description: "OC Oakridge Shingles" },
        { id: "oc-starter", description: "OC Starter" },
        { id: "oc-hip-ridge", description: "OC Hip & Ridge" },
        { id: "abc-pro-guard-20", description: "ABC Pro Guard 20 (Rhino Underlayment)" }
      ],
      "OC 2": [
        { id: "oc-duration", description: "OC Duration Shingles" },
        { id: "oc-starter", description: "OC Starter" },
        { id: "oc-hip-ridge", description: "OC Hip & Ridge" },
        { id: "maxfelt-nc", description: "MaxFelt NC Synthetic Underlayment" }
      ]
    };

    const selectedBundle = PRESET_BUNDLES[preset];
    if (!selectedBundle) {
      console.warn(`Preset bundle '${preset}' not found`);
      return;
    }

    console.log(`Found ${selectedBundle.length} materials for bundle: ${preset}`);

    // CRITICAL FIX: Merge with existing materials instead of replacing
    const newMaterials = { ...localSelectedMaterials }; // Start with existing materials
    const newQuantities = { ...localQuantities }; // Start with existing quantities
    const newWasteFactors = { ...materialWasteFactors }; // Preserve existing waste factors

    selectedBundle.forEach(({ id, description }) => {
      const material = ROOFING_MATERIALS.find(m => m.id === id);
      if (material) {
        const isGafTimberline = id === "gaf-timberline-hdz-sg";
        const overrideWaste = isGafTimberline 
          ? gafTimberlineWasteFactor / 100 
          : wasteFactor / 100;

        const { quantity: calculatedQuantity, actualWasteFactor } = calculateMaterialQuantity(
          material,
          measurements,
          overrideWaste,
          dbWastePercentages
        );

        // Only add if not already present, or if it's a replacement for same category
        console.log(`Adding material: ${material.name} (${id}) - Qty: ${calculatedQuantity}`);
        newMaterials[id] = material;
        newQuantities[id] = Math.max(1, calculatedQuantity);
        newWasteFactors[id] = actualWasteFactor;
      } else {
        console.warn(`Material with id '${id}' not found in ROOFING_MATERIALS`);
      }
    });

    // Update state with merged materials
    setLocalSelectedMaterials(newMaterials);
    setLocalQuantities(newQuantities);
    setMaterialWasteFactors(newWasteFactors);
    // 🔧 FIX: Update material order to maintain stable card positions
    setMaterialOrder(Object.keys(newMaterials));
    setSelectedPreset(preset);

    toast({
      title: "Materials Added Successfully! ✅",
      description: `${preset} package materials have been added to your existing selection (${Object.keys(newMaterials).length} total materials).`,
      duration: 4000,
      variant: "default"
    });

    console.log(`Successfully applied ${preset} preset. Total materials now: ${Object.keys(newMaterials).length}`);
  };

  // Reset selected preset when materials are changed manually
  useEffect(() => {
    // If user manually adds/removes materials, reset the selected preset
    setSelectedPreset(null);
  }, [localSelectedMaterials]);

  // Calculate total with current selections
  const calculateEstimateTotal = () => {
    // Calculate base total from selected materials and quantities
    let materialsTotal = Object.entries(localSelectedMaterials).reduce((total, [materialId, material]) => {
      const quantity = localQuantities[materialId] || 0;
      return total + (quantity * material.price);
    }, 0);
    
    // Add low slope costs if applicable
    if (showLowSlope && measurements && measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
      const lowSlopePitchArea = measurements.areasByPitch.find(
        area => area.pitch === "2:12" || area.pitch === "2/12"
      );
      
      if (lowSlopePitchArea) {
        const lowSlopeArea = lowSlopePitchArea.area;
        // $100/sq with 10% waste
        const lowSlopeCost = (lowSlopeArea / 100) * 100 * 1.1;
        materialsTotal += lowSlopeCost;
        
        // Add ISO cost if selected
        if (includeIso) {
          materialsTotal += (lowSlopeArea / 100) * 50; // $50/sq for ISO
        }
      }
    }
    
    // Add the calculated peel & stick system cost
    if (isPeelStickSelected && peelStickPrice) {
      const numericPeelStickPrice = parseFloat(peelStickPrice) || 0;
      materialsTotal += numericPeelStickPrice;
    }

    // Add warranty cost
    if (warrantyDetails && warrantyDetails.price > 0) {
      materialsTotal += warrantyDetails.price;
    }
    
    return materialsTotal;
  };
  
  // Format price for display
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined || isNaN(price)) return 'N/A';
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Helper to check if material is mandatory
  const isMandatoryMaterial = (materialId: string, materialName: string): boolean => {
    // Check for traditional "Required" materials
    if (materialName.includes('Required') && materialName.includes('cannot be removed')) {
      return true;
    }
    
    // Check for low-slope materials that are auto-selected when low-slope areas exist
    const lowSlopeMaterialIds = [
      'polyglass-elastoflex-sbs',  // BASE
      'polyglass-polyflex-app',    // CAP  
      'gaf-poly-iso-4x8'          // ISO
    ];
    
    if (lowSlopeMaterialIds.includes(materialId) && showLowSlope) {
      return true;
    }
    
    // Check for GAF package materials that are auto-selected
    const gafPackageMaterialIds = [
      'gaf-timberline-hdz-sg',
      'gaf-prostart-starter-shingle-strip',
      'gaf-seal-a-ridge',
      'gaf-weatherwatch-ice-water-shield',
      'abc-pro-guard-20',
      'gaf-feltbuster-synthetic-underlayment',
      'gaf-cobra-rigid-vent',
      'adjustable-lead-pipe-flashing-4inch',
      'master-sealant',
      'cdx-plywood',
      'millennium-galvanized-drip-edge',
      'karnak-flashing-cement',
      '1inch-plastic-cap-nails',
      'abc-electro-galvanized-coil-nails',
      'coil-nails-ring-shank'
    ];
    
    // 🎯 TERRITORY MANAGER OVERRIDE: Allow Territory Managers to delete individual GAF package materials
    if (gafPackageMaterialIds.includes(materialId) && selectedPackage) {
      // Territory Managers can delete individual materials even from GAF packages
      if (isManager) {
        return false; // Not mandatory for Territory Managers - they can delete
      }
      return true; // Mandatory for other users (Sales Reps, etc.)
    }
    
    return false;
  };

  // Helper to check if material is a low-slope material
  const isLowSlopeMaterial = (materialId: string): boolean => {
    const lowSlopeMaterialIds = [
      'polyglass-elastoflex-sbs',  // BASE
      'polyglass-polyflex-app',    // CAP  
      'gaf-poly-iso-4x8'          // ISO
    ];
    return lowSlopeMaterialIds.includes(materialId) && showLowSlope;
  };

  // Helper to check if material is a skylight material from job worksheet
  const isSkylightMaterial = (materialId: string): boolean => {
    const skylightMaterialIds = [
      'skylight-2x2',
      'skylight-2x4'
    ];
    return skylightMaterialIds.includes(materialId);
  };

  // 🎨 VISUAL STYLING: Check if material is auto-selected (for blue highlighting)
  const isAutoSelectedMaterial = (materialId: string): boolean => {
    const gafPackageMaterialIds = [
      'gaf-timberline-hdz-sg',
      'gaf-prostart-starter-shingle-strip',
      'gaf-seal-a-ridge',
      'gaf-weatherwatch-ice-water-shield',
      'abc-pro-guard-20',
      'gaf-feltbuster-synthetic-underlayment',
      'gaf-cobra-rigid-vent',
      'adjustable-lead-pipe-flashing-4inch',
      'master-sealant',
      'cdx-plywood',
      'millennium-galvanized-drip-edge',
      'karnak-flashing-cement',
      '1inch-plastic-cap-nails',
      'abc-electro-galvanized-coil-nails',
      'coil-nails-ring-shank'
    ];
    
    // Show blue styling for GAF package materials (whether package is selected or not)
    return gafPackageMaterialIds.includes(materialId);
  };
  
  // Format calculation logic with actual measurements and show estimated quantity
  const formatCalculationWithMeasurements = (material: Material): string => {
    // Starting with the base calculation text
    let calculationText = material.coverageRule?.calculation || "";
    
    // If we don't have a calculation text, use a default
    if (!calculationText) {
      if (material.category === MaterialCategory.SHINGLES) {
        calculationText = "Total Roof Area";
      } else if (material.category === MaterialCategory.UNDERLAYMENTS) {
        calculationText = "Total Roof Area";
      } else if (material.category === MaterialCategory.VENTILATION) {
        if (material.id.includes("ridge-vent")) {
          calculationText = "Ridge Length";
        } else if (material.id.includes("off-ridge")) {
          calculationText = "Per unit, manual quantity";
        } else {
          calculationText = "Manual quantity";
        }
      } else {
        calculationText = "Based on roof area and measurements";
      }
    }
    
    // Get the current actual waste factor for this material
    const currentActualWasteFactor = materialWasteFactors[material.id];
    
    // Replace placeholders with actual measurement values
    if (calculationText.includes("Total Area")) {
      calculationText = calculationText.replace("Total Area", `Total Area (${measurements.totalArea.toFixed(1)} sq ft)`);
    }
    
    if (calculationText.includes("Ridge Length")) {
      calculationText = calculationText.replace("Ridge Length", `Ridge Length (${measurements.ridgeLength.toFixed(1)} ft)`);
    }
    
    if (calculationText.includes("Hip Length")) {
      calculationText = calculationText.replace("Hip Length", `Hip Length (${measurements.hipLength.toFixed(1)} ft)`);
    }
    
    if (calculationText.includes("Valley Length")) {
      calculationText = calculationText.replace("Valley Length", `Valley Length (${measurements.valleyLength.toFixed(1)} ft)`);
    }
    
    if (calculationText.includes("Eave Length")) {
      calculationText = calculationText.replace("Eave Length", `Eave Length (${measurements.eaveLength.toFixed(1)} ft)`);
    }
    
    if (calculationText.includes("Rake Length")) {
      calculationText = calculationText.replace("Rake Length", `Rake Length (${measurements.rakeLength.toFixed(1)} ft)`);
    }

    if (calculationText.includes("Low Slope Area")) {
      // Calculate low slope area (<= 2/12)
      let lowSlopeArea = 0;
      if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
        lowSlopeArea = measurements.areasByPitch
          .filter(area => {
            const pitchParts = area.pitch.split(/[:\\/]/);
            const rise = parseInt(pitchParts[0] || '0');
            return !isNaN(rise) && rise <= 2;
          })
          .reduce((sum, area) => sum + (area.area || 0), 0);
      }
      calculationText = calculationText.replace("Low Slope Area (<= 2/12)", `Low Slope Area (${lowSlopeArea.toFixed(1)} sq ft)`);
      calculationText = calculationText.replace("Low Slope Area (0-2 pitch)", `Low Slope Area (0-2 pitch) (${lowSlopeArea.toFixed(1)} sq ft)`);
    }
    
    if (calculationText.includes("0/12 pitch area")) {
        let zeroPitchArea = 0;
        if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
            zeroPitchArea = measurements.areasByPitch
            .filter(area => ["0:12", "0/12"].includes(area.pitch))
            .reduce((sum, area) => sum + (area.area || 0), 0);
        }
        calculationText = calculationText.replace("0/12 pitch area", `0/12 Area (${zeroPitchArea.toFixed(1)} sq ft)`);
    }
    
    // Handle formulas with "Eaves LF" or "EavesLF" (for ProStart Starter Shingle)
    if (calculationText.includes("Eaves LF") || calculationText.includes("EavesLF")) {
      const eaveLength = measurements.eaveLength || 0;
      calculationText = calculationText
        .replace("Eaves LF", `Eaves LF (${eaveLength.toFixed(1)} ft)`)
        .replace("EavesLF", `Eaves LF (${eaveLength.toFixed(1)} ft)`);
    }
    
    // Handle combined Ridge+Hip length calculations
    if (calculationText.includes("(Ridge Length") && calculationText.includes("Hip Length")) {
      const ridgeLength = measurements.ridgeLength || 0;
      const hipLength = measurements.hipLength || 0;
      const totalLength = ridgeLength + hipLength;
      calculationText = calculationText.replace(
        /\(Ridge Length.*\+ Hip Length.*\)/,
        `(Ridge Length (${ridgeLength.toFixed(1)} ft) + Hip Length (${hipLength.toFixed(1)} ft) = ${totalLength.toFixed(1)} ft)`
      );
    }

    // Handle formulas with "Steep Slope Area"
    if (calculationText.includes("Steep Slope Area")) {
      let steepSlopeArea = 0;
      if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
        steepSlopeArea = measurements.areasByPitch
          .filter(area => {
            const pitchParts = area.pitch.split(/[:\\/]/);
            const rise = parseInt(pitchParts[0] || '0');
            return !isNaN(rise) && rise >= 3;
          })
          .reduce((sum, area) => sum + (area.area || 0), 0);
      }
      calculationText = calculationText.replace("Steep Slope Area", `Steep Slope Area (${steepSlopeArea.toFixed(1)} sq ft)`);
    }
    
    // Handle formulas with waste percentage references
    if (calculationText.includes("Waste%") || calculationText.includes("Waste %")) {
      const wastePercent = material.id === "gaf-timberline-hdz-sg" 
        ? gafTimberlineWasteFactor
        : (currentActualWasteFactor !== undefined ? Math.round(currentActualWasteFactor * 100) : wasteFactor);
      
      calculationText = calculationText
        .replace("Waste%", `Waste (${wastePercent}%)`)
        .replace("Waste %", `Waste (${wastePercent}%)`);
    }
    
    // Replace generic (1 + Waste%) pattern
    if (calculationText.includes("(1 + Waste")) {
      const wastePercent = material.id === "gaf-timberline-hdz-sg" 
        ? gafTimberlineWasteFactor
        : (currentActualWasteFactor !== undefined ? Math.round(currentActualWasteFactor * 100) : wasteFactor);
      
      calculationText = calculationText.replace(
        /\(1 \+ Waste.*?\)/,
        `(1 + Waste ${wastePercent}%)`
      );
    }
    
    const quantity = localQuantities[material.id] || 0;
    
    // Add a summary showing the calculated quantity that matches the displayed quantity
    calculationText += ` → ${quantity} ${material.unit}${quantity !== 1 ? 's' : ''} needed`;
    
    // For shingles that use bundles/squares, show square footage too
    if (material.id === "gaf-timberline-hdz-sg" || 
        (material.category === MaterialCategory.SHINGLES && material.bundlesPerSquare)) {
      const bundlesPerSq = material.bundlesPerSquare || (material.id === "gaf-timberline-hdz-sg" ? 3 : undefined);
      if (bundlesPerSq) {
        const squares = quantity / bundlesPerSq;
        calculationText += ` (${squares.toFixed(1)} squares)`;
      }
    }
    
    return calculationText;
  };
  
  // Render a selected material row with quantity
  const renderSelectedMaterial = (materialId: string, material: Material) => {
    const isGafTimberline = materialId === "gaf-timberline-hdz-sg";
    const bundleQuantity = localQuantities[materialId] || 0;
    const isMandatory = material.name && isMandatoryMaterial(materialId, material.name);
    const isLowSlope = isLowSlopeMaterial(materialId);
    const isAutoSelected = isAutoSelectedMaterial(materialId);
    
    // Check if this is a JWS accessory (accessories that sales reps can edit)
    const isJWSAccessory = material.category === MaterialCategory.ACCESSORIES;
    
    // Project managers (sales reps) can only edit JWS accessories, not package materials
    const isReadOnlyForProjectManager = effectiveUserRole === 'rep' && !isJWSAccessory;
    
    // Check if this is a synthetic underlayment that should be double layer
    const syntheticDoubleLayerUnderlayments = [
      'abc-pro-guard-20',
      'gaf-feltbuster-synthetic-underlayment',
      'maxfelt-nc'
    ];
    const isSyntheticDoubleLayer = syntheticDoubleLayerUnderlayments.includes(materialId);
    
    // Ensure waste factor exists, falling back to the default for the material if not in state yet.
    const currentWasteFactorForMaterial = materialWasteFactors[materialId] ?? determineWasteFactor(material, undefined, dbWastePercentages);

    const initialDisplayValue = () => {
      const qty = localQuantities[materialId] || 0;
      return isGafTimberline ? Math.ceil(qty / 3).toString() : qty.toString();
    };

    const handleQuantityInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        let newBundlesOrUnits: number;

        if (isGafTimberline) {
            const newSquares = parseFloat(rawValue);
            if (!isNaN(newSquares) && newSquares >= 0) {
                newBundlesOrUnits = Math.ceil(newSquares * 3);
            } else { // Revert to current quantity if input is invalid or empty
                newBundlesOrUnits = localQuantities[materialId] || 0;
            }
        } else {
            const newQuantityNum = parseInt(rawValue, 10);
            if (!isNaN(newQuantityNum) && newQuantityNum >= 0) {
                newBundlesOrUnits = newQuantityNum;
            } else { // Revert to current quantity if input is invalid or empty
                newBundlesOrUnits = localQuantities[materialId] || 0;
            }
        }
        // Only call updateQuantity if the value has actually changed to avoid unnecessary updates/flicker
        if (newBundlesOrUnits !== (localQuantities[materialId] || 0) || 
            (isGafTimberline && parseFloat(rawValue).toFixed(1) !== (localQuantities[materialId] / 3).toFixed(1)) ) {
            updateQuantity(materialId, newBundlesOrUnits);
        }
    };

    // RESTORED: handlePerMaterialWasteChange function (logic from previous correct version)
    const handlePerMaterialWasteChange = (materialIdForWaste: string, newWastePercentage: string) => {
      const newWaste = parseFloat(newWastePercentage);
      const targetMaterial = localSelectedMaterials[materialIdForWaste] || material; // Ensure we use the correct material

      if (!isNaN(newWaste) && newWaste >= 0 && newWaste <= 100) {
        isInternalChange.current = true;
        const newWasteDecimal = newWaste / 100;
        
        // Recalculate quantity for this material only with the new waste
        const { quantity: updatedQuantity, actualWasteFactor: finalWasteFactor } = calculateMaterialQuantity(
          targetMaterial,
          measurements,
          newWasteDecimal, 
          dbWastePercentages 
        );

        // Update local states
        setLocalQuantities(prev => ({ ...prev, [materialIdForWaste]: updatedQuantity }));
        setMaterialWasteFactors(prev => ({ ...prev, [materialIdForWaste]: finalWasteFactor })); 
        setUserOverriddenWaste(prev => ({ ...prev, [materialIdForWaste]: true })); // Mark as user overridden

        if (targetMaterial.id === "gaf-timberline-hdz-sg") {
          setDisplayQuantities(prev => ({ ...prev, [materialIdForWaste]: Math.ceil(updatedQuantity / 3).toString() }));
        } else {
          setDisplayQuantities(prev => ({ ...prev, [materialIdForWaste]: updatedQuantity.toString() }));
        }
        
        updateMaterialWastePercentage(materialIdForWaste, newWaste)
          .then(success => {
            if (success) {
              console.log(`Updated waste percentage for ${materialIdForWaste} in database: ${newWaste}%`);
              setDbWastePercentages(prev => ({ ...prev, [materialIdForWaste]: newWaste }));
            } else { /* ... error ... */ }
          }).catch(error => { /* ... error ... */ });

        toast({ title: `${targetMaterial.name} waste factor updated to ${newWaste.toFixed(0)}%`, duration: 2000 });
      } else if (newWastePercentage === "") {
        isInternalChange.current = true;
        const { quantity: updatedQuantity, actualWasteFactor: finalWasteFactor } = calculateMaterialQuantity(targetMaterial, measurements, 0, dbWastePercentages);
        setLocalQuantities(prev => ({ ...prev, [materialIdForWaste]: updatedQuantity }));
        setMaterialWasteFactors(prev => ({ ...prev, [materialIdForWaste]: finalWasteFactor }));
        setUserOverriddenWaste(prev => ({ ...prev, [materialIdForWaste]: true })); // Still overridden, but to 0%

        if (targetMaterial.id === "gaf-timberline-hdz-sg") {
          setDisplayQuantities(prev => ({ ...prev, [materialIdForWaste]: Math.ceil(updatedQuantity / 3).toString() }));
        } else {
          setDisplayQuantities(prev => ({ ...prev, [materialIdForWaste]: updatedQuantity.toString() }));
        }
        toast({ title: `${targetMaterial.name} waste factor set to 0%`, duration: 2000 });
      }
    };

    let baseName = material.name || "";
    let requirementText = "";
    if (isMandatory) {
      const match = baseName.match(/^(.*?)(\s*\(Required.*?\))$/);
      if (match && match[1] && match[2]) {
        baseName = match[1].trim();
        requirementText = match[2].trim();
      }
    }

    // Calculate area coverage and other details
    const totalArea = measurements?.totalArea || 0;
    
    // Get dimensions or coverage area info if available
    const getDimensionsDisplay = () => {
      // This was removed - we don't use dimensions anymore
      return "";
    };
    
    // Get coverage area if available
    const getCoverageDisplay = () => {
      if (material.coveragePerUnit && material.coveragePerUnit > 0) {
        return `${material.coveragePerUnit} sq ft${material.unit === 'Roll' ? '/roll' : ''}`;
      }
      return "";
    };
    
    // Get bundle/squares info for shingles
    const getBundleInfo = () => {
      if (isGafTimberline) {
        // For GAF Timberline, show squares and bundles - round up squares
        const squares = Math.ceil(bundleQuantity / 3);
        return `${squares} squares (${bundleQuantity} bundles)`;
      } else if (material.bundlesPerSquare && material.bundlesPerSquare > 0) {
        return `${material.bundlesPerSquare} bundles/square`;
      }
      return "";
    };

    // Determine styling based on material type
    const getContainerStyling = () => {
      if (isLowSlope) {
        return 'py-2 px-3 rounded-md border-2 bg-green-50 border-green-300';
      } else if (isSkylightMaterial(materialId)) {
        return 'py-2 px-3 rounded-md border-2 bg-yellow-50 border-yellow-300';
      } else if (isAutoSelected) {
        return 'py-2 px-3 rounded-md border-2 bg-blue-50 border-blue-300';
      } 
      // Apply ventilation color coding
      else if (materialId.includes('gooseneck')) {
        return 'p-3 rounded-md border border-orange-300 bg-orange-50';
      } else if (materialId.includes('boot')) {
        return 'p-3 rounded-md border border-gray-400 bg-gray-50';
      } else if (materialId.includes('skylight')) {
        return 'p-3 rounded-md border border-sky-300 bg-sky-50';
      } else if (materialId.includes('gutter')) {
        return 'p-3 rounded-md border border-amber-600 bg-amber-50';
      } else {
        return 'p-3 rounded-md border border-gray-200';
      }
    };

    // SIMPLIFIED VIEW FOR SALES REPS
    if (effectiveUserRole === 'rep') {
      return (
        <div
          key={materialId}
          className={`p-4 mb-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
            isLowSlope 
              ? 'bg-gradient-to-r from-green-50 to-green-100/50 border border-green-200 hover:border-green-300' 
              : isSkylightMaterial(materialId)
              ? 'bg-gradient-to-r from-yellow-50 to-yellow-100/50 border border-yellow-200 hover:border-yellow-300'
              : isAutoSelected
              ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 hover:border-blue-300'
              : materialId.includes('gooseneck')
              ? 'bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-300 hover:border-orange-400'
              : materialId.includes('boot')
              ? 'bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-400 hover:border-gray-500'
              : materialId.includes('skylight')
              ? 'bg-gradient-to-r from-sky-50 to-sky-100/50 border border-sky-300 hover:border-sky-400'
              : 'bg-white hover:bg-gray-50 border border-gray-200'
          }`}
        >
          {/* Material name and badge */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 pr-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 leading-tight mb-1">{baseName}</p>
                {isReadOnlyForProjectManager && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Quantity locked - Package materials cannot be modified</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {(isAutoSelected || isLowSlope || isSkylightMaterial(materialId) || isSyntheticDoubleLayer) && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  isLowSlope 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : isSkylightMaterial(materialId)
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : isSyntheticDoubleLayer
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {isLowSlope ? '🌿 Low-Slope Required' : 
                   isSkylightMaterial(materialId) ? '☀️ From Job Worksheet' : 
                   isSyntheticDoubleLayer ? '⬆️ Double Layer' :
                   'Auto-Selected'}
                </span>
              )}
            </div>
            
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
              isLowSlope 
                ? 'bg-gradient-to-br from-green-400 to-green-500 text-white' 
                : isSkylightMaterial(materialId)
                ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white'
                : isAutoSelected
                ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white'
                : materialId.includes('gooseneck')
                ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
                : materialId.includes('boot')
                ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                : materialId.includes('skylight')
                ? 'bg-gradient-to-br from-sky-400 to-sky-500 text-white'
                : 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
            }`}>
              <span className="text-sm font-bold">
                {baseName.substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Quantity and controls row */}
          <div className="flex items-center justify-between gap-2">
            {/* Quantity display */}
            <div className="flex items-baseline gap-2 flex-shrink min-w-0">
              <span className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                {isGafTimberline 
                  ? Math.ceil(bundleQuantity / 3)
                  : bundleQuantity
                }
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-600">
                  {isGafTimberline 
                    ? 'squares'
                    : material.unit === 'Bundle' ? 'bundles' : material.unit.toLowerCase()
                  }
                </span>
                {isGafTimberline && (
                  <span className="text-xs text-gray-500">
                    ({bundleQuantity} bundles)
                  </span>
                )}
              </div>
            </div>
            
            {/* Controls section - prevent shrinking */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isReadOnlyForProjectManager ? (
                // Read-only display for project managers (except for accessories)
                <div className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg bg-gray-50 min-w-[3rem] text-center">
                  {isGafTimberline 
                    ? Math.ceil(bundleQuantity / 3)
                    : bundleQuantity
                  }
                  <span className="text-xs text-gray-500 ml-1">
                    {isGafTimberline ? 'sq' : material.unit === 'Bundle' ? 'bnd' : material.unit.slice(0, 3).toLowerCase()}
                  </span>
                </div>
              ) : (
                // Editable controls for other roles or JWS accessories
                <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (isGafTimberline) {
                        const currentQty = localQuantities[materialId] || 0;
                        const currentSq = currentQty / 3;
                        const nextSq = Math.max(0, parseFloat((currentSq - 0.1).toFixed(1)));
                        updateQuantity(materialId, Math.ceil(nextSq * 3));
                      } else {
                        updateQuantity(materialId, Math.max(0, (localQuantities[materialId] || 0) - 1));
                      }
                    }}
                    className="px-3 py-2 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  >
                    <span className="text-gray-600 font-medium">−</span>
                  </button>
                  
                  <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-x border-gray-200 bg-gray-50 min-w-[3rem] text-center">
                    {isGafTimberline 
                      ? Math.ceil(bundleQuantity / 3)
                      : bundleQuantity
                    }
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (isGafTimberline) {
                        const currentQty = localQuantities[materialId] || 0;
                        const currentSq = currentQty / 3;
                        const nextSq = parseFloat((currentSq + 0.1).toFixed(1));
                        updateQuantity(materialId, Math.ceil(nextSq * 3));
                      } else {
                        updateQuantity(materialId, (localQuantities[materialId] || 0) + 1);
                      }
                    }}
                    className="px-3 py-2 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                    aria-label={`Increase quantity for ${baseName}`}
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Delete button - Only show if not mandatory and not read-only for project managers */}
              {!isMandatory && !isReadOnlyForProjectManager && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    removeMaterial(materialId);
                  }}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors group focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`Remove ${baseName}`}
                >
                  <Trash className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ORIGINAL DETAILED VIEW FOR OTHER ROLES
    return (
      <div
        key={materialId}
        className={`${getContainerStyling()}`}
      >
        {/* Material Info Container */}
        <div className="flex flex-col gap-1">
          {/* Title and Badge Row */}
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-gray-800 text-sm leading-tight">{baseName}</span>
            {(isAutoSelected || isLowSlope || isSkylightMaterial(materialId) || isSyntheticDoubleLayer) && (
              <Badge 
                variant="default" 
                className={`text-white text-xs px-1.5 py-0.5 whitespace-nowrap ${
                  isLowSlope 
                    ? 'bg-green-600' 
                    : isSkylightMaterial(materialId)
                    ? 'bg-yellow-600'
                    : isSyntheticDoubleLayer
                    ? 'bg-purple-600'
                    : 'bg-blue-600'
                }`}
              >
                {isLowSlope ? 'Low-Slope Required' : 
                 isSkylightMaterial(materialId) ? 'From Job Worksheet' :
                 isSyntheticDoubleLayer ? 'Double Layer' :
                 'Auto-Selected'}
              </Badge>
            )}
          </div>
          
          {/* Requirement Text */}
          {(isAutoSelected || isLowSlope || isSkylightMaterial(materialId) || isSyntheticDoubleLayer) && (requirementText || isSyntheticDoubleLayer) && (
            <p className={`text-xs leading-tight font-medium ${
              isLowSlope ? 'text-green-700' : 
              isSkylightMaterial(materialId) ? 'text-yellow-700' : 
              isSyntheticDoubleLayer ? 'text-purple-700' :
              'text-blue-700'
            }`}>
              {isSyntheticDoubleLayer ? 'Double layer application on steep slope areas' : requirementText}
            </p>
          )}
          
          {/* Quantity Summary */}
          {(isAutoSelected || isLowSlope || isSkylightMaterial(materialId) || isSyntheticDoubleLayer) && bundleQuantity > 0 && (
            <div className={`text-xs ${
              isLowSlope ? 'text-green-700' : 
              isSkylightMaterial(materialId) ? 'text-yellow-700' : 
              isSyntheticDoubleLayer ? 'text-purple-700' :
              'text-blue-700'
            }`}>
              <p className="font-medium">
                {isGafTimberline 
                    ? `${Math.ceil(bundleQuantity / 3)} squares (${bundleQuantity} bundles)`
                  : `Quantity: ${bundleQuantity} ${material.unit}${bundleQuantity > 1 ? 's' : ''}`
                }
                {material.coveragePerUnit && (
                  <span className="font-normal"> • Covers approx. {(bundleQuantity * material.coveragePerUnit).toFixed(0)} sq ft</span>
                )}
                {isSyntheticDoubleLayer && (
                  <span className="font-normal"> • Base qty: {Math.ceil(bundleQuantity / 2)}</span>
                )}
              </p>
            </div>
          )}
          
          {/* Price Information - Hide for sales reps */}
          {effectiveUserRole !== 'rep' && (
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1">
             {isGafTimberline && material.approxPerSquare && (
                 <>{formatPrice(material.approxPerSquare)} per Square</>
             )}
             {!isGafTimberline && material.price > 0 && 
              <>{formatPrice(material.price)} per {material.unit}</>
            }
             {!isGafTimberline && material.approxPerSquare && material.approxPerSquare > 0 && 
                <span>(≈ {formatPrice(material.approxPerSquare)}/square)</span>
             }
             {material.id === 'full-peel-stick-system' && 
                 <span className="italic">(Cost included in Add-on Price)</span>
             }
          </div>
          )}
          
          {/* Calculation Details - Hide for sales reps */}
          {material.coverageRule && effectiveUserRole !== 'rep' && (
            <div className="text-xs text-gray-600 space-y-1 mt-1">
              <p className="leading-tight font-medium">• Calculation Details: {formatCalculationWithMeasurements(material)}</p>
              
              {/* Waste Factor Controls */}
              {currentWasteFactorForMaterial !== undefined && 
               material.category !== MaterialCategory.VENTILATION && 
               material.category !== MaterialCategory.ACCESSORIES && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="mr-1">• Waste:</span>
                  <Input
                    id={`waste-input-${materialId}`}
                    type="number"
                    min="0"
                    max="100"
                    value={(currentWasteFactorForMaterial * 100).toFixed(0)}
                    onChange={(e) => handlePerMaterialWasteChange(materialId, e.target.value)}
                    className="h-5 w-10 py-0 px-1 text-center text-xs"
                    aria-label={`Waste factor for ${baseName}`}
                  />
                  <span className="text-xs">%</span>
                  
                  {/* Preset Buttons */}
                  <div className="flex gap-0.5 ml-1">
                    {[0, 5, 10, 12, 15].map(presetValue => (
                      <Button
                        key={`waste-preset-${presetValue}`}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`h-5 w-7 px-0 py-0 text-[9px] ${Math.round(currentWasteFactorForMaterial * 100) === presetValue ? 'bg-blue-100' : ''}`}
                        onClick={() => handlePerMaterialWasteChange(materialId, presetValue.toString())}
                      >
                        {presetValue}%
                      </Button>
                    ))}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground ml-0.5" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Adjust waste factor for this material. Changes will update the quantity.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Bundle/Square Info */}
          {!material.coverageRule?.description && getBundleInfo() && (
            <p className="text-[10px] text-muted-foreground">• {getBundleInfo()}</p>
          )}
        </div>
  
        {/* Quantity Controls and Delete Button */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center flex-1">
             {isReadOnlyForProjectManager ? (
               // Read-only display for project managers (except for accessories)
               <div className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg bg-gray-50 text-center">
                 {isGafTimberline 
                   ? `${Math.ceil(bundleQuantity / 3)} squares`
                   : `${bundleQuantity} ${material.unit.toLowerCase()}`
                 }
               </div>
             ) : isGafTimberline ? (
               <> {/* Timberline Input (Squares) */}
                 <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-r-none" 
                    onClick={(e) => { 
                       e.preventDefault();
                       const currentQty = localQuantities[materialId] || 0;
                       const currentSq = currentQty / 3;
                       const nextSq = Math.max(0, parseFloat((currentSq - 0.1).toFixed(1))); 
                       updateQuantity(materialId, Math.ceil(nextSq * 3));
                    }} 
                    aria-label={`Decrease quantity for ${baseName}`}>
                    -
                  </Button>
                 <Input 
                    id={`qty-gaf-${materialId}`}
                    type="number" 
                    min="0" 
                    step="0.1"
                    defaultValue={initialDisplayValue()}
                    onBlur={handleQuantityInputBlur}      // UPDATE onBlur
                    key={`qty-input-gaf-${materialId}-${localQuantities[materialId]}`} // Add localQuantities to key to force re-render with new default if external change happens
                    className="h-7 w-16 rounded-none text-center text-sm"
                    aria-label={`Quantity in Squares for ${baseName}`} 
                  />
                 <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-l-none" 
                    onClick={(e) => { 
                       e.preventDefault();
                       const currentQty = localQuantities[materialId] || 0;
                       const currentSq = currentQty / 3;
                       const nextSq = parseFloat((currentSq + 0.1).toFixed(1));
                       updateQuantity(materialId, Math.ceil(nextSq * 3));
                    }} 
                    aria-label={`Increase quantity for ${baseName}`}>
                    +
                  </Button>
               </>
             ) : (
               <> {/* Other Material Input (Bundles/Units) */}
                 <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-r-none" 
                    onClick={(e) => {
                      e.preventDefault();
                      updateQuantity(materialId, Math.max(0, (localQuantities[materialId] || 0) - 1));
                    }} 
                    aria-label={`Decrease quantity for ${baseName}`}
                  >-</Button>
                 <Input 
                    id={`qty-${materialId}`}
                    type="number" 
                    min="0" 
                    defaultValue={initialDisplayValue()}
                    onBlur={handleQuantityInputBlur}      // UPDATE onBlur
                    key={`qty-input-${materialId}-${localQuantities[materialId]}`} // Add localQuantities to key
                    className="h-7 w-14 rounded-none text-center text-sm" 
                    aria-label={`Quantity for ${baseName}`}
                  />
                 <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-l-none" 
                    onClick={(e) => {
                      e.preventDefault();
                      updateQuantity(materialId, (localQuantities[materialId] || 0) + 1);
                    }} 
                    aria-label={`Increase quantity for ${baseName}`}
                  >+</Button>
               </>
             )}
          </div>
          <Button 
             type="button" 
             variant="ghost" 
             size="icon" 
             onClick={() => removeMaterial(materialId)} 
             className={`h-7 w-7 text-red-500 hover:bg-red-50 ${isMandatory || isReadOnlyForProjectManager ? 'opacity-50 cursor-not-allowed' : ''}`} 
             disabled={isMandatory || isReadOnlyForProjectManager}
             aria-label={`Remove ${baseName}`}
           >
             <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Update warranty selection when package changes
  useEffect(() => {
    // If no package is selected, we can't have a warranty
    if (!selectedPackage) {
      if (selectedWarranty) {
        console.log("Removing warranty because no package is selected");
        setSelectedWarranty(null);
        toast({
          title: "Warranty Removed",
          description: "Warranties require a GAF package to be selected.",
          duration: 4000,
          variant: "default"
        });
      }
      return;
    }
    
    // Auto-select warranty based on package - only if warranty is not already set appropriately
    if (selectedPackage === '3mg-1') {
      // 3MG Standard always uses Silver Pledge
      if (selectedWarranty !== 'silver-pledge') {
        console.log("Auto-selecting Silver Pledge warranty for 3MG Standard package");
        setSelectedWarranty('silver-pledge');
      }
    } else if (selectedPackage === '3mg-2') {
      // 3MG Select always uses Gold Pledge
      if (selectedWarranty !== 'gold-pledge') {
        console.log("Auto-selecting Gold Pledge warranty for 3MG Select package");
        setSelectedWarranty('gold-pledge');
      }
    } else if (selectedPackage === 'gaf-1') {
      // GAF 1 can only use Silver Pledge
      if (selectedWarranty === 'gold-pledge') {
        console.log("Changing warranty from Gold Pledge to Silver Pledge because GAF 1 Basic Package was selected");
        setSelectedWarranty('silver-pledge');
      }
    } else if (selectedPackage === 'gaf-2') {
      // GAF 2 can use either warranty, default to Gold Pledge if none selected
      if (!selectedWarranty) {
        console.log("Auto-selecting Gold Pledge warranty for GAF 2 Premium Package");
        setSelectedWarranty('gold-pledge');
      }
    }
  }, [selectedPackage]); // Removed selectedWarranty and toast from deps to prevent loops

  // 🎯 CRITICAL FIX: Auto-sync GAF package selection with material presets
  // When users select GAF 1 or GAF 2 in the big boxes at top, automatically apply materials
  // When deselected, remove GAF materials from selection
  const previousPackageRef = useRef<string | null>(null);
  const packageUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Only run if package selection actually changed (including null changes)
    if (!measurements || previousPackageRef.current === selectedPackage) {
      previousPackageRef.current = selectedPackage;
      return;
    }
    
    // CRITICAL FIX: Don't auto-populate for empty string packages
    if (selectedPackage === '') {
      console.log(`🎯 GAF Package Sync: Skipping auto-populate for empty string package`);
      previousPackageRef.current = selectedPackage;
      return;
    }
    
    // Clear any pending updates to prevent rapid-fire updates
    if (packageUpdateTimeoutRef.current) {
      clearTimeout(packageUpdateTimeoutRef.current);
    }
    
    // Debounce the package updates to prevent state loops
    packageUpdateTimeoutRef.current = setTimeout(() => {
      console.log(`🎯 GAF Package Changed: ${previousPackageRef.current} → ${selectedPackage}`);
      
      // CRITICAL FIX: Define ALL package materials (GAF AND OC) that should be removed when switching
      const allPackageMaterials = [
        // GAF Package Materials
        "gaf-timberline-hdz-sg",
        "gaf-prostart-starter-shingle-strip", 
        "gaf-seal-a-ridge",
        "gaf-weatherwatch-ice-water-shield",
        "abc-pro-guard-20", // GAF 1 only
        "gaf-feltbuster-synthetic-underlayment", // GAF 2 only
        "gaf-cobra-rigid-vent", // GAF 2 only
        "adjustable-lead-pipe-flashing-4inch",
        "master-sealant",
        "cdx-plywood",
        "millennium-galvanized-drip-edge",
        "karnak-flashing-cement",
        "1inch-plastic-cap-nails",
        "abc-electro-galvanized-coil-nails",
        "coil-nails-ring-shank",
        // OC Package Materials (3MG Standard - OC)
        "oc-duration",
        "oc-oakridge",
        "oc-hip-ridge", 
        "oc-starter",
        "poly-glass-irxe", // Used in both GAF and OC packages
        // 3MG Select Materials
        "gaf-uhdz-shingles"
      ];
      
      // 🔧 PRESERVE ORDER: Remove all package materials when switching, preserve accessories/ventilation
      // Create arrays to track current order of materials
      const currentMaterialOrder = Object.keys(localSelectedMaterials);
      const newMaterials: {[key: string]: Material} = {};
      const newQuantities: {[key: string]: number} = {};
      const newWasteFactors: {[key: string]: number} = {};
      
      // First, preserve all NON-PACKAGE materials (accessories, ventilation, low-slope)
      currentMaterialOrder.forEach(materialId => {
        if (!allPackageMaterials.includes(materialId)) {
          newMaterials[materialId] = localSelectedMaterials[materialId];
          newQuantities[materialId] = localQuantities[materialId];
          if (materialWasteFactors[materialId] !== undefined) {
            newWasteFactors[materialId] = materialWasteFactors[materialId];
          }
        }
      });
      
      let toastMessage = "";
      
      if (!selectedPackage) {
        // Package deselected - remove all package materials
        toastMessage = "Package materials removed from selection";
        console.log("🎯 Package Deselected: Removing all package materials");
      } else {
        // Package selected - add the appropriate GAF materials
        const packageToPreset: Record<string, string> = {
          'gaf-1': 'GAF 1',
          'gaf-2': 'GAF 2',
          '3mg-standard-oc': '3MG Standard - OC',
          '3mg-standard-gaf': '3MG Standard - GAF',
          '3mg-select': '3MG Select'
        };
        
        const presetName = packageToPreset[selectedPackage];
        if (presetName) {
          console.log(`🎯 Package Selected: Adding ${presetName} materials`);
            
            // 🏗️ ENHANCED: Updated GAF packages + new flat-only roof logic
            const PRESET_BUNDLES: { [key: string]: { id: string, description: string }[] } = {
            "GAF 1": [
              { id: "gaf-timberline-hdz-sg", description: "GAF Timberline HDZ SG (Shingles)" },
              { id: "gaf-prostart-starter-shingle-strip", description: "GAF ProStart Starter Shingle Strip" },
              { id: "gaf-seal-a-ridge", description: "GAF Seal-A-Ridge (Ridge Cap)" },
              { id: "gaf-weatherwatch-ice-water-shield", description: "GAF StormGuard Ice & Water Shield (Valleys)" },
              { id: "abc-pro-guard-20", description: "ABC Pro Guard 20 (Rhino Underlayment)" },
              { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
              { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" },
              { id: "cdx-plywood", description: "1/2\"x4'x8' CDX Plywood - 4-Ply" },
              // 🔧 NEW: Additional materials for steep slope areas
              { id: "millennium-galvanized-drip-edge", description: "Millennium Galvanized Steel Drip Edge - 26GA - 6\"" },
              { id: "karnak-flashing-cement", description: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)" },
              { id: "1inch-plastic-cap-nails", description: "1\" Plastic Cap Nails (3000/bucket)" },
              { id: "abc-electro-galvanized-coil-nails", description: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)" },
              { id: "coil-nails-ring-shank", description: "Coil Nails - Ring Shank - 2 3/8\"x.113\" (5000 Cnt)" }
            ],
            "GAF 2": [
              { id: "gaf-timberline-hdz-sg", description: "GAF Timberline HDZ SG (Shingles)" },
              { id: "gaf-prostart-starter-shingle-strip", description: "GAF ProStart Starter Shingle Strip" },
              { id: "gaf-seal-a-ridge", description: "GAF Seal-A-Ridge (Ridge Cap)" },
              { id: "gaf-feltbuster-synthetic-underlayment", description: "GAF FeltBuster Synthetic Underlayment" },
              { id: "gaf-weatherwatch-ice-water-shield", description: "GAF StormGuard Ice & Water Shield (Valleys)" },
              { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
              { id: "gaf-cobra-rigid-vent", description: "GAF Cobra Rigid Vent 3 Exhaust Ridge Vent" },
              { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" },
              { id: "cdx-plywood", description: "1/2\"x4'x8' CDX Plywood - 4-Ply" },
              // 🔧 NEW: Additional materials for steep slope areas
              { id: "millennium-galvanized-drip-edge", description: "Millennium Galvanized Steel Drip Edge - 26GA - 6\"" },
              { id: "karnak-flashing-cement", description: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)" },
              { id: "1inch-plastic-cap-nails", description: "1\" Plastic Cap Nails (3000/bucket)" },
              { id: "abc-electro-galvanized-coil-nails", description: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)" },
              { id: "coil-nails-ring-shank", description: "Coil Nails - Ring Shank - 2 3/8\"x.113\" (5000 Cnt)" }
            ],
            "3MG Standard - OC": [
              { id: "oc-oakridge", description: "Owens Corning Oakridge" }, // FIXED: Only OC Oakridge, not Duration
              { id: "oc-hip-ridge", description: "OC Hip & Ridge" }, // FIXED: Use existing material ID
              { id: "oc-starter", description: "OC Starter" }, // FIXED: Use existing material ID
              { id: "maxfelt-nc", description: "MaxFelt NC Synthetic Underlayment" },
              { id: "poly-glass-irxe", description: "Poly Glass IRXE (Valleys)" },
              { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
              { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" },
              { id: "cdx-plywood", description: "1/2\"x4'x8' CDX Plywood - 4-Ply" },
              { id: "millennium-galvanized-drip-edge", description: "Millennium Galvanized Steel Drip Edge - 26GA - 6\"" },
              { id: "karnak-flashing-cement", description: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)" },
              { id: "1inch-plastic-cap-nails", description: "1\" Plastic Cap Nails (3000/bucket)" },
              { id: "abc-electro-galvanized-coil-nails", description: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)" }
            ],
            "3MG Standard - GAF": [
              { id: "gaf-timberline-hdz-sg", description: "GAF Timberline HDZ SG (Shingles)" },
              { id: "gaf-prostart-starter-shingle-strip", description: "GAF ProStart Starter Shingle Strip" },
              { id: "gaf-seal-a-ridge", description: "GAF Seal-A-Ridge (Ridge Cap)" },
              { id: "poly-glass-irxe", description: "Poly Glass IRXE (Valleys)" },
              { id: "abc-pro-guard-20", description: "ABC Pro Guard 20 (Rhino Underlayment)" },
              { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
              { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" },
              { id: "cdx-plywood", description: "1/2\"x4'x8' CDX Plywood - 4-Ply" },
              { id: "millennium-galvanized-drip-edge", description: "Millennium Galvanized Steel Drip Edge - 26GA - 6\"" },
              { id: "karnak-flashing-cement", description: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)" },
              { id: "1inch-plastic-cap-nails", description: "1\" Plastic Cap Nails (3000/bucket)" },
              { id: "abc-electro-galvanized-coil-nails", description: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)" },
              { id: "coil-nails-ring-shank", description: "Coil Nails - Ring Shank - 2 3/8\"x.113\" (5000 Cnt)" }
            ],
            "3MG Select": [
              { id: "gaf-uhdz", description: "GAF Timberline UHDZ Shingles" },
              { id: "gaf-prostart-starter-shingle-strip", description: "GAF ProStart Starter Shingle Strip" },
              { id: "gaf-seal-a-ridge", description: "GAF Seal-A-Ridge" },
              { id: "maxfelt-nc", description: "MaxFelt NC Synthetic Underlayment" },
              { id: "poly-glass-irxe", description: "Poly Glass IRXE (Valleys)" },
              { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
              { id: "gaf-cobra-rigid-vent", description: "GAF Cobra Rigid Vent 3 Exhaust Ridge Vent" },
              { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" },
              { id: "cdx-plywood", description: "1/2\"x4'x8' CDX Plywood - 4-Ply" },
              { id: "millennium-galvanized-drip-edge", description: "Millennium Galvanized Steel Drip Edge - 26GA - 6\"" },
              { id: "karnak-flashing-cement", description: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)" },
              { id: "soffit-vents-continuous", description: "Continuous Soffit Vents (10')"},
              { id: "1inch-plastic-cap-nails", description: "1\" Plastic Cap Nails (3000/bucket)" },
              { id: "abc-electro-galvanized-coil-nails", description: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)" },
              { id: "coil-nails-ring-shank", description: "Coil Nails - Ring Shank - 2 3/8\"x.113\" (5000 Cnt)" }
            ]
          };
          
          // 🏠 NEW: Flat-only roof materials (≤2/12 pitch)
          const FLAT_ROOF_MATERIALS = [
            { id: "polyglass-elastoflex-sbs", description: "Polyglass Elastoflex SA-V SBS Base Sheet (2 sq)" },
            { id: "polyglass-polyflex-app", description: "Polyglass Polyflex SA-P APP Cap Sheet (1 sq)" },
            { id: "gaf-poly-iso-4x8", description: "GAF Poly ISO 4X8 (for 0/12 pitch areas)" },
            { id: "karnak-asphalt-primer-spray", description: "Karnak #108 Asphalt Primer Spray (14 oz)" },
            { id: "galvanized-steel-roll-valley", description: "Galvanized Steel Roll Valley - 26GA - 16\" (50')" },
            { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant (Caulk)" }
          ];
          
          // 🔧 HELPER: Extract pitch rise from pitch string
          const getPitchRise = (pitchString: string): number => {
            if (!pitchString) return 0;
            const parts = pitchString.split(/[:\\/]/);
            return parseInt(parts[0] || '0');
          };
          
          // 🔍 ANALYZE ROOF TYPE: Check if this is flat-only roof vs hybrid/steep roof
          const hasOnlyFlatPitches = measurements?.areasByPitch?.every(area => {
            const rise = getPitchRise(area.pitch);
            return !isNaN(rise) && rise <= 2;
          }) || false;
          
          const hasSteepPitches = measurements?.areasByPitch?.some(area => {
            const rise = getPitchRise(area.pitch);
            return !isNaN(rise) && rise > 2;
          }) || false;
          
          console.log(`🏗️ ROOF ANALYSIS: hasOnlyFlatPitches=${hasOnlyFlatPitches}, hasSteepPitches=${hasSteepPitches}`);
          
          if (hasOnlyFlatPitches && !hasSteepPitches) {
            // 🏠 FLAT-ONLY ROOF: Use specialized flat roof materials instead of GAF packages
            console.log(`🏠 FLAT-ONLY ROOF DETECTED: Adding flat roof materials instead of GAF package`);
            
            FLAT_ROOF_MATERIALS.forEach(({ id, description }) => {
              const material = ROOFING_MATERIALS.find(m => m.id === id);
              if (material) {
                // Special logic for ISO - only add if 0/12 pitch exists
                if (id === "gaf-poly-iso-4x8") {
                  const has0Pitch = measurements?.areasByPitch?.some(area => {
                    const rise = getPitchRise(area.pitch);
                    return !isNaN(rise) && rise === 0;
                  });
                  
                  if (!has0Pitch) {
                    console.log(`Skipped ${material.name} - No 0/12 pitch areas found`);
                    return;
                  }
                }

                const { quantity: calculatedQuantity, actualWasteFactor } = calculateMaterialQuantity(
                  material,
                  measurements,
                  wasteFactor / 100,
                  dbWastePercentages
                );

                if (calculatedQuantity > 0) {
                  newMaterials[id] = material;
                  newQuantities[id] = calculatedQuantity;
                  newWasteFactors[id] = actualWasteFactor;
                  console.log(`🏠 Added FLAT roof material: ${material.name} - Qty: ${calculatedQuantity}`);
                } else {
                  console.log(`Skipped ${material.name} - Qty: ${calculatedQuantity} (not applicable)`);
                }
              }
            });
            
            toastMessage = `Flat roof materials applied! Materials automatically selected for roofs ≤2/12 pitch.`;
            
          } else {
            // 🏔️ STEEP/HYBRID ROOF: Use GAF packages + low-slope materials if needed
          const selectedBundle = PRESET_BUNDLES[presetName];
          if (selectedBundle) {
              console.log(`🏔️ STEEP/HYBRID ROOF: Adding ${presetName} materials`);
              
            // Add the GAF package materials
            selectedBundle.forEach(({ id, description }) => {
              const material = ROOFING_MATERIALS.find(m => m.id === id);
              if (material) {
                const isGafTimberline = id === "gaf-timberline-hdz-sg";
                const overrideWaste = isGafTimberline 
                  ? gafTimberlineWasteFactor / 100 
                  : wasteFactor / 100;

                const { quantity: calculatedQuantity, actualWasteFactor } = calculateMaterialQuantity(
                  material,
                  measurements,
                  overrideWaste,
                  dbWastePercentages
                );

                // 🔧 SPECIAL CASE: CDX Plywood auto-population for non-flat roofs
                // CDX Plywood should be auto-populated with quantity 1 for all non-flat roofs
                let finalQuantity = calculatedQuantity;
                if (id === "cdx-plywood" && calculatedQuantity <= 0) {
                  finalQuantity = 1; // Default to 1 board for non-flat roofs
                  console.log(`🔧 CDX Plywood: Auto-populated with default quantity 1 for non-flat roof`);
                }

                // Only add materials with positive calculated quantities (including CDX plywood override)
                if (finalQuantity > 0) {
                  newMaterials[id] = material;
                  newQuantities[id] = finalQuantity;
                  newWasteFactors[id] = actualWasteFactor;
                    console.log(`🏔️ Added STEEP material: ${material.name} - Qty: ${finalQuantity}, Price: $${material.price}`);
                } else {
                  console.log(`Skipped ${material.name} - Qty: ${finalQuantity} (not applicable)`);
                }
              }
            });
            
              // 🔧 HYBRID ROOF: If has low-slope areas, also add low-slope materials
              if (showLowSlope) {
                console.log(`🔧 HYBRID ROOF: Also adding low-slope materials for 0-2/12 pitch areas`);
                
                const lowSlopeMaterials = ["polyglass-elastoflex-sbs", "polyglass-polyflex-app"];
                lowSlopeMaterials.forEach(materialId => {
                  const material = ROOFING_MATERIALS.find(m => m.id === materialId);
                  if (material) {
                    const { quantity: calculatedQuantity, actualWasteFactor } = calculateMaterialQuantity(
                      material,
                      measurements,
                      wasteFactor / 100,
                      dbWastePercentages
                    );

                    if (calculatedQuantity > 0) {
                      newMaterials[materialId] = material;
                      newQuantities[materialId] = calculatedQuantity;
                      newWasteFactors[materialId] = actualWasteFactor;
                      console.log(`🔧 Added LOW-SLOPE for hybrid: ${material.name} - Qty: ${calculatedQuantity}`);
                    }
                  }
                });
              }
              
              toastMessage = `${presetName} materials applied! ${showLowSlope ? 'Includes low-slope materials for hybrid roof.' : 'Materials automatically populated.'}`;
            }
          }
        }
      }
      
      // Update all states in a batch
      setLocalSelectedMaterials(newMaterials);
      setLocalQuantities(newQuantities);
      setMaterialWasteFactors(newWasteFactors);
      // 🔧 FIX: Update material order to maintain stable card positions
      setMaterialOrder(Object.keys(newMaterials));
      
      // Show toast notification
      if (toastMessage) {
        const isLowSlopeWarning = toastMessage.includes("only applicable to roofs with steep slope areas");
        toast({
          title: selectedPackage ? "Package Materials Applied! ✅" : "Package Materials Removed",
          description: toastMessage,
          duration: 4000,
          variant: isLowSlopeWarning ? "destructive" : "default"
        });
      }
      
      // Update previous package reference
      previousPackageRef.current = selectedPackage;
    }, 150); // 150ms debounce to prevent rapid updates
    
    // Cleanup timeout on unmount
    return () => {
      if (packageUpdateTimeoutRef.current) {
        clearTimeout(packageUpdateTimeoutRef.current);
      }
    };
  }, [selectedPackage, measurements, wasteFactor, gafTimberlineWasteFactor, dbWastePercentages, toast]);

  // Populate editableTemplateMaterials when activePricingTemplate changes or on initial load
  useEffect(() => {
    console.log("[EditableTemplateEffect] Active pricing template changed:", activePricingTemplate?.name);
    if (activePricingTemplate && activePricingTemplate.materials && Object.keys(activePricingTemplate.materials).length > 0) {
      console.log("[EditableTemplateEffect] Loading materials from active template:", activePricingTemplate.name, Object.keys(activePricingTemplate.materials).length);
      setEditableTemplateMaterials(JSON.parse(JSON.stringify(activePricingTemplate.materials))); // Deep copy
    } else {
      // Default to ROOFING_MATERIALS if no active template or if it's empty
      // This assumes ROOFING_MATERIALS is the desired "Master" default
      console.log("[EditableTemplateEffect] No active template or empty, loading from ROOFING_MATERIALS as default master.");
      const masterMaterials: Record<string, Material> = {};
      ROOFING_MATERIALS.forEach(material => {
        masterMaterials[material.id] = JSON.parse(JSON.stringify(material)); // Deep copy
      });
      setEditableTemplateMaterials(masterMaterials);
    }
  }, [activePricingTemplate]);

  const handleEditableMaterialPropertyChange = (
    materialId: string,
    propertyPath: string, 
    value: any,
    isNumeric: boolean = false
  ) => {
    setEditableTemplateMaterials(prev => {
      const newMaterials = { ...prev };
      const materialToUpdate = JSON.parse(JSON.stringify(newMaterials[materialId])); // Deep clone

      let current = materialToUpdate;
      const parts = propertyPath.split('.');
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {}; 
        }
        current = current[parts[i]];
      }
      
      let processedValue = value;
      if (isNumeric) {
        processedValue = parseFloat(value);
        if (isNaN(processedValue)) {
          // Decide how to handle invalid numbers, e.g., keep old value or set to 0
          // For now, let's revert or set to 0 if it's a price.
          if (propertyPath === 'price') processedValue = 0;
          else { // For other numeric fields, maybe try to keep previous if parse fails.
             // This part needs careful consideration based on field type.
             // For simplicity, if parse fails and not price, it might become NaN.
          }
        }
      }
      current[parts[parts.length - 1]] = processedValue;
      
      newMaterials[materialId] = materialToUpdate;
      console.log(`[EditableMaterialChange] Material: ${materialId}, Path: ${propertyPath}, New Value:`, processedValue, "Updated Material:", newMaterials[materialId]);
      return newMaterials;
    });
  };

  const handleOpenSaveAsNewTemplateModal = () => {
    // Pre-fill name if a template is loaded, suggesting a copy
    if (activePricingTemplate?.name) {
      setNewTemplateName(`${activePricingTemplate.name} - Copy`);
      setNewTemplateDescription(activePricingTemplate.description || "");
    } else {
      setNewTemplateName("My Custom Template");
      setNewTemplateDescription("");
    }
    setIsSaveAsNewModalOpen(true);
  };

  const handleSaveNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({ title: "Template Name Required", description: "Please enter a name for your new template.", variant: "destructive" });
      return;
    }

    const defaultLaborRates = { 
      laborRate: 85, isHandload: false, handloadRate: 10, dumpsterLocation: "orlando",
      dumpsterCount: 1, dumpsterRate: 400, includePermits: true, permitRate: 450,
      permitCount: 1, permitAdditionalRate: 450, pitchRates: {}, wastePercentage: 12,
      includeGutters: false, gutterLinearFeet: 0, gutterRate: 8, includeDownspouts: false,
      downspoutCount: 0, downspoutRate: 75, includeDetachResetGutters: false,
      detachResetGutterLinearFeet: 0, detachResetGutterRate: 1
    };

    const templateDataToSave = {
      name: newTemplateName.trim(),
      description: newTemplateDescription.trim(),
      materials: editableTemplateMaterials as any, // Cast to any for DB insert
      quantities: {} as any, 
      labor_rates: (activePricingTemplate?.labor_rates || defaultLaborRates) as any, 
      profit_margin: activePricingTemplate?.profit_margin || 25, 
      is_default: false, 
      material_categories: null, // Set to null as it's optional in the database
    };

    console.log("Attempting to save new template (typed for DB insert):", templateDataToSave);

    try {
      const { data, error } = await supabase
        .from('pricing_templates')
        .insert(templateDataToSave) 
        .select()
        .single();

      if (error) {
        console.error("Error saving new template to Supabase:", error);
        toast({ title: "Error Saving Template", description: error.message, variant: "destructive" });
      } else if (data) {
        toast({ title: "Template Saved!", description: `"${data.name}" has been saved.` });
        setIsSaveAsNewModalOpen(false);
        setNewTemplateName("");
        setNewTemplateDescription("");
        if (onTemplateChange) { 
          const returnedTemplate: PricingTemplate = {
            id: data.id as string, 
            name: data.name as string,
            description: data.description as string | undefined,
            materials: data.materials as unknown as Record<string, Material>,
            quantities: data.quantities as unknown as Record<string, number>,
            labor_rates: data.labor_rates as unknown as any, // Cast to any, assuming LaborRates structure matches
            profit_margin: data.profit_margin as number | undefined,
            is_default: data.is_default as boolean | undefined,
            created_at: data.created_at as string | undefined,
            updated_at: data.updated_at as string | undefined,
            material_categories: data.material_categories as unknown as any, // Add material_categories field
          };
          onTemplateChange(returnedTemplate); 
        }
      }
    } catch (e) {
      console.error("Exception saving new template:", e);
      toast({ title: "Save Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  // Helper function to format category names for display
  const formatCategoryName = (category: string): string => {
    switch (category) {
      case MaterialCategory.LOW_SLOPE:
        return "Low slope";
      default:
        return category;
    }
  };

  // Auto-populate materials when package selection changes
  useEffect(() => {
    // CRITICAL FIX: Only auto-populate if user has actually selected a package
    // Don't auto-populate for empty string or null - user must make an explicit choice
    if (!selectedPackage || selectedPackage === '' || !measurements?.totalArea) {
      console.log(`[PackageEffect] Skipping auto-populate - no valid package selected: '${selectedPackage}'`);
      return;
    }

    // Check if we already have materials from any package
    const hasPackageMaterials = localSelectedMaterials['gaf-timberline-hdz-sg'] || 
                               localSelectedMaterials['gaf-prostart-starter-shingle-strip'] ||
                               localSelectedMaterials['gaf-seal-a-ridge'] ||
                               localSelectedMaterials['oc-duration'] ||
                               localSelectedMaterials['oc-oakridge'];
    
    if (hasPackageMaterials) {
      console.log(`[PackageEffect] Already have package materials, skipping auto-populate`);
      return;
    }
    
    console.log(`[PackageEffect] Package selected: ${selectedPackage}, auto-populating materials`);
    
    // Map package IDs to preset bundle names
    const packageToPreset: { [key: string]: string } = {
      'gaf-1': 'GAF 1',
      'gaf-2': 'GAF 2',
      '3mg-standard-oc': '3MG Standard - OC',
      '3mg-standard-gaf': '3MG Standard - GAF',
      '3mg-select': '3MG Select'
    };
    
    const presetName = packageToPreset[selectedPackage];
    if (presetName) {
      // Small delay to ensure measurements are fully loaded
      setTimeout(() => {
        applyPresetBundle(presetName);
      }, 100);
    }
  }, [selectedPackage, measurements?.totalArea]); // Only trigger when package or measurements change

  // Handle Full Peel and Stick selection
  useEffect(() => {
    if (!measurements || !selectedPackage) return;
    
    console.log('🔧 [Peel & Stick] Selection changed:', isPeelStickSelected);
    
    if (isPeelStickSelected) {
      // Materials to remove when peel & stick is selected
      const underlaymentMaterialsToRemove = [
        'gaf-feltbuster-synthetic-underlayment',
        'abc-pro-guard-20',
        'max-usa-feltbuster-1000',
        'maxfelt-nc',  // ADD MAX FELT to removal list
        'poly-glass-irxe' // Remove valley material too
      ];
      
      // Remove existing underlayments
      const updatedMaterials = { ...localSelectedMaterials };
      const updatedQuantities = { ...localQuantities };
      const updatedDisplayQuantities = { ...displayQuantities };
      const updatedWasteFactors = { ...materialWasteFactors };
      const updatedOverrides = { ...userOverriddenWaste };
      let updatedOrder = [...materialOrder];
      
      underlaymentMaterialsToRemove.forEach(materialId => {
        if (updatedMaterials[materialId]) {
          console.log(`🔧 [Peel & Stick] Removing ${materialId}`);
          delete updatedMaterials[materialId];
          delete updatedQuantities[materialId];
          delete updatedDisplayQuantities[materialId];
          delete updatedWasteFactors[materialId];
          delete updatedOverrides[materialId];
          updatedOrder = updatedOrder.filter(id => id !== materialId);
        }
      });
      
      // Add GAF StormGuard for steep slope area
      const stormGuardMaterial = ROOFING_MATERIALS.find(m => m.id === 'gaf-weatherwatch-ice-water-shield');
      if (stormGuardMaterial && measurements.areasByPitch) {
        // Calculate steep slope area (everything above 2/12 pitch)
        let steepSlopeArea = 0;
        if (Array.isArray(measurements.areasByPitch)) {
          steepSlopeArea = measurements.areasByPitch
            .filter(area => {
              const pitchParts = area.pitch.split(/[:\\/]/);
              const rise = parseInt(pitchParts[0] || '0');
              return !isNaN(rise) && rise > 2;
            })
            .reduce((sum, area) => sum + (area.area || 0), 0);
        }
        
        if (steepSlopeArea > 0) {
          const steepSlopeSquares = steepSlopeArea / 100;
          // StormGuard covers 1.5 squares per roll
          const quantity = Math.ceil(steepSlopeSquares / 1.5);
          
          console.log(`🔧 [Peel & Stick] Adding GAF StormGuard: ${quantity} rolls for ${steepSlopeArea} sq ft steep slope`);
          
          updatedMaterials['gaf-weatherwatch-ice-water-shield'] = stormGuardMaterial;
          updatedQuantities['gaf-weatherwatch-ice-water-shield'] = quantity;
          updatedDisplayQuantities['gaf-weatherwatch-ice-water-shield'] = quantity.toString();
          updatedWasteFactors['gaf-weatherwatch-ice-water-shield'] = 10; // 10% waste
          updatedOverrides['gaf-weatherwatch-ice-water-shield'] = false;
          
          if (!updatedOrder.includes('gaf-weatherwatch-ice-water-shield')) {
            updatedOrder.push('gaf-weatherwatch-ice-water-shield');
          }
        }
      }
      
      // Update all states
      setLocalSelectedMaterials(updatedMaterials);
      setLocalQuantities(updatedQuantities);
      setDisplayQuantities(updatedDisplayQuantities);
      setMaterialWasteFactors(updatedWasteFactors);
      setUserOverriddenWaste(updatedOverrides);
      setMaterialOrder(updatedOrder);
      
      toast({
        title: "Full Peel & Stick System Applied",
        description: "Replaced underlayments with GAF StormGuard on all steep slope areas",
        duration: 3000,
      });
    }
  }, [isPeelStickSelected, measurements, selectedPackage]);

  // Handle Florida underlayment doubling
  useEffect(() => {
    // Check if property is in Florida
    const isFloridaProperty = jobWorksheet?.basic_info?.address && 
      (jobWorksheet.basic_info.address.toLowerCase().includes('fl') || 
       jobWorksheet.basic_info.address.toLowerCase().includes('florida'));
    
    if (!isFloridaProperty || !measurements || Object.keys(localSelectedMaterials).length === 0) {
      return;
    }
    
    console.log('🌴 [Florida] Checking underlayment quantities for Florida property');
    
    // NO underlayments should be doubled in Florida anymore
    // Synthetics are already doubled in calculation logic
    // Storm Guard and Poly Glass IRXE should NEVER be doubled
    const underlaymentMaterialIds: string[] = [
      // EMPTY - No Florida-specific doubling needed
    ];
    
    let needsUpdate = false;
    const updatedQuantities = { ...localQuantities };
    const updatedDisplayQuantities = { ...displayQuantities };
    
    underlaymentMaterialIds.forEach(materialId => {
      if (localSelectedMaterials[materialId]) {
        const material = localSelectedMaterials[materialId];
        
        // Calculate the base quantity
        const { quantity: baseQuantity } = calculateMaterialQuantity(
          material,
          measurements,
          materialWasteFactors[materialId] || wasteFactor / 100,
          dbWastePercentages
        );
        
        // Double the quantity for Florida
        const floridaQuantity = baseQuantity * 2;
        
        // Only update if the current quantity is not already doubled
        if (updatedQuantities[materialId] !== floridaQuantity) {
          console.log(`🌴 [Florida] Doubling ${material.name}: ${baseQuantity} → ${floridaQuantity}`);
          updatedQuantities[materialId] = floridaQuantity;
          updatedDisplayQuantities[materialId] = floridaQuantity.toString();
          needsUpdate = true;
        }
      }
    });
    
    if (needsUpdate) {
      setLocalQuantities(updatedQuantities);
      setDisplayQuantities(updatedDisplayQuantities);
      
      toast({
        title: "Florida Underlayment Requirements Applied",
        description: "Underlayment quantities have been doubled per Florida building codes",
        duration: 4000,
      });
    }
  }, [localSelectedMaterials, measurements, jobWorksheet, materialWasteFactors, wasteFactor, dbWastePercentages]);

  // Main return structure
  return (
    <div key={`materials-tab-${measurements?.totalArea || 'default'}`} className={`grid grid-cols-1 ${effectiveUserRole !== 'rep' ? 'lg:grid-cols-5' : 'lg:grid-cols-2'} gap-6`}>
      {/* Package & Warranty Selection for Sales Reps */}
      {effectiveUserRole === 'rep' && (
        <div className="lg:col-span-1">
          <Card className="h-fit bg-gray-800/30 backdrop-blur-xl border-green-600/20">
            <CardHeader className="pb-3 border-b border-green-700/30">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <PackageOpen className="h-5 w-5 text-green-400" />
                Package & Warranty Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <PackageSelector 
                selectedPackage={selectedPackage} 
                onPackageSelect={(packageId) => {
                  console.log('MaterialsSelectionTab - Package selection changed to:', packageId);
                  setSelectedPackage(packageId);
                }} 
              />
              
              <WarrantySelector 
                selectedPackage={selectedPackage}
                selectedWarranty={selectedWarranty}
                onWarrantySelect={setSelectedWarranty}
                isPeelStickSelected={isPeelStickSelected}
                onPeelStickToggle={setIsPeelStickSelected}
              />
              
              {/* Low Slope Options hidden for sales reps - not needed in their simplified view */}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Left Column: Package Selection etc. - Hide for sales reps */}
      {effectiveUserRole !== 'rep' && (
      <div className="lg:col-span-3 space-y-6">
        {/* GAF Package & Warranty Card - Hide for Sales Reps */}
        {effectiveUserRole !== 'rep' && (
          <Card className="bg-gray-800/30 backdrop-blur-xl border-green-600/20">
             <CardHeader className="border-b border-green-700/30">
               <CardTitle className="text-white">GAF Package & Warranty Selection</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <PackageSelector 
                 selectedPackage={selectedPackage} 
                 onPackageSelect={(packageId) => {
                   console.log('MaterialsSelectionTab - Package selection changed to:', packageId);
                   setSelectedPackage(packageId);
                 }} 
               />
               <WarrantySelector 
                 selectedPackage={selectedPackage}
                 selectedWarranty={selectedWarranty}
                 onWarrantySelect={setSelectedWarranty}
                 isPeelStickSelected={isPeelStickSelected}
                 onPeelStickToggle={setIsPeelStickSelected}
               />
               {showLowSlope && (
                 <LowSlopeOptions measurements={measurements} includeIso={includeIso} onIsoToggle={setIncludeIso} />
               )}
             </CardContent>
          </Card>
        )}
        

        
        {/* Package Selection Card */}
        <Card className={cardStyles}>
          <CardHeader className={headerStyles}>
            <div className="flex items-center justify-between">
              <CardTitle className={titleStyles}>Select Packages</CardTitle>
              {/* Preset Bundles Button - Only show for non-sales reps */}
              {effectiveUserRole !== 'rep' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Clear current selection before applying preset
                      if (selectedPreset) {
                        setLocalSelectedMaterials({});
                        setLocalQuantities({});
                        setMaterialOrder([]);
                        setSelectedPreset(null);
                      }
                    }}
                    disabled={Object.keys(localSelectedMaterials).length === 0}
                    className={`${descriptionStyles} border-gray-600`}
                  >
                    Clear All
                  </Button>
                  <div className="relative">
                    <Button
                      variant="default"
                      size="sm"
                      className={`${descriptionStyles} bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white`}
                      onClick={() => setShowPresetMenu(!showPresetMenu)}
                    >
                      <PackageOpen className="h-4 w-4" />
                      Quick Add Package
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    {showPresetMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-green-700/30 rounded-md shadow-lg z-10">
                        <div className="py-1">
                          <button
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-green-900/30 hover:text-white"
                            onClick={() => {
                              applyPresetBundle('GAF 1');
                              setShowPresetMenu(false);
                            }}
                          >
                            GAF 1 - Basic
                          </button>
                          <button
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-green-900/30 hover:text-white"
                            onClick={() => {
                              applyPresetBundle('GAF 2');
                              setShowPresetMenu(false);
                            }}
                          >
                            GAF 2 - Premium
                          </button>
                          <button
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-green-900/30 hover:text-white"
                            onClick={() => {
                              applyPresetBundle('OC 1');
                              setShowPresetMenu(false);
                            }}
                          >
                            OC 1 - Basic
                          </button>
                          <button
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-green-900/30 hover:text-white"
                            onClick={() => {
                              applyPresetBundle('OC 2');
                              setShowPresetMenu(false);
                            }}
                          >
                            OC 2 - Premium
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700/30 rounded-md">
              {canEditMaterialPrices() ? (
                <p className={`${descriptionStyles}`}>
                  🔓 <strong>Admin Access:</strong> You can modify material prices for this estimate.
                </p>
              ) : (
                <p className={`${descriptionStyles}`}>
                  🔒 <strong>Territory Manager:</strong> Material prices are locked for consistency across estimates.
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             {/* Waste Factor Inputs */}
             <div className="flex items-center space-x-4 pb-4">
               <Label htmlFor="wasteFactor" className={`${descriptionStyles}`}>Waste Factor:</Label>
               <Input 
                 id="wasteFactor" 
                 type="number" 
                 value={wasteFactorInput} 
                 onChange={handleWasteFactorInputChange} 
                 onBlur={handleWasteFactorBlur}
                 className={`${descriptionStyles} w-24 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20`} 
                 min="0" 
                 max="50" 
               />
               <span className="text-sm text-gray-400">%</span>
               <span className="text-sm text-gray-400">(Applies to all materials except GAF Timberline HDZ)</span>
             </div>
             {localSelectedMaterials["gaf-timberline-hdz-sg"] && (
              <div className="flex items-center space-x-4 pb-4 pt-2 border-t border-green-700/30">
                <Label htmlFor="gafWasteFactor" className={`${descriptionStyles}`}>GAF Timberline HDZ Waste Factor:</Label>
                <div className="flex space-x-2">
                  {[12, 15, 20].map(factor => (
                    <Button 
                      key={factor} 
                      variant="outline" 
                      className={`${gafTimberlineWasteFactor === factor ? "bg-green-900/30 text-green-400 border-green-600" : "bg-gray-700/50 hover:bg-gray-700/70 text-gray-400 border-gray-600"} 
                      ${isDarkTheme ? "bg-gray-700/50 hover:bg-gray-700/70 text-gray-400 border-gray-600" : ""}`} 
                      onClick={() => handleGafTimberlineWasteFactorChange(factor)}
                    >
                      {factor}%
                    </Button>
                  ))}
                 </div>
                 <span className="text-sm text-blue-600 font-medium">{gafTimberlineWasteFactor}%</span>
               </div>
             )}
             
             
             {/* Materials Accordion */}
             <Accordion 
               type="multiple" 
               value={expandedCategories}
               onValueChange={setExpandedCategories}
               className="w-full space-y-2">
               {Object.keys(materialsByCategory).length === 0 ? (
                 <p>No materials found in template or grouping failed.</p>
               ) : (
                 Object.entries(materialsByCategory).map(([category, materials]) => {
                   // Skip LOW_SLOPE category if no low slope areas are found
                 if (category === MaterialCategory.LOW_SLOPE && !showLowSlope) return null;
                   
                   // Ensure materials array is valid
                   if (!Array.isArray(materials)) {
                      console.warn(`Materials for category ${category} is not an array:`, materials);
                      return null;
                   }
                   
                   // Skip categories with no materials
                   if (materials.length === 0) return null;
                   
                 return (
                   <AccordionItem key={category} value={category} className="border-green-500/40">
                                               <AccordionTrigger className="text-lg font-semibold py-4 bg-gray-100 hover:bg-gray-200 px-4 rounded-t-lg transition-all duration-200 shadow-sm">
                       {formatCategoryName(category)}
                                               {category === MaterialCategory.LOW_SLOPE && showLowSlope && (<Badge variant="outline" className="ml-2 text-blue-700 border-blue-300 bg-blue-100">Flat/Low-Slope Required</Badge>)}
                     </AccordionTrigger>
                                           <AccordionContent className="bg-gray-50 px-4 pb-4 rounded-b-lg border-x border-b border-gray-200">
                       <div className="space-y-2 pt-2">
                         {materials.map(baseMaterial => {
                           const material = editableTemplateMaterials[baseMaterial.id] || baseMaterial;
                           const isSelected = !!localSelectedMaterials[material.id];

                           // Define material-specific colors with lighter backgrounds
                           const getMaterialColor = (materialId: string) => {
                             // Goosenecks - Orange
                             if (materialId.includes('gooseneck')) {
                               return 'border-orange-300 bg-orange-50 hover:bg-orange-100';
                             }
                             // Boots - Grey
                             if (materialId.includes('boot')) {
                               return 'border-gray-300 bg-gray-50 hover:bg-gray-100';
                             }
                             // Skylights - Light Blue
                             if (materialId.includes('skylight')) {
                               return 'border-sky-300 bg-sky-50 hover:bg-sky-100';
                             }
                             // Gutters - Bronze (using amber as closest)
                             if (materialId.includes('gutter')) {
                               return 'border-amber-300 bg-amber-50 hover:bg-amber-100';
                             }
                             // Default styling for other materials
                             return 'border-gray-300 bg-white hover:bg-gray-50';
                           };

                           // Get accent colors for titles and highlights
                           const getMaterialAccentColor = (materialId: string) => {
                             if (materialId.includes('gooseneck')) {
                               return { title: 'text-orange-700', coverage: 'bg-orange-100 border-orange-200', logic: 'bg-orange-50 border-orange-200' };
                             }
                             if (materialId.includes('boot')) {
                               return { title: 'text-gray-700', coverage: 'bg-gray-100 border-gray-300', logic: 'bg-gray-50 border-gray-200' };
                             }
                             if (materialId.includes('skylight')) {
                               return { title: 'text-sky-700', coverage: 'bg-sky-100 border-sky-200', logic: 'bg-sky-50 border-sky-200' };
                             }
                             if (materialId.includes('gutter')) {
                               return { title: 'text-amber-700', coverage: 'bg-amber-100 border-amber-200', logic: 'bg-amber-50 border-amber-200' };
                             }
                             // Check for specific material categories
                             if (materialId.includes('shingle') || materialId.includes('hdz')) {
                               return { title: 'text-green-700', coverage: 'bg-green-100 border-green-200', logic: 'bg-green-50 border-green-200' };
                             }
                             if (materialId.includes('underlayment') || materialId.includes('shield')) {
                               return { title: 'text-blue-700', coverage: 'bg-blue-100 border-blue-200', logic: 'bg-blue-50 border-blue-200' };
                             }
                             if (materialId.includes('vent') || materialId.includes('cobra')) {
                               return { title: 'text-purple-700', coverage: 'bg-purple-100 border-purple-200', logic: 'bg-purple-50 border-purple-200' };
                             }
                             if (materialId.includes('nail') || materialId.includes('coil')) {
                               return { title: 'text-indigo-700', coverage: 'bg-indigo-100 border-indigo-200', logic: 'bg-indigo-50 border-indigo-200' };
                             }
                             // Default neutral colors
                             return { title: 'text-gray-900', coverage: 'bg-gray-100 border-gray-200', logic: 'bg-gray-50 border-gray-200' };
                           };

                           const accentColors = getMaterialAccentColor(material.id);

                           return (
                            <div key={material.id} className={`rounded-lg p-4 transition-all duration-200 shadow-sm hover:shadow-md ${getMaterialColor(material.id)}`}>
                              <div className="flex flex-col lg:flex-row justify-between items-start gap-3">
                                {/* Left Column: Material Info */}
                                <div className="flex-1 space-y-2">
                                  <h4 className={`text-sm font-semibold ${accentColors.title}`}>{material.name}</h4>
                                  
                                  {/* Only show price input/display for non-reps */}
                                  {effectiveUserRole !== 'rep' && (
                                    <div className="flex items-center space-x-2">
                                      <Label htmlFor={`price-${material.id}`} className="sr-only">Price</Label>
                                      <Input
                                        id={`price-${material.id}`}
                                        type="number"
                                        step="0.01"
                                        defaultValue={material.price !== undefined ? String(material.price) : ''} 
                                        onBlur={(e) => canEditMaterialPrices() && handleEditableMaterialPropertyChange(material.id, 'price', e.target.value, true)}
                                        className={`h-8 text-sm rounded-md shadow-sm w-24 ${
                                          canEditMaterialPrices() 
                                            ? 'bg-white border-gray-300 text-gray-900 focus:border-green-400 focus:ring-green-400/30' 
                                            : 'bg-gray-100 border-gray-300 text-gray-600'
                                        }`}
                                        disabled={!canEditMaterialPrices()}
                                        placeholder="0.00"
                                        key={`price-input-${material.id}`}
                                      />
                                      {material.unit && <span className="text-sm text-gray-700 font-medium">per {material.unit}</span>}
                                      {material.approxPerSquare && material.approxPerSquare > 0 && 
                                        <span className="text-xs text-gray-600">(≈ {formatPrice(material.approxPerSquare)}/sq)</span>
                                      }
                                    </div>
                                  )}
                                  
                                  {/* Coverage Rule Description - Keep visible for all roles */}
                                  {material.coverageRule?.description && (
                                    <p className={`text-xs text-gray-700 p-2 rounded border ${accentColors.coverage}`}>
                                      <span className="font-semibold text-gray-900">Coverage:</span> {material.coverageRule.description}
                                    </p>
                                  )}
                          
                                  {/* Coverage Rule Calculation & Logic - Hide for sales reps */}
                                  {material.coverageRule?.calculation && effectiveUserRole !== 'rep' && (
                                    <div className={`text-xs text-gray-700 p-2 rounded border ${accentColors.logic} space-y-1`}>
                                      <p><span className="font-semibold text-gray-900">Logic:</span> {material.coverageRule.calculation}</p>
                                      {!readOnly && (
                                        <p className="text-gray-600 mt-0.5">
                                          <span className="font-semibold text-gray-900">→ Current Calc:</span> {formatCalculationWithMeasurements(material)}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                          
                                {/* Right Column: Action Button */}
                                <div className="ml-2 flex-shrink-0 self-center">
                                  <Button 
                                    size="sm" 
                                    variant={isSelected ? "secondary" : "outline"} 
                                    onClick={() => { 
                                      if (readOnly) return;
                                      isSelected ? removeMaterial(material.id) : addMaterial(editableTemplateMaterials[baseMaterial.id] || baseMaterial); 
                                    }} 
                                    className={`min-w-[100px] h-9 transition-all duration-200 ${
                                      isSelected 
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 shadow-lg shadow-green-500/25 hover:shadow-green-500/40' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-green-500 shadow-sm'
                                    }`}
                                    disabled={readOnly}
                                  >
                                    {isSelected ? <Check className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
                                    {isSelected ? "Selected" : "Add"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                           );
                         })}
                       </div>
                     </AccordionContent>
                   </AccordionItem>
                 );
                 })
               )}
             </Accordion>
          </CardContent>
          <CardFooter className="flex justify-between items-center mt-4 border-t border-green-700/30 pt-6">
            <Button 
              variant="outline" 
              onClick={() => onMaterialsUpdate({ 
                selectedMaterials: localSelectedMaterials,
                quantities: localQuantities,
                peelStickPrice: peelStickPrice,
                warrantyCost: warrantyDetails?.price || 0,
                warrantyDetails: warrantyDetails,
                selectedWarranty,
                selectedPackage,
                isNavigatingBack: true 
              })}
              className="flex items-center gap-2 bg-gray-700/50 hover:bg-gray-700/70 text-green-400 border-green-600/30"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Measurements
            </Button>
           </CardFooter>
        </Card>
      </div>
      )}

      {/* Right Column: Selected Materials */}
      <div className={effectiveUserRole !== 'rep' ? "lg:col-span-2" : "lg:col-span-1"}>
        <Card className="sticky top-4 bg-white shadow-lg border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-200 bg-gray-50/50">
            <CardTitle className="text-lg text-gray-900 font-semibold">
              {effectiveUserRole === 'rep' ? 'Auto-Selected Materials' : 'Selected Materials'}
            </CardTitle>
            {effectiveUserRole === 'rep' && (
              <p className="text-sm text-gray-600 mt-1 font-medium">
                Materials are automatically selected based on your package choice
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-2 px-4 py-3">
            {Object.keys(localSelectedMaterials).length === 0 && !warrantyDetails ? (
              <div className="text-center py-8 text-gray-600">
                <p className="text-sm font-medium">{effectiveUserRole === 'rep' ? 'Materials will be auto-populated' : 'No materials selected yet'}</p>
                <p className="text-xs mt-1 text-gray-500">{effectiveUserRole === 'rep' ? 'Based on package selection' : 'Select packages from the list'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 🔧 FIX: Sort materials to always show low-slope at top */}
                {(() => {
                  // Separate low-slope and other materials
                  const lowSlopeMaterials = materialOrder.filter(id => {
                    const material = localSelectedMaterials[id];
                    return material && material.category === 'LOW_SLOPE';
                  });
                  
                  const otherMaterials = materialOrder.filter(id => {
                    const material = localSelectedMaterials[id];
                    return material && material.category !== 'LOW_SLOPE';
                  });
                  
                  // Combine with low-slope first
                  const sortedOrder = [...lowSlopeMaterials, ...otherMaterials];
                  
                  return sortedOrder.map(materialId => {
                    const material = localSelectedMaterials[materialId];
                    if (!material || !material.id) return null; 
                    return renderSelectedMaterial(materialId, material);
                  });
                })()}
                {/* Display Warranty Details */}
                {warrantyDetails && warrantyDetails.price > 0 && (
                  <div className="p-3 rounded-md border border-purple-300 bg-purple-50">
                    <div className="flex flex-col gap-1">
                      {/* Title and Badge Row */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-gray-800 text-sm leading-tight">{warrantyDetails.name}</span>
                        <Badge variant="default" className="bg-purple-600 text-white text-xs px-1.5 py-0.5 whitespace-nowrap">
                          Warranty
                        </Badge>
                      </div>
                      
                      {/* Price Information - Hide from sales reps */}
                      {effectiveUserRole !== 'rep' && (
                        <div className="text-xs text-muted-foreground">
                          {formatPrice(warrantyDetails.price)}
                        </div>
                      )}
                      
                      {/* Calculation Details - Hidden for cleaner display */}
                    </div>
                  </div>
                )}
                {/* Only show total for non-sales reps */}
                {effectiveUserRole !== 'rep' && (
                  <div className="flex justify-between font-medium text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatPrice(calculateEstimateTotal())}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MaterialsSelectionTab; 