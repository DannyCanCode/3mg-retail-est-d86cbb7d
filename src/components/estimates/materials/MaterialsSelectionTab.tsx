import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Plus, Trash, ChevronDown, ChevronUp, Check, PackageOpen } from "lucide-react";
import { MeasurementValues } from "../measurement/types";
import { ROOFING_MATERIALS } from "./data";
import { Material, MaterialCategory } from "./types";
import { calculateMaterialQuantity, calculateMaterialTotal, groupMaterialsByCategory } from "./utils";
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
import { toast } from "@/hooks/use-toast";
import { getDefaultPricingTemplate, PricingTemplate } from "@/api/pricing-templates";

// *** UPDATED LOG HERE ***
console.log("[MaterialsSelectionTab] Component Code Loaded - Version Check: TEMPLATE SELECTION UPDATE v3"); 

interface MaterialsSelectionTabProps {
  measurements: MeasurementValues;
  selectedMaterials?: {[key: string]: Material};
  quantities?: {[key: string]: number};
  onMaterialsUpdate: (update: { 
    selectedMaterials: {[key: string]: Material}, 
    quantities: {[key: string]: number},
    peelStickPrice: string // Add the calculated price
  }) => void;
  readOnly?: boolean;
}

export function MaterialsSelectionTab({
  measurements,
  selectedMaterials = {}, // Default to empty object
  quantities = {}, // Default to empty object
  onMaterialsUpdate,
  readOnly,
}: MaterialsSelectionTabProps) {
  // Debug log measurements
  console.log("MaterialsSelectionTab rendering with measurements:", measurements);
  console.log("areasByPitch:", measurements?.areasByPitch);
  console.log("Received selectedMaterials:", {
    count: Object.keys(selectedMaterials).length,
    ids: Object.keys(selectedMaterials)
  });
  
  // Add validation at the start
  if (!measurements || !measurements.totalArea || measurements.totalArea === 0 || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Missing Measurements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please go back and enter roof measurements before selecting materials.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => onMaterialsUpdate({ selectedMaterials: {}, quantities: {}, peelStickPrice: "0.00" }) } variant="outline">Back to Measurements</Button>
        </CardFooter>
      </Card>
    );
  }

  // Local state for managing selected materials
  const [localSelectedMaterials, setLocalSelectedMaterials] = useState<{[key: string]: Material}>(selectedMaterials);
  const [localQuantities, setLocalQuantities] = useState<{[key: string]: number}>(quantities);
  const [wasteFactor, setWasteFactor] = useState(10); // Default 10% waste
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    MaterialCategory.SHINGLES
  ]);
  const [showLowSlope, setShowLowSlope] = useState(false);
  // Special waste factor for GAF Timberline HDZ
  const [gafTimberlineWasteFactor, setGafTimberlineWasteFactor] = useState(12); // Minimum 12%
  
  // State for GAF packages and warranty options
  const [selectedPackage, setSelectedPackage] = useState<string>('gaf-1');
  const [selectedWarranty, setSelectedWarranty] = useState<string>('silver-pledge');
  const [isPeelStickSelected, setIsPeelStickSelected] = useState<boolean>(false);
  const [includeIso, setIncludeIso] = useState<boolean>(false);
  const [peelStickPrice, setPeelStickPrice] = useState<string>("0.00");
  
  // State for display quantities (e.g., Squares for Timberline)
  const [displayQuantities, setDisplayQuantities] = useState<Record<string, string>>({});
  
  // Ref to track if changes are from internal state or external props
  const isInternalChange = useRef(false);
  const prevSelectedMaterialsCount = useRef(Object.keys(selectedMaterials).length);
  const skipNextParentUpdate = useRef(false);

  // Add state to track currently selected preset (if any)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Reset function to completely reset state from props
  const resetStateFromProps = useCallback(() => {
    console.log("Resetting state from props", {
      materials: Object.keys(selectedMaterials).length,
      quantities: Object.keys(quantities).length
    });
    
    // Temporarily stop parent updates while we reset state
    skipNextParentUpdate.current = true;
    
    // Create fresh copies to ensure React detects changes
    const materialsCopy = {...selectedMaterials};
    const quantitiesCopy = {...quantities};
    
    setLocalSelectedMaterials(materialsCopy);
    setLocalQuantities(quantitiesCopy);
    
    // Initialize display quantities
    const initialDisplayQtys: Record<string, string> = {};
    for (const materialId in quantitiesCopy) {
      const bundleQuantity = quantitiesCopy[materialId] || 0;
      const isGafTimberline = materialId === "gaf-timberline-hdz-sg";
      initialDisplayQtys[materialId] = isGafTimberline 
          ? (bundleQuantity / 3).toFixed(1) 
          : bundleQuantity.toString();
    }
    setDisplayQuantities(initialDisplayQtys);
  }, [selectedMaterials, quantities]);

  // Update local state when props change
  useEffect(() => {
    console.log("MaterialsSelectionTab: Props changed", {
      selectedMaterialsCount: Object.keys(selectedMaterials).length,
      localSelectedMaterialsCount: Object.keys(localSelectedMaterials).length,
      isInternalChange: isInternalChange.current
    });
    
    // Skip updating if this was triggered by our own internal state change
    if (isInternalChange.current) {
      console.log("Skipping prop update since it was triggered by internal change");
      isInternalChange.current = false;
      return;
    }
    
    // Check if materials count has changed significantly (indicates template application)
    const selectedMaterialsCount = Object.keys(selectedMaterials).length;
    const localMaterialsCount = Object.keys(localSelectedMaterials).length;
    const significantChange = Math.abs(selectedMaterialsCount - localMaterialsCount) > 1;
    
    if (significantChange) {
      console.log("Significant change in materials count, resetting state from props");
      skipNextParentUpdate.current = true; // Skip the next parent update to break the loop
      resetStateFromProps();
      return;
    }
    
    // Only update if the selectedMaterials prop actually contains data
    // This prevents wiping out local state if an empty object is passed accidentally
    if (Object.keys(selectedMaterials).length > 0 || Object.keys(localSelectedMaterials).length === 0) {
      skipNextParentUpdate.current = true; // Skip the next parent update
      setLocalSelectedMaterials(selectedMaterials);
    }
    
    if (Object.keys(quantities).length > 0 || Object.keys(localQuantities).length === 0) {
      skipNextParentUpdate.current = true; // Skip the next parent update
      setLocalQuantities(quantities);
      
      // Initialize display quantities
      const initialDisplayQtys: Record<string, string> = {};
      for (const materialId in quantities) {
        const bundleQuantity = quantities[materialId] || 0;
        const isGafTimberline = materialId === "gaf-timberline-hdz-sg";
        initialDisplayQtys[materialId] = isGafTimberline 
            ? (bundleQuantity / 3).toFixed(1) 
            : bundleQuantity.toString();
      }
      setDisplayQuantities(initialDisplayQtys);
    }
    
    // Update the previous count
    prevSelectedMaterialsCount.current = selectedMaterialsCount;
  }, [selectedMaterials, quantities, resetStateFromProps, localSelectedMaterials]);
  
  // Notify parent of changes when local state changes
  useEffect(() => {
    // Don't notify parent if we just updated from parent props
    if (skipNextParentUpdate.current) {
      console.log("Skipping parent notification due to prop-initiated update");
      skipNextParentUpdate.current = false;
      return;
    }
    
    // Only notify if values actually changed
    const materialsChanged = JSON.stringify(localSelectedMaterials) !== JSON.stringify(selectedMaterials);
    const quantitiesChanged = JSON.stringify(localQuantities) !== JSON.stringify(quantities);
    
    if (materialsChanged || quantitiesChanged) {
      console.log("Notifying parent of material changes", {
        materialsCount: Object.keys(localSelectedMaterials).length,
        quantitiesCount: Object.keys(localQuantities).length
      });
      
      // Set flag to indicate this update came from internal state
      isInternalChange.current = true;
      
      onMaterialsUpdate({
        selectedMaterials: localSelectedMaterials,
        quantities: localQuantities,
        peelStickPrice
      });
    }
  }, [localSelectedMaterials, localQuantities, onMaterialsUpdate, selectedMaterials, quantities, peelStickPrice]);

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
    if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch)) {
      return;
    }
    
    const hasFlatRoofAreas = measurements.areasByPitch.some(
      area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch)
    );
    
    // Auto-detect special low pitch areas and add required materials
    const hasLowPitch = measurements.areasByPitch.some(
      area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch)
    );
    const has0Pitch = measurements.areasByPitch.some(area => ["0:12", "0/12"].includes(area.pitch));
    
    const newSelectedMaterials = { ...localSelectedMaterials };
    const newQuantities = { ...localQuantities };
    let materialsUpdated = false; // Flag to track if updates were made
    
    // Add GAF Poly ISO for 0/12 pitch
    if (has0Pitch) {
      const polyIsoMaterial = ROOFING_MATERIALS.find(m => m.id === "gaf-poly-iso-4x8");
      if (polyIsoMaterial) {
          const zeroPitchArea = measurements.areasByPitch
              .filter(area => ["0:12", "0/12"].includes(area.pitch))
              .reduce((total, area) => total + (area.area || 0), 0);
          if (zeroPitchArea > 0) {
              const squaresNeeded = zeroPitchArea / 100;
              const quantityNeeded = Math.ceil(squaresNeeded * 1.12);
              const currentQty = newQuantities["gaf-poly-iso-4x8"] || 0;
              if (!newSelectedMaterials["gaf-poly-iso-4x8"] || currentQty !== quantityNeeded) {
                  const mandatoryMaterial = { 
                      ...polyIsoMaterial,
                      name: `${polyIsoMaterial.name} (Required for 0/12 pitch - cannot be removed)`
                  };
                  newSelectedMaterials["gaf-poly-iso-4x8"] = mandatoryMaterial;
                  newQuantities["gaf-poly-iso-4x8"] = quantityNeeded;
                  materialsUpdated = true;
              }
          }
      } 
    }
    
    // Add Polyglass Base and Cap sheets if 0/12, 1/12 OR 2/12 pitch exists
    if (hasLowPitch) {
      const baseSheetMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-elastoflex-sbs");
      const capSheetMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-polyflex-app");
      
      if (baseSheetMaterial && capSheetMaterial) {
        // Calculate area with 0/12, 1/12 or 2/12 pitch
        const lowPitchArea = measurements.areasByPitch
          .filter(area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch))
          .reduce((total, area) => total + (area.area || 0), 0);
        
        if (lowPitchArea > 0) {
          const squaresNeeded = lowPitchArea / 100;
          const wasteFactorForLowSlope = wasteFactor / 100; 
          const squaresWithWaste = squaresNeeded * (1 + wasteFactorForLowSlope);
          const baseQuantity = Math.ceil(squaresWithWaste / 0.625);
          const capQuantity = Math.ceil(squaresWithWaste / 0.8);
          
          // Check if update is needed for Base sheet
          const currentBaseQty = newQuantities["polyglass-elastoflex-sbs"] || 0;
          if (!newSelectedMaterials["polyglass-elastoflex-sbs"] || currentBaseQty !== baseQuantity) {
              const mandatoryBaseSheet = {
                ...baseSheetMaterial,
                name: `${baseSheetMaterial.name} (Required for <= 2/12 pitch - cannot be removed)`
              };
              newSelectedMaterials["polyglass-elastoflex-sbs"] = mandatoryBaseSheet;
              newQuantities["polyglass-elastoflex-sbs"] = baseQuantity;
              materialsUpdated = true;
          }

          // Check if update is needed for Cap sheet
          const currentCapQty = newQuantities["polyglass-polyflex-app"] || 0;
           if (!newSelectedMaterials["polyglass-polyflex-app"] || currentCapQty !== capQuantity) {
              const mandatoryCapSheet = {
                ...capSheetMaterial,
                name: `${capSheetMaterial.name} (Required for <= 2/12 pitch - cannot be removed)`
              };
              newSelectedMaterials["polyglass-polyflex-app"] = mandatoryCapSheet;
              newQuantities["polyglass-polyflex-app"] = capQuantity;
              materialsUpdated = true;
          }
        }
      }
    }
    
    // Update state only if materials were actually added or changed
    if (materialsUpdated) {
      setLocalSelectedMaterials(newSelectedMaterials);
      setLocalQuantities(newQuantities);
    }
  }, [measurements, wasteFactor]);

  // Group materials by category using the complete ROOFING_MATERIALS list
  const materialsByCategory = useMemo(() => {
    console.log("Grouping materials from complete ROOFING_MATERIALS list");
    const groups = groupMaterialsByCategory(ROOFING_MATERIALS);
    console.log("Grouped materials by category:", groups);
    return groups;
  }, []);

  // Handle Peel & Stick system add-on
  useEffect(() => {
    const systemMaterialId = "full-peel-stick-system";
    const peelStickCostPerSquare = 60;
    const systemMaterial = ROOFING_MATERIALS.find(m => m.id === systemMaterialId);
    let newPeelStickCost = 0;
    let needsUpdate = false;
    let updatedMaterials = { ...localSelectedMaterials };
    let updatedQuantities = { ...localQuantities };

    // Ensure we have necessary data
    if (!measurements?.totalArea || !systemMaterial) {
       setPeelStickPrice("0.00");
       return;
    }
    
    // Calculate steep slope area (>= 3/12)
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
      // Peel & Stick is ON
      if (steepSlopeArea > 0) {
        const steepSlopeSquares = steepSlopeArea / 100;
        newPeelStickCost = steepSlopeSquares * peelStickCostPerSquare;
        
        const systemQuantity = Math.ceil((steepSlopeSquares * (1 + wasteFactor / 100)) / 1.5); 

        // Check if update is needed
        const currentQuantity = updatedQuantities[systemMaterialId] || 0;
        if (!updatedMaterials[systemMaterialId] || currentQuantity !== systemQuantity) {
          updatedMaterials[systemMaterialId] = systemMaterial;
          updatedQuantities[systemMaterialId] = systemQuantity;
          needsUpdate = true;
        }
      } else {
        newPeelStickCost = 0;
        // Remove system material if it exists
        if (updatedMaterials[systemMaterialId]) {
           delete updatedMaterials[systemMaterialId];
           delete updatedQuantities[systemMaterialId];
           needsUpdate = true;
        }
      }
    } else {
      // Peel & Stick is OFF
      newPeelStickCost = 0;
      // Remove system material if it exists
      if (updatedMaterials[systemMaterialId]) {
        delete updatedMaterials[systemMaterialId];
        delete updatedQuantities[systemMaterialId];
        needsUpdate = true;
      }
    }

    // Update the cost state
    setPeelStickPrice(newPeelStickCost.toFixed(2));

    // If materials/quantities changed, update state
    if (needsUpdate) {
      setLocalSelectedMaterials(updatedMaterials);
      setLocalQuantities(updatedQuantities);
    }
  }, [isPeelStickSelected, measurements, wasteFactor]);

  // Add material to selection
  const addMaterial = (materialToAdd: Material) => {
    console.log(`Adding material: ${materialToAdd.id}`);
    isInternalChange.current = true;
    
    const effectiveWasteFactor = materialToAdd.id === "gaf-timberline-hdz-sg" ? 
      gafTimberlineWasteFactor / 100 : 
      wasteFactor / 100;
    
    const suggestedQuantity = calculateMaterialQuantity(
      materialToAdd, 
      measurements, 
      effectiveWasteFactor
    );
    
    setLocalSelectedMaterials(prev => ({
      ...prev,
      [materialToAdd.id]: materialToAdd
    }));
    
    setLocalQuantities(prev => ({
      ...prev,
      [materialToAdd.id]: suggestedQuantity
    }));
    
    // Update display quantity for Timberline
    if (materialToAdd.id === "gaf-timberline-hdz-sg") {
      setDisplayQuantities(prev => ({
        ...prev,
        [materialToAdd.id]: (suggestedQuantity / 3).toFixed(1)
      }));
    } else {
      setDisplayQuantities(prev => ({
        ...prev,
        [materialToAdd.id]: suggestedQuantity.toString()
      }));
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
    
    delete newSelectedMaterials[materialId];
    delete newQuantities[materialId];
    delete newDisplayQuantities[materialId];
    
    setLocalSelectedMaterials(newSelectedMaterials);
    setLocalQuantities(newQuantities);
    setDisplayQuantities(newDisplayQuantities);
  };
  
  // Update quantity for a material
  const updateQuantity = (materialId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    isInternalChange.current = true;
    
    setLocalQuantities(prev => ({
      ...prev,
      [materialId]: newQuantity
    }));
    
    // Update display quantity for Timberline
    if (materialId === "gaf-timberline-hdz-sg") {
      setDisplayQuantities(prev => ({
        ...prev,
        [materialId]: (newQuantity / 3).toFixed(1)
      }));
    } else {
      setDisplayQuantities(prev => ({
        ...prev,
        [materialId]: newQuantity.toString()
      }));
    }
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
    const value = parseInt(e.target.value);
    if (isNaN(value)) return;
    
    setWasteFactor(Math.max(0, Math.min(50, value))); // Limit between 0-50%
    
    // Recalculate quantities with new waste factor
    const newQuantities = { ...localQuantities };
    const newDisplayQuantities = { ...displayQuantities };
    
    Object.keys(localSelectedMaterials).forEach(materialId => {
      // Skip GAF Timberline HDZ as it has its own waste factor
      if (materialId === "gaf-timberline-hdz-sg") return;
      
      const newQuantity = calculateMaterialQuantity(
        localSelectedMaterials[materialId],
        measurements,
        value / 100
      );
      
      newQuantities[materialId] = newQuantity;
      newDisplayQuantities[materialId] = newQuantity.toString();
    });
    
    setLocalQuantities(newQuantities);
    setDisplayQuantities(newDisplayQuantities);
  };
  
  // Handle GAF Timberline HDZ waste factor change
  const handleGafTimberlineWasteFactorChange = (newWasteFactor: number) => {
    setGafTimberlineWasteFactor(newWasteFactor);
    
    // Only update GAF Timberline HDZ SG if it's selected
    if (localSelectedMaterials["gaf-timberline-hdz-sg"]) {
      const newQuantity = calculateMaterialQuantity(
        localSelectedMaterials["gaf-timberline-hdz-sg"],
        measurements,
        newWasteFactor / 100
      );
      
      setLocalQuantities(prev => ({
        ...prev,
        ["gaf-timberline-hdz-sg"]: newQuantity
      }));
      
      setDisplayQuantities(prev => ({
        ...prev,
        ["gaf-timberline-hdz-sg"]: (newQuantity / 3).toFixed(1)
      }));
    }
  };
  
  // Apply material preset bundle
  const applyPresetBundle = (preset: string) => {
    console.log(`Applying preset bundle: ${preset}`);
    setSelectedPreset(preset); // Track the selected preset
    isInternalChange.current = true;
    
    // Check if the roof has any standard pitches (3/12 or higher)
    const hasStandardPitchAreas = measurements.areasByPitch.some(
      area => {
        const pitchValue = parseInt(area.pitch.split(/[:\/]/)[0]) || 0;
        return pitchValue >= 3;
      }
    );
    
    // Start with a fresh selection for preset packages
    const newSelectedMaterials: {[key: string]: Material} = {};
    const newQuantities: {[key: string]: number} = {};
    const newDisplayQuantities: {[key: string]: string} = {};
    
    // Preserve mandatory low-pitch materials from current selection
    Object.entries(localSelectedMaterials).forEach(([materialId, material]) => {
      if (material.name && material.name.includes("cannot be removed")) {
        newSelectedMaterials[materialId] = material;
        newQuantities[materialId] = localQuantities[materialId] || 0;
        newDisplayQuantities[materialId] = displayQuantities[materialId] || "0";
      }
    });

    // UPDATED: Define preset package materials with correct material IDs and detailed descriptions
    const presetMaterials: { [key: string]: { id: string, description: string }[] } = {
      "GAF 1": [
        { id: "gaf-timberline-hdz-sg", description: "GAF Timberline HDZ SG (Shingles)" },
        { id: "gaf-prostart-starter-shingle-strip", description: "GAF ProStart Starter Shingle Strip" },
        { id: "gaf-seal-a-ridge", description: "GAF Seal-A-Ridge (Ridge Cap)" },
        { id: "gaf-weatherwatch-ice-water-shield", description: "GAF WeatherWatch Ice & Water Shield (Valleys)" },
        { id: "abc-pro-guard-20", description: "ABC Pro Guard 20 (Rhino Underlayment)" },
        { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
        { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" },
        { id: "karnak-asphalt-primer-spray", description: "Karnak #108 Asphalt Primer Spray" }
      ],
      "GAF 2": [
        { id: "gaf-timberline-hdz-sg", description: "GAF Timberline HDZ SG (Shingles)" },
        { id: "gaf-prostart-starter-shingle-strip", description: "GAF ProStart Starter Shingle Strip" },
        { id: "gaf-seal-a-ridge", description: "GAF Seal-A-Ridge (Ridge Cap)" },
        { id: "gaf-feltbuster-synthetic-underlayment", description: "GAF FeltBuster Synthetic Underlayment" },
        { id: "gaf-weatherwatch-ice-water-shield", description: "GAF WeatherWatch Ice & Water Shield (Valleys)" },
        { id: "adjustable-lead-pipe-flashing-4inch", description: "Adjustable Lead Pipe Flashing - 4\"" },
        { id: "gaf-cobra-rigid-vent", description: "GAF Cobra Rigid Vent 3 Exhaust Ridge Vent" },
        { id: "master-sealant", description: "Master Builders MasterSeal NP1 Sealant" },
        { id: "karnak-asphalt-primer-spray", description: "Karnak #108 Asphalt Primer Spray" }
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
    
    // Show notification if there are no standard pitch areas
    if (!hasStandardPitchAreas) {
      toast({
        title: "Low-Slope Roof Detected",
        description: `Your roof only has low-slope areas (0/12, 1/12, or 2/12). The ${preset} package will only apply to any standard pitch areas, while the special low-slope materials will be used for your low-slope areas.`,
      });
    }
    
    // Debug log
    console.log("Preset materials to add:", presetMaterials[preset].map(m => m.id));
    console.log("Finding materials in ROOFING_MATERIALS array with", ROOFING_MATERIALS.length, "items");
    
    // UPDATED: Always try to add materials even if no standard pitch areas
    // This ensures materials like feltbuster that work on all pitches are still added
    const materialsToAdd = presetMaterials[preset] || [];
    
    materialsToAdd.forEach(({ id: materialId, description }) => {
      // Skip if the material was already added (e.g., mandatory materials)
      if (newSelectedMaterials[materialId]) {
        console.log(`Material ${materialId} (${description}) already selected, skipping`);
        return;
      }
      
      // Find the material in ROOFING_MATERIALS
      const material = ROOFING_MATERIALS.find(m => m.id === materialId);
      
      if (!material) {
        console.error(`Material with ID ${materialId} (${description}) not found in ROOFING_MATERIALS`);
        return;
      }
      
      console.log(`Found material: ${material.id} - ${material.name} (${description})`);
      
      const effectiveWasteFactor = material.id === "gaf-timberline-hdz-sg" ? 
        gafTimberlineWasteFactor / 100 : 
        wasteFactor / 100;
      
      // Special handling for WeatherWatch (valleys only)
      if (materialId === "gaf-weatherwatch-ice-water-shield" && (preset === "GAF 1" || preset === "GAF 2")) {
        const valleyLength = measurements.valleyLength || 0;
        if (valleyLength > 0) {
          const rollsNeeded = Math.ceil(valleyLength / 45.5);
          
          const valleyOnlyMaterial = { ...material }; 
          valleyOnlyMaterial.name = "GAF WeatherWatch Ice & Water Shield (valleys only)";
          newSelectedMaterials[materialId] = valleyOnlyMaterial;
          newQuantities[materialId] = rollsNeeded;
          newDisplayQuantities[materialId] = rollsNeeded.toString();
          console.log(`Added valley-only material ${materialId} (${description}) with quantity ${rollsNeeded}`);
        } else {
          console.log(`Skipping ${materialId} (${description}) as there's no valley length`);
        }
      } 
      // For shingles and other materials, only add if there are standard pitch areas or if it's applicable to all pitches
      else if (material.category === MaterialCategory.SHINGLES && !hasStandardPitchAreas) {
        // Skip shingles if there are no standard pitch areas
        console.log(`Skipping shingle ${materialId} (${description}) as there are no standard pitch areas`);
        return;
      }
      else {
        // Standard calculation for other materials
        const quantity = calculateMaterialQuantity(
          material, 
          measurements, 
          effectiveWasteFactor
        );
        
        // Only skip if the quantity is zero AND it's not a material that might be manually entered
        if (quantity <= 0 && !materialId.includes('karnak') && !materialId.includes('sealant') && !materialId.includes('pipe-flashing')) {
          console.log(`Calculated quantity for ${materialId} (${description}) is ${quantity}, skipping`);
          return; // Skip if quantity is zero or negative
        }
        
        // For certain materials, provide a minimum quantity if calculation returns zero
        let finalQuantity = quantity;
        if (quantity <= 0) {
          if (materialId.includes('sealant')) {
            finalQuantity = 2; // Minimum 2 tubes of sealant
          } else if (materialId.includes('karnak')) {
            finalQuantity = 1; // Minimum 1 spray can
          } else if (materialId.includes('pipe-flashing')) {
            finalQuantity = 1; // Minimum 1 pipe flashing
          }
        }
        
        newSelectedMaterials[materialId] = material;
        newQuantities[materialId] = finalQuantity;
        
        if (material.id === "gaf-timberline-hdz-sg") {
          newDisplayQuantities[materialId] = (finalQuantity / 3).toFixed(1);
        } else {
          newDisplayQuantities[materialId] = finalQuantity.toString();
        }
        
        console.log(`Added material ${materialId} (${description}) with quantity ${finalQuantity}`);
      }
    });
    
    console.log("Final materials to set:", Object.keys(newSelectedMaterials));
    console.log("Quantities:", newQuantities);
    
    // Update state with new materials and quantities
    setLocalSelectedMaterials(newSelectedMaterials);
    setLocalQuantities(newQuantities);
    setDisplayQuantities(newDisplayQuantities);
    
    // Add a visual confirmation toast
    const addedCount = Object.keys(newSelectedMaterials).length;
    const materialNamesAdded = Object.values(newSelectedMaterials)
      .map(m => m.name.split('(')[0].trim()) // Get just the base name without any parenthetical info
      .sort((a, b) => a.localeCompare(b))
      .join(", ");
    
    const toastDescription = addedCount > 0
      ? `Added ${addedCount} materials: ${materialNamesAdded.length > 100 
          ? materialNamesAdded.substring(0, 97) + '...' 
          : materialNamesAdded}`
      : "No new materials were added. All materials may already be selected or not applicable for this roof.";
    
    toast({
      title: `${preset} Package Applied`,
      description: toastDescription,
      variant: "default"
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
    if (!material.coverageRule?.calculation || !measurements) return material.coverageRule?.calculation || "";
    
    let calculationText = material.coverageRule.calculation;
    
    // Replace generic terms with actual measurements
    if (calculationText.includes("Ridge Length")) {
      calculationText = calculationText.replace("Ridge Length", `Ridge Length (${measurements.ridgeLength || 0} ft)`);
    }
    
    if (calculationText.includes("Hip Length")) {
      calculationText = calculationText.replace("Hip Length", `Hip Length (${measurements.hipLength || 0} ft)`);
    }
    
    if (calculationText.includes("Valley Length")) {
      calculationText = calculationText.replace("Valley Length", `Valley Length (${measurements.valleyLength || 0} ft)`);
    }
    
    if (calculationText.includes("Eave Length")) {
      calculationText = calculationText.replace("Eave Length", `Eave Length (${measurements.eaveLength || 0} ft)`);
    }
    
    if (calculationText.includes("Rake Length")) {
      calculationText = calculationText.replace("Rake Length", `Rake Length (${measurements.rakeLength || 0} ft)`);
    }
    
    if (calculationText.includes("Step Flashing Length")) {
      calculationText = calculationText.replace("Step Flashing Length", `Step Flashing Length (${measurements.stepFlashingLength || 0} ft)`);
    }
    
    if (calculationText.includes("Drip Edge Length")) {
      calculationText = calculationText.replace("Drip Edge Length", `Drip Edge Length (${measurements.dripEdgeLength || 0} ft)`);
    }
    
    if (calculationText.includes("Total Squares")) {
      const totalSquares = (measurements.totalArea || 0) / 100;
      calculationText = calculationText.replace("Total Squares", `Total Squares (${totalSquares.toFixed(1)})`);
    }
    
    if (calculationText.includes("Total Roof Area")) {
      calculationText = calculationText.replace("Total Roof Area", `Total Roof Area (${measurements.totalArea || 0} sq ft)`);
    }
    
    if (calculationText.includes("Steep Slope Area")) {
      // Calculate steep slope area (>= 3/12)
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
      calculationText = calculationText.replace("Steep Slope Area (>= 3/12)", `Steep Slope Area (${steepSlopeArea.toFixed(1)} sq ft)`);
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
    }
    
    // Calculate and add the estimated quantity
    const effectiveWasteFactor = material.id === "gaf-timberline-hdz-sg" ? 
      gafTimberlineWasteFactor / 100 : 
      wasteFactor / 100;
      
    const estimatedQuantity = calculateMaterialQuantity(material, measurements, effectiveWasteFactor);
    
    // Add a summary showing the calculated quantity
    if (estimatedQuantity > 0) {
      calculationText += ` → ${estimatedQuantity} ${material.unit}${estimatedQuantity > 1 ? 's' : ''} needed`;
      
      // For shingles that use bundles/squares, show square footage too
      if (material.id === "gaf-timberline-hdz-sg" || 
          material.category === MaterialCategory.SHINGLES && material.bundlesPerSquare) {
        const squares = estimatedQuantity / (material.bundlesPerSquare || 3);
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
    
    const displayQuantity = displayQuantities[materialId] || (isGafTimberline ? '0.0' : '0');

    const handleDisplayQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        setDisplayQuantities(prev => ({...prev, [materialId]: rawValue})); 

        if (isGafTimberline) {
            const newSquares = parseFloat(rawValue);
            if (!isNaN(newSquares) && newSquares >= 0) {
                 const newBundles = Math.ceil(newSquares * 3);
                 updateQuantity(materialId, newBundles);
            } else if (rawValue === '') {
                 updateQuantity(materialId, 0);
            }
        } else {
            const newQuantity = parseInt(rawValue) || 0;
            updateQuantity(materialId, newQuantity);
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
        className={`flex flex-col sm:flex-row justify-between sm:items-center ${isMandatory ? 'py-2 px-3' : 'p-3'} rounded-md border ${isMandatory ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}
      >
        {/* Left side: Material Info */}
        <div className={`flex-1 ${isMandatory ? 'mb-2' : 'mb-3'} sm:mb-0 sm:mr-4`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-800">{baseName}</span>
            {isMandatory && (
              <Badge variant="default" className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5">
                Auto-Selected
              </Badge>
            )}
          </div>
          
          {isMandatory && requirementText && (
            <p className="text-[11px] text-blue-700 mb-0.5">{requirementText}</p>
          )}
          
          {/* Add quantity summary with calculation result */}
          <div className="text-xs text-blue-700 mb-1">
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
          
          <div className="text-sm text-muted-foreground mb-1">
             {isGafTimberline && material.approxPerSquare && (
                 <>{formatPrice(material.approxPerSquare)} per Square</>
             )}
             {!isGafTimberline && material.price > 0 && 
               <>{formatPrice(material.price)} per {material.unit}</>
             }
             {!isGafTimberline && material.approxPerSquare && material.approxPerSquare > 0 && 
                <span> (≈ {formatPrice(material.approxPerSquare)}/square)</span>
             }
             {material.id === 'full-peel-stick-system' && 
                 <span className="italic"> (Cost included in Add-on Price)</span>
             }
          </div>
          
          {/* Add detailed material info */}
          <div className="text-xs text-muted-foreground space-y-0.5">
            {/* Display price information */}
            <p>– Price: {formatPrice(material.price)} per {material.unit}
              {material.approxPerSquare && material.approxPerSquare > 0 && 
                <span> (≈ {formatPrice(material.approxPerSquare)}/square)</span>
              }
              {material.id === 'full-peel-stick-system' && 
                <span className="italic"> (Cost included in Add-on Price)</span>
              }
            </p>
            
            {/* Display coverage rule */}
            {material.coverageRule?.description && (
              <p>– Coverage Rule: {material.coverageRule.description}</p>
            )}
            
            {/* Display calculation logic */}
            {material.coverageRule?.calculation && (
              <p>– Calculation Logic: {formatCalculationWithMeasurements(material)}</p>
            )}
            
            {/* Display bundle/square info for shingles if not already covered */}
            {!material.coverageRule?.description && getBundleInfo() && (
              <p>– {getBundleInfo()}</p>
            )}
          </div>
        </div>
  
        {/* Right side: Quantity Control and Delete Button */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
          <div className="flex items-center">
             {isGafTimberline ? (
               <> {/* Timberline Input (Squares) */}
                 <Button type="button" variant="outline" size="icon" className={`h-8 w-8 rounded-r-none`} 
                    onClick={() => { 
                       const currentSq = parseFloat(displayQuantity) || 0;
                       const nextSq = Math.max(0, currentSq - 0.1); 
                       setDisplayQuantities(prev => ({...prev, [materialId]: nextSq.toFixed(1)})); 
                       updateQuantity(materialId, Math.ceil(nextSq * 3));
                    }} 
                    aria-label={`Decrease quantity for ${baseName}`}>
                    -
                  </Button>
                 <Input 
                    type="number" 
                    min="0" 
                    step="0.1"
                    value={displayQuantity}
                    onChange={handleDisplayQuantityChange}
                    className={`h-8 w-20 rounded-none text-center`}
                    aria-label={`Quantity in Squares for ${baseName}`} 
                  />
                 <Button type="button" variant="outline" size="icon" className={`h-8 w-8 rounded-l-none`} 
                    onClick={() => { 
                       const currentSq = parseFloat(displayQuantity) || 0;
                       const nextSq = currentSq + 0.1;
                       setDisplayQuantities(prev => ({...prev, [materialId]: nextSq.toFixed(1)}));
                       updateQuantity(materialId, Math.ceil(nextSq * 3));
                    }} 
                    aria-label={`Increase quantity for ${baseName}`}>
                    +
                  </Button>
               </>
             ) : (
               <> {/* Other Material Input (Bundles/Units) */}
                 <Button type="button" variant="outline" size="icon" className={`h-8 w-8 rounded-r-none`} onClick={() => updateQuantity(materialId, Math.max(0, bundleQuantity - 1))} aria-label={`Decrease quantity for ${baseName}`}>-</Button>
                 <Input 
                    type="number" 
                    min="0" 
                    value={displayQuantity}
                    onChange={handleDisplayQuantityChange}
                    className={`h-8 w-16 rounded-none text-center`} 
                    aria-label={`Quantity for ${baseName}`}
                  />
                 <Button type="button" variant="outline" size="icon" className={`h-8 w-8 rounded-l-none`} onClick={() => updateQuantity(materialId, bundleQuantity + 1)} aria-label={`Increase quantity for ${baseName}`}>+</Button>
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

  // Main return structure
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Material Selection etc. */}
      <div className="lg:col-span-2 space-y-6">
        {/* GAF Package & Warranty Card */}
        <Card>
           <CardHeader><CardTitle>GAF Package & Warranty Selection</CardTitle></CardHeader>
           <CardContent className="space-y-4">
             <PackageSelector selectedPackage={selectedPackage} onPackageSelect={setSelectedPackage} />
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
             <Accordion type="multiple" defaultValue={[MaterialCategory.SHINGLES]} className="w-full">
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
                           {materials.map(material => (
                             <div key={material.id} className="flex justify-between items-center p-3 rounded-md border hover:bg-secondary/20">
                               <div className="space-y-1">
                                 <div className="font-medium">{material.name}</div>
                                 {/* Price information with square footage estimate if available */}
                                 <div className="text-sm text-muted-foreground">
                                   – Price: {formatPrice(material.price)} per {material.unit}
                                   {material.approxPerSquare && material.approxPerSquare > 0 && 
                                     <span> (≈ {formatPrice(material.approxPerSquare)}/square)</span>
                                   }
                                 </div>
                                 {/* Coverage rule */}
                                 {material.coverageRule?.description && (
                                   <div className="text-xs text-muted-foreground">
                                     – Coverage Rule: {material.coverageRule.description}
                                   </div>
                                 )}
                                 {/* Calculation logic */}
                                 {material.coverageRule?.calculation && (
                                   <div className="text-xs text-muted-foreground">
                                     – Calculation Logic: {formatCalculationWithMeasurements(material)}
                                   </div>
                                 )}
                               </div>
                               {(() => {
                                 // Debug material selection state
                                 const isSelected = !!localSelectedMaterials[material.id];
                                 if (material.id === "gaf-timberline-hdz-sg" || material.id === "oc-oakridge") {
                                   console.log(`Material selection state for ${material.id}:`, {
                                     isSelected,
                                     inLocalSelected: material.id in localSelectedMaterials,
                                     inPropsSelected: material.id in selectedMaterials
                                   });
                                 }
                                 return (
                                   <Button 
                                     size="sm" 
                                     variant={isSelected ? "secondary" : "outline"} 
                                     onClick={() => { isSelected ? removeMaterial(material.id) : addMaterial(material); }} 
                                     className="min-w-24"
                                   >
                                     {isSelected ? <><Check className="mr-1 h-4 w-4" />Selected</> : <><Plus className="mr-1 h-4 w-4" />Add</>}
                                   </Button>
                                 );
                               })()}
                             </div>
                           ))}
                         </div>
                       </AccordionContent>
                     </AccordionItem>
                   );
                 })
               )}
             </Accordion>
          </CardContent>
          <CardFooter className="flex justify-between">
             <Button type="button" variant="outline" onClick={() => onMaterialsUpdate({ selectedMaterials: {}, quantities: {}, peelStickPrice: "0.00" })} className="flex items-center gap-2"><ChevronLeft className="h-4 w-4" />Back to Measurements</Button>
             <Button onClick={() => onMaterialsUpdate({ selectedMaterials: localSelectedMaterials, quantities: localQuantities, peelStickPrice })} disabled={Object.keys(localSelectedMaterials).length === 0} className="flex items-center gap-2">Continue</Button>
           </CardFooter>
        </Card>
      </div>

      {/* Right Column: Selected Materials */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader><CardTitle>Selected Materials</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(localSelectedMaterials).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No materials selected yet</p>
                <p className="text-sm mt-2">Select materials from the list</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(localSelectedMaterials).map(([materialId, material]) => {
                   if (!material || !material.id) return null; 
                   return renderSelectedMaterial(materialId, material);
                 })}
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