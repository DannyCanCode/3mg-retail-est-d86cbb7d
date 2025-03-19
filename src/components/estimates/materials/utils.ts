import { Material, MaterialCategory } from "./types";
import { MeasurementValues } from "../measurement/types";

export function calculateMaterialQuantity(
  material: Material, 
  measurements: MeasurementValues,
  wasteFactor: number = 0.1 // Default 10% waste
): number {
  // Add waste factor to total area for calculations
  const totalAreaWithWaste = measurements.totalArea * (1 + wasteFactor);
  const totalSquares = totalAreaWithWaste / 100; // 1 square = 100 sq ft
  
  // Calculate flat/low-slope roof area
  const flatRoofAreas = measurements.areasByPitch.filter(area => 
    ["0:12", "1:12", "2:12"].includes(area.pitch)
  );
  const flatRoofArea = flatRoofAreas.reduce((sum, area) => sum + area.area, 0);
  
  // Function to calculate ceiling
  const ceiling = (value: number) => Math.ceil(value);
  
  switch(material.category) {
    case MaterialCategory.SHINGLES:
      // Handle different types of shingle materials
      if (material.id.includes("starter")) {
        // Starter shingles
        if (material.id.includes("gaf-pro-start")) {
          return ceiling((measurements.eaveLength + measurements.rakeLength) / 120);
        } else if (material.id.includes("tamko-starter")) {
          return ceiling((measurements.eaveLength + measurements.rakeLength) / 105);
        } else if (material.id.includes("iko-leading-edge")) {
          return ceiling((measurements.eaveLength + measurements.rakeLength) / 123);
        } else {
          return ceiling((measurements.eaveLength + measurements.rakeLength) / 110); // Default
        }
      } else if (material.id.includes("hip-ridge") || material.id.includes("hip") && material.id.includes("ridge")) {
        // Hip and ridge shingles
        if (material.id.includes("gaf-sa-r")) {
          return ceiling((measurements.ridgeLength + measurements.hipLength) / 25);
        } else if (material.id.includes("owens-corning-proedge")) {
          return ceiling((measurements.ridgeLength + measurements.hipLength) / 33);
        } else if (material.id.includes("tamko")) {
          return ceiling((measurements.ridgeLength + measurements.hipLength) / 33.3);
        } else if (material.id.includes("iko")) {
          return ceiling((measurements.ridgeLength + measurements.hipLength) / 33);
        } else {
          return ceiling((measurements.ridgeLength + measurements.hipLength) / 30); // Default
        }
      } else {
        // Regular shingles - excluding flat/low-slope areas
        const steepSlopeArea = totalAreaWithWaste - flatRoofArea;
        return ceiling(steepSlopeArea / 33.3); // 3 bundles per square (33.3 sq ft per bundle)
      }
      
    case MaterialCategory.UNDERLAYMENTS:
      if (material.id.includes("peel") || material.id.includes("stick")) {
        // Peel and stick underlayment for valleys and eaves
        const valleyArea = measurements.valleyLength * 3 * 0.167; // 3 feet wide valley × conversion factor
        const eaveArea = measurements.eaveLength * 3 * 0.167; // 3 feet wide ice & water at eaves
        const totalIceAndWaterArea = valleyArea + eaveArea;
        return Math.max(ceiling(totalIceAndWaterArea / 200), 1); // Min 1 roll if there are valleys
      } else {
        // Synthetic underlayment
        return ceiling(totalSquares / 10); // 10 squares per roll
      }
      
    case MaterialCategory.LOW_SLOPE:
      // Low slope materials are used only for flat/low-slope areas
      if (material.id.includes("plybase") || material.id.includes("base")) {
        return ceiling(flatRoofArea / 200); // 2 squares per roll
      } else if (material.id.includes("cap")) {
        return ceiling(flatRoofArea / 100); // 1 square per roll
      } else {
        return ceiling(flatRoofArea / 150); // Default 1.5 squares per roll
      }
      
    case MaterialCategory.METAL:
      if (material.id.includes("valley")) {
        return ceiling(measurements.valleyLength / 55);
      } else if (material.id.includes("drip-edge") || material.id.includes("drip")) {
        return ceiling((measurements.eaveLength + measurements.rakeLength) / 10);
      } else if (material.id.includes("l-flashing")) {
        return ceiling(measurements.flashingLength / 10);
      } else {
        return 0; // Default case
      }
      
    case MaterialCategory.VENTILATION:
      if (material.id.includes("ridge-vent")) {
        return ceiling(measurements.ridgeLength / 4);
      } else if (material.id.includes("boot")) {
        // Simplified - in real application would need count of penetrations by size
        return 1; // Default to 1 per roof
      } else {
        return 0; // Default case
      }
      
    case MaterialCategory.ACCESSORIES:
      if (material.id.includes("cement") || material.id.includes("karnak")) {
        return ceiling(totalSquares / 15);
      } else if (material.id.includes("nail") || material.id.includes("cap")) {
        return ceiling(totalSquares / 10);
      } else if (material.id.includes("plywood")) {
        return 0; // Would need damaged area estimate
      } else {
        return 0; // Default case
      }
      
    default:
      return 0;
  }
}

export function calculateMaterialTotal(quantity: number, price: number): number {
  return quantity * price;
}

// Group materials by category for display
export function groupMaterialsByCategory(materials: Material[]): Record<MaterialCategory, Material[]> {
  const groupedMaterials: Record<MaterialCategory, Material[]> = {
    [MaterialCategory.SHINGLES]: [],
    [MaterialCategory.UNDERLAYMENTS]: [],
    [MaterialCategory.LOW_SLOPE]: [],
    [MaterialCategory.METAL]: [],
    [MaterialCategory.VENTILATION]: [],
    [MaterialCategory.ACCESSORIES]: []
  };
  
  materials.forEach(material => {
    groupedMaterials[material.category].push(material);
  });
  
  return groupedMaterials;
}
