import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Material } from "./types";
import { MaterialSelector } from "./MaterialSelector";

interface MaterialCategoryGroupProps {
  category: string;
  materials: Material[];
  selectedMaterials: Record<string, Material>;
  quantities: Record<string, number>;
  mandatoryMaterialIds?: string[];
  readOnly?: boolean;
  onMaterialSelect: (material: Material, selected: boolean) => void;
  onQuantityChange: (material: Material, quantity: number) => void;
}

/**
 * A component that displays a collapsible group of materials by category
 */
export function MaterialCategoryGroup({
  category,
  materials,
  selectedMaterials,
  quantities,
  mandatoryMaterialIds = [],
  readOnly = false,
  onMaterialSelect,
  onQuantityChange
}: MaterialCategoryGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Only show categories that have materials
  if (!materials || materials.length === 0) {
    return null;
  }
  
  const selectedCount = materials.filter(m => selectedMaterials[m.id]).length;
  
  return (
    <div className="mb-4">
      <div
        className="flex justify-between items-center py-2 px-4 bg-muted/30 border rounded-lg cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-medium">
          {category} 
          <span className="ml-2 text-sm text-muted-foreground">
            ({selectedCount}/{materials.length} selected)
          </span>
        </h3>
        <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {materials.map(material => (
            <MaterialSelector
              key={material.id}
              material={material}
              isSelected={Boolean(selectedMaterials[material.id])}
              quantity={quantities[material.id] || 0}
              onSelect={onMaterialSelect}
              onQuantityChange={onQuantityChange}
              isReadOnly={readOnly}
              isMandatory={mandatoryMaterialIds.includes(material.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 