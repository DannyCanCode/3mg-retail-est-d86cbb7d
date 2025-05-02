import { Material, MaterialCategory } from "./types";

export const ROOFING_MATERIALS: Material[] = [
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
    price: 87.88,
    unit: "Roll",
    approxPerSquare: 19.53,
    coverageRule: {
      description: "4.5 Squares/Roll (450 sq ft)",
      calculation: "Total Roof Area ÷ 4.5, rounded up",
    }
  },
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
    price: 108.89,
    unit: "Roll",
    approxPerSquare: 10.89,
    coverageRule: {
      description: "10 Squares/Roll (1,000 sq ft)",
      calculation: "Total Roof Area ÷ 10, rounded up",
    }
  },
  // Adding more underlayments from Excel
  {
    id: "maxfelt-nc",
    name: "MaxFelt NC",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 65.56,
    unit: "Roll",
    approxPerSquare: 6.56,
    coverageRule: {
      description: "10 Squares/Roll (1,000 sq ft)",
      calculation: "Ceiling(Total Squares ÷ 10)",
    }
  },
  {
    id: "gaf-poly-iso-4x8",
    name: "GAF Poly ISO 4X8",
    category: MaterialCategory.LOW_SLOPE,
    price: 90.0,
    unit: "Roll",
    approxPerSquare: 90.0,
    coverageRule: {
      description: "For 0/12 pitch areas only",
      calculation: "0/12 pitch area square footage × 1.12 ÷ 100, rounded up",
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
  // --- ADDING PSEUDO-MATERIAL FOR FULL PEEL & STICK SYSTEM ---
  {
    id: "full-peel-stick-system",
    name: "Full W.W Peel & Stick System Add-on",
    category: MaterialCategory.UNDERLAYMENTS, // Or ACCESSORIES?
    price: 0, // Cost is handled separately ($60/sq)
    unit: "Roll", // Based on user rule 1.5 sq = 1 roll
    approxPerSquare: 0, // Cost is separate
    coverageRule: {
      description: "1.5 Squares Steep Area / Roll (Cost: $60/sq extra)",
      calculation: "Steep Slope Area (>= 3/12) ÷ 1.5, rounded up",
    }
  },
  // --- END ADDITION ---
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
    price: 13.30,
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
  {
    id: "tamco-roof-to-wall-flashing",
    name: "TAMCO Galvalume Roof to Wall Flashing - 26GA - 4\"x5\" (10')",
    category: MaterialCategory.METAL,
    price: 17.20,
    unit: "Piece",
    coverageRule: {
      description: "10'/Piece",
      calculation: "(Step Flashing LF + Wall Flashing LF) ÷ 10, rounded up",
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
      calculation: "Manual quantity selection",
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
    id: "abc-electro-galvanized-coil-nails",
    name: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)",
    category: MaterialCategory.ACCESSORIES,
    price: 57.22,
    unit: "Box",
    coverageRule: {
      description: "1 box per 10 squares",
      calculation: "Ceiling(Total Squares ÷ 10)",
    }
  },
  {
    id: "coil-nails-ring-shank",
    name: "Coil Nails - Ring Shank - 2 3/8\"x.113\" (5000 Cnt)",
    category: MaterialCategory.ACCESSORIES,
    price: 68.89,
    unit: "Box",
    coverageRule: {
      description: "1 box per 30 squares",
      calculation: "Ceiling(Total Squares ÷ 30)",
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
      calculation: "Manual quantity selection",
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
      calculation: "Manual quantity selection",
    }
  },
  {
    id: "karnak-asphalt-primer-spray",
    name: "Karnak #108 Asphalt Primer Spray (14 oz)",
    category: MaterialCategory.ACCESSORIES,
    price: 20.00,
    unit: "Each",
    coverageRule: {
      description: "1 per 10 squares of low slope area",
      calculation: "Ceiling(Low Slope Area ÷ 10)",
    }
  },
  {
    id: "karnak-flashing-cement",
    name: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)",
    category: MaterialCategory.ACCESSORIES,
    price: 70.37,
    unit: "Each",
    coverageRule: {
      description: "1 bucket per 300 LF of flashings",
      calculation: "Ceiling((Valley Length + Drip Edge + Wall Flashing + Step Flashing) ÷ 300)",
    }
  },
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
    id: "rustoleum-protective-enamel",
    name: "Rustoleum Protective Enamel (12 oz)",
    category: MaterialCategory.ACCESSORIES,
    price: 11.67,
    unit: "Each",
    coverageRule: {
      description: "1 can per 1000 sq ft of roof area",
      calculation: "Ceiling(Total Squares ÷ 100)",
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
  },
];
