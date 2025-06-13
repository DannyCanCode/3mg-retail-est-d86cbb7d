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
import WarrantySelector from "../warranties/WarrantySelector";
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
    isNavigatingBack?: boolean; // New optional flag
  }) => void;
  readOnly?: boolean;
  activePricingTemplate?: PricingTemplate | null; // Allow null
  allPricingTemplates?: PricingTemplate[];
  onTemplateChange?: (template: PricingTemplate) => void;
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
}: MaterialsSelectionTabProps) { // Added activePricingTemplate, allPricingTemplates, onTemplateChange to props
  // Debug log measurements
  console.log(`MaterialsSelectionTab rendering with measurements (key: ${measurements?.predominantPitch || 'no-measurements'})`);
  console.log("areasByPitch:", measurements?.areasByPitch);
  console.log("Received selectedMaterials:", {
    count: Object.keys(selectedMaterials).length,
    ids: Object.keys(selectedMaterials)
  });

  // Local state for managing selected materials
  const [localSelectedMaterials, setLocalSelectedMaterials] = useState<{[key: string]: Material}>(selectedMaterials);
  const [localQuantities, setLocalQuantities] = useState<{[key: string]: number}>(quantities);
  const [materialWasteFactors, setMaterialWasteFactors] = useState<Record<string, number>>({}); // State to store waste factors per material
  const [userOverriddenWaste, setUserOverriddenWaste] = useState<Record<string, boolean>>({}); // Tracks user per-item overrides
  const [wasteFactor, setWasteFactor] = useState(10); // Default 10% waste
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    MaterialCategory.SHINGLES
  ]);
  const [showLowSlope, setShowLowSlope] = useState(false);
  // Special waste factor for GAF Timberline HDZ
  const [gafTimberlineWasteFactor, setGafTimberlineWasteFactor] = useState(12); // Minimum 12%
  
  // State for GAF packages and warranty options
  const [selectedPackage, setSelectedPackage] = useState<string | null>('gaf-1');
  const [selectedWarranty, setSelectedWarranty] = useState<string | null>('silver-pledge');
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
  
  // Load database waste percentages on component mount
  useEffect(() => {
    const loadDbWastePercentages = async () => {
      setIsDbWasteLoading(true);
      try {
        const dbWaste = await getAllMaterialWastePercentages();
        setDbWastePercentages(dbWaste);
        console.log("Loaded waste percentages from DB:", dbWaste);
      } catch (error) {
        console.error("Error loading waste percentages:", error);
      } finally {
        setIsDbWasteLoading(false);
      }
    };
    
    loadDbWastePercentages();
  }, []);

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
  }, [selectedMaterials, quantities, resetStateFromProps]); // Corrected dependency array
  
  // Notify parent of changes when local state changes
  useEffect(() => {
    console.log("[NotifyParentEffect] Hook triggered. Deps:", {
      localSelectedMaterials: Object.keys(localSelectedMaterials).length,
      localQuantities: Object.keys(localQuantities).length,
      // materialWasteFactors is not sent to parent, so not listed here
      peelStickPrice,
      warrantyDetails,
      selectedMaterialsProp: Object.keys(selectedMaterials).length,
      quantitiesProp: Object.keys(quantities).length,
    });

    // Don't notify parent if we just updated from parent props
    if (skipNextParentUpdate.current) {
      console.log("[NotifyParentEffect] Skipping parent notification: skipNextParentUpdate is true.");
      skipNextParentUpdate.current = false; // Reset for next potential update
      return;
    }
    
    // We will call onMaterialsUpdate if this effect is triggered by a change
    // in localSelectedMaterials, localQuantities, peelStickPrice or warrantyDetails.
    // The isInternalChange.current flag helps prevent immediate re-runs from prop updates.

    console.log("[NotifyParentEffect] Preparing to notify parent. isInternalChange (before set):", isInternalChange.current);
    console.log("[NotifyParentEffect] Data to be sent:", {
      selectedMaterials: localSelectedMaterials,
      quantities: localQuantities,
      peelStickPrice,
      warrantyCost: warrantyDetails?.price || 0,
      warrantyDetails,
    });
    
    isInternalChange.current = true; // Mark that this change is internal BEFORE calling parent
    
    onMaterialsUpdate({
      selectedMaterials: localSelectedMaterials,
      quantities: localQuantities,
      peelStickPrice,
      warrantyCost: warrantyDetails?.price || 0,
      warrantyDetails,
      isNavigatingBack: false // Explicitly false for regular updates
    });
    console.log("[NotifyParentEffect] Parent notified. isInternalChange (after set):", isInternalChange.current);

  }, [localSelectedMaterials, localQuantities, peelStickPrice, warrantyDetails, onMaterialsUpdate, selectedMaterials, quantities]); // Keep dependencies as they are
  // materialWasteFactors removed from dependency array as it's not sent to parent
  
  // Initialize expanded categories
  useEffect(() => {
    const initialExpandedCategories = [MaterialCategory.SHINGLES];
    
    // Check if there are low-slope areas on the roof
    const hasFlatRoofAreas = measurements.areasByPitch.some(
      area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch)
    );
    
    setShowLowSlope(hasFlatRoofAreas);
    
    // If there are flat roof areas, auto-expand that category
    if (hasFlatRoofAreas) {
      initialExpandedCategories.push(MaterialCategory.LOW_SLOPE);
    }
    
    setExpandedCategories(initialExpandedCategories);
  }, [measurements]);

  // Check for flat/low-slope areas and add required materials
  useEffect(() => {
    // Temporarily commented out for debugging navigation issue
    
    console.log("[MaterialsSelectionTab] Checking for low-slope areas in measurements");
    
    if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch)) {
      console.log("[MaterialsSelectionTab] No valid measurements or areasByPitch");
      return;
    }
    
    const hasLowPitch = measurements.areasByPitch.some(
      area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch)
    );
    
    const has0Pitch = measurements.areasByPitch.some(area => ["0:12", "0/12"].includes(area.pitch));
    
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
    
    let zeroPitchArea = 0;
    if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
      zeroPitchArea = measurements.areasByPitch
        .filter(area => ["0:12", "0/12"].includes(area.pitch))
        .reduce((sum, area) => sum + (area.area || 0), 0);
    }
    
    if (!hasLowPitch) {
      return;
    }
    
    const newSelectedMaterials = { ...localSelectedMaterials };
    const newQuantities = { ...localQuantities };
    const newDisplayQuantities = { ...displayQuantities };
    const newMaterialWasteFactors = { ...materialWasteFactors }; 
    const newUserOverriddenWaste = { ...userOverriddenWaste }; 
    let materialsUpdated = false; 
    
    if (has0Pitch && zeroPitchArea > 0) {
      const polyIsoMaterial = ROOFING_MATERIALS.find(m => m.id === "gaf-poly-iso-4x8");
      if (polyIsoMaterial) {
        const { quantity: boardsNeeded, actualWasteFactor: isoWasteFactor } = calculateMaterialQuantity(
          polyIsoMaterial,
          measurements,
          wasteFactor / 100 
        );
        const finalQuantity = Math.max(1, boardsNeeded);
        const currentQty = newQuantities["gaf-poly-iso-4x8"] || 0;
        if (!newSelectedMaterials["gaf-poly-iso-4x8"] || currentQty !== finalQuantity) {
        const mandatoryMaterial = { 
          ...polyIsoMaterial,
          name: `${polyIsoMaterial.name} (Required for 0/12 pitch - cannot be removed)`
        };
        newSelectedMaterials["gaf-poly-iso-4x8"] = mandatoryMaterial;
          newQuantities["gaf-poly-iso-4x8"] = finalQuantity;
          newDisplayQuantities["gaf-poly-iso-4x8"] = finalQuantity.toString();
          newMaterialWasteFactors["gaf-poly-iso-4x8"] = isoWasteFactor; 
          newUserOverriddenWaste["gaf-poly-iso-4x8"] = false; 
          materialsUpdated = true;
        }
      } 
    }
    
    if (hasLowPitch && lowSlopeArea > 0) {
      const baseSheetMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-elastoflex-sbs");
      const capSheetMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-polyflex-app");
      if (baseSheetMaterial && capSheetMaterial) {
        // Only calculate cap quantity first
        const { quantity: capQuantity, actualWasteFactor: capWaste } = calculateMaterialQuantity( capSheetMaterial, measurements, wasteFactor / 100 );
        const finalCapQuantity = Math.max(1, capQuantity);
        
        // Calculate base quantity as half of cap quantity, rounded up
        const baseQuantity = Math.ceil(finalCapQuantity / 2);
        const baseWaste = capWaste; // Use same waste factor as cap
        
        const finalBaseQuantity = baseQuantity; // Already rounded up
        const currentBaseQty = newQuantities["polyglass-elastoflex-sbs"] || 0;
        if (!newSelectedMaterials["polyglass-elastoflex-sbs"] || currentBaseQty !== finalBaseQuantity) {
          const mandatoryBaseSheet = { ...baseSheetMaterial, name: `${baseSheetMaterial.name} (Required for <= 2/12 pitch - cannot be removed)` };
          newSelectedMaterials["polyglass-elastoflex-sbs"] = mandatoryBaseSheet;
          newQuantities["polyglass-elastoflex-sbs"] = finalBaseQuantity;
          newDisplayQuantities["polyglass-elastoflex-sbs"] = finalBaseQuantity.toString();
          newMaterialWasteFactors["polyglass-elastoflex-sbs"] = baseWaste; 
          newUserOverriddenWaste["polyglass-elastoflex-sbs"] = false; 
          materialsUpdated = true;
        }
        const currentCapQty = newQuantities["polyglass-polyflex-app"] || 0;
        if (!newSelectedMaterials["polyglass-polyflex-app"] || currentCapQty !== finalCapQuantity) {
          const mandatoryCapSheet = { ...capSheetMaterial, name: `${capSheetMaterial.name} (Required for <= 2/12 pitch - cannot be removed)` };
          newSelectedMaterials["polyglass-polyflex-app"] = mandatoryCapSheet;
          newQuantities["polyglass-polyflex-app"] = finalCapQuantity;
          newDisplayQuantities["polyglass-polyflex-app"] = finalCapQuantity.toString();
          newMaterialWasteFactors["polyglass-polyflex-app"] = capWaste; 
          newUserOverriddenWaste["polyglass-polyflex-app"] = false; 
          materialsUpdated = true;
        }
        if (lowSlopeArea >= 50) {
          const karnak19 = ROOFING_MATERIALS.find(m => m.id === "karnak-19");
          if (karnak19 && (!newSelectedMaterials["karnak-19"])) {
            const { quantity: karnakQuantity, actualWasteFactor: karnakWaste } = calculateMaterialQuantity( karnak19, measurements, undefined );
            newSelectedMaterials["karnak-19"] = karnak19;
            newQuantities["karnak-19"] = Math.max(1, karnakQuantity); 
            newDisplayQuantities["karnak-19"] = Math.max(1, karnakQuantity).toString();
            newMaterialWasteFactors["karnak-19"] = karnakWaste; 
            newUserOverriddenWaste["karnak-19"] = false; 
            materialsUpdated = true;
          }
          const karnakSpray = ROOFING_MATERIALS.find(m => m.id === "karnak-asphalt-primer-spray");
          if (karnakSpray && (!newSelectedMaterials["karnak-asphalt-primer-spray"])) {
             const { quantity: sprayQuantityCalculated, actualWasteFactor: sprayWaste } = calculateMaterialQuantity( karnakSpray, measurements, undefined );
            const sprayQuantity = Math.max(lowSlopeArea > 200 ? 2 : 1, sprayQuantityCalculated); 
            newSelectedMaterials["karnak-asphalt-primer-spray"] = karnakSpray;
            newQuantities["karnak-asphalt-primer-spray"] = sprayQuantity;
            newDisplayQuantities["karnak-asphalt-primer-spray"] = sprayQuantity.toString();
            newMaterialWasteFactors["karnak-asphalt-primer-spray"] = sprayWaste; 
            newUserOverriddenWaste["karnak-asphalt-primer-spray"] = false; 
            materialsUpdated = true;
          }
        }
      } 
    }
    if (materialsUpdated) {
      isInternalChange.current = true;
      setLocalSelectedMaterials(newSelectedMaterials);
      setLocalQuantities(newQuantities);
      setDisplayQuantities(newDisplayQuantities);
      setMaterialWasteFactors(newMaterialWasteFactors); 
      setUserOverriddenWaste(newUserOverriddenWaste); 
      toast({
        title: "Low-Slope Materials Added",
        description: `Required materials for ${lowSlopeArea.toFixed(1)} sq ft of low-slope area have been automatically added.` +
                     ` Actual waste factors applied have been stored.`,
      });
    }
    
  }, [measurements, wasteFactor, ROOFING_MATERIALS, toast]); // KEEPING existing deps for now

  // Group all available materials by category for rendering the accordion
  const materialsByCategory = useMemo(() => {
    console.log("[MaterialsByCategoryMemo] Grouping materials from ROOFING_MATERIALS.");
      return groupMaterialsByCategory(ROOFING_MATERIALS);
  }, []); // This now only depends on the static list, not the template

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
    
  }, [isPeelStickSelected, measurements, wasteFactor, ROOFING_MATERIALS, toast]); // KEEPING existing deps for now
  
  // Calculate and set warranty details
  useEffect(() => {
    console.log("[WarrantyEffect] START - Selected Warranty:", selectedWarranty, "Selected Package:", selectedPackage, "Measurements:", measurements);

    if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch)) {
      console.log("[WarrantyEffect] No measurements or areasByPitch, setting warrantyDetails to null.");
      setWarrantyDetails(null);
      return;
    }

    // If no warranty is selected, set warrantyDetails to null
    if (!selectedWarranty) {
      console.log("[WarrantyEffect] No warranty selected, setting warrantyDetails to null.");
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
    console.log("[WarrantyEffect] Steep Slope Area (sq ft):", steepSlopeAreaSqFt);

    if (steepSlopeAreaSqFt === 0) {
      console.log("[WarrantyEffect] No steep slope area, setting warrantyDetails to null.");
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
      
      // Update display quantity
      if (materialToAdd.id === "gaf-timberline-hdz-sg") {
        setDisplayQuantities(prev => ({ ...prev, [materialToAdd.id]: (finalQuantity / 3).toFixed(1) }));
      } else {
        setDisplayQuantities(prev => ({ ...prev, [materialToAdd.id]: finalQuantity.toString() }));
      }
      
      // Ensure category remains expanded by explicitly setting the expanded categories
      if (!expandedCategories.includes(materialToAdd.category)) {
        setExpandedCategories(prev => [...prev, materialToAdd.category]);
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
  
  // Handle waste factor change
  const handleWasteFactorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newGlobalWastePercentage = parseInt(e.target.value);
    if (!isNaN(newGlobalWastePercentage) && newGlobalWastePercentage >= 0 && newGlobalWastePercentage <= 50) {
      setWasteFactor(newGlobalWastePercentage);
      isInternalChange.current = true;
      
      const newGlobalWasteDecimal = newGlobalWastePercentage / 100;
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
      setLocalQuantities(updatedQuantities);
      setDisplayQuantities(updatedDisplayQuantities);
      setMaterialWasteFactors(updatedMaterialWasteFactors); 
    }
  };
  
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
        { id: "gaf-weatherwatch-ice-water-shield", description: "GAF WeatherWatch Ice & Water Shield (Valleys)" },
        { id: "abc-pro-guard-20", description: "ABC Pro Guard 20 (Rhino Underlayment)" },
        { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
        { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" }
      ],
      "GAF 2": [
        { id: "gaf-timberline-hdz-sg", description: "GAF Timberline HDZ SG (Shingles)" },
        { id: "gaf-prostart-starter-shingle-strip", description: "GAF ProStart Starter Shingle Strip" },
        { id: "gaf-seal-a-ridge", description: "GAF Seal-A-Ridge (Ridge Cap)" },
        { id: "gaf-feltbuster-synthetic-underlayment", description: "GAF FeltBuster Synthetic Underlayment" },
        { id: "gaf-weatherwatch-ice-water-shield", description: "GAF WeatherWatch Ice & Water Shield (Valleys)" },
        { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
        { id: "gaf-cobra-rigid-vent", description: "GAF Cobra Rigid Vent 3 Exhaust Ridge Vent" },
        { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" }
      ],
      "OC 1": [ 
        { id: "oc-oakridge", description: "OC Oakridge (Shingles)" },
        { id: "oc-hip-ridge", description: "OC Hip & Ridge (Ridge Cap)" },
        { id: "oc-starter", description: "OC Starter Shingle Strip" },
        { id: "abc-pro-guard-20", description: "ABC Pro Guard 20 (Rhino Underlayment)" },
        { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" }
      ],
      "OC 2": [ 
        { id: "oc-duration", description: "OC Duration (Shingles)" },
        { id: "oc-hip-ridge", description: "OC Hip & Ridge (Ridge Cap)" },
        { id: "oc-starter", description: "OC Starter Shingle Strip" },
        { id: "abc-pro-guard-20", description: "ABC Pro Guard 20 (Rhino Underlayment)" },
        { id: "gaf-feltbuster-synthetic-underlayment", description: "GAF FeltBuster Synthetic Underlayment" }
      ]
    };
    
    const materialsToAddFromPreset = PRESET_BUNDLES[preset];
    if (!materialsToAddFromPreset) {
      console.error(`Preset ${preset} not found!`);
      toast({ title: "Error", description: `Preset ${preset} not found.`, variant: "destructive" });
      return;
    }
    
    const newSelectedMaterials: { [key: string]: Material } = {};
    const newQuantities: { [key: string]: number } = {};

    materialsToAddFromPreset.forEach(({ id: materialId }) => {
      const material = ROOFING_MATERIALS.find(m => m.id === materialId);
      if (material) {
        const { quantity } = calculateMaterialQuantity(material, measurements, undefined, dbWastePercentages);
        if (quantity > 0) {
          newSelectedMaterials[materialId] = material;
          newQuantities[materialId] = quantity;
        }
      }
    });
  
    // Update local state directly
      setLocalSelectedMaterials(newSelectedMaterials);
      setLocalQuantities(newQuantities);
      setSelectedPreset(preset);
      
      toast({
        title: `Preset Applied: ${preset}`,
      description: "Materials have been updated.",
      });
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
  const isMandatoryMaterial = (materialName: string): boolean => {
    return materialName.includes('Required') && materialName.includes('cannot be removed');
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
    const isMandatory = material.name && isMandatoryMaterial(material.name);
    
    // Ensure waste factor exists, falling back to the default for the material if not in state yet.
    const currentWasteFactorForMaterial = materialWasteFactors[materialId] ?? determineWasteFactor(material, undefined, dbWastePercentages); 

    const initialDisplayValue = () => {
      const qty = localQuantities[materialId] || 0;
      return isGafTimberline ? (qty / 3).toFixed(1) : qty.toString();
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
          setDisplayQuantities(prev => ({ ...prev, [materialIdForWaste]: (updatedQuantity / 3).toFixed(1) }));
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
          setDisplayQuantities(prev => ({ ...prev, [materialIdForWaste]: (updatedQuantity / 3).toFixed(1) }));
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
        // For GAF Timberline, show squares and bundles
        const squares = bundleQuantity / 3;
        return `${squares.toFixed(1)} squares (${bundleQuantity} bundles)`;
      } else if (material.bundlesPerSquare && material.bundlesPerSquare > 0) {
        return `${material.bundlesPerSquare} bundles/square`;
      }
      return "";
    };

    return (
      <div
        key={materialId}
        className={`flex flex-col sm:flex-row justify-between sm:items-start ${isMandatory ? 'py-2 px-3' : 'p-3'} rounded-md border ${isMandatory ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}
      >
        {/* Left side: Material Info */}
        <div className={`flex-1 ${isMandatory ? 'mb-2' : 'mb-2'} sm:mb-0 sm:mr-3`}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-semibold text-gray-800">{baseName}</span>
            {isMandatory && (
              <Badge variant="default" className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5">
                Auto-Selected
              </Badge>
            )}
          </div>
          
          {isMandatory && requirementText && (
            <p className="text-[10px] text-blue-700 mb-0.5">{requirementText}</p>
          )}
          
          {/* Add quantity summary with calculation result */}
          <div className="text-xs text-blue-700 mb-0.5">
            {bundleQuantity > 0 && (
              <p className="font-medium">
                {isGafTimberline 
                  ? `${(bundleQuantity / 3).toFixed(1)} squares (${bundleQuantity} bundles)`
                  : `Quantity: ${bundleQuantity} ${material.unit}${bundleQuantity > 1 ? 's' : ''}`
                }
                {material.coveragePerUnit && (
                  <span className="font-normal"> • Covers approx. {(bundleQuantity * material.coveragePerUnit).toFixed(0)} sq ft</span>
                )}
              </p>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground mb-0.5 flex flex-wrap items-center gap-x-1">
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
          
          {/* Add detailed material info */}
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            {/* Consolidated Calculation Details */}
            {material.coverageRule && ( // Show if any coverage rule exists
              <div>
                <p>– Calculation Details: {formatCalculationWithMeasurements(material)}</p>
                
                {/* Add editable waste factor - only for materials that use waste */}
                {currentWasteFactorForMaterial !== undefined && 
                 material.category !== MaterialCategory.VENTILATION && 
                 material.category !== MaterialCategory.ACCESSORIES && (
                  <div className="flex flex-wrap items-center ml-1 mt-0.5">
                    <div className="flex items-center mr-1">
                      <span className="mr-1">– Waste:</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={(currentWasteFactorForMaterial * 100).toFixed(0)}
                        onChange={(e) => handlePerMaterialWasteChange(materialId, e.target.value)}
                        className="h-5 w-10 py-0 px-1 text-center text-xs"
                        aria-label={`Waste factor for ${baseName}`}
                      />
                      <span className="text-xs ml-0.5 mr-1">%</span>
                    </div>
                    <div className="flex space-x-0.5">
                      {[0, 5, 10, 12, 15].map(presetValue => (
                        <Button
                          key={`waste-preset-${presetValue}`}
                          type="button"
                          size="sm"
                          variant="outline"
                          className={`h-5 w-6 px-0.5 py-0 text-[9px] ${Math.round(currentWasteFactorForMaterial * 100) === presetValue ? 'bg-blue-100' : ''}`}
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
            
            {/* Display bundle/square info for shingles if not already covered (fallback) */}
            {!material.coverageRule?.description && getBundleInfo() && (
              <p>– {getBundleInfo()}</p>
            )}
          </div>
        </div>
  
        {/* Right side: Quantity Control and Delete Button */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 sm:ml-auto">
          <div className="flex items-center">
             {isGafTimberline ? (
               <> {/* Timberline Input (Squares) */}
                 <Button type="button" variant="outline" size="icon" className={`h-8 w-8 rounded-r-none`} 
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
                    type="number" 
                    min="0" 
                    step="0.1"
                    defaultValue={initialDisplayValue()} // USE defaultValue
                    onBlur={handleQuantityInputBlur}      // UPDATE onBlur
                    key={`qty-input-gaf-${materialId}-${localQuantities[materialId]}`} // Add localQuantities to key to force re-render with new default if external change happens
                    className={`h-8 w-20 rounded-none text-center`}
                    aria-label={`Quantity in Squares for ${baseName}`} 
                  />
                 <Button type="button" variant="outline" size="icon" className={`h-8 w-8 rounded-l-none`} 
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
                    className={`h-8 w-8 rounded-r-none`} 
                    onClick={(e) => {
                      e.preventDefault();
                      updateQuantity(materialId, Math.max(0, (localQuantities[materialId] || 0) - 1));
                    }} 
                    aria-label={`Decrease quantity for ${baseName}`}
                  >-</Button>
                 <Input 
                    type="number" 
                    min="0" 
                    defaultValue={initialDisplayValue()} // USE defaultValue
                    onBlur={handleQuantityInputBlur}      // UPDATE onBlur
                    key={`qty-input-${materialId}-${localQuantities[materialId]}`} // Add localQuantities to key
                    className={`h-8 w-16 rounded-none text-center`} 
                    aria-label={`Quantity for ${baseName}`}
                  />
                 <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className={`h-8 w-8 rounded-l-none`} 
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
             className={`h-8 w-8 text-red-500 hover:bg-red-50 ${isMandatory ? 'opacity-50 cursor-not-allowed' : ''}`} 
             disabled={isMandatory}
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
    
    // If changing from GAF 2 to GAF 1 and Gold Pledge is selected, reset to Silver Pledge
    if (selectedPackage === 'gaf-1' && selectedWarranty === 'gold-pledge') {
      console.log("Changing warranty from Gold Pledge to Silver Pledge because GAF 1 Basic Package was selected");
      setSelectedWarranty('silver-pledge');
      toast({
        title: "Warranty Changed",
        description: "Silver Pledge warranty selected because GAF 1 Basic Package does not support Gold Pledge.",
        duration: 4000,
        variant: "default"
      });
    }
  }, [selectedPackage, selectedWarranty, toast]);

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
          };
          onTemplateChange(returnedTemplate); 
        }
      }
    } catch (e) {
      console.error("Exception saving new template:", e);
      toast({ title: "Save Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  // Main return structure
  return (
    <div key={`materials-tab-${measurements?.totalArea || 'default'}-${Date.now()}`} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Column: Material Selection etc. */}
      <div className="lg:col-span-3 space-y-6">
        {/* GAF Package & Warranty Card */}
        <Card>
           <CardHeader><CardTitle>GAF Package & Warranty Selection</CardTitle></CardHeader>
           <CardContent className="space-y-4">
             <PackageSelector 
               selectedPackage={selectedPackage} 
               onPackageSelect={setSelectedPackage} 
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
        
        {/* Material Selection Card */}
        <Card>
          <CardHeader><CardTitle>Select Materials</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             {/* Waste Factor Inputs */}
             <div className="flex items-center space-x-4 pb-4">
               <Label htmlFor="wasteFactor">Waste Factor:</Label>
               <Input id="wasteFactor" type="number" value={wasteFactor} onChange={handleWasteFactorChange} className="w-24" min="0" max="50" />
               <span className="text-sm text-muted-foreground">%</span>
               <span className="text-sm text-muted-foreground">(Applies to all materials except GAF Timberline HDZ)</span>
             </div>
             {localSelectedMaterials["gaf-timberline-hdz-sg"] && (
              <div className="flex items-center space-x-4 pb-4 pt-2 border-t">
                <Label htmlFor="gafWasteFactor">GAF Timberline HDZ Waste Factor:</Label>
                <div className="flex space-x-2">
                  {[12, 15, 20].map(factor => (
                    <Button key={factor} variant="outline" className={gafTimberlineWasteFactor === factor ? "bg-blue-100" : ""} onClick={() => handleGafTimberlineWasteFactorChange(factor)}>{factor}%</Button>
                  ))}
                 </div>
                 <span className="text-sm text-blue-600 font-medium">Current: {gafTimberlineWasteFactor}%</span>
               </div>
             )}
             
             {/* Presets Section */}
             <div className="border-t pt-4 pb-2">
               <h3 className="text-md font-medium mb-2">Material Presets</h3>
               <div className="flex flex-wrap gap-2">
                 {[
                   { id: "GAF 1", label: "GAF 1 - Basic Package" },
                   { id: "GAF 2", label: "GAF 2 - Premium Package" },
                   { id: "OC 1", label: "OC 1 - Oakridge" },
                   { id: "OC 2", label: "OC 2 - Duration" }
                 ].map(preset => (
                   <Button 
                     key={preset.id} 
                     variant={selectedPreset === preset.id ? "default" : "outline"}
                     size="sm" 
                     className={`text-xs ${selectedPreset === preset.id ? 'border-2 border-primary' : ''}`}
                     onClick={() => applyPresetBundle(preset.id)}
                     disabled={readOnly}
                   >
                     <PackageOpen className="w-3.5 h-3.5 mr-1" />
                     {preset.label}
                     {selectedPreset === preset.id && <Check className="w-3.5 h-3.5 ml-1" />}
                   </Button>
                 ))}
               </div>
               <p className="text-xs text-muted-foreground mt-1">
                 Click a preset to automatically add a pre-configured bundle of materials
               </p>
             </div>
             
             {/* Materials Accordion */}
             <Accordion 
               type="multiple" 
               value={expandedCategories}
               onValueChange={setExpandedCategories}
               className="w-full">
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
                   <AccordionItem key={category} value={category}>
                     <AccordionTrigger className="text-lg font-semibold py-3">
                       {category}
                       {category === MaterialCategory.LOW_SLOPE && showLowSlope && (<Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-300 bg-yellow-50">Flat/Low-Slope Required</Badge>)}
                     </AccordionTrigger>
                     <AccordionContent>
                       <div className="space-y-2 pt-2">
                         {materials.map(baseMaterial => {
                           const material = editableTemplateMaterials[baseMaterial.id] || baseMaterial;
                           const isSelected = !!localSelectedMaterials[material.id];

                           return (
                            <div key={material.id} className="p-3 rounded-md border border-gray-200 hover:shadow-sm transition-shadow duration-150 ease-in-out">
                              <div className="flex justify-between items-start">
                                {/* Left Column: Details */}
                                <div className="flex-grow space-y-1.5 pr-3">
                                  {/* Editable Name */}
                                  <div>
                                    <Label htmlFor={`name-${material.id}`} className="sr-only">Material Name</Label>
                                    <Input
                                      id={`name-${material.id}`}
                                      type="text"
                                      defaultValue={material.name || ''} // Use defaultValue for initial render
                                      // onChange no longer calls handleEditableMaterialPropertyChange directly
                                      onBlur={(e) => handleEditableMaterialPropertyChange(material.id, 'name', e.target.value)} // Update main state on blur
                                      className="h-8 text-base font-semibold border-0 border-b-2 border-transparent focus:border-indigo-500 focus:ring-0 rounded-none px-1 py-0 -ml-1 w-full"
                                      disabled={readOnly}
                                      placeholder="Material Name"
                                      key={`name-input-${material.id}`} // Add a key to help React with defaultValue changes if material.id changes
                                    />
                                  </div>
                          
                                  {/* Editable Price & Static Unit */}
                                  <div className="flex items-center space-x-2">
                                    <Label htmlFor={`price-${material.id}`} className="sr-only">Price</Label>
                                    <Input
                                      id={`price-${material.id}`}
                                      type="number"
                                      step="0.01"
                                      defaultValue={material.price !== undefined ? String(material.price) : ''} // Use defaultValue
                                      // onChange no longer calls handleEditableMaterialPropertyChange directly
                                      onBlur={(e) => handleEditableMaterialPropertyChange(material.id, 'price', e.target.value, true)} // Update main state on blur
                                      className="h-8 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 w-24"
                                      disabled={readOnly}
                                      placeholder="0.00"
                                      key={`price-input-${material.id}`} // Add a key
                                    />
                                    {material.unit && <span className="text-sm text-gray-600">per {material.unit}</span>}
                                    {material.approxPerSquare && material.approxPerSquare > 0 && 
                                      <span className="text-xs text-gray-500">(≈ {formatPrice(material.approxPerSquare)}/sq)</span>
                                    }
                                  </div>
                                  
                                  {/* Static Coverage Rule Description */}
                                  {material.coverageRule?.description && (
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium text-gray-700">Coverage:</span> {material.coverageRule.description}
                                    </p>
                                  )}
                          
                                  {/* Static Coverage Rule Calculation & Interpreted Logic */}
                                  {material.coverageRule?.calculation && (
                                    <div className="text-xs text-gray-600">
                                      <p><span className="font-medium text-gray-700">Logic:</span> {material.coverageRule.calculation}</p>
                                      {!readOnly && (
                                        <p className="text-indigo-500 mt-0.5">
                                          <span className="font-medium text-gray-700">→ Current Calc:</span> {formatCalculationWithMeasurements(material)}
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
                                    className="min-w-[100px] h-9"
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
          <CardFooter className="flex justify-between items-center mt-4">
            <Button 
              variant="outline" 
              onClick={() => onMaterialsUpdate({ 
                selectedMaterials: localSelectedMaterials,
                quantities: localQuantities,
                peelStickPrice: peelStickPrice,
                warrantyCost: warrantyDetails?.price || 0,
                warrantyDetails: warrantyDetails,
                isNavigatingBack: true 
              })}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Measurements
            </Button>
           </CardFooter>
        </Card>
      </div>

      {/* Right Column: Selected Materials */}
      <div className="lg:col-span-2">
        <Card className="sticky top-4">
          <CardHeader className="pb-2"><CardTitle>Selected Materials</CardTitle></CardHeader>
          <CardContent className="space-y-3 px-3 py-2">
            {Object.keys(localSelectedMaterials).length === 0 && !warrantyDetails ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No materials selected yet</p>
                <p className="text-sm mt-2">Select materials from the list</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(localSelectedMaterials).map(([materialId, material]) => {
                   if (!material || !material.id) return null; 
                   return renderSelectedMaterial(materialId, material);
                 })}
                {/* Display Warranty Details */}
                {warrantyDetails && warrantyDetails.price > 0 && (
                  <div className="p-3 rounded-md border border-purple-300 bg-purple-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800">{warrantyDetails.name}</span>
                      <Badge variant="default" className="ml-2 bg-purple-600 text-white text-xs px-1.5 py-0.5">
                        Warranty
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {formatPrice(warrantyDetails.price)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>– Calculation Logic: {warrantyDetails.calculation}</p>
                    </div>
                  </div>
                )}
                 <div className="flex justify-between font-medium text-lg pt-2 border-t">
                   <span>Total:</span>
                   <span>{formatPrice(calculateEstimateTotal())}</span>
                 </div>
               </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MaterialsSelectionTab; 