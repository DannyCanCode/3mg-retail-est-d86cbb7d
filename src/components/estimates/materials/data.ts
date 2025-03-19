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
  // Adding more ventilation items from Excel
  {
    id: "off-ridge-vent",
    name: "Off Ridge Vent",
    category: MaterialCategory.VENTILATION,
    price: 87.09,
    unit: "Box",
    coverageRule: {
      description: "1 per roof section requiring additional ventilation",
      calculation: "Count of roof sections needing off-ridge ventilation",
    }
  },
  {
    id: "gooseneck-4inch",
    name: "Gooseneck 4\"",
    category: MaterialCategory.VENTILATION,
    price: 42.09,
    unit: "Each",
    coverageRule: {
      description: "1 per vent penetration",
      calculation: "Count of 4\" vent penetrations",
    }
  },
  {
    id: "gooseneck-10inch",
    name: "Gooseneck 10\"",
    category: MaterialCategory.VENTILATION,
    price: 53.33,
    unit: "Each",
    coverageRule: {
      description: "1 per vent penetration",
      calculation: "Count of 10\" vent penetrations",
    }
  },
  {
    id: "lead-boot-1-5inch",
    name: "Lead Boot 1.5\"",
    category: MaterialCategory.VENTILATION,
    price: 17.22,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 1.5\" pipe penetrations",
    }
  },
  {
    id: "lead-boot-2inch",
    name: "Lead Boot 2\"",
    category: MaterialCategory.VENTILATION,
    price: 18.33,
    unit: "Each",
    coverageRule: {
      description: "1 per pipe penetration",
      calculation: "Count of 2\" pipe penetrations",
    }
  },
  {
    id: "lead-boot-3inch",
    name: "Lead Boot 3\"",
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
];
