import { Material } from "../../components/estimates/materials/types";
import { MeasurementValues } from "../../components/estimates/measurement/types";
import { MaterialCalculationService } from "../calculations";

/**
 * Package types for predefined material packages
 */
export enum PackageType {
  GAF_BASIC = "GAF 1",
  GAF_PREMIUM = "GAF 2",
  OC_1 = "OC 1",
  OC_2 = "OC 2"
}

/**
 * Service for handling template application and management
 */
export class TemplateService {
  /**
   * Apply a predefined material package to create a set of selected materials
   * 
   * @param packageType - The type of package to apply
   * @param measurements - The roof measurements
   * @param currentSelectedMaterials - Currently selected materials (optional)
   * @param currentQuantities - Currently specified quantities (optional)
   * @returns Object containing the updated materials and quantities
   */
  public static applyPackage(
    packageType: PackageType,
    measurements: MeasurementValues,
    currentSelectedMaterials: Record<string, Material> = {},
    currentQuantities: Record<string, number> = {}
  ): { 
    selectedMaterials: Record<string, Material>, 
    quantities: Record<string, number>
  } {
    console.log(`[TemplateService] Applying package: ${packageType}`);
    
    // Get materials for the selected package
    const packageMaterials = this.getPackageMaterials(packageType);
    
    // Copy existing selected materials to preserve any that aren't part of the package
    const newSelectedMaterials = { ...currentSelectedMaterials };
    const newQuantities = { ...currentQuantities };
    
    // Track mandatory materials (those that can't be unselected)
    const mandatoryMaterialIds: string[] = [];
    
    // For each package material, add it if not already selected
    packageMaterials.forEach(material => {
      // Skip if this material is already selected
      if (newSelectedMaterials[material.id]) {
        console.log(`[TemplateService] Material ${material.id} already selected, skipping.`);
        return;
      }
      
      // Add the material
      newSelectedMaterials[material.id] = material;
      
      // Calculate the quantity based on measurements
      const calculatedQuantity = MaterialCalculationService.calculateMaterialQuantity(
        material, 
        measurements,
        0.1 // 10% waste factor
      );
      
      // Store the calculated quantity
      newQuantities[material.id] = calculatedQuantity;
    });
    
    // Add low slope materials if needed
    const { selectedMaterials: withLowSlope, quantities: lowSlopeQuantities } = 
      this.addLowSlopeMaterials(measurements, newSelectedMaterials, newQuantities);
    
    return { 
      selectedMaterials: withLowSlope, 
      quantities: lowSlopeQuantities
    };
  }
  
  /**
   * Get the materials for a specific package
   * 
   * @param packageType - The type of package to get materials for
   * @returns Array of materials for the package
   */
  private static getPackageMaterials(packageType: PackageType): Material[] {
    // This would typically come from an API, but for now we'll hard-code the material IDs
    // and fetch from the application's material data
    
    // Define material IDs for each package
    let materialIds: string[] = [];
    
    switch (packageType) {
      case PackageType.GAF_BASIC:
        materialIds = [
          "gaf-timberline-hdz-sg",           // GAF Timberline HDZ SG (Shingles)
          "gaf-prostart-starter-shingle-strip", // GAF ProStart Starter Shingle Strip
          "gaf-seal-a-ridge",                // GAF Seal-A-Ridge (Ridge Cap)
          "abc-pro-guard-20",                // ABC Pro Guard 20 (Underlayment)
          "gaf-weatherwatch-ice-water-shield" // Ice & Water (valleys only)
        ];
        break;
      
      case PackageType.GAF_PREMIUM:
        materialIds = [
          "gaf-timberline-hdz-sg",           // GAF Timberline HDZ
          "gaf-seal-a-ridge",                // GAF Seal-A-Ridge
          "gaf-prostart-starter-shingle-strip", // GAF ProStart Starter
          "gaf-feltbuster-synthetic-underlayment", // GAF FeltBuster
          "gaf-weatherwatch-ice-water-shield" // Ice & Water (valleys only)
        ];
        break;
        
      case PackageType.OC_1:
        materialIds = [
          "oc-oakridge",                    // Oakridge Shingles
          "oc-starter-strip",               // OC Starter Strip
          "oc-hip-ridge",                   // OC Hip & Ridge
          "rhino-g-ps",                     // Rhino Synthetic Underlayment
          "gaf-weatherwatch-ice-water-shield" // Ice & Water (valleys only)
        ];
        break;
        
      case PackageType.OC_2:
        materialIds = [
          "oc-duration",                    // Duration Shingles
          "oc-starter-strip",               // OC Starter Strip
          "oc-hip-ridge",                   // OC Hip & Ridge
          "gaf-feltbuster-synthetic-underlayment", // FeltBuster Underlayment
          "gaf-weatherwatch-ice-water-shield" // Ice & Water (valleys only)
        ];
        break;
    }
    
    // Find each material in the ROOFING_MATERIALS collection
    // In a real implementation, you'd import and use the ROOFING_MATERIALS array
    // This is just a placeholder - the actual implementation would need to access materials
    // Either from a global import or passed in
    return materialIds.map(id => this.findMaterialById(id)).filter(Boolean) as Material[];
  }
  
