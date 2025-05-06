import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Material } from "./types";
import { MaterialCalculationService } from "@/services/calculations";

interface MaterialSelectorProps {
  material: Material;
  isSelected: boolean;
  quantity: number;
  onSelect: (material: Material, selected: boolean) => void;
  onQuantityChange: (material: Material, quantity: number) => void;
  isReadOnly?: boolean;
  isMandatory?: boolean;
}

/**
 * A component for selecting a material and specifying its quantity
 */
export function MaterialSelector({
  material,
  isSelected,
  quantity,
  onSelect,
  onQuantityChange,
  isReadOnly = false,
  isMandatory = false
}: MaterialSelectorProps) {
  // Format the price display (showing both per unit and per square if available)
  const formatPrice = (material: Material) => {
    return (
      <>
        ${material.price.toFixed(2)} per {material.unit}
        {material.approxPerSquare && (
          <span className="text-muted-foreground ml-1">
            (≈ ${material.approxPerSquare.toFixed(2)}/square)
          </span>
        )}
      </>
    )
  };
  
  const handleSelectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isReadOnly || isMandatory) return;
    onSelect(material, !isSelected);
  };
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value) || 0;
    onQuantityChange(material, newQuantity);
  };
  
  return (
    <div className={`border rounded-lg p-3 ${isSelected ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <div className="flex items-start">
            <Button
              variant={isSelected ? "secondary" : "outline"}
              size="sm"
              className={`mr-2 h-6 w-6 p-0 ${isMandatory ? 'bg-amber-200 hover:bg-amber-300 border-amber-400' : ''}`}
              onClick={handleSelectClick}
              disabled={isReadOnly || isMandatory}
            >
              {isSelected && <Check className="h-3 w-3" />}
            </Button>
            <div>
              <h4 className="text-sm font-medium mb-1">{material.name}</h4>
              <p className="text-xs text-muted-foreground">{formatPrice(material)}</p>
            </div>
          </div>
          
          {isSelected && (
            <div className="ml-8 mt-2">
              <div className="text-xs text-muted-foreground">
                <div>
                  <strong>Coverage Rule:</strong> {material.coverageRule.description}
                </div>
                {material.coverageRule.calculation && (
                  <div>
                    <strong>Calculation:</strong> {material.coverageRule.calculation}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {isSelected && (
          <div className="ml-3 mt-1 flex items-center">
            <label htmlFor={`qty-${material.id}`} className="text-xs text-muted-foreground mr-2">Qty:</label>
            <input
              id={`qty-${material.id}`}
              type="number"
              min="0"
              value={quantity}
              onChange={handleQuantityChange}
              className="w-16 p-1 text-sm border rounded"
              disabled={isReadOnly}
              aria-label={`Quantity for ${material.name}`}
            />
          </div>
        )}
      </div>
    </div>
  );
} 