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

interface MaterialsSelectionTabProps {
  measurements: MeasurementValues;
  selectedMaterials?: {[key: string]: Material};
  quantities?: {[key: string]: number};
  onMaterialsSelected: (selectedMaterials: {[key: string]: Material}, quantities: {[key: string]: number}) => void;
  readOnly?: boolean;
}

export function MaterialsSelectionTab({
  measurements,
  selectedMaterials,
  quantities,
  onMaterialsSelected,
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
          <Button onClick={() => onMaterialsSelected({}, {})} variant="outline">Back to Measurements</Button>
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
  const [peelStickPrice, setPeelStickPrice] = useState<string>("");
  
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
          .reduce((total, area) => total + area.area, 0);
        
        // Calculate quantity (both materials use 0.8 squares/roll)
        const squaresNeeded = lowPitchArea / 100;
        const baseQuantity = Math.ceil(squaresNeeded / 0.8);
        const capQuantity = Math.ceil(squaresNeeded / 0.8);
        
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
      }
    }
    
    // Update state if *any* materials were automatically added (0/12 OR 1/12-2/12)
    if (has0Pitch || has1or2Pitch) {
      onMaterialsSelected(newSelectedMaterials, newQuantities);
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
  
  // Handle peel and stick price updates from warranty selector
  const handlePeelStickPriceUpdate = (price: string) => {
    setPeelStickPrice(price);
  };
  
  // Calculate total with current selections
  const calculateEstimateTotal = () => {
    let total = Object.entries(selectedMaterials).reduce((total, [materialId, material]) => {
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
        total += lowSlopeCost;
        
        // Add ISO cost if selected
        if (includeIso) {
          total += (lowSlopeArea / 100) * 50; // $50/sq for ISO
        }
      }
    }
    
    // Add peel and stick system cost if selected
    if (isPeelStickSelected && peelStickPrice) {
      total += parseFloat(peelStickPrice);
    }
    
    return total;
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
    
    onMaterialsSelected({
      ...selectedMaterials,
      [material.id]: material
    }, {
      ...quantities,
      [material.id]: suggestedQuantity
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
    
    onMaterialsSelected(newSelectedMaterials, newQuantities);
  };
  
  // Update quantity for a material
  const updateQuantity = (materialId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    onMaterialsSelected({
      ...selectedMaterials,
    }, {
      ...quantities,
      [materialId]: newQuantity
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
    
    onMaterialsSelected(selectedMaterials, newQuantities);
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
      
      onMaterialsSelected(selectedMaterials, newQuantities);
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
        // Skip if this material ID is already in newSelectedMaterials
        // This prevents package materials from overriding mandatory low-pitch materials
        if (newSelectedMaterials[materialId]) return;
        
        const material = ROOFING_MATERIALS.find(m => m.id === materialId);
        if (material) {
          // Special handling for WeatherWatch (valleys only) for both GAF 1 and GAF 2 packages
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
          } else {
            // Calculate quantity normally for other materials
            // Use regular waste factor for everything else
            const effectiveWasteFactor = material.id === "gaf-timberline-hdz" ? 
              gafTimberlineWasteFactor / 100 : 
              wasteFactor / 100;
            
            newQuantities[materialId] = calculateMaterialQuantity(
              material, 
              measurements, 
              effectiveWasteFactor
            );
            
            // Add the material to the selected list
            newSelectedMaterials[materialId] = material;
          }
        }
      });
    }
    
    // Update state with new bundle + preserved mandatory materials
    onMaterialsSelected(newSelectedMaterials, newQuantities);
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
      if (material.unit === 'bundle' && !material.id.includes('ridge') && !material.id.includes('hip') && !material.id.includes('starter')) {
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
      // Special case for valleys-only WeatherWatch Ice & Water Shield
      if (material.name && material.name.includes("valleys only")) {
        const valleyLength = measurements.valleyLength || 0;
        return `Valley (${valleyLength} LF) ÷ 45.5 = ${quantity} rolls`;
      }
      
      // Standard WeatherWatch Ice & Water Shield calculation (for standalone usage)
      if (material.id === "gaf-weatherwatch-ice-water-shield") {
        return `${Math.abs(measurements.totalArea).toFixed(1)} sq ft ÷ 100 = ${(Math.abs(measurements.totalArea)/100).toFixed(1)} squares ÷ 1.5 = ${quantity} rolls`;
      }
      
      if (material.id === "gaf-feltbuster-synthetic-underlayment" || material.id === "abc-pro-guard-20") {
        return `${Math.abs(measurements.totalArea).toFixed(1)} sq ft ÷ 100 = ${(Math.abs(measurements.totalArea)/100).toFixed(1)} squares ÷ 4.5 = ${quantity} rolls`;
      }
      
      if (material.coverageRule.description.includes("Peel & Stick") || material.coverageRule.description.includes("Weatherwatch")) {
        const valleyLength = measurements.valleyLength || 0;
        const eaveLength = measurements.eaveLength || 0;
        const valleyArea = valleyLength * 3 * 0.167;
        const eaveArea = eaveLength * 3 * 0.167;
        return `Valley (${valleyLength} LF × 3' × 0.167) + Eaves (${eaveLength} LF × 3' × 0.167) = ${(valleyArea + eaveArea).toFixed(1)} sq ft ÷ 200 = ${quantity} rolls`;
      }
      
      // Regular underlayment
      const squaresPerRoll = extractCoverageValue(material.coverageRule.description);
      return `${Math.abs(measurements.totalArea).toFixed(1)} sq ft ÷ 100 = ${(Math.abs(measurements.totalArea)/100).toFixed(1)} squares ÷ ${squaresPerRoll} = ${quantity} rolls`;
    }
    
    if (material.category === MaterialCategory.LOW_SLOPE) {
      console.log(`[Explainer V2] Calculating explanation for Low Slope: ${material.id}`); // Log Start V2
      const lowSlopeArea = measurements.areasByPitch
        .filter(area => {
          const pitchParts = area.pitch.split(/[:\/]/);
          const rise = parseInt(pitchParts[0] || '0');
          return !isNaN(rise) && rise <= 2;
        })
        .reduce((total, area) => total + (area.area || 0), 0);
      console.log(`[Explainer V2] Low Slope: Calculated lowSlopeArea (all <= 2/12): ${lowSlopeArea}`); // Log general low slope area

      // Special case for GAF Poly ISO 4X8 (for 0/12 pitch)
      if (material.id === "gaf-poly-iso-4x8") {
        const zeroPitchArea = measurements.areasByPitch
          .filter(area => ["0:12", "0/12"].includes(area.pitch))
          .reduce((total, area) => total + area.area, 0);
        
        return `0/12 pitch area (${zeroPitchArea.toFixed(1)} sq ft) ÷ 100 = ${(zeroPitchArea/100).toFixed(1)} squares × 1.12 waste = ${Math.ceil((zeroPitchArea/100) * 1.12)} rolls`;
      }
      
      // Special case for Polyglass elastoflex base sheet (for 1/12 or 2/12 pitch)
      if (material.id === "polyglass-elastoflex-sbs") {
        const lowPitchArea = measurements.areasByPitch
          .filter(area => ["1:12", "2:12", "1/12", "2/12"].includes(area.pitch))
          .reduce((total, area) => total + (area.area || 0), 0);
        console.log(`[Explainer V2] Polyglass Base: Calculated specific lowPitchArea (1/12, 2/12): ${lowPitchArea}`); // Log specific area
        const explanationText = `1/12 or 2/12 pitch area (${lowPitchArea.toFixed(1)} sq ft) ÷ 100 = ${(lowPitchArea/100).toFixed(1)} squares ÷ 0.8 = ${quantity} rolls`;
        console.log(`[Explainer V2] Polyglass Base: Generated Text: ${explanationText}`); // Log final text
        return explanationText;
      }
      
      // Special case for Polyglass polyflex cap sheet (for 1/12 or 2/12 pitch)
      if (material.id === "polyglass-polyflex-app") {
        const lowPitchArea = measurements.areasByPitch
          .filter(area => ["1:12", "2:12", "1/12", "2/12"].includes(area.pitch))
          .reduce((total, area) => total + (area.area || 0), 0);
        console.log(`[Explainer V2] Polyglass Cap: Calculated specific lowPitchArea (1/12, 2/12): ${lowPitchArea}`); // Log specific area
        const explanationText = `1/12 or 2/12 pitch area (${lowPitchArea.toFixed(1)} sq ft) ÷ 100 = ${(lowPitchArea/100).toFixed(1)} squares ÷ 0.8 = ${quantity} rolls`;
        console.log(`[Explainer V2] Polyglass Cap: Generated Text: ${explanationText}`); // Log final text
        return explanationText;
      }
      
      // Default low slope material
      let squaresPerRoll = 1.5; // Default
      if (material.coverageRule.description.includes("Base")) squaresPerRoll = 2;
      if (material.coverageRule.description.includes("Cap")) squaresPerRoll = 1;
      
      return `Low slope area ${lowSlopeArea.toFixed(1)} sq ft ÷ 100 = ${(lowSlopeArea/100).toFixed(1)} squares ÷ ${squaresPerRoll} = ${quantity} rolls`;
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
    
    // Default explanation
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
    return materialName.includes('Required') && materialName.includes('cannot be removed');
  };

  // Render a selected material row with quantity
  const renderSelectedMaterial = (materialId: string, material: Material) => {
    const quantity = quantities[materialId] || 0;
    const isMandatory = isMandatoryMaterial(material.name);
    
    return (
      <div 
        key={materialId} 
        className={`flex justify-between items-center p-2 rounded-md ${isMandatory ? 'bg-blue-50 border border-blue-200' : ''}`}
      >
        <div className="flex-1">
          <div className="flex items-center">
            <span className="font-medium">{material.name}</span>
            {isMandatory && (
              <Badge className="ml-2 bg-blue-500" variant="secondary">Auto-Selected</Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatPrice(material.price)} per {material.unit}
            {material.approxPerSquare && ` (≈ ${formatPrice(material.approxPerSquare)}/square)`}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {getCalculationExplanation(material, quantity)}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => updateQuantity(materialId, Math.max(0, quantity - 1))}
              disabled={isMandatory}
            >
              -
            </Button>
            <Input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => updateQuantity(materialId, parseInt(e.target.value) || 0)}
              className="h-8 w-16 rounded-none text-center"
              disabled={isMandatory}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => updateQuantity(materialId, quantity + 1)}
              disabled={isMandatory}
            >
              +
            </Button>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeMaterial(materialId)}
            className="h-8 w-8"
            disabled={isMandatory}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Material selection panel */}
      <div className="lg:col-span-2">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>GAF Package & Warranty Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PackageSelector 
              selectedPackage={selectedPackage} 
              onPackageSelect={setSelectedPackage} 
            />
            
            <WarrantySelector 
              selectedPackage={selectedPackage}
              selectedWarranty={selectedWarranty}
              onWarrantySelect={setSelectedWarranty}
              onPeelStickPriceUpdate={handlePeelStickPriceUpdate}
              isPeelStickSelected={isPeelStickSelected}
              onPeelStickToggle={setIsPeelStickSelected}
            />
            
            {showLowSlope && (
              <LowSlopeOptions 
                measurements={measurements}
                includeIso={includeIso}
                onIsoToggle={setIncludeIso}
              />
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Select Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 pb-4">
              <Label htmlFor="wasteFactor">Waste Factor:</Label>
              <Input
                id="wasteFactor"
                type="number"
                value={wasteFactor}
                onChange={handleWasteFactorChange}
                className="w-24"
                min="0"
                max="50"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <span className="text-sm text-muted-foreground">
                (Applies to all materials except GAF Timberline HDZ)
              </span>
            </div>
            
            {/* GAF Timberline HDZ special waste factor */}
            {isGafTimberlineSelected && (
              <div className="flex items-center space-x-4 pb-4 pt-2 border-t">
                <Label htmlFor="gafWasteFactor">GAF Timberline HDZ Waste Factor:</Label>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className={gafTimberlineWasteFactor === 12 ? "bg-blue-100" : ""}
                    onClick={() => handleGafTimberlineWasteFactorChange(12)}
                  >
                    12%
                  </Button>
                  <Button
                    variant="outline"
                    className={gafTimberlineWasteFactor === 15 ? "bg-blue-100" : ""}
                    onClick={() => handleGafTimberlineWasteFactorChange(15)}
                  >
                    15%
                  </Button>
                  <Button
                    variant="outline"
                    className={gafTimberlineWasteFactor === 20 ? "bg-blue-100" : ""}
                    onClick={() => handleGafTimberlineWasteFactorChange(20)}
                  >
                    20%
                  </Button>
                </div>
                <span className="text-sm text-blue-600 font-medium">
                  Current: {gafTimberlineWasteFactor}%
                </span>
              </div>
            )}
            
            {/* Presets section */}
            <div className="border-t pt-4 pb-2">
              <h3 className="text-md font-medium mb-2">Material Presets</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPresetBundle("GAF 1")}
                  className="flex items-center"
                >
                  <PackageOpen className="h-4 w-4 mr-1" />
                  GAF 1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPresetBundle("GAF 2")}
                  className="flex items-center"
                >
                  <PackageOpen className="h-4 w-4 mr-1" />
                  GAF 2
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPresetBundle("OC 1")}
                  className="flex items-center"
                >
                  <PackageOpen className="h-4 w-4 mr-1" />
                  OC 1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPresetBundle("OC 2")}
                  className="flex items-center"
                >
                  <PackageOpen className="h-4 w-4 mr-1" />
                  OC 2
                </Button>
              </div>
            </div>
            
            <Accordion type="multiple" defaultValue={[MaterialCategory.SHINGLES]} className="w-full">
              {/* Render material categories */}
              {Object.entries(groupedMaterials).map(([category, materials]) => {
                // Skip low slope category if no flat roof areas
                if (category === MaterialCategory.LOW_SLOPE && !showLowSlope) {
                  return null;
                }
                
                return (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="text-lg font-semibold py-3">
                      {category}
                      {category === MaterialCategory.LOW_SLOPE && showLowSlope && (
                        <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-300 bg-yellow-50">
                          Flat/Low-Slope Required
                        </Badge>
                      )}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {materials.map(material => (
                          <div 
                            key={material.id} 
                            className="flex justify-between items-center p-3 rounded-md border hover:bg-secondary/20"
                          >
                            <div className="space-y-1">
                              <div className="font-medium">{material.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {material.price} per {material.unit}
                                {material.approxPerSquare && ` (~${formatPrice(material.approxPerSquare)}/square)`}
                              </div>
                              <div className="text-xs text-muted-foreground">{material.coverageRule.description}</div>
                            </div>
                            <Button 
                              size="sm" 
                              variant={selectedMaterials[material.id] ? "secondary" : "outline"}
                              onClick={() => {
                                if (selectedMaterials[material.id]) {
                                  removeMaterial(material.id);
                                } else {
                                  addMaterial(material);
                                }
                              }}
                              className="min-w-24"
                            >
                              {selectedMaterials[material.id] ? (
                                <>
                                  <Check className="mr-1 h-4 w-4" />
                                  Selected
                                </>
                              ) : (
                                <>
                                  <Plus className="mr-1 h-4 w-4" />
                                  Add
                                </>
                              )}
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onMaterialsSelected({}, {})}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Measurements
            </Button>
            
            <Button 
              onClick={() => {
                // Save materials without triggering navigation
                // This lets the parent component handle tab navigation naturally
                onMaterialsSelected(selectedMaterials, quantities);
              }}
              disabled={Object.keys(selectedMaterials).length === 0}
              className="flex items-center gap-2"
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Selected materials panel */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Selected Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(selectedMaterials).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No materials selected yet</p>
                <p className="text-sm mt-2">Select materials from the list to add them to your estimate</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(selectedMaterials).map(([materialId, material]) => {
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
