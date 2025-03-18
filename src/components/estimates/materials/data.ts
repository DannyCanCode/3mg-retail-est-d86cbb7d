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
  // LOW SLOPE MATERIALS
  {
    id: "certainteed-flintlastic-sa-plybase",
    name: "CertainTeed Flintlastic SA Plybase",
    category: MaterialCategory.LOW_SLOPE,
    price: 137.22,
    unit: "Roll",
    approxPerSquare: 68.61,
    coverageRule: {
      description: "2 Squares/Roll (200 sq ft)",
      calculation: "Ceiling(Flat Roof Area ÷ 200)",
    }
  },
  {
    id: "certainteed-flintlastic-cap",
    name: "CertainTeed Flintlastic CAP",
    category: MaterialCategory.LOW_SLOPE,
    price: 131.67,
    unit: "Roll",
    approxPerSquare: 131.67,
    coverageRule: {
      description: "1 Square/Roll (100 sq ft)",
      calculation: "Ceiling(Flat Roof Area ÷ 100)",
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
];
