import { Material, MaterialCategory } from "./types";

export const ROOFING_MATERIALS: Material[] = [
  // SHINGLES
  {
    id: "gaf-timberline-hdz",
    name: "GAF Timberline HDZ",
    category: MaterialCategory.SHINGLES,
    price: 41.86,
    unit: "Bundle",
    approxPerSquare: 125.58,
    coverageRule: {
      description: "3 Bundles/Square (33.3 sq ft per bundle)",
      calculation: "Total Area / 33.3 rounded up",
    }
  },
  {
    id: "gaf-timberline-hdz-sg",
    name: "GAF Timberline HDZ SG",
    category: MaterialCategory.SHINGLES,
    price: 41.86,
    unit: "Bundle",
    approxPerSquare: 125.58,
    coverageRule: {
      description: "3 Bundles/Square (33.3 sq ft per bundle)",
      calculation: "Total Area / 33.3 rounded up",
    }
  },
  {
    id: "gaf-sa-r-hip-ridge",
    name: "GAF S-A-R Hip & Ridge",
    category: MaterialCategory.SHINGLES,
    price: 67.22,
    unit: "Bundle",
    coverageRule: {
      description: "25 LF/Bundle",
      calculation: "(Ridge Length + Hip Length) ÷ 25, rounded up",
    }
  },
  {
    id: "gaf-seal-a-ridge",
    name: "GAF Seal-A-Ridge (25')",
    category: MaterialCategory.SHINGLES,
    price: 67.22,
    unit: "Bundle",
    coverageRule: {
      description: "25 LF/Bundle",
      calculation: "Ridge Length ÷ 25, rounded up",
    }
  },
  {
    id: "gaf-pro-start-starter",
    name: "GAF Pro-Start Starter",
    category: MaterialCategory.SHINGLES,
    price: 63.33,
    unit: "Bundle",
    coverageRule: {
      description: "120 LF/Bundle",
      calculation: "(Eave Length + Rake Length) ÷ 120, rounded up",
    }
  },
  {
    id: "gaf-prostart-starter-shingle-strip",
    name: "GAF ProStart Starter Shingle Strip (120')",
    category: MaterialCategory.SHINGLES,
    price: 63.33,
    unit: "Bundle",
    coverageRule: {
      description: "120 LF/Bundle",
      calculation: "(Eave Length + Rake Length) ÷ 120, rounded up",
    }
  },
  // Adding OC Shingles from Excel
  {
    id: "oc-oakridge",
    name: "OC Oakridge",
    category: MaterialCategory.SHINGLES,
    price: 38.33,
    unit: "Bundle",
    approxPerSquare: 114.99,
    coverageRule: {
      description: "3 Bundles/Square (33.3 sq ft per bundle)",
      calculation: "Total Area / 33.3 rounded up",
    }
  },
  {
    id: "oc-hip-ridge",
    name: "OC Hip & Ridge",
    category: MaterialCategory.SHINGLES,
    price: 84.44,
    unit: "Bundle",
    coverageRule: {
      description: "25 LF/Bundle",
      calculation: "(Ridge Length + Hip Length) ÷ 25, rounded up",
    }
  },
  {
    id: "oc-starter",
    name: "OC Starter",
    category: MaterialCategory.SHINGLES,
    price: 70.56,
    unit: "Bundle",
    coverageRule: {
      description: "120 LF/Bundle",
      calculation: "(Eave Length + Rake Length) ÷ 120, rounded up",
    }
  },
  {
    id: "oc-duration",
    name: "OC Duration",
    category: MaterialCategory.SHINGLES,
    price: 41.3,
    unit: "Bundle",
    approxPerSquare: 123.90,
    coverageRule: {
      description: "3 Bundles/Square (33.3 sq ft per bundle)",
      calculation: "Total Area / 33.3 rounded up",
    }
  },
  // UNDERLAYMENTS
  {
    id: "abc-pro-guard-20",
    name: "ABC Pro Guard 20 (Rhino)",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 83.33,
    unit: "Roll",
    approxPerSquare: 8.33,
    coverageRule: {
      description: "10 Squares/Roll (1,000 sq ft)",
      calculation: "Ceiling(Total Squares ÷ 10)",
    }
  },
  {
    id: "gaf-feltbuster",
    name: "GAF FeltBuster",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 102.23,
    unit: "Roll",
    approxPerSquare: 10.22,
    coverageRule: {
      description: "10 Squares/Roll (1,000 sq ft)",
      calculation: "Ceiling(Total Squares ÷ 10)",
    }
  },
  {
    id: "gaf-weatherwatch",
    name: "GAF Weatherwatch (Peel & Stick)",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 93.89,
    unit: "Roll",
    approxPerSquare: 46.95,
    coverageRule: {
      description: "2 Squares/Roll (200 sq ft)",
      calculation: "Valley Length (ft) ÷ 3 × 0.167 + Eave Length (ft) ÷ 3 × 0.167",
    }
  },
  {
    id: "gaf-weatherwatch-ice-water-shield",
    name: "GAF WeatherWatch Ice & Water Shield",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 93.89,
    unit: "Roll",
    approxPerSquare: 46.95,
    coverageRule: {
      description: "2 Squares/Roll (200 sq ft)",
      calculation: "Valley Length (ft) ÷ 3 × 0.167 + Eave Length (ft) ÷ 3 × 0.167",
    }
  },
  {
    id: "gaf-feltbuster-synthetic-underlayment",
    name: "GAF FeltBuster Synthetic Underlayment (10 sq)",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 102.23,
    unit: "Roll",
    approxPerSquare: 10.22,
    coverageRule: {
      description: "10 Squares/Roll (1,000 sq ft)",
      calculation: "Ceiling(Total Roof Area ÷ 10)",
    }
  },
  // Adding more underlayments from Excel
  {
    id: "maxfelt-nc",
    name: "MaxFelt NC",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 70.5,
    unit: "Roll",
    approxPerSquare: 7.05,
    coverageRule: {
      description: "10 Squares/Roll (1,000 sq ft)",
      calculation: "Ceiling(Total Squares ÷ 10)",
    }
  },
  {
    id: "rhino-synthetic",
    name: "Rhino Synthetic",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 67.65,
    unit: "Roll",
    approxPerSquare: 6.77,
    coverageRule: {
      description: "10 Squares/Roll (1,000 sq ft)",
      calculation: "Ceiling(Total Squares ÷ 10)",
    }
  },
  {
    id: "poly-glass-irxe",
    name: "Poly Glass IRXE",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 67.65,
    unit: "Roll",
    approxPerSquare: 33.83,
    coverageRule: {
      description: "2 Squares/Roll (200 sq ft)",
      calculation: "Ceiling(Total Squares ÷ 2)",
    }
  },
  {
    id: "rhino-g-ps",
    name: "Rhino G P&S",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 110.73,
    unit: "Roll",
    approxPerSquare: 55.37,
    coverageRule: {
      description: "2 Squares/Roll (200 sq ft)",
      calculation: "Valley Length (ft) ÷ 3 × 0.167 + Eave Length (ft) ÷ 3 × 0.167",
    }
  },
  {
    id: "polyglass-elastoflex-sbs",
    name: "Polyglass Elastoflex SA-V SBS Base Sheet (2 sq)",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 142.22,
    unit: "Roll",
    approxPerSquare: 71.11,
    coverageRule: {
      description: "2 Squares/Roll (200 sq ft)",
      calculation: "Total Low Slope Area ÷ 2, rounded up",
    }
  },
  {
    id: "polyglass-polyflex-app",
    name: "Polyglass Polyflex SA-P APP Cap Sheet (1 sq)",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 132.22,
    unit: "Roll",
    approxPerSquare: 132.22,
    coverageRule: {
      description: "1 Square/Roll (100 sq ft)",
      calculation: "Total Low Slope Area ÷ 1, rounded up",
    }
  },
  // METAL
  {
    id: "drip-edge-26ga",
    name: "Drip Edge 26GA Galvalume (2.5\" Face, Painted)",
    category: MaterialCategory.METAL,
    price: 13.33,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Ceiling((Eave Length + Rake Length) ÷ 10)",
    }
  },
  {
    id: "millennium-galvanized-drip-edge",
    name: "Millennium Galvanized Steel Drip Edge - 26GA - 6\" (10')",
    category: MaterialCategory.METAL,
    price: 13.33,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Drip Edge ÷ 10, rounded up",
    }
  },
  {
    id: "millennium-galvanized-rake-edge",
    name: "Millennium Galvanized Steel Rake Edge - 26GA - 6\" (10')",
    category: MaterialCategory.METAL,
    price: 13.33,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Rake Length ÷ 10, rounded up",
    }
  },
  {
    id: "millennium-galvanized-wall-flashing",
    name: "Millennium Galvanized Steel Wall Flashing - 26GA - 6\" (10')",
    category: MaterialCategory.METAL,
    price: 15.00,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Wall Length ÷ 10, rounded up",
    }
  },
  {
    id: "millennium-galvanized-step-flashing",
    name: "Millennium Galvanized Steel Step Flashing - 26GA - 8\" × 8\" (100/bx)",
    category: MaterialCategory.METAL,
    price: 83.33,
    unit: "Box",
    coverageRule: {
      description: "100 pieces/Box",
      calculation: "Wall Length ÷ 0.5, rounded up, divided by 100",
    }
  },
  {
    id: "millennium-galvanized-counter-flashing",
    name: "Millennium Galvanized Steel Counter Flashing - 26GA - 6\" (10')",
    category: MaterialCategory.METAL,
    price: 15.00,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Wall Length ÷ 10, rounded up",
    }
  },
  {
    id: "millennium-galvanized-valley-metal",
    name: "Millennium Galvanized Steel Valley Metal - 26GA - 20\" (10')",
    category: MaterialCategory.METAL,
    price: 91.67,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Valley Length ÷ 10, rounded up",
    }
  },
  {
    id: "aluminum-eave-drip-edge",
    name: "Aluminum Eave Drip Edge",
    category: MaterialCategory.METAL,
    price: 16.00,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "Ceiling(Eave Length ÷ 10)",
    }
  },
  {
    id: "valley-metal-26ga",
    name: "Valley Metal 26GA Galvalume 16\" × 55'",
    category: MaterialCategory.METAL,
    price: 91.67,
    unit: "Roll",
    coverageRule: {
      description: "55'/Roll",
      calculation: "Ceiling(Valley Length ÷ 55)",
    }
  },
  // VENTILATION & BOOTS
  {
    id: "gaf-cobra-ridge-vent",
    name: "GAF Cobra Shingle Over Ridge Vent (12\")",
    category: MaterialCategory.VENTILATION,
    price: 22.31,
    unit: "Piece",
    coverageRule: {
      description: "4'/Piece",
      calculation: "Ceiling(Ridge Length ÷ 4)",
    }
  },
  {
    id: "gaf-cobra-rigid-vent",
    name: "GAF Cobra Rigid Vent 3 Exhaust Ridge Vent w/ Nails - 11-1/2\" (4')",
    category: MaterialCategory.VENTILATION,
    price: 22.31,
    unit: "Piece",
    coverageRule: {
      description: "4'/Piece",
      calculation: "Ridges ÷ 4, rounded up",
    }
  },
  {
    id: "galvanized-off-ridge-vent",
    name: "Galvanized Steel Off Ridge Vent (4') - w/ Diverter",
    category: MaterialCategory.VENTILATION,
    price: 87.09,
    unit: "Piece",
    coverageRule: {
      description: "4'/Piece",
      calculation: "Count of roof sections needing off-ridge ventilation",
    }
  },
  {
    id: "galvanized-gooseneck-4inch",
    name: "Galvanized Steel Gooseneck Exhaust Vent - 4\" - w/ Damper",
    category: MaterialCategory.VENTILATION,
    price: 42.09,
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
    price: 53.33,
    unit: "Each",
    coverageRule: {
      description: "1 per vent penetration",
      calculation: "Count of 10\" vent penetrations",
    }
  },
  {
    id: "lead-boot-4inch",
    name: "Lead Boot 4\"",
    category: MaterialCategory.VENTILATION,
    price: 27.78,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 4\" pipe penetrations",
    }
  },
  // Adding boot flashing items from screenshots
  {
    id: "bullet-boot-1-5inch",
    name: "Bullet Boot Pipe Flashing - 1 1/2\"",
    category: MaterialCategory.VENTILATION,
    price: 17.22,
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
    price: 18.33,
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
    price: 22.22,
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
    price: 27.78,
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
    price: 17.22,
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
    price: 18.33,
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
    price: 22.22,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 3\" pipe penetrations",
    }
  },
  // ACCESSORIES
  {
    id: "211-plastic-cement",
    name: "211 Plastic Cement (5gal)",
    category: MaterialCategory.ACCESSORIES,
    price: 48.33,
    unit: "Bucket",
    coverageRule: {
      description: "1 bucket per 10-15 squares",
      calculation: "Ceiling(Total Squares ÷ 15)",
    }
  },
  {
    id: "1inch-plastic-cap-nails",
    name: "1\" Plastic Cap Nails (3000/pail)",
    category: MaterialCategory.ACCESSORIES,
    price: 39.48,
    unit: "Pail",
    coverageRule: {
      description: "1 pail per 10 squares of synthetic underlayment",
      calculation: "Ceiling(Total Squares ÷ 10)",
    }
  },
  // Adding more accessories from Excel
  {
    id: "shingle-nails",
    name: "Shingle Nails",
    category: MaterialCategory.ACCESSORIES,
    price: 53.89,
    unit: "Box",
    coverageRule: {
      description: "1 box per 30 squares",
      calculation: "Ceiling(Total Squares ÷ 30)",
    }
  },
  {
    id: "decking-nails",
    name: "Decking Nails",
    category: MaterialCategory.ACCESSORIES,
    price: 66.67,
    unit: "Box",
    coverageRule: {
      description: "1 box per roof repair area",
      calculation: "Count of repair sections",
    }
  },
  {
    id: "cap-nails",
    name: "Cap Nails",
    category: MaterialCategory.ACCESSORIES,
    price: 39.34,
    unit: "Box",
    coverageRule: {
      description: "1 box per 10 squares of felt or synthetic",
      calculation: "Ceiling(Total Squares ÷ 10)",
    }
  },
  {
    id: "karnak-19",
    name: "Karnak 19",
    category: MaterialCategory.ACCESSORIES,
    price: 64.81,
    unit: "Tube",
    coverageRule: {
      description: "1 tube per 20 squares",
      calculation: "Ceiling(Total Squares ÷ 20)",
    }
  },
  {
    id: "orv-screws",
    name: "ORV Screws",
    category: MaterialCategory.ACCESSORIES,
    price: 23.99,
    unit: "Pack",
    coverageRule: {
      description: "1 pack per ridge vent installation",
      calculation: "Ceiling(Ridge Length ÷ 50)",
    }
  },
  // LOW SLOPE section
  {
    id: "modified-base-sheet",
    name: "Modified Base Sheet",
    category: MaterialCategory.LOW_SLOPE,
    price: 65.92,
    unit: "Roll",
    approxPerSquare: 32.96,
    coverageRule: {
      description: "2 Squares/Roll (200 sq ft)",
      calculation: "Ceiling(Low Slope Area ÷ 200)",
    }
  },
  {
    id: "modified-cap-sheet",
    name: "Modified Cap Sheet",
    category: MaterialCategory.LOW_SLOPE,
    price: 103.42,
    unit: "Roll",
    approxPerSquare: 103.42,
    coverageRule: {
      description: "1 Square/Roll (100 sq ft)",
      calculation: "Ceiling(Low Slope Area ÷ 100)",
    }
  },
  {
    id: "gaf-liberty-self-adhering-membrane",
    name: "GAF Liberty Self-Adhering Membrane",
    category: MaterialCategory.LOW_SLOPE,
    price: 132.22, 
    unit: "Roll",
    approxPerSquare: 132.22,
    coverageRule: {
      description: "1 Square/Roll (100 sq ft)",
      calculation: "Total Low Slope Area ÷ 1, rounded up",
    }
  },
  {
    id: "gaf-ruberoid-torch-granular",
    name: "GAF Ruberoid Torch Granular",
    category: MaterialCategory.LOW_SLOPE,
    price: 132.22,
    unit: "Roll",
    approxPerSquare: 132.22,
    coverageRule: {
      description: "1 Square/Roll (100 sq ft)",
      calculation: "Total Low Slope Area ÷ 1, rounded up",
    }
  },
  // Add wood material section
  {
    id: "decking-plywood-cdx-4x8-half-inch",
    name: "Decking Plywood CDX 4×8 1/2\"",
    category: MaterialCategory.ACCESSORIES,
    price: 45.99,
    unit: "Sheet",
    coverageRule: {
      description: "32 sq ft per sheet",
      calculation: "Repair Area ÷ 32, rounded up",
    }
  },
  {
    id: "decking-plywood-cdx-4x8-five-eighth-inch",
    name: "Decking Plywood CDX 4×8 5/8\"",
    category: MaterialCategory.ACCESSORIES,
    price: 53.99,
    unit: "Sheet",
    coverageRule: {
      description: "32 sq ft per sheet",
      calculation: "Repair Area ÷ 32, rounded up",
    }
  },
  {
    id: "lumber-2x4-8ft",
    name: "Lumber 2×4×8'",
    category: MaterialCategory.ACCESSORIES,
    price: 7.99,
    unit: "Piece",
    coverageRule: {
      description: "8 ft per piece",
      calculation: "Count of repair sections",
    }
  },
  {
    id: "lumber-1x4-8ft",
    name: "Lumber 1×4×8'",
    category: MaterialCategory.ACCESSORIES,
    price: 4.99,
    unit: "Piece",
    coverageRule: {
      description: "8 ft per piece",
      calculation: "Count of repair sections",
    }
  },
  {
    id: "lumber-2x6-8ft",
    name: "Lumber 2×6×8'",
    category: MaterialCategory.ACCESSORIES,
    price: 9.99,
    unit: "Piece",
    coverageRule: {
      description: "8 ft per piece",
      calculation: "Count of repair sections",
    }
  },
  {
    id: "lumber-2x8-8ft",
    name: "Lumber 2×8×8'",
    category: MaterialCategory.ACCESSORIES,
    price: 12.99,
    unit: "Piece",
    coverageRule: {
      description: "8 ft per piece",
      calculation: "Count of repair sections",
    }
  },
];
