import { Material, MaterialCategory } from "./types";

// Final corrected list based on user input and required removals/updates
export const ROOFING_MATERIALS: Material[] = [
  // SHINGLES
  {
    id: "gaf-timberline-hdz-sg",
    name: "GAF Timberline HDZ SG",
    category: MaterialCategory.SHINGLES,
    price: 42.82,
    unit: "Bundle",
    approxPerSquare: 128.46,
    coverageRule: { description: "3 Bundles/Square (33.3 sq ft per bundle)", calculation: "Steep Slope Area / 33.3 rounded up" }
  },
  {
    id: "gaf-seal-a-ridge",
    name: "GAF Seal-A-Ridge (25')",
    category: MaterialCategory.SHINGLES,
    price: 70.56,
    unit: "Bundle",
    coverageRule: { description: "20 LF/Bundle", calculation: "(Ridge Length + Hip Length) * (1 + Waste%) / 20 rounded up" }
  },
  {
    id: "gaf-prostart-starter-shingle-strip",
    name: "GAF ProStart Starter Shingle Strip (120')",
    category: MaterialCategory.SHINGLES,
    price: 67.22,
    unit: "Bundle",
    coverageRule: { description: "110 LF/Bundle", calculation: "Eaves LF * (1 + Waste%) / 110 rounded up" }
  },
  {
    id: "oc-oakridge",
    name: "OC Oakridge",
    category: MaterialCategory.SHINGLES,
    price: 38.33,
    unit: "Bundle",
    approxPerSquare: 114.99,
    coverageRule: { description: "3 Bundles/Square (33.3 sq ft per bundle)", calculation: "Steep Slope Area / 33.3 rounded up" }
  },
   {
    id: "oc-hip-ridge",
    name: "OC Hip & Ridge",
    category: MaterialCategory.SHINGLES,
    price: 84.44,
    unit: "Bundle",
    coverageRule: { description: "25 LF/Bundle", calculation: "(Ridge Length + Hip Length) * (1 + Waste%) / 25 rounded up" }
  },
  {
    id: "oc-starter",
    name: "OC Starter",
    category: MaterialCategory.SHINGLES,
    price: 70.56,
    unit: "Bundle",
    coverageRule: { description: "120 LF/Bundle", calculation: "(Eave Length + Rake Length) * (1 + Waste%) / 120 rounded up" }
  },
  {
    id: "gaf-uhdz",
    name: "GAF Timberline UHDZ",
    category: MaterialCategory.SHINGLES,
    price: 48.50,
    unit: "Bundle",
    approxPerSquare: 145.50,
    coverageRule: { description: "3 Bundles/Square (33.3 sq ft per bundle)", calculation: "Steep Slope Area / 33.3 rounded up" }
  },
  {
    id: "oc-duration",
    name: "OC Duration",
    category: MaterialCategory.SHINGLES,
    price: 41.30,
    unit: "Bundle",
    approxPerSquare: 123.90,
    coverageRule: { description: "3 Bundles/Square (33.3 sq ft per bundle)", calculation: "Steep Slope Area / 33.3 rounded up" }
  },
  // UNDERLAYMENTS
  {
    id: "full-peel-stick-system",
    name: "Full W.W Peel & Stick System",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 0,
    unit: "Roll",
    approxPerSquare: 0,
    coverageRule: { description: "1.5 Squares Steep Area / Roll (Cost: $60/sq extra)", calculation: "Steep Slope Area / 1.5 rounded up" }
  },
  {
    id: "abc-pro-guard-20",
    name: "ABC Pro Guard 20 (Rhino)",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 87.88,
    unit: "Roll",
    approxPerSquare: 17.58,
    coverageRule: { description: "5 Squares/Roll (500 sq ft)", calculation: "Steep Slope Area / 5 rounded up" } 
  },
  {
    id: "gaf-weatherwatch-ice-water-shield",
    name: "GAF WeatherWatch Ice & Water Shield",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 101.11,
    unit: "Roll",
    approxPerSquare: 50.56,
    coverageRule: { description: "1.5 Squares/Roll (150 sq ft)", calculation: "Valley Length / 45.5 rounded up" } 
  },
  {
    id: "gaf-feltbuster-synthetic-underlayment",
    name: "GAF FeltBuster Synthetic Underlayment (10 sq)",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 108.89, 
    unit: "Roll",
    approxPerSquare: 10.89, 
    coverageRule: { description: "10 Squares/Roll (1,000 sq ft)", calculation: "Total Area / 10 rounded up" } 
  },
  {
    id: "maxfelt-nc",
    name: "MaxFelt NC",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 65.56, 
    unit: "Roll",
    approxPerSquare: 6.56,
    coverageRule: { description: "10 Squares/Roll (1,000 sq ft)", calculation: "Ceiling(Total Squares / 10)" }
  },
  {
    id: "polyglass-ice-water-shield",
    name: "Polyglass Ice & Water Shield",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 125.00,
    unit: "Roll",
    approxPerSquare: 62.50,
    coverageRule: { description: "2 Squares/Roll (200 sq ft)", calculation: "Total Area / 2 rounded up" }
  },
  {
    id: "rhino-synthetic",
    name: "Rhino Synthetic",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 67.65,
    unit: "Roll",
    approxPerSquare: 6.77,
    coverageRule: { description: "10 Squares/Roll (1,000 sq ft)", calculation: "Ceiling(Total Squares / 10)" }
  },
  {
    id: "poly-glass-irxe",
    name: "Poly Glass IRXE",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 67.65,
    unit: "Roll",
    approxPerSquare: 33.83,
    coverageRule: { description: "2 Squares/Roll (200 sq ft)", calculation: "Ceiling(Total Squares / 2)" } 
  },
  {
    id: "rhino-g-ps",
    name: "Rhino G P&S",
    category: MaterialCategory.UNDERLAYMENTS,
    price: 110.73,
    unit: "Roll",
    approxPerSquare: 55.37,
    coverageRule: { description: "2 Squares/Roll (200 sq ft)", calculation: "Valley Length + Eave Length related calc" } 
  },
  // LOW SLOPE
  {
    id: "polyglass-elastoflex-sbs",
    name: "Polyglass Elastoflex SA-V SBS Base Sheet (2 sq)",
    category: MaterialCategory.LOW_SLOPE,
    price: 142.22,
    unit: "Roll",
    approxPerSquare: 177.78,
    coverageRule: { description: "200 sq ft per roll for 0-2/12 pitch areas", calculation: "Low Slope Area (0-2 pitch) ÷ 200 × waste then rounded up" }
  },
  {
    id: "polyglass-polyflex-app",
    name: "Polyglass Polyflex SA-P APP Cap Sheet (1 sq)",
    category: MaterialCategory.LOW_SLOPE,
    price: 132.22,
    unit: "Roll",
    approxPerSquare: 165.28,
    coverageRule: { description: "Cap quantity = Base quantity × 2", calculation: "Base rolls × 2" }
  },
  {
    id: "gaf-poly-iso-4x8",
    name: "GAF Poly ISO 4X8",
    category: MaterialCategory.LOW_SLOPE,
    price: 90.00,
    unit: "Square", 
    approxPerSquare: 90.00, 
    coverageRule: { description: "Priced at $90.00/square for 0/12 pitch areas.", calculation: "0/12 pitch area / 100 rounded up" }
  },
  // METAL
  {
    id: "millennium-galvanized-drip-edge",
    name: "Millennium Galvanized Steel Drip Edge - 26GA - 6\" (10')",
    category: MaterialCategory.METAL,
    price: 15.00,
    unit: "Piece",
    coverageRule: { description: "10'/Piece", calculation: "Eave Length + Rake Length / 10 rounded up" }
  },
  {
    id: "aluminum-eave-drip-edge",
    name: "Aluminum Eave Drip Edge",
    category: MaterialCategory.METAL,
    price: 16.00,
    unit: "Piece",
    coverageRule: { description: "10'/Piece", calculation: "Ceiling(Eave Length / 10)" }
  },
  {
    id: "tamco-roof-to-wall-flashing",
    name: "TAMCO Galvalume Roof to Wall Flashing - 26GA - 4\"x5\" (10')",
    category: MaterialCategory.METAL,
    price: 17.20,
    unit: "Piece",
    coverageRule: { description: "10'/Piece", calculation: "(Step Flashing LF + Wall Flashing LF) / 10 rounded up" }
  },
  {
    id: "acm-counter-flashing",
    name: "ACM Galvalume Counter Flashing - 3\"x10\" (per PC)",
    category: MaterialCategory.METAL,
    price: 14.85,
    unit: "Piece",
    coverageRule: { description: "10'/Piece", calculation: "Manual quantity selection" }
  },
  {
    id: "galvanized-steel-roll-valley",
    name: "Galvanized Steel Roll Valley - 26GA - 16\" (50')",
    category: MaterialCategory.METAL,
    price: 81.00,
    unit: "Roll",
    coverageRule: { description: "50'/Roll", calculation: "Valley Length / 50 rounded up" }
  },
  // VENTILATION & BOOTS
  {
    id: "gaf-cobra-rigid-vent",
    name: "GAF Cobra Rigid Vent 3 Exhaust Ridge Vent w/ Nails - 11-1/2\" (4')",
    category: MaterialCategory.VENTILATION,
    price: 22.31,
    unit: "Piece",
    coverageRule: { description: "4'/Piece", calculation: "Ridges LF / 4 rounded up" }
  },
   {
    id: "galvanized-steel-off-ridge-vent",
    name: "Galvanized Steel Off Ridge Vent (4') - w/ Diverter",
    category: MaterialCategory.VENTILATION,
    price: 71.25,
    unit: "Piece",
    coverageRule: { description: "4'/Piece", calculation: "Count needed based on ventilation requirements" }
  },
  {
    id: "galvanized-gooseneck-4inch",
    name: "Galvanized Steel Gooseneck Exhaust Vent - 4\" - w/ Damper",
    category: MaterialCategory.VENTILATION,
    price: 44.44,
    unit: "Each",
    coverageRule: { description: "1 per vent penetration", calculation: "Count of 4\" vent penetrations" }
  },
  {
    id: "galvanized-gooseneck-10inch",
    name: "Galvanized Steel Gooseneck Exhaust Vent - 10\" - w/ Damper",
    category: MaterialCategory.VENTILATION,
    price: 55.56,
    unit: "Each",
    coverageRule: { description: "1 per vent penetration", calculation: "Count of 10\" vent penetrations" }
  },
  {
    id: "bullet-boot-1-5inch",
    name: "Bullet Boot Pipe Flashing - 1 1/2\"",
    category: MaterialCategory.VENTILATION,
    price: 22.50,
    unit: "Each",
    coverageRule: { description: "1 per pipe penetration", calculation: "Count of 1.5\" pipe penetrations" }
  },
  {
    id: "bullet-boot-2inch",
    name: "Bullet Boot Pipe Flashing - 2\"",
    category: MaterialCategory.VENTILATION,
    price: 24.97,
    unit: "Each",
    coverageRule: { description: "1 per pipe penetration", calculation: "Count of 2\" pipe penetrations" }
  },
  {
    id: "bullet-boot-3inch",
    name: "Bullet Boot Pipe Flashing - 3\"",
    category: MaterialCategory.VENTILATION,
    price: 27.78,
    unit: "Each",
    coverageRule: { description: "1 per pipe penetration", calculation: "Count of 3\" pipe penetrations" }
  },
  {
    id: "bullet-boot-4inch",
    name: "Bullet Boot Pipe Flashing - 4\"",
    category: MaterialCategory.VENTILATION,
    price: 43.49,
    unit: "Each",
    coverageRule: { description: "1 per pipe penetration", calculation: "Count of 4\" pipe penetrations" }
  },
  {
    id: "adjustable-lead-pipe-flashing-1-5inch",
    name: "Adjustable Lead Pipe Flashing - 2.5# - 1 1/2\" (8\"x10\"x10\")",
    category: MaterialCategory.VENTILATION,
    price: 19.44,
    unit: "Each",
    coverageRule: { description: "1 per pipe penetration", calculation: "Count of 1.5\" pipe penetrations" }
  },
  {
    id: "adjustable-lead-pipe-flashing-2inch",
    name: "Adjustable Lead Pipe Flashing - 2.5# - 2\" (8\"x10\"x10\")",
    category: MaterialCategory.VENTILATION,
    price: 20.56,
    unit: "Each",
    coverageRule: { description: "1 per pipe penetration", calculation: "Count of 2\" pipe penetrations" }
  },
  {
    id: "adjustable-lead-pipe-flashing-3inch",
    name: "Adjustable Lead Pipe Flashing - 2.5# - 3\" (10\"x12\"x10\")",
    category: MaterialCategory.VENTILATION,
    price: 24.44,
    unit: "Each",
    coverageRule: { description: "1 per pipe penetration", calculation: "Count of 3\" pipe penetrations" }
  },
  {
    id: "adjustable-lead-pipe-flashing-4inch",
    name: "Adjustable Lead Pipe Flashing - 2.5# - 4\" (12\"x12\"x12\")",
    category: MaterialCategory.VENTILATION,
    price: 30.00,
    unit: "Each",
    coverageRule: { description: "1 per pipe penetration", calculation: "Count of 4\" pipe penetrations" } 
  },
  {
    id: "golden-rule-zipseal-mast-flashing",
    name: "Golden Rule ZipSeal Large EPDM Retrofit Electric Mast Flashing - 0\"-5 3/8\" - Black",
    category: MaterialCategory.VENTILATION,
    price: 28.25,
    unit: "Each",
    coverageRule: { description: "1 per mast penetration", calculation: "Count of mast penetrations" }
  },
  // ACCESSORIES
  {
    id: "1inch-plastic-cap-nails",
    name: "1\" Plastic Cap Nails (3000/bucket)",
    category: MaterialCategory.ACCESSORIES,
    price: 39.48,
    unit: "Bucket",
    coverageRule: { description: "1 bucket per 20 squares of total roof area", calculation: "Ceiling(Total Squares / 20)" }
  },
  {
    id: "master-sealant",
    name: "Master Builders MasterSeal NP1 Sealant (10.1 oz)",
    category: MaterialCategory.ACCESSORIES,
    price: 11.76,
    unit: "Each",
    coverageRule: { description: "1 tube per 10 squares", calculation: "Ceiling(Total Squares / 10)" }
  },
  {
    id: "round-metal-cap-nails",
    name: "Round Metal Cap Nails - 1\" (25 lb)",
    category: MaterialCategory.ACCESSORIES,
    price: 79.99,
    unit: "Box",
    coverageRule: { description: "1 box per 50 squares", calculation: "Ceiling(Total Squares / 50)" }
  },
  {
    id: "abc-electro-galvanized-coil-nails",
    name: "ABC Electro Galvanized Coil Nails - 1 1/4\" (7200 Cnt)",
    category: MaterialCategory.ACCESSORIES,
    price: 57.22,
    unit: "Box",
    coverageRule: { description: "1 box per 10 squares", calculation: "Ceiling(Total Squares / 10)" }
  },
  {
    id: "coil-nails-ring-shank",
    name: "Coil Nails - Ring Shank - 2 3/8\"x.113\" (5000 Cnt)",
    category: MaterialCategory.ACCESSORIES,
    price: 68.89,
    unit: "Box",
    coverageRule: { description: "1 box per 30 squares", calculation: "Ceiling(Total Squares / 30)" }
  },
  {
    id: "wood-zip-screws",
    name: "DIRECT #10X1-1/2 WOODZIP MILL (250 ct)",
    category: MaterialCategory.ACCESSORIES,
    price: 23.99,
    unit: "Each", 
    coverageRule: { description: "1 box per roof", calculation: "Manual quantity selection" }
  },
  {
    id: "zamac-masonry-fastener",
    name: "Zamac Masonry Fastener - 1 1/4\"x1/4\" (100 Cnt)",
    category: MaterialCategory.ACCESSORIES,
    price: 23.99,
    unit: "Box",
    coverageRule: { description: "1 box per roof (if needed)", calculation: "Manual quantity selection" }
  },
   {
    id: "karnak-asphalt-primer-spray",
    name: "Karnak #108 Asphalt Primer Spray (14 oz)",
    category: MaterialCategory.ACCESSORIES,
    price: 20.00,
    unit: "Each",
    coverageRule: { description: "1 per 10 squares of low slope area", calculation: "Ceiling(Low Slope Area / 10)" }
  },
  {
    id: "karnak-flashing-cement",
    name: "Karnak #19 Ultra Rubberized Flashing Cement (5 Gal)",
    category: MaterialCategory.ACCESSORIES,
    price: 70.37,
    unit: "Each", 
    coverageRule: { description: "1 bucket per 300 LF of flashings", calculation: "Ceiling((Valley Length + Drip Edge Length + Wall Flashing Length + Step Flashing Length) / 300)" }
  },
  {
    id: "skylight-2x2",
    name: "2x2 Skylight",
    category: MaterialCategory.ACCESSORIES,
    price: 280.00,
    unit: "Each",
    coverageRule: { description: "1 per skylight", calculation: "Count of skylights from job worksheet" }
  },
  {
    id: "skylight-2x4", 
    name: "2x4 Skylight",
    category: MaterialCategory.ACCESSORIES,
    price: 370.00,
    unit: "Each",
    coverageRule: { description: "1 per skylight", calculation: "Count of skylights from job worksheet" }
  },
  {
    id: "kennedy-skylight-small",
    name: "Kennedy 2222-TSFG2 Self-Flashing Skylight w/ Tempered Glass & 2\" Curb",
    category: MaterialCategory.ACCESSORIES,
    price: 225.00,
    unit: "Each",
    coverageRule: { description: "1 per skylight", calculation: "Count of skylights" }
  },
  {
    id: "kennedy-skylight-large",
    name: "Kennedy 2246-TSFG2 Self-Flashing Skylight w/ Tempered Glass & 2\" Curb",
    category: MaterialCategory.ACCESSORIES,
    price: 300.00,
    unit: "Each",
    coverageRule: { description: "1 per skylight", calculation: "Count of skylights" }
  },
  {
    id: "rustoleum-protective-enamel",
    name: "Rustoleum Protective Enamel (12 oz)",
    category: MaterialCategory.ACCESSORIES,
    price: 11.67,
    unit: "Each",
    coverageRule: { description: "1 can per 1000 sq ft of roof area", calculation: "Ceiling(Total Squares / 100)" }
  },
  // Wood section from original list (excluding removed items)
  {
    id: "decking-plywood-cdx-4x8-five-eighth-inch",
    name: "Decking Plywood CDX 4×8 5/8\"",
    category: MaterialCategory.ACCESSORIES,
    price: 53.99,
    unit: "Sheet",
    coverageRule: { description: "32 sq ft per sheet", calculation: "Repair Area / 32, rounded up" }
  },
  {
    id: "lumber-1x4-8ft",
    name: "Lumber 1×4×8'",
    category: MaterialCategory.ACCESSORIES,
    price: 4.99,
    unit: "Piece",
    coverageRule: { description: "8 ft per piece", calculation: "Count of repair sections" }
  },
    {
    id: "lumber-2x6-8ft",
    name: "Lumber 2×6×8'",
    category: MaterialCategory.ACCESSORIES,
    price: 9.99,
    unit: "Piece",
    coverageRule: { description: "8 ft per piece", calculation: "Count of repair sections" }
  },
  {
    id: "lumber-2x8-8ft",
    name: "Lumber 2×8×8'",
    category: MaterialCategory.ACCESSORIES,
    price: 12.99,
    unit: "Piece",
    coverageRule: { description: "8 ft per piece", calculation: "Count of repair sections" }
  },
  {
    id: "cdx-plywood",
    name: "1/2\"x4'x8' CDX Plywood - 4-Ply",
    category: MaterialCategory.ACCESSORIES,
    price: 70.00,
    unit: "Board", 
    coverageRule: { description: "32 sq ft per sheet", calculation: "Repair Area / 32, rounded up" }
  },
  {
    id: "karnak-19", // Added back based on user list
    name: "Karnak 19",
    category: MaterialCategory.ACCESSORIES,
    price: 64.81,
    unit: "Tube",
    coverageRule: { description: "1 tube per 20 squares", calculation: "Ceiling(Total Squares / 20)" }
  },
  {
    id: "abc-pro-start-premium",
    name: "ABC Pro Start Premium Starter Strip",
    category: MaterialCategory.SHINGLES,
    price: 75.00,
    unit: "Bundle",
    coverageRule: { description: "120 LF/Bundle", calculation: "(Eave Length + Rake Length) * (1 + Waste%) / 120 rounded up" }
  },
  {
    id: "soffit-vents-continuous",
    name: "Continuous Soffit Vents (10')",
    category: MaterialCategory.VENTILATION,
    price: 18.50,
    unit: "Piece",
    coverageRule: { description: "10'/Piece", calculation: "Soffit Length / 10 rounded up" }
  }
];

// Optional: Log counts for verification
// if (process.env.NODE_ENV === 'development') {
//     console.log(`Exporting ${ROOFING_MATERIALS.length} materials from data.ts`);
// }