  /**
   * Find a material by ID from the application's material data
   * 
   * @param id - The material ID to look for
   * @returns The material object or null if not found
   */
  private static findMaterialById(id: string): Material | null {
    // In a real implementation, this would access the ROOFING_MATERIALS array
    // For now, return a placeholder that the consumer should implement
    console.warn(`[TemplateService] findMaterialById is not implemented. Material ${id} not found.`);
    return null;
  }
  
  /**
   * Add low slope required materials if needed
   * 
   * @param measurements - The roof measurements
   * @param currentMaterials - Currently selected materials
   * @param currentQuantities - Currently specified quantities
   * @returns Updated materials and quantities
   */
  public static addLowSlopeMaterials(
    measurements: MeasurementValues,
    currentMaterials: Record<string, Material>,
    currentQuantities: Record<string, number>
  ): {
    selectedMaterials: Record<string, Material>,
    quantities: Record<string, number>
  } {
    // Clone the current state to avoid mutation
    const newSelectedMaterials = { ...currentMaterials };
    const newQuantities = { ...currentQuantities };
    
    // Check if we have any low-slope areas (0/12, 1/12, or 2/12 pitch)
    const hasLowPitch = measurements.areasByPitch?.some(
      area => {
        const pitchValue = parseInt(area.pitch.split(/[:\\/]/)[0]) || 0;
        return pitchValue >= 0 && pitchValue <= 2;
      }
    ) || false;
    
    // Check specifically for 0/12 pitch
    const has0Pitch = measurements.areasByPitch?.some(
      area => {
        const pitchValue = parseInt(area.pitch.split(/[:\\/]/)[0]) || 0;
        return pitchValue === 0;
      }
    ) || false;
    
    // If we have low pitch areas, we need to add required materials
    if (hasLowPitch) {
      // For 0/12 pitch areas, add Poly ISO
      if (has0Pitch) {
        const polyIso = this.findMaterialById("gaf-poly-iso-4x8");
        if (polyIso) {
          // Mark as mandatory by modifying the name
          const mandatoryPolyIso = {
            ...polyIso,
            name: `${polyIso.name} (Required for 0/12 pitch - cannot be removed)`
          };
          
          newSelectedMaterials["gaf-poly-iso-4x8"] = mandatoryPolyIso;
          
          // Calculate quantity based on low slope area
          const lowSlopeArea = measurements.areasByPitch
            ?.filter(area => area.pitch === "0/12" || area.pitch === "0:12")
            .reduce((sum, area) => sum + (area.area || 0), 0) || 0;
          
          if (lowSlopeArea > 0) {
            // Calculate quantity - simple estimation
            const squaresNeeded = lowSlopeArea / 100;
            newQuantities["gaf-poly-iso-4x8"] = Math.ceil(squaresNeeded * 4); // Adjust as needed
          }
        }
      }
      
      // For any low slope (0/12, 1/12, 2/12), add Polyglass material
      const baseSheet = this.findMaterialById("polyglass-elastoflex-sbs");
      const capSheet = this.findMaterialById("polyglass-polyflex-app");
      
      if (baseSheet && capSheet) {
        // Add base sheet (marked as mandatory)
        const mandatoryBase = {
          ...baseSheet,
          name: `${baseSheet.name} (Required for <= 2/12 pitch - cannot be removed)`
        };
        newSelectedMaterials["polyglass-elastoflex-sbs"] = mandatoryBase;
        
        // Add cap sheet (marked as mandatory)
        const mandatoryCap = {
          ...capSheet,
          name: `${capSheet.name} (Required for <= 2/12 pitch - cannot be removed)`
        };
        newSelectedMaterials["polyglass-polyflex-app"] = mandatoryCap;
        
        // Calculate quantities based on low slope area
        const lowSlopeArea = measurements.areasByPitch
          ?.filter(area => {
            const pitchValue = parseInt(area.pitch.split(/[:\\/]/)[0]) || 0;
            return pitchValue >= 0 && pitchValue <= 2;
          })
          .reduce((sum, area) => sum + (area.area || 0), 0) || 0;
        
        if (lowSlopeArea > 0) {
          const squaresNeeded = lowSlopeArea / 100;
          // 1.60 rolls per square (0.625 sq per roll)
          newQuantities["polyglass-elastoflex-sbs"] = Math.ceil(squaresNeeded / 0.625); 
          // 1.25 rolls per square (0.8 sq per roll)
          newQuantities["polyglass-polyflex-app"] = Math.ceil(squaresNeeded / 0.8);
        }
      }
    }
    
    return {
      selectedMaterials: newSelectedMaterials,
      quantities: newQuantities
    };
  }
} 