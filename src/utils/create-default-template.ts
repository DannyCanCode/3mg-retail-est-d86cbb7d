import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { Material, MaterialCategory } from "@/components/estimates/materials/types";
import { createPricingTemplate } from "@/api/pricing-templates";

const UPDATED_MATERIALS: Material[] = [
  // SHINGLES
  {
    id: "gaf-timberline-hdz-sg",
    name: "GAF Timberline HDZ SG",
    category: MaterialCategory.SHINGLES,
    price: 42.82,
    unit: "Bundle",
    approxPerSquare: 128.46,
    coverageRule: {
      description: "3 Bundles/Square (33.3 sq ft per bundle)",
      calculation: "Total Area / 33.3 rounded up",
    }
  },
  {
    id: "gaf-seal-a-ridge",
    name: "GAF Seal-A-Ridge (25')",
    category: MaterialCategory.SHINGLES,
    price: 70.56,
    unit: "Bundle",
    coverageRule: {
      description: "20 LF/Bundle",
      calculation: "(Ridge Length + Hip Length) ÷ 20, rounded up",
    }
  },
  {
    id: "gaf-prostart-starter-shingle-strip",
    name: "GAF ProStart Starter Shingle Strip (120')",
    category: MaterialCategory.SHINGLES,
    price: 67.22,
    unit: "Bundle",
    coverageRule: {
      description: "110 LF/Bundle",
      calculation: "Eaves LF ÷ 110, rounded up",
    }
  },
  // UNDERLAYMENTS
  {
    id: "gaf-weatherwatch-ice-water-shield",
    name: "GAF WeatherWatch Ice & Water Shield",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 101.11,
    unit: "Roll",
    approxPerSquare: 50.56,
    coverageRule: {
      description: "1.5 Squares/Roll (150 sq ft)",
      calculation: "Total Area ÷ 1.5, rounded up",
    }
  },
  {
    id: "gaf-feltbuster-synthetic-underlayment",
    name: "GAF FeltBuster Synthetic Underlayment (10 sq)",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 77.78,
    unit: "Roll",
    approxPerSquare: 17.28,
    coverageRule: {
      description: "4.5 Squares/Roll (450 sq ft)",
      calculation: "Total Roof Area ÷ 4.5, rounded up",
    }
  },
  {
    id: "abc-pro-guard-20",
    name: "ABC Pro Guard 20 Synthetic Underlayment (10 sq)",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 87.88,
    unit: "Roll",
    approxPerSquare: 8.79,
    coverageRule: {
      description: "10 Squares/Roll (1000 sq ft)",
      calculation: "Total Roof Area ÷ 10, rounded up",
    }
  },
  // LOW SLOPE
  {
    id: "polyglass-elastoflex-sbs",
    name: "Polyglass Elastoflex SA-V SBS Base Sheet (2 sq)",
    category: MaterialCategory.LOW_SLOPE,
    price: 142.22,
    unit: "Roll",
    approxPerSquare: 177.78,
    coverageRule: {
      description: "1.60 Rolls per Square (0.625 sq/roll)",
      calculation: "1/12 or 2/12 Pitch Area ÷ 0.625, rounded up",
    }
  },
  {
    id: "polyglass-polyflex-app",
    name: "Polyglass Polyflex SA-P APP Cap Sheet (1 sq)",
    category: MaterialCategory.LOW_SLOPE,
    price: 132.22,
    unit: "Roll",
    approxPerSquare: 165.28,
    coverageRule: {
      description: "1.25 Rolls per Square (0.8 sq/roll)",
      calculation: "1/12 or 2/12 Pitch Area ÷ 0.8, rounded up",
    }
  },
  // METAL
  {
    id: "millennium-galvanized-drip-edge",
    name: "Millennium Galvanized Steel Drip Edge - 26GA - 6\" (10')",
    category: MaterialCategory.METAL,
    price: 15.00,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Drip Edge ÷ 10, rounded up",
    }
  },
  // VENTILATION
  {
    id: "gaf-cobra-rigid-vent",
    name: "GAF Cobra Rigid Vent 3 Exhaust Ridge Vent w/ Nails - 11-1/2\" (4')",
    category: MaterialCategory.VENTILATION,
    price: 22.31,
    unit: "Piece",
    coverageRule: {
      description: "4'/Piece",
      calculation: "Ridges LF ÷ 4, rounded up",
    }
  },
  {
    id: "galvanized-steel-off-ridge-vent",
    name: "Galvanized Steel Off Ridge Vent (4') - w/ Diverter",
    category: MaterialCategory.VENTILATION,
    price: 71.25,
    unit: "Piece",
    coverageRule: {
      description: "4'/Piece",
      calculation: "Count needed based on ventilation requirements",
    }
  },
  {
    id: "galvanized-gooseneck-4inch",
    name: "Galvanized Steel Gooseneck Exhaust Vent - 4\" - w/ Damper",
    category: MaterialCategory.VENTILATION,
    price: 44.44,
    unit: "Each",
    coverageRule: {
      description: "1 per vent penetration",
      calculation: "Count of 4\" vent penetrations",
    }
  },
  {
    id: "galvanized-gooseneck-10inch",
    name: "Galvanized Steel Gooseneck Exhaust Vent - 10\" - w/ Damper",
    category: MaterialCategory.VENTILATION,
    price: 55.56,
    unit: "Each",
    coverageRule: {
      description: "1 per vent penetration",
      calculation: "Count of 10\" vent penetrations",
    }
  },
  // PIPE BOOTS
  {
    id: "bullet-boot-1-5inch",
    name: "Bullet Boot Pipe Flashing - 1 1/2\"",
    category: MaterialCategory.VENTILATION,
    price: 22.50,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 1.5\" pipe penetrations",
    }
  },
  {
    id: "bullet-boot-2inch",
    name: "Bullet Boot Pipe Flashing - 2\"",
    category: MaterialCategory.VENTILATION,
    price: 24.97,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 2\" pipe penetrations",
    }
  },
  {
    id: "bullet-boot-3inch",
    name: "Bullet Boot Pipe Flashing - 3\"",
    category: MaterialCategory.VENTILATION,
    price: 27.78,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 3\" pipe penetrations",
    }
  },
  {
    id: "bullet-boot-4inch",
    name: "Bullet Boot Pipe Flashing - 4\"",
    category: MaterialCategory.VENTILATION,
    price: 43.49,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 4\" pipe penetrations",
    }
  },
  {
    id: "adjustable-lead-pipe-flashing-1-5inch",
    name: "Adjustable Lead Pipe Flashing - 2.5# - 1 1/2\" (8\"x10\"x10\")",
    category: MaterialCategory.VENTILATION,
    price: 19.44,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 1.5\" pipe penetrations",
    }
  },
  {
    id: "adjustable-lead-pipe-flashing-2inch",
    name: "Adjustable Lead Pipe Flashing - 2.5# - 2\" (8\"x10\"x10\")",
    category: MaterialCategory.VENTILATION,
    price: 20.56,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 2\" pipe penetrations",
    }
  },
  {
    id: "adjustable-lead-pipe-flashing-3inch",
    name: "Adjustable Lead Pipe Flashing - 2.5# - 3\" (10\"x12\"x10\")",
    category: MaterialCategory.VENTILATION,
    price: 24.44,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 3\" pipe penetrations",
    }
  },
  {
    id: "adjustable-lead-pipe-flashing-4inch",
    name: "Adjustable Lead Pipe Flashing - 2.5# - 4\" (12\"x12\"x12\")",
    category: MaterialCategory.VENTILATION,
    price: 30.00,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 4\" pipe penetrations",
    }
  },
  {
    id: "golden-rule-zipseal-mast-flashing",
    name: "Golden Rule ZipSeal Large EPDM Retrofit Electric Mast Flashing - 0\"-5 3/8\" - Black",
    category: MaterialCategory.VENTILATION,
    price: 28.25,
    unit: "Each",
    coverageRule: {
      description: "1 per mast penetration",
      calculation: "Count of mast penetrations",
    }
  },
  // ACCESSORIES 
  {
    id: "round-metal-cap-nails",
    name: "Round Metal Cap Nails - 1\" (25 lb)",
    category: MaterialCategory.ACCESSORIES,
    price: 79.99,
    unit: "Box",
    coverageRule: {
      description: "1 box per 50 squares",
      calculation: "Ceiling(Total Squares ÷ 50)",
    }
  },
  {
    id: "abc-plastic-cap-nails",
    name: "ABC Plastic Cap Nails - 1\" (3000 Cnt)",
    category: MaterialCategory.ACCESSORIES,
    price: 42.78,
    unit: "Box",
    coverageRule: {
      description: "1 box per 15 squares",
      calculation: "Ceiling(Total Squares ÷ 15)",
    }
  },
  {
    id: "abc-electro-galvanized-coil-nails",
    name: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)",
    category: MaterialCategory.ACCESSORIES,
    price: 57.22,
    unit: "Box",
    coverageRule: {
      description: "1 box per 30 squares",
      calculation: "Ceiling(Total Squares ÷ 30)",
    }
  },
  {
    id: "coil-nails-ring-shank",
    name: "Coil Nails - Ring Shank - 2 3/8\"x.113\" (5000 Cnt)",
    category: MaterialCategory.ACCESSORIES,
    price: 68.89,
    unit: "Box",
    coverageRule: {
      description: "1 box per roof",
      calculation: "1",
    }
  },
  {
    id: "wood-zip-screws",
    name: "DIRECT #10X1-1/2 WOODZIP MILL (250 ct)",
    category: MaterialCategory.ACCESSORIES,
    price: 23.99,
    unit: "Each",
    coverageRule: {
      description: "1 box per roof",
      calculation: "1",
    }
  },
  {
    id: "zamac-masonry-fastener",
    name: "Zamac Masonry Fastener - 1 1/4\"x1/4\" (100 Cnt)",
    category: MaterialCategory.ACCESSORIES,
    price: 23.99,
    unit: "Box",
    coverageRule: {
      description: "1 box per roof (if needed)",
      calculation: "1",
    }
  },
  {
    id: "karnak-asphalt-primer-spray",
    name: "Karnak #108 Asphalt Primer Spray (14 oz)",
    category: MaterialCategory.ACCESSORIES,
    price: 20.00,
    unit: "Each",
    coverageRule: {
      description: "1 per 5 squares",
      calculation: "Ceiling(Total Squares ÷ 5)",
    }
  },
  {
    id: "karnak-flashing-cement",
    name: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)",
    category: MaterialCategory.ACCESSORIES,
    price: 70.37,
    unit: "Each",
    coverageRule: {
      description: "1 bucket per 15 squares",
      calculation: "Ceiling(Total Squares ÷ 15)",
    }
  },
  {
    id: "master-sealant",
    name: "Master Builders MasterSeal NP1 Sealant (10.1 oz)",
    category: MaterialCategory.ACCESSORIES,
    price: 11.76,
    unit: "Each",
    coverageRule: {
      description: "1 tube per 10 squares",
      calculation: "Ceiling(Total Squares ÷ 10)",
    }
  },
  // MISCELLANEOUS
  {
    id: "kennedy-skylight-small",
    name: "Kennedy 2222-TSFG2 Self-Flashing Skylight w/ Tempered Glass & 2\" Curb",
    category: MaterialCategory.ACCESSORIES,
    price: 225.00,
    unit: "Each",
    coverageRule: {
      description: "1 per skylight",
      calculation: "Count of skylights",
    }
  },
  {
    id: "kennedy-skylight-large",
    name: "Kennedy 2246-TSFG2 Self-Flashing Skylight w/ Tempered Glass & 2\" Curb",
    category: MaterialCategory.ACCESSORIES,
    price: 300.00,
    unit: "Each",
    coverageRule: {
      description: "1 per skylight",
      calculation: "Count of skylights",
    }
  },
  {
    id: "tamco-roof-to-wall-flashing",
    name: "TAMCO Galvalume Roof to Wall Flashing - 26GA - 4\"x5\" (10')",
    category: MaterialCategory.METAL,
    price: 17.20,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Wall Length ÷ 10, rounded up",
    }
  },
  {
    id: "acm-counter-flashing",
    name: "ACM Galvalume Counter Flashing - 3\"x10\" (per PC)",
    category: MaterialCategory.METAL,
    price: 14.85,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Wall Length ÷ 10, rounded up",
    }
  },
  {
    id: "galvanized-steel-roll-valley",
    name: "Galvanized Steel Roll Valley - 26GA - 16\" (50')",
    category: MaterialCategory.METAL,
    price: 81.00,
    unit: "Roll",
    coverageRule: {
      description: "50'/Roll",
      calculation: "Valley Length ÷ 50, rounded up",
    }
  },
  {
    id: "rustoleum-protective-enamel",
    name: "Rustoleum Protective Enamel (12 oz)",
    category: MaterialCategory.ACCESSORIES,
    price: 11.67,
    unit: "Each",
    coverageRule: {
      description: "1 can per roof",
      calculation: "1",
    }
  },
  {
    id: "cdx-plywood",
    name: "1/2\"x4'x8' CDX Plywood - 4-Ply",
    category: MaterialCategory.ACCESSORIES,
    price: 70.00,
    unit: "Board",
    coverageRule: {
      description: "32 sq ft per sheet",
      calculation: "Repair Area ÷ 32, rounded up",
    }
  }
];

// Default labor rates for the template
const DEFAULT_LABOR_RATES: LaborRates = {
  laborRate: 85,
  isHandload: false,
  handloadRate: 10,
  dumpsterLocation: "orlando",
  dumpsterCount: 1,
  dumpsterRate: 400,
  includePermits: true,
  permitRate: 450,
  permitCount: 1,
  permitAdditionalRate: 450,
  pitchRates: {},
  wastePercentage: 12,
  includeGutters: false,
  gutterLinearFeet: 0,
  gutterRate: 8,
  includeDownspouts: false,
  downspoutCount: 0,
  downspoutRate: 75,
  includeDetachResetGutters: false,
  detachResetGutterLinearFeet: 0,
  detachResetGutterRate: 1
};

/**
 * Creates a default pricing template with updated materials
 */
export const createDefaultTemplate = async () => {
  console.log("Creating default template with updated materials...");

  if (!isSupabaseConfigured()) {
    console.error("Supabase not configured, cannot create template");
    return { error: new Error("Supabase not configured") };
  }

  // Create a materials object keyed by id
  const materials: {[key: string]: Material} = {};
  const quantities: {[key: string]: number} = {};

  UPDATED_MATERIALS.forEach(material => {
    materials[material.id] = material;
    quantities[material.id] = 0; // Default quantity is 0
  });

  // Create the template
  const template = {
    name: "Standard GAF Package (Updated)",
    description: "Standard GAF shingle package with updated materials and prices - May 2024",
    materials,
    quantities,
    labor_rates: DEFAULT_LABOR_RATES,
    profit_margin: 25,
    is_default: true
  };

  try {
    const { data, error } = await createPricingTemplate(template);
    
    if (error) {
      console.error("Error creating default template:", error);
      return { error };
    }
    
    console.log("Default template created successfully!", data);
    return { data };
  } catch (error) {
    console.error("Exception creating default template:", error);
    return { 
      error: error instanceof Error ? error : new Error("Unknown error occurred") 
    };
  }
};

// Export for use in other files
export default createDefaultTemplate; 