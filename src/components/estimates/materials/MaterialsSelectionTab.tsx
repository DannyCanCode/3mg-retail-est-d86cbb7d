import React, { useState, useEffect } from "react";
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

// *** ADD UNIQUE LOG HERE ***
console.log("[MaterialsSelectionTab] Component Code Loaded - Version Check: April 19th 1:15 PM"); 

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
  selectedMaterials,
  quantities,
  onMaterialsUpdate,
  readOnly,
}: MaterialsSelectionTabProps) {
  // Debug log measurements
  console.log("MaterialsSelectionTab rendering with measurements:", measurements);
  console.log("areasByPitch:", measurements?.areasByPitch);
  
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

  // Debug log measurements
  useEffect(() => {
    console.log("MaterialsSelectionTab measurements:", measurements);
  }, [measurements]);

  const [wasteFactor, setWasteFactor] = useState(10); // Default 10% waste
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    MaterialCategory.SHINGLES
  ]);
  const [showLowSlope, setShowLowSlope] = useState(false);
  // Special waste factor for GAF Timberline HDZ
  const [gafTimberlineWasteFactor, setGafTimberlineWasteFactor] = useState(12); // Minimum 12%
  
  // New state for GAF packages and warranty options
  const [selectedPackage, setSelectedPackage] = useState<string>('gaf-1');
  const [selectedWarranty, setSelectedWarranty] = useState<string>('silver-pledge');
  const [isPeelStickSelected, setIsPeelStickSelected] = useState<boolean>(false);
  const [includeIso, setIncludeIso] = useState<boolean>(false);
  const [peelStickPrice, setPeelStickPrice] = useState<string>("0.00");
  
  // Group materials by category
  const groupedMaterials = groupMaterialsByCategory(ROOFING_MATERIALS);
  
  // Check if GAF Timberline HDZ is selected
  const isGafTimberlineSelected = Boolean(selectedMaterials["gaf-timberline-hdz"]);
  
  // Check if there are flat/low-slope areas on the roof
  useEffect(() => {
    // Make sure measurements and areasByPitch are valid
    if (!measurements || !measurements.areasByPitch || !Array.isArray(measurements.areasByPitch) || measurements.areasByPitch.length === 0) {
      return;
    }
    
    const hasFlatRoofAreas = measurements.areasByPitch.some(
      area => ["0:12", "1:12", "2:12", "0/12", "1/12", "2/12"].includes(area.pitch)
    );
    
    setShowLowSlope(hasFlatRoofAreas);
    
    // If there are flat roof areas, auto-expand that category
    if (hasFlatRoofAreas && !expandedCategories.includes(MaterialCategory.LOW_SLOPE)) {
      setExpandedCategories([...expandedCategories, MaterialCategory.LOW_SLOPE]);
    }
    
    // Auto-detect special low pitch areas and add required materials
    const has0Pitch = measurements.areasByPitch.some(
      area => ["0:12", "0/12"].includes(area.pitch)
    );
    
    const has1or2Pitch = measurements.areasByPitch.some(
      area => ["1:12", "2:12", "1/12", "2/12"].includes(area.pitch)
    );
    
    // Auto-select special materials based on pitch detection
    const newSelectedMaterials = { ...selectedMaterials };
    const newQuantities = { ...quantities };
    
    // Add GAF Poly ISO for 0/12 pitch
    if (has0Pitch) {
      const polyIsoMaterial = ROOFING_MATERIALS.find(m => m.id === "gaf-poly-iso-4x8");
      if (polyIsoMaterial) {
        // Calculate area with 0/12 pitch
        const zeroPitchArea = measurements.areasByPitch
          .filter(area => ["0:12", "0/12"].includes(area.pitch))
          .reduce((total, area) => total + area.area, 0);
        
        // Calculate quantity with 12% waste
        const squaresNeeded = zeroPitchArea / 100;
        const quantityNeeded = Math.ceil(squaresNeeded * 1.12);
        
        // Add to materials with a note that it's mandatory
        const mandatoryMaterial = { 
          ...polyIsoMaterial,
          name: `${polyIsoMaterial.name} (Required for 0/12 pitch - cannot be removed)`
        };
        
        newSelectedMaterials["gaf-poly-iso-4x8"] = mandatoryMaterial;
        newQuantities["gaf-poly-iso-4x8"] = quantityNeeded;
        
        // Show notification if this is a new addition
        if (!selectedMaterials["gaf-poly-iso-4x8"]) {
          toast({
            title: "Material Auto-Selected",
            description: `GAF Poly ISO 4X8 has been automatically added because your roof has 0/12 pitch areas (${zeroPitchArea.toFixed(1)} sq ft).`,
          });
        }
      }
    }
    
    // Add Polyglass Base and Cap sheets if 1/12 or 2/12 pitch exists
    if (has1or2Pitch) { 
      const baseSheetMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-elastoflex-sbs");
      const capSheetMaterial = ROOFING_MATERIALS.find(m => m.id === "polyglass-polyflex-app");
      
      if (baseSheetMaterial && capSheetMaterial) {
        // Calculate area with 1/12 or 2/12 pitch
        const lowPitchArea = measurements.areasByPitch
          .filter(area => ["1:12", "2:12", "1/12", "2/12"].includes(area.pitch))
          .reduce((total, area) => total + (area.area || 0), 0);
        
        // --- FIX: Calculate quantity based on lowPitchArea --- 
        if (lowPitchArea > 0) {
          const squaresNeeded = lowPitchArea / 100;
          // Ensure waste factor is applied to low slope areas as well
          const wasteFactorForLowSlope = wasteFactor / 100; // Use the general waste factor
          const squaresWithWaste = squaresNeeded * (1 + wasteFactorForLowSlope);
          const baseQuantity = Math.ceil(squaresWithWaste / 0.8); // Apply to squares with waste
          const capQuantity = Math.ceil(squaresWithWaste / 0.8); // Apply to squares with waste
          console.log(`[useEffect] Calculated Polyglass quantities: Area=${lowPitchArea.toFixed(1)}, Squares=${squaresNeeded.toFixed(2)}, Waste=${wasteFactor}%, SqWaste=${squaresWithWaste.toFixed(2)}, BaseQ=${baseQuantity}, CapQ=${capQuantity}`);

          // Add to materials with a note that they're mandatory
          const mandatoryBaseSheet = {
            ...baseSheetMaterial,
            name: `${baseSheetMaterial.name} (Required for 1/12 or 2/12 pitch - cannot be removed)`
          };
          
          const mandatoryCapSheet = {
            ...capSheetMaterial,
            name: `${capSheetMaterial.name} (Required for 1/12 or 2/12 pitch - cannot be removed)`
          };
          
          newSelectedMaterials["polyglass-elastoflex-sbs"] = mandatoryBaseSheet;
          newSelectedMaterials["polyglass-polyflex-app"] = mandatoryCapSheet;
          newQuantities["polyglass-elastoflex-sbs"] = baseQuantity;
          newQuantities["polyglass-polyflex-app"] = capQuantity;
          
          // Show notification if these are new additions
          if (!selectedMaterials["polyglass-elastoflex-sbs"] || !selectedMaterials["polyglass-polyflex-app"]) {
            toast({
              title: "Low Slope Materials Auto-Selected",
              description: `Polyglass Base and Cap sheets automatically added because your roof has 1/12 or 2/12 pitch areas (${lowPitchArea.toFixed(1)} sq ft).`,
            });
          }
        } else {
            console.log("[useEffect] lowPitchArea is 0, skipping Polyglass quantity calculation.");
        }
        // --- END FIX --- 
      }
    }
    
    // Update state if *any* materials were automatically added (0/12 OR 1/12-2/12)
    if (has0Pitch || has1or2Pitch) {
      onMaterialsUpdate({ selectedMaterials: newSelectedMaterials, quantities: newQuantities, peelStickPrice });
    }
  }, [measurements, expandedCategories]);

  // Update materials when package changes
  useEffect(() => {
    if (selectedPackage === 'gaf-1') {
      applyPresetBundle("GAF 1");
    } else if (selectedPackage === 'gaf-2') {
      applyPresetBundle("GAF 2");
    }
  }, [selectedPackage]);
  
  // Reset warranty if needed when package changes
  useEffect(() => {
    // If Gold Pledge is selected but GAF 1 package is chosen, reset to Silver Pledge
    if (selectedWarranty === 'gold-pledge' && selectedPackage === 'gaf-1') {
      setSelectedWarranty('silver-pledge');
    }
  }, [selectedPackage]);
  
  // --- NEW useEffect to handle Peel & Stick state changes ---
  useEffect(() => {
    const systemMaterialId = "full-peel-stick-system";
    const peelStickCostPerSquare = 60;
    const systemMaterial = ROOFING_MATERIALS.find(m => m.id === systemMaterialId);
    let newPeelStickCost = 0;
    let needsUpdate = false;
    let updatedMaterials = { ...selectedMaterials };
    let updatedQuantities = { ...quantities };

    // Ensure we have necessary data
    if (!measurements?.totalArea || !systemMaterial) {
       console.warn("[PeelStick Effect] Missing measurements or system material definition.");
       setPeelStickPrice("0.00");
       return; // Exit if data is missing
    }
    
    // Calculate steep slope area (>= 3/12)
    let steepSlopeArea = 0;
    if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
      steepSlopeArea = measurements.areasByPitch
        .filter(area => {
          const pitchParts = area.pitch.split(/[:\\/]/);
          const rise = parseInt(pitchParts[0] || '0');
          return !isNaN(rise) && rise >= 3; // Steep slope check
        })
        .reduce((sum, area) => sum + (area.area || 0), 0);
    } else {
      console.warn("[PeelStick Effect] areasByPitch missing or not an array. Cannot calculate steep slope area.");
      // Decide fallback: Use totalArea or 0?
      // steepSlopeArea = measurements.totalArea; // Option 1: Fallback to total (might be wrong)
      steepSlopeArea = 0; // Option 2: Safer fallback, results in 0 cost/qty
    }
    console.log(`[PeelStick Effect] Calculated Steep Slope Area: ${steepSlopeArea.toFixed(1)} sq ft`);

    if (isPeelStickSelected) {
      // --- Peel & Stick is ON ---
      if (steepSlopeArea > 0) {
        const steepSlopeSquares = steepSlopeArea / 100;
        newPeelStickCost = steepSlopeSquares * peelStickCostPerSquare;
        
        // --- FIX: Calculate quantity based on STEEP SLOPE SQUARES ---
        // Calculate quantity for the SYSTEM material based on STEEP area (1.5 sq/roll)
        const systemQuantity = Math.ceil((steepSlopeSquares * (1 + wasteFactor / 100)) / 1.5); 
        console.log(`[PeelStick Effect] ON: Steep Area=${steepSlopeArea.toFixed(1)}, SteepSquares=${steepSlopeSquares.toFixed(1)}, ExtraCost=${newPeelStickCost.toFixed(2)}, SystemQty=${systemQuantity}`);

        // Check if update is needed (add system material or change its quantity)
        const currentQuantity = updatedQuantities[systemMaterialId] || 0;
        if (!updatedMaterials[systemMaterialId] || currentQuantity !== systemQuantity) {
          console.log(`[PeelStick Effect] Needs Update: Add/Update ${systemMaterialId} Qty=${systemQuantity}`);
          updatedMaterials[systemMaterialId] = systemMaterial; // Add/ensure it exists
          updatedQuantities[systemMaterialId] = systemQuantity; // Set quantity
          needsUpdate = true;
        }
      } else {
        // No steep slope area, don't add the system or cost
        console.log(`[PeelStick Effect] ON: No steep slope area found. System not added.`);
        newPeelStickCost = 0;
        // Ensure system material is removed if it somehow exists
        if (updatedMaterials[systemMaterialId]) {
           console.log(`[PeelStick Effect] Needs Update: Remove ${systemMaterialId} due to 0 steep area.`);
           delete updatedMaterials[systemMaterialId];
           delete updatedQuantities[systemMaterialId];
           needsUpdate = true;
        }
      }
    } else {
      // --- Peel & Stick is OFF ---
      console.log(`[PeelStick Effect] OFF.`);
      newPeelStickCost = 0;
      // Check if the system material needs to be removed
      if (updatedMaterials[systemMaterialId]) {
        console.log(`[PeelStick Effect] Needs Update: Remove ${systemMaterialId}.`);
        delete updatedMaterials[systemMaterialId];
        delete updatedQuantities[systemMaterialId];
        needsUpdate = true;
      }
    }

    // Update the cost state
    setPeelStickPrice(newPeelStickCost.toFixed(2));

    // If materials/quantities changed, call the main update function
    if (needsUpdate) {
      console.log(`[PeelStick Effect] Calling onMaterialsUpdate with updated state.`);
      // Pass the calculated peelStickPrice up along with materials/quantities
      onMaterialsUpdate({
         selectedMaterials: updatedMaterials,
         quantities: updatedQuantities,
         peelStickPrice: newPeelStickCost.toFixed(2) // Pass the calculated price
      });
    }
    // Pass current price up even if materials didn't change, in case only cost changed
    // (e.g., if measurements changed but selection didn't)
    else if (peelStickPrice !== newPeelStickCost.toFixed(2)) {
         console.log(`[PeelStick Effect] Calling onMaterialsUpdate just to update price.`);
         onMaterialsUpdate({
            selectedMaterials: selectedMaterials, // Pass current state
            quantities: quantities, // Pass current state
            peelStickPrice: newPeelStickCost.toFixed(2)
         });
    }

  }, [isPeelStickSelected, measurements, selectedMaterials, quantities, wasteFactor, onMaterialsUpdate]); // Added onMaterialsUpdate to deps
  
  // Handler to receive peelStickPrice (now only used if we revert to custom price input)
  // For now, the cost is calculated within MaterialsSelectionTab
  const handlePeelStickPriceUpdate = (price: string) => {
    // setPeelStickPrice(price); // Commented out as cost is now calculated here
    console.warn("[handlePeelStickPriceUpdate] This handler might be obsolete as cost is calculated in parent.");
  };
  
  // Calculate total with current selections
  const calculateEstimateTotal = () => {
    // Calculate base total from selected materials and quantities
    let materialsTotal = Object.entries(selectedMaterials).reduce((total, [materialId, material]) => {
      const quantity = quantities[materialId] || 0;
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
    
    // Add the calculated peel & stick system cost (stored in peelStickPrice state)
    if (isPeelStickSelected && peelStickPrice) {
      const numericPeelStickPrice = parseFloat(peelStickPrice) || 0;
      console.log(`[calculateEstimateTotal] Adding Peel&Stick Cost: ${numericPeelStickPrice}`);
      materialsTotal += numericPeelStickPrice;
    }
    
    return materialsTotal;
  };
  
  // Add material to selection
  const addMaterial = (material: Material) => {
    // Use GAF Timberline specific waste factor if this is GAF Timberline HDZ
    const effectiveWasteFactor = material.id === "gaf-timberline-hdz" ? 
      gafTimberlineWasteFactor / 100 : 
      wasteFactor / 100;
    
    // Calculate suggested quantity based on measurements
    const suggestedQuantity = calculateMaterialQuantity(
      material, 
      measurements, 
      effectiveWasteFactor
    );
    
    onMaterialsUpdate({
      selectedMaterials: {
        ...selectedMaterials,
        [material.id]: material
      },
      quantities: {
        ...quantities,
        [material.id]: suggestedQuantity
      },
      peelStickPrice
    });
  };
  
  // Remove material from selection
  const removeMaterial = (materialId: string) => {
    // Get the material
    const material = selectedMaterials[materialId];
    
    // Do not allow removing mandatory materials
    if (material && isMandatoryMaterial(material.name)) {
      return;
    }
    
    const newSelectedMaterials = { ...selectedMaterials };
    const newQuantities = { ...quantities };
    
    delete newSelectedMaterials[materialId];
    delete newQuantities[materialId];
    
    onMaterialsUpdate({
      selectedMaterials: newSelectedMaterials,
      quantities: newQuantities,
      peelStickPrice
    });
  };
  
  // Update quantity for a material
  const updateQuantity = (materialId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    onMaterialsUpdate({
      selectedMaterials: {
        ...selectedMaterials,
      },
      quantities: {
        ...quantities,
        [materialId]: newQuantity
      },
      peelStickPrice
    });
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
    
    // Recalculate all quantities with new waste factor
    const newQuantities = { ...quantities };
    Object.keys(selectedMaterials).forEach(materialId => {
      // Skip GAF Timberline HDZ as it has its own waste factor
      if (materialId === "gaf-timberline-hdz") return;
      
      newQuantities[materialId] = calculateMaterialQuantity(
        selectedMaterials[materialId],
        measurements,
        value / 100
      );
    });
    
    onMaterialsUpdate({ selectedMaterials, quantities: newQuantities, peelStickPrice });
  };
  
  // Handle GAF Timberline HDZ waste factor change
  const handleGafTimberlineWasteFactorChange = (newWasteFactor: number) => {
    setGafTimberlineWasteFactor(newWasteFactor);
    
    // Only update GAF Timberline HDZ if it's selected
    if (selectedMaterials["gaf-timberline-hdz"]) {
      const newQuantities = { ...quantities };
      newQuantities["gaf-timberline-hdz"] = calculateMaterialQuantity(
        selectedMaterials["gaf-timberline-hdz"],
        measurements,
        newWasteFactor / 100
      );
      
      onMaterialsUpdate({ selectedMaterials, quantities: newQuantities, peelStickPrice });
    }
  };
  
  // Apply material preset bundle
  const applyPresetBundle = (preset: string) => {
    // Check if the roof has any standard pitches (3/12 or higher)
    const hasStandardPitchAreas = measurements.areasByPitch.some(
      area => {
        const pitchValue = parseInt(area.pitch.split(/[:\/]/)[0]) || 0;
        return pitchValue >= 3;
      }
    );
    
    // Instead of clearing all materials, save any mandatory low-pitch materials
    const newSelectedMaterials: {[key: string]: Material} = {};
    const newQuantities: {[key: string]: number} = {};
    
    // Preserve mandatory low-pitch materials if they exist
    Object.entries(selectedMaterials).forEach(([materialId, material]) => {
      // Check if this is a mandatory low-pitch material
      if (isMandatoryMaterial(material.name)) {
        // Keep the material
        newSelectedMaterials[materialId] = material;
        newQuantities[materialId] = quantities[materialId] || 0;
      }
    });
    
    // Define preset material ids for each bundle
    const presetMaterials: { [key: string]: string[] } = {
      "GAF 1": ["gaf-timberline-hdz", "gaf-prostart-starter-shingle-strip", "gaf-seal-a-ridge", "gaf-weatherwatch-ice-water-shield", "abc-pro-guard-20"],
      "GAF 2": ["gaf-timberline-hdz", "gaf-prostart-starter-shingle-strip", "gaf-seal-a-ridge", "gaf-feltbuster-synthetic-underlayment", "gaf-weatherwatch-ice-water-shield"],
      "OC 1": ["oc-oakridge", "oc-hip-ridge", "oc-starter", "abc-pro-guard-20", "lead-boot-4inch"],
      "OC 2": ["oc-duration", "oc-hip-ridge", "oc-starter", "abc-pro-guard-20", "gaf-feltbuster-synthetic-underlayment"]
    };
    
    // Show notification if there are no standard pitch areas
    if (!hasStandardPitchAreas) {
      toast({
        title: "Low-Slope Roof Detected",
        description: `Your roof only has low-slope areas (0/12, 1/12, or 2/12). The ${preset} package will only apply to any standard pitch areas, while the special low-slope materials will be used for your low-slope areas.`,
      });
    }
    
    // Only apply package materials if there are standard pitch areas
    if (hasStandardPitchAreas) {
      // Find and add the materials in the preset
      presetMaterials[preset].forEach(materialId => {
        // *** Add logging here ***
        console.log(`[Preset] Processing materialId: ${materialId}`); 

        if (newSelectedMaterials[materialId]) {
           console.log(`[Preset] Skipping ${materialId} because it's already selected (mandatory).`);
           return;
        }
        
        const material = ROOFING_MATERIALS.find(m => m.id === materialId);
        if (material) {
          console.log(`[Preset] Found material object for ${materialId}`);
          // Special handling for WeatherWatch 
          if (materialId === "gaf-weatherwatch-ice-water-shield" && (preset === "GAF 1" || preset === "GAF 2")) {
            // Calculate quantity for valleys only - 45.5 LF of valleys equals 1 roll
            const valleyLength = measurements.valleyLength || 0;
            
            // Only add WeatherWatch if there are valleys
            if (valleyLength > 0) {
              // Calculate rolls needed based on 45.5 LF per roll
              const rollsNeeded = Math.ceil(valleyLength / 45.5);
              
              // Modify the material name to indicate valleys only
              const valleyOnlyMaterial = { ...material };
              valleyOnlyMaterial.name = "GAF WeatherWatch Ice & Water Shield (valleys only)";
              newSelectedMaterials[materialId] = valleyOnlyMaterial;
              
              newQuantities[materialId] = rollsNeeded;
            }
            // If no valleys, don't add WeatherWatch to the package (skip it)
             console.log(`[Preset] Calculated WeatherWatch quantity: ${newQuantities[materialId]}`);
          } else {
            // Calculate quantity normally for other materials
            const effectiveWasteFactor = material.id === "gaf-timberline-hdz" ? 
              gafTimberlineWasteFactor / 100 : 
              wasteFactor / 100;
            
            console.log(`[Preset] Calculating quantity for ${materialId} with waste ${effectiveWasteFactor}`);
            // *** Add log BEFORE calculation ***
            console.log(`[Preset] Measurements being used:`, JSON.stringify(measurements, null, 2)); 

            newQuantities[materialId] = calculateMaterialQuantity(
              material, 
              measurements, 
              effectiveWasteFactor
            );
            
            // *** Add log AFTER calculation ***
            console.log(`[Preset] Calculated quantity for ${materialId}: ${newQuantities[materialId]}`);
            
            newSelectedMaterials[materialId] = material;
          }
        } else {
            // *** Add log if material not found ***
            console.error(`[Preset] Material object NOT FOUND for materialId: ${materialId}`);
        }
      });
    }
    
    // Update state with new bundle + preserved mandatory materials
    onMaterialsUpdate({ selectedMaterials: newSelectedMaterials, quantities: newQuantities, peelStickPrice });
  };
  
  // Handle continue button click
  const handleContinue = () => {
    // INSTEAD of calling onMaterialsSelected which triggers navigation to pricing
    // Just return so that parent component handles tab navigation naturally
    return;
  };
  
  // Format price to display as currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };
  
  // Generate a human-readable explanation of the calculation for a material
  const getCalculationExplanation = (material: Material, quantity: number): string => {
    if (material.category === MaterialCategory.SHINGLES) {
      // --- Field Shingles (e.g., GAF Timberline HDZ) ---
      if (material.unit?.toLowerCase() === 'bundle' && !material.id.includes('ridge') && !material.id.includes('hip') && !material.id.includes('starter')) {
        console.log(`[Explainer V2] Calculating explanation for Field Shingle: ${material.id}`); // Log Start V2
        const actualWasteFactor = material.id === "gaf-timberline-hdz" 
                                  ? Math.max(gafTimberlineWasteFactor / 100, 0.12)
                                  : wasteFactor / 100; 
                                  
        let steepSlopeArea = 0;
        if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
            console.log(`[Explainer V2] Found areasByPitch:`, JSON.stringify(measurements.areasByPitch)); // Log pitch data V2
            steepSlopeArea = measurements.areasByPitch
              .filter(area => {
                const pitchParts = area.pitch.split(/[:\/]/);
                const rise = parseInt(pitchParts[0] || '0');
                const isSteep = !isNaN(rise) && rise >= 3;
                return isSteep;
              })
              .reduce((sum, area) => sum + (area.area || 0), 0);
             console.log(`[Explainer V2] Calculated steepSlopeArea: ${steepSlopeArea}`); // Log calculated area V2
        } else {
             console.warn(`[Explainer V2] Field Shingle: areasByPitch missing or not an array. Using totalArea as fallback.`);
             steepSlopeArea = measurements.totalArea || 0; 
             console.log(`[Explainer V2] Using fallback totalArea: ${steepSlopeArea}`);
        }

        const steepSlopeSquares = steepSlopeArea / 100;
        // Ensure waste factor is treated as a percentage added (e.g., 1 + 0.12)
        const squaresWithWaste = Math.round(steepSlopeSquares * (1 + actualWasteFactor) * 10) / 10; 
        const bundlesPerSquare = material.coverageRule.description.includes("3 Bundles/Square") ? 3 : 3; 
        
        const explanationText = `${steepSlopeArea.toFixed(1)} sq ft (Steep Slope Only) × (1 + ${(actualWasteFactor * 100).toFixed(0)}% waste) ÷ 100 = ${squaresWithWaste.toFixed(1)} squares × ${bundlesPerSquare} = ${quantity} bundles`;
        console.log(`[Explainer V2] Generated Text: ${explanationText}`); // Log final text V2
        return explanationText;
      } 
      
      // --- Ridge/Hip Cap Shingles ---
      if (material.id.includes("ridge") || material.id.includes("hip")) {
        const ridgeLength = measurements.ridgeLength || 0;
        const hipLength = measurements.hipLength || 0;
        const lfPerBundle = extractCoverageValue(material.coverageRule.description);
        // Use the component's general wasteFactor state for length waste
        const totalLengthWithWaste = (ridgeLength + hipLength) * (1 + wasteFactor / 100);
        return `Ridge (${ridgeLength} LF) + Hip (${hipLength} LF) = ${ridgeLength + hipLength} LF × (1 + ${wasteFactor}% waste) = ${totalLengthWithWaste.toFixed(1)} LF ÷ ${lfPerBundle} = ${quantity} bundles`;
      }
      
      // --- Starter Shingles ---
      if (material.id.includes("starter")) {
         let totalLength = 0;
         let lengthDesc = "";
         if (material.id === "gaf-prostart-starter-shingle-strip") {
           totalLength = measurements.eaveLength || 0;
           lengthDesc = `Eaves (${totalLength} LF)`;
         } else {
           totalLength = (measurements.eaveLength || 0) + (measurements.rakeLength || 0);
           lengthDesc = `Eaves (${measurements.eaveLength || 0} LF) + Rakes (${measurements.rakeLength || 0} LF) = ${totalLength} LF`;
         }
         const lfPerBundle = extractCoverageValue(material.coverageRule.description);
         // Use the component's general wasteFactor state for length waste
         const totalLengthWithWaste = totalLength * (1 + wasteFactor / 100); 
         return `${lengthDesc} × (1 + ${wasteFactor}% waste) = ${totalLengthWithWaste.toFixed(1)} LF ÷ ${lfPerBundle} = ${quantity} bundles`;
      }
      
      // Fallback explanation for any other shingles (shouldn't be reached ideally)
      return `Calculation based on ${material.coverageRule.calculation || 'standard rules'}`; 
    } 
    
    if (material.category === MaterialCategory.UNDERLAYMENTS) {
      // --- Moved Peel & Stick System Explanation FIRST ---
      if (material.id === "full-peel-stick-system") {
        console.log(`[Explainer ${material.id}] Received measurements:`, JSON.stringify(measurements?.areasByPitch));
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
           console.warn("[Explainer] Peel&Stick System: areasByPitch missing. Cannot explain steep slope calc.");
           return "Steep Slope Area (N/A) - Calculation Error"; 
        }
        if (steepSlopeArea <= 0) {
            return `No Steep Slope Area (>= 3/12) found = 0 rolls`;
        }
        const steepSlopeSquares = steepSlopeArea / 100;
        const squaresPerRoll = 1.5; // System coverage is 1.5 sq/roll
        const explanationText = `Steep Slope Area (${steepSlopeArea.toFixed(1)} sq ft) ÷ 100 = ${steepSlopeSquares.toFixed(1)} squares ÷ ${squaresPerRoll} sq/roll = ${quantity} rolls`;
        console.log(`[Explainer] FINAL CHECK for ${material.id}: steepSlopeArea=${steepSlopeArea.toFixed(1)}, steepSlopeSquares=${steepSlopeSquares.toFixed(1)}, quantity=${quantity}, RESULT_TEXT=${explanationText}`);
        return explanationText; 
      }
      // --- END Moved Block ---
      
      // Special case for valleys-only WeatherWatch Ice & Water Shield
      if (material.name && material.name.includes("valleys only")) {
        const valleyLength = measurements.valleyLength || 0;
        return `Valley (${valleyLength.toFixed(1)} LF) ÷ 45.5 LF/roll = ${quantity} rolls`; // Added units/precision
      }

      // Special case for ABC Pro Guard 20 (Rhino)
      if (material.id === "abc-pro-guard-20") {
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
          console.warn(`[Explainer] Rhino: areasByPitch missing or not an array. Cannot explain steep slope calc.`);
          // Fallback explanation if pitch data is missing
           return `Steep Slope Area (N/A) ÷ 450 sq ft/roll = ${quantity} rolls`;
        }

        if (steepSlopeArea <= 0) {
          return `No Steep Slope Area (>= 3/12) found = 0 rolls`;
        }

        const steepSlopeSquares = steepSlopeArea / 100;
        const squaresPerRoll = 4.5; // Rhino covers 4.5 squares
        // Explanation usually doesn't show waste factor for underlayment
        return `Steep Slope Area (${steepSlopeArea.toFixed(1)} sq ft) ÷ 100 = ${steepSlopeSquares.toFixed(1)} squares ÷ ${squaresPerRoll} sq/roll = ${quantity} rolls`;
      }
      // --- END FIX ---

      // Standard WeatherWatch Ice & Water Shield calculation (for standalone usage, not valleys only)
      if (material.id === "gaf-weatherwatch-ice-water-shield") {
        const totalArea = Math.abs(measurements.totalArea);
        const totalSquares = totalArea / 100;
        const squaresPerRoll = 1.5; // Standard WeatherWatch covers 1.5 squares
        return `${totalArea.toFixed(1)} sq ft ÷ 100 = ${totalSquares.toFixed(1)} squares ÷ ${squaresPerRoll} sq/roll = ${quantity} rolls`;
      }

      // GAF Feltbuster (uses total area)
      if (material.id === "gaf-feltbuster-synthetic-underlayment") {
         const totalArea = Math.abs(measurements.totalArea);
         const totalSquares = totalArea / 100;
         const squaresPerRoll = 10; // Feltbuster covers 10 squares
         return `${totalArea.toFixed(1)} sq ft ÷ 100 = ${totalSquares.toFixed(1)} squares ÷ ${squaresPerRoll} sq/roll = ${quantity} rolls`;
      }

      // Peel & Stick / General Weatherwatch (assuming these are different from the specific GAF one)
      if (material.coverageRule.description.includes("Peel & Stick") || material.coverageRule.description.includes("Weatherwatch")) {
        // This calculation seems complex and might need review based on specific product
        const valleyLength = measurements.valleyLength || 0;
        const eaveLength = measurements.eaveLength || 0;
        const valleyArea = valleyLength * 3 * 0.167; // This calc seems specific, ensure it's correct
        const eaveArea = eaveLength * 3 * 0.167;   // This calc seems specific, ensure it's correct
        const squaresPerRoll = 2; // Often 2 squares (200 sq ft)
        return `Valley Area (${valleyArea.toFixed(1)} sq ft) + Eave Area (${eaveArea.toFixed(1)} sq ft) = ${(valleyArea + eaveArea).toFixed(1)} sq ft ÷ ${squaresPerRoll * 100} sq ft/roll = ${quantity} rolls`;
      }

      // Default/Regular underlayment (using total area)
      const totalArea = Math.abs(measurements.totalArea);
      const totalSquares = totalArea / 100;
      const squaresPerRoll = extractCoverageValue(material.coverageRule.description) || 10; // Default to 10 sq if not found
      return `${totalArea.toFixed(1)} sq ft ÷ 100 = ${totalSquares.toFixed(1)} squares ÷ ${squaresPerRoll} sq/roll = ${quantity} rolls`;
    }
    
    if (material.category === MaterialCategory.LOW_SLOPE) {
      console.log(`[Explainer V2] Calculating explanation for Low Slope: ${material.id}`); // Log Start V2
      
      // First, calculate the relevant low slope area based on the specific material
      let relevantLowSlopeArea = 0;
      let pitchDescription = "Low Slope"; // Default description

      if (measurements.areasByPitch && Array.isArray(measurements.areasByPitch)) {
        if (material.id === "gaf-poly-iso-4x8") {
          // GAF Poly ISO is ONLY for 0/12 pitch
          relevantLowSlopeArea = measurements.areasByPitch
            .filter(area => ["0:12", "0/12"].includes(area.pitch))
            .reduce((total, area) => total + (area.area || 0), 0);
          pitchDescription = "0/12 Pitch";
        } else if (material.id === "polyglass-elastoflex-sbs" || material.id === "polyglass-polyflex-app") {
          // Polyglass Base/Cap are ONLY for 1/12 or 2/12 pitch
          relevantLowSlopeArea = measurements.areasByPitch
            .filter(area => ["1:12", "2:12", "1/12", "2/12"].includes(area.pitch))
            .reduce((total, area) => total + (area.area || 0), 0);
          pitchDescription = "1/12 or 2/12 Pitch";
        } else {
          // Default for other LOW_SLOPE materials (assumed to cover all <= 2/12)
          relevantLowSlopeArea = measurements.areasByPitch
            .filter(area => {
              const pitchParts = area.pitch.split(/[:\\/]/);
              const rise = parseInt(pitchParts[0] || '0');
              return !isNaN(rise) && rise <= 2;
            })
            .reduce((total, area) => total + (area.area || 0), 0);
          pitchDescription = "Low Slope (<= 2/12)";
        }
      } else {
        console.warn(`[Explainer] Low Slope ${material.id}: areasByPitch missing or not an array.`);
        return `${pitchDescription} Area (N/A) - Calculation Error`;
      }
      
      console.log(`[Explainer V2] Low Slope ${material.id}: Calculated relevant area (${pitchDescription}): ${relevantLowSlopeArea}`);

      if (relevantLowSlopeArea <= 0) {
        return `No ${pitchDescription} Area found = 0 rolls`;
      }

      // --- Now generate explanation based on the specific material and its relevant area ---
      const relevantSquares = relevantLowSlopeArea / 100;
      let squaresPerRoll = extractCoverageValue(material.coverageRule.description) || 1; // Default to 1 sq/roll if extraction fails

      // Specific explanation logic for Polyglass Base/Cap
      if (material.id === "polyglass-elastoflex-sbs" || material.id === "polyglass-polyflex-app") {
        // Determine rolls/sq based on material ID
        const rollsPerSquare = material.id === "polyglass-elastoflex-sbs" ? 1.60 : 1.25;
        const explanationText = `${pitchDescription} Area (${relevantLowSlopeArea.toFixed(1)} sq ft) ÷ 100 = ${relevantSquares.toFixed(1)} squares × ${rollsPerSquare.toFixed(2)} rolls/sq = ${quantity} rolls`;
        console.log(`[Explainer V2] Polyglass Explanation: ${explanationText}`); 
        return explanationText;
      }

      // Specific explanation for GAF Poly ISO (example)
      if (material.id === "gaf-poly-iso-4x8") {
         const coverage = extractCoverageValue(material.coverageRule.description) || 32; 
         return `${pitchDescription} Area (${relevantLowSlopeArea.toFixed(1)} sq ft) ÷ ${coverage} sq ft/unit = ${quantity} units`;
      } 

      // Default explanation for other low slope materials
      if (squaresPerRoll <= 0) squaresPerRoll = 1; // Avoid division by zero
      return `${pitchDescription} Area (${relevantLowSlopeArea.toFixed(1)} sq ft) ÷ 100 = ${relevantSquares.toFixed(1)} squares ÷ ${squaresPerRoll} sq/roll = ${quantity} rolls`;
    }
    
    // For accessories with per-square calculations (like Master Sealant)
    if (material.category === MaterialCategory.ACCESSORIES) {
      const totalArea = Math.abs(measurements.totalArea);
      const totalSquares = totalArea / 100;
      const totalSquaresWithWaste = Math.round(totalSquares * (1 + wasteFactor / 100) * 10) / 10;
      
      // Check for specific coverage patterns in the description
      if (material.coverageRule.description.includes("per 10 squares")) {
        return `${totalArea.toFixed(1)} sq ft ÷ 100 = ${totalSquares.toFixed(1)} squares × (1 + ${wasteFactor}% waste) = ${totalSquaresWithWaste} squares ÷ 10 = ${quantity} ${material.unit.toLowerCase()}s`;
      } else if (material.coverageRule.description.includes("per 15 squares") || 
                material.coverageRule.description.includes("per 10-15 squares")) {
        return `${totalArea.toFixed(1)} sq ft ÷ 100 = ${totalSquares.toFixed(1)} squares × (1 + ${wasteFactor}% waste) = ${totalSquaresWithWaste} squares ÷ 15 = ${quantity} ${material.unit.toLowerCase()}s`;
      } else if (material.coverageRule.description.includes("per 20 squares")) {
        return `${totalArea.toFixed(1)} sq ft ÷ 100 = ${totalSquares.toFixed(1)} squares × (1 + ${wasteFactor}% waste) = ${totalSquaresWithWaste} squares ÷ 20 = ${quantity} ${material.unit.toLowerCase()}s`;
      } else if (material.coverageRule.description.includes("per 30 squares")) {
        return `${totalArea.toFixed(1)} sq ft ÷ 100 = ${totalSquares.toFixed(1)} squares × (1 + ${wasteFactor}% waste) = ${totalSquaresWithWaste} squares ÷ 30 = ${quantity} ${material.unit.toLowerCase()}s`;
      }
    }
    
    // Default explanation if no specific category/ID matched
    console.log(`[Explainer] No specific explanation for ${material.id}, using default.`);
    return material.coverageRule.calculation;
  };
  
  // Helper function to extract numeric values from coverage descriptions
  const extractCoverageValue = (description: string): number => {
    // Try to find a number followed by LF, Squares, etc.
    const match = description.match(/(\d+(\.\d+)?)\s*(LF|Squares|Square)/i);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
    // Fallback to extracting just the first number
    const numMatch = description.match(/(\d+(\.\d+)?)/);
    if (numMatch && numMatch[1]) {
      return parseFloat(numMatch[1]);
    }
    // Default fallback
    return 10; // Reasonable default
  };

  // Helper to determine if a material is mandatory based on the name
  const isMandatoryMaterial = (materialName: string): boolean => {
    // A more robust check might be needed if the naming convention changes
    return materialName.includes('Required') && materialName.includes('cannot be removed');
  };

  // Render a selected material row with quantity
  const renderSelectedMaterial = (materialId: string, material: Material) => {
    const quantity = quantities[materialId] || 0;
    const isMandatory = isMandatoryMaterial(material.name);
    
    // Extract the base name and the requirement text if mandatory
    let baseName = material.name;
    let requirementText = "";
    if (isMandatory) {
      const match = material.name.match(/^(.*?)(\s*\(Required.*?\))$/);
      if (match && match[1] && match[2]) {
        baseName = match[1].trim();
        requirementText = match[2].trim();
      }
    }

    let explanation = '';
    try {
      explanation = getCalculationExplanation(material, quantity);
    } catch (error) {
      console.error(`[Renderer] Error getting explanation for ${material.id}:`, error);
      explanation = 'Error generating calculation explanation.';
    }

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
          <div className="text-sm text-muted-foreground">
            {/* Simple Price Display */}
            {material.price > 0 && 
              <>{formatPrice(material.price)} per {material.unit}</>
            }
            {material.approxPerSquare && material.approxPerSquare > 0 && 
               <span> (≈ {formatPrice(material.approxPerSquare)}/square)</span>
            }
            {material.id === 'full-peel-stick-system' && 
                <span className="italic"> (Cost included in Add-on Price)</span>
            }
          </div>
          <div className="text-xs text-muted-foreground mt-1 break-words">
            {explanation}
          </div>
        </div>
  
        {/* Right side: Quantity Control and Delete Button */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
          <div className="flex items-center">
            <Button type="button" variant="outline" size="icon" className={`h-8 w-8 rounded-r-none`} onClick={() => updateQuantity(materialId, Math.max(0, quantity - 1))} aria-label={`Decrease quantity for ${baseName}`}>-</Button>
            <Input type="number" min="0" value={quantity} onChange={(e) => updateQuantity(materialId, parseInt(e.target.value) || 0)} className={`h-8 w-16 rounded-none text-center`} aria-label={`Quantity for ${baseName}`} />
            <Button type="button" variant="outline" size="icon" className={`h-8 w-8 rounded-l-none`} onClick={() => updateQuantity(materialId, quantity + 1)} aria-label={`Increase quantity for ${baseName}`}>+</Button>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(materialId)} className={`h-8 w-8 text-red-500 hover:bg-red-50`} aria-label={`Remove ${baseName}`}><Trash className="h-4 w-4" /></Button>
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
             {isGafTimberlineSelected && (
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
                 {["GAF 1", "GAF 2", "OC 1", "OC 2"].map(preset => (
                   <Button key={preset} variant="outline" size="sm" onClick={() => applyPresetBundle(preset)} className="flex items-center"><PackageOpen className="h-4 w-4 mr-1" />{preset}</Button>
                 ))}
               </div>
             </div>
             
             {/* Materials Accordion */}
             <Accordion type="multiple" defaultValue={[MaterialCategory.SHINGLES]} className="w-full">
               {Object.entries(groupedMaterials).map(([category, materials]) => {
                 if (category === MaterialCategory.LOW_SLOPE && !showLowSlope) return null;
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
                               <div className="text-sm text-muted-foreground">
                                 {material.price > 0 && <>{material.price} per {material.unit}</>}
                                 {material.approxPerSquare && material.approxPerSquare > 0 && ` (~${formatPrice(material.approxPerSquare)}/square)`}
                               </div>
                               <div className="text-xs text-muted-foreground">{material.coverageRule.description}</div>
                             </div>
                             <Button size="sm" variant={selectedMaterials[material.id] ? "secondary" : "outline"} onClick={() => { selectedMaterials[material.id] ? removeMaterial(material.id) : addMaterial(material); }} className="min-w-24">
                               {selectedMaterials[material.id] ? <><Check className="mr-1 h-4 w-4" />Selected</> : <><Plus className="mr-1 h-4 w-4" />Add</>}
                             </Button>
                           </div>
                         ))}
                       </div>
                     </AccordionContent>
                   </AccordionItem>
                 );
               })}
             </Accordion>
          </CardContent>
          <CardFooter className="flex justify-between">
             <Button type="button" variant="outline" onClick={() => onMaterialsUpdate({ selectedMaterials: {}, quantities: {}, peelStickPrice: "0.00" })} className="flex items-center gap-2">
               <ChevronLeft className="h-4 w-4" />Back to Measurements
             </Button>
             <Button onClick={() => { onMaterialsUpdate({ selectedMaterials, quantities, peelStickPrice }); /* No nav needed */ }} disabled={Object.keys(selectedMaterials).length === 0} className="flex items-center gap-2">
               Continue
             </Button>
           </CardFooter>
        </Card>
      </div>

      {/* Right Column: Selected Materials */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader><CardTitle>Selected Materials</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(selectedMaterials).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No materials selected yet</p>
                <p className="text-sm mt-2">Select materials from the list</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(selectedMaterials).map(([materialId, material]) => {
                   if (!material || !material.id) return null; // Safety check
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