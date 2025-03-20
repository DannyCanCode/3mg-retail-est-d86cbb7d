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

interface MaterialsSelectionTabProps {
  measurements: MeasurementValues;
  onBack: () => void;
  onContinue: (selectedMaterials: {[key: string]: Material}, quantities: {[key: string]: number}) => void;
}

export function MaterialsSelectionTab({
  measurements,
  onBack,
  onContinue,
}: MaterialsSelectionTabProps) {
  const [wasteFactor, setWasteFactor] = useState(10); // Default 10% waste
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    MaterialCategory.SHINGLES
  ]);
  const [selectedMaterials, setSelectedMaterials] = useState<{[key: string]: Material}>({});
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [showLowSlope, setShowLowSlope] = useState(false);
  // Special waste factor for GAF Timberline HDZ
  const [gafTimberlineWasteFactor, setGafTimberlineWasteFactor] = useState(12); // Minimum 12%
  
  // New state for GAF packages and warranty options
  const [selectedPackage, setSelectedPackage] = useState<string>('gaf-1');
  const [selectedWarranty, setSelectedWarranty] = useState<string>('silver-pledge');
  const [includeIso, setIncludeIso] = useState<boolean>(false);
  const [peelStickPrice, setPeelStickPrice] = useState<string>("");
  
  // Group materials by category
  const groupedMaterials = groupMaterialsByCategory(ROOFING_MATERIALS);
  
  // Check if GAF Timberline HDZ is selected
  const isGafTimberlineSelected = Boolean(selectedMaterials["gaf-timberline-hdz"]);
  
  // Debug logging
  useEffect(() => {
    console.log("Rendering MaterialsSelectionTab with preset bundles");
  }, []);
  
  // Check if there are flat/low-slope areas on the roof
  useEffect(() => {
    const hasFlatRoofAreas = measurements.areasByPitch.some(
      area => ["0:12", "1:12", "2:12"].includes(area.pitch)
    );
    
    setShowLowSlope(hasFlatRoofAreas);
    
    // If there are flat roof areas, auto-expand that category
    if (hasFlatRoofAreas && !expandedCategories.includes(MaterialCategory.LOW_SLOPE)) {
      setExpandedCategories([...expandedCategories, MaterialCategory.LOW_SLOPE]);
    }
  }, [measurements]);

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
    if (showLowSlope) {
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
    if (selectedWarranty === 'peel-stick-system' && peelStickPrice) {
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
    
    setSelectedMaterials({
      ...selectedMaterials,
      [material.id]: material
    });
    
    setQuantities({
      ...quantities,
      [material.id]: suggestedQuantity
    });
  };
  
  // Remove material from selection
  const removeMaterial = (materialId: string) => {
    const newSelectedMaterials = { ...selectedMaterials };
    const newQuantities = { ...quantities };
    
    delete newSelectedMaterials[materialId];
    delete newQuantities[materialId];
    
    setSelectedMaterials(newSelectedMaterials);
    setQuantities(newQuantities);
  };
  
  // Update quantity for a material
  const updateQuantity = (materialId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setQuantities({
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
    
    setQuantities(newQuantities);
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
      
      setQuantities(newQuantities);
    }
  };
  
  // Apply material preset bundle
  const applyPresetBundle = (preset: string) => {
    // Clear existing selections
    const newSelectedMaterials: {[key: string]: Material} = {};
    const newQuantities: {[key: string]: number} = {};
    
    // Define preset material ids for each bundle
    const presetMaterials: { [key: string]: string[] } = {
      "GAF 1": ["gaf-prostart-starter-shingle-strip", "gaf-timberline-hdz", "gaf-seal-a-ridge", "gaf-weatherwatch-ice-water-shield", "abc-pro-guard-20"],
      "GAF 2": ["gaf-timberline-hdz", "gaf-seal-a-ridge", "gaf-prostart-starter-shingle-strip", "gaf-feltbuster-synthetic-underlayment", "gaf-weatherwatch-ice-water-shield"],
      "OC 1": ["oc-oakridge", "oc-hip-ridge", "oc-starter", "abc-pro-guard-20", "lead-boot-4inch"],
      "OC 2": ["oc-duration", "oc-hip-ridge", "oc-starter", "abc-pro-guard-20", "gaf-feltbuster-synthetic-underlayment"]
    };
    
    // Find and add the materials in the preset
    presetMaterials[preset].forEach(materialId => {
      const material = ROOFING_MATERIALS.find(m => m.id === materialId);
      if (material) {
        newSelectedMaterials[materialId] = material;
        
        // Use special calculation for GAF Timberline HDZ to match Excel
        if (materialId === "gaf-timberline-hdz") {
          // Ensure minimum 12% waste factor for GAF Timberline HDZ
          const actualWasteFactor = Math.max(gafTimberlineWasteFactor / 100, 0.12);
          const totalArea = Math.abs(measurements.totalArea); // Ensure positive area
          
          // Calculate squares with waste using Excel formula
          const squaresWithWaste = Math.round((totalArea * (1 + actualWasteFactor)) / 100 * 10) / 10;
          
          // Calculate bundles (3 per square)
          newQuantities[materialId] = Math.max(3, Math.ceil(squaresWithWaste * 3));
        } else if (materialId === "gaf-weatherwatch-ice-water-shield" && preset === "GAF 2") {
          // For GAF 2, WeatherWatch is only used in valleys
          const valleyLength = measurements.valleyLength || 0;
          // Calculate required rolls based on valley length (approx 3 feet wide coverage)
          const valleyAreaSqFt = Math.max(valleyLength * 3, 0);
          // Each roll covers approx 150 sq ft
          newQuantities[materialId] = Math.max(1, Math.ceil(valleyAreaSqFt / 150));
        } else {
          // Regular calculation for other materials
          newQuantities[materialId] = calculateMaterialQuantity(
            material,
            measurements,
            wasteFactor / 100
          );
        }
      }
    });
    
    // Update state with new bundle
    setSelectedMaterials(newSelectedMaterials);
    setQuantities(newQuantities);
  };
  
  // Handle continue button click
  const handleContinue = () => {
    onContinue(selectedMaterials, quantities);
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
    // Determine what type of material we're dealing with
    if (material.category === MaterialCategory.SHINGLES) {
      if (material.id === "gaf-timberline-hdz") {
        const actualWasteFactor = Math.max(gafTimberlineWasteFactor / 100, 0.12);
        const totalArea = Math.abs(measurements.totalArea);
        const squaresWithWaste = Math.round((totalArea * (1 + actualWasteFactor)) / 100 * 10) / 10;
        return `${totalArea.toFixed(1)} sq ft × (1 + ${(actualWasteFactor * 100).toFixed(0)}% waste) ÷ 100 = ${squaresWithWaste} squares × 3 = ${Math.ceil(squaresWithWaste * 3)} bundles`;
      } 
      
      if (material.id.includes("ridge") || material.id.includes("hip")) {
        const ridgeLength = measurements.ridgeLength || 0;
        const hipLength = measurements.hipLength || 0;
        const lfPerBundle = extractCoverageValue(material.coverageRule.description);
        return `Ridge (${ridgeLength} LF) + Hip (${hipLength} LF) = ${ridgeLength + hipLength} LF ÷ ${lfPerBundle} = ${quantity} bundles`;
      }
      
      if (material.id.includes("starter")) {
        if (material.id === "gaf-prostart-starter-shingle-strip") {
          const eaveLength = measurements.eaveLength || 0;
          const lfPerBundle = extractCoverageValue(material.coverageRule.description);
          return `Eaves (${eaveLength} LF) ÷ ${lfPerBundle} = ${quantity} bundles`;  
        } else {
          const eaveLength = measurements.eaveLength || 0;
          const rakeLength = measurements.rakeLength || 0;
          const lfPerBundle = extractCoverageValue(material.coverageRule.description);
          return `Eaves (${eaveLength} LF) + Rakes (${rakeLength} LF) = ${eaveLength + rakeLength} LF ÷ ${lfPerBundle} = ${quantity} bundles`;
        }
      }
      
      // Default shingles
      return `${Math.abs(measurements.totalArea).toFixed(1)} sq ft ÷ 100 = ${(Math.abs(measurements.totalArea)/100).toFixed(1)} squares × 3 = ${quantity} bundles`;
    } 
    
    if (material.category === MaterialCategory.UNDERLAYMENTS) {
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
      const lowSlopeArea = measurements.areasByPitch
        .filter(area => {
          const [rise] = area.pitch.split(':').map(Number);
          return rise <= 2;
        })
        .reduce((total, area) => total + area.area, 0);
      
      if (material.id === "polyglass-elastoflex-sbs") {
        return `Low slope area ${lowSlopeArea.toFixed(1)} sq ft ÷ 100 = ${(lowSlopeArea/100).toFixed(1)} squares ÷ 0.8 = ${quantity} rolls`;
      }
      
      if (material.id === "polyglass-polyflex-app") {
        return `Low slope area ${lowSlopeArea.toFixed(1)} sq ft ÷ 100 = ${(lowSlopeArea/100).toFixed(1)} squares ÷ 0.8 = ${quantity} rolls (1.25 rolls per square)`;
      }
      
      // Default low slope material
      let squaresPerRoll = 1.5; // Default
      if (material.coverageRule.description.includes("Base")) squaresPerRoll = 2;
      if (material.coverageRule.description.includes("Cap")) squaresPerRoll = 1;
      
      return `Low slope area ${lowSlopeArea.toFixed(1)} sq ft ÷ 100 = ${(lowSlopeArea/100).toFixed(1)} squares ÷ ${squaresPerRoll} = ${quantity} rolls`;
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
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Measurements
            </Button>
            
            <Button 
              onClick={handleContinue}
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
                  const quantity = quantities[materialId] || 0;
                  const price = material.price;
                  const total = quantity * price;
                  
                  // Calculate squares for shingles (bundles ÷ 3)
                  let squareCount = null;
                  let isGafTimberline = false;
                  
                  if (material.category === MaterialCategory.SHINGLES && material.unit === "Bundle" && !material.id.includes("hip-ridge") && !material.id.includes("starter")) {
                    isGafTimberline = material.id === "gaf-timberline-hdz";
                    
                    // Calculate squares based on bundles
                    if (isGafTimberline) {
                      // For GAF Timberline HDZ, use the same formula as in Excel
                      // Calculate total squares including waste
                      const actualWasteFactor = Math.max(gafTimberlineWasteFactor / 100, 0.12);
                      const totalArea = Math.abs(measurements.totalArea); // Ensure positive area
                      
                      // Excel formula logic:
                      // 1. Calculate area with waste: totalArea * (1 + wasteFactor)
                      // 2. Convert to squares: area / 100
                      // 3. Round to 1 decimal place: Math.round(squares * 10) / 10
                      const squaresWithWaste = Math.round((totalArea * (1 + actualWasteFactor)) / 100 * 10) / 10;
                      
                      // Display the calculated squares value - ensure it's positive
                      squareCount = squaresWithWaste.toFixed(1);
                      
                      // Validate: Make sure the bundle quantity matches the squares calculation
                      const expectedBundles = Math.max(3, Math.ceil(squaresWithWaste * 3));
                      if (quantity !== expectedBundles) {
                        // Update quantity to match the calculated square count
                        // This ensures consistency between displayed squares and bundle count
                        setTimeout(() => updateQuantity(materialId, expectedBundles), 0);
                      }
                    } else {
                      // For regular shingles
                      const calculatedSquares = quantity / 3;
                      squareCount = calculatedSquares > 0 ? calculatedSquares.toFixed(1) : "calculating...";
                    }
                  }
                  
                  // Get the calculation explanation
                  const calculationExplanation = getCalculationExplanation(material, quantity);
                  
                  return (
                    <div key={materialId} className="flex flex-col border-b pb-2 last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{material.name}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMaterial(materialId)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-sm">
                          {formatPrice(price)} per {material.unit}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(materialId, quantity - 1)}
                            disabled={quantity <= 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          <div className="text-center">
                            <div className="font-medium w-12">
                              {quantity}
                            </div>
                            {squareCount && (
                              <div className={`text-xs mt-0.5 ${isGafTimberline ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                                {typeof squareCount === 'string' && squareCount === "calculating..." 
                                  ? squareCount 
                                  : `${Math.abs(parseFloat(squareCount))} sq${isGafTimberline ? ` (${gafTimberlineWasteFactor}% waste)` : ''}`}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(materialId, quantity + 1)}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-xs text-muted-foreground">
                          {material.coverageRule.description}
                          {isGafTimberline && ` (Min waste: ${gafTimberlineWasteFactor}%)`}
                        </div>
                        <div className="text-sm font-medium">
                          {formatPrice(total)}
                        </div>
                      </div>
                      {/* Add calculation explanation */}
                      <div className="mt-1 text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
                        <span className="font-medium">Calculation: </span>
                        {calculationExplanation}
                      </div>
                    </div>
                  );
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
