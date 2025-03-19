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
  
  // Group materials by category
  const groupedMaterials = groupMaterialsByCategory(ROOFING_MATERIALS);
  
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
  
  // Calculate total with current selections
  const calculateEstimateTotal = () => {
    return Object.entries(selectedMaterials).reduce((total, [materialId, material]) => {
      const quantity = quantities[materialId] || 0;
      return total + (quantity * material.price);
    }, 0);
  };
  
  // Add material to selection
  const addMaterial = (material: Material) => {
    // Calculate suggested quantity based on measurements
    const suggestedQuantity = calculateMaterialQuantity(
      material, 
      measurements, 
      wasteFactor / 100
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
      newQuantities[materialId] = calculateMaterialQuantity(
        selectedMaterials[materialId],
        measurements,
        value / 100
      );
    });
    
    setQuantities(newQuantities);
  };
  
  // Apply material preset bundle
  const applyPresetBundle = (preset: string) => {
    // Clear existing selections
    const newSelectedMaterials: {[key: string]: Material} = {};
    const newQuantities: {[key: string]: number} = {};
    
    // Define preset material ids for each bundle
    const presetMaterials: { [key: string]: string[] } = {
      "GAF 1": ["gaf-timberline-hdz", "gaf-sa-r-hip-ridge", "gaf-pro-start-starter", "gaf-feltbuster", "gaf-weatherwatch"],
      "GAF 2": ["gaf-timberline-hdz", "gaf-sa-r-hip-ridge", "gaf-pro-start-starter", "gaf-weatherwatch"],
      "OC 1": ["gaf-timberline-hdz", "gaf-sa-r-hip-ridge", "abc-pro-guard-20", "lead-boot-4inch"],
      "OC 2": ["gaf-timberline-hdz", "gaf-pro-start-starter", "abc-pro-guard-20", "gaf-feltbuster"]
    };
    
    // Find and add the materials in the preset
    presetMaterials[preset].forEach(materialId => {
      const material = ROOFING_MATERIALS.find(m => m.id === materialId);
      if (material) {
        newSelectedMaterials[materialId] = material;
        newQuantities[materialId] = calculateMaterialQuantity(
          material,
          measurements,
          wasteFactor / 100
        );
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
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Material selection panel */}
      <div className="lg:col-span-2">
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
                (Applied to all material calculations)
              </span>
            </div>
            
            {/* Preset Material Bundles */}
            <div className="mb-6 p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
              <h3 className="text-md font-bold mb-3 text-blue-800">Preset Material Bundles</h3>
              <div className="grid grid-cols-4 gap-3">
                {["GAF 1", "GAF 2", "OC 1", "OC 2"].map((preset) => (
                  <Button
                    key={preset}
                    variant="default"
                    className="h-auto py-4 flex flex-col items-center justify-center bg-white border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-400 text-blue-800"
                    onClick={() => applyPresetBundle(preset)}
                  >
                    <PackageOpen className="h-6 w-6 mb-1" />
                    <span className="font-bold">{preset}</span>
                  </Button>
                ))}
              </div>
              <p className="text-sm text-blue-700 mt-2 font-medium">Click a bundle to pre-select materials. You can still add or remove individual items.</p>
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
                  if (material.category === MaterialCategory.SHINGLES && material.unit === "Bundle" && !material.id.includes("hip-ridge") && !material.id.includes("starter")) {
                    squareCount = (quantity / 3).toFixed(1);
                  }
                  
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
                          <div className="w-12 text-center font-medium">
                            {quantity}
                            {squareCount && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({squareCount} sq)
                              </span>
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
                        </div>
                        <div className="text-sm font-medium">
                          {formatPrice(total)}
                        </div>
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
