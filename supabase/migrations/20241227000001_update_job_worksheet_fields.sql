-- Update job_worksheet JSONB column to support all fields from the paper form

-- First, let's add a check constraint to ensure job_worksheet has proper structure
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS job_worksheet_structure;

-- Add comment to describe the expected structure
COMMENT ON COLUMN estimates.job_worksheet IS 'JSON structure for job worksheet data:
{
  "basic_info": {
    "name": string,
    "job_type": "insurance" | "retail",
    "price_match": boolean,
    "address": string,
    "leak": boolean
  },
  "property_access": {
    "hoa": boolean,
    "gate": boolean,
    "gate_code": string,
    "gate_guard": boolean,
    "pool": boolean,
    "driveway": "concrete" | "pavers",
    "rr_secondary_structure": boolean,
    "dumpster_notes": string
  },
  "shingle_roof": {
    "manufacturer": string,
    "type": string,
    "color": string,
    "drip": string,
    "warranty_3mg": "10_year" | "25_year_uhdz",
    "warranty_gaf": "silver" | "gold",
    "underlayment": "synthetic" | "peel_stick",
    "decking": "plywood" | "plank",
    "flat_roof_sq": number,
    "pitch_gauge": string,
    "iso_needed": boolean
  },
  "ventilation": {
    "goosenecks": {
      "4_inch": number,
      "6_inch": number,
      "10_inch": number,
      "12_inch": number,
      "color": string
    },
    "boots": {
      "1_5_inch": number,
      "2_inch": number,
      "3_inch": number,
      "4_inch": number,
      "color": string
    },
    "ridge_vents_lf": number,
    "off_ridge_vents": {
      "2_ft": number,
      "4_ft": number,
      "6_ft": number,
      "8_ft": number
    }
  },
  "accessories": {
    "skylight": {
      "count_2x2": number,
      "count_2x4": number,
      "dome": number,
      "other": string
    }
  },
  "gutters": {
    "existing_gutters": boolean,
    "keep_or_new": "keep" | "new",
    "photos": boolean,
    "gutter_size": "6_inch" | "7_inch",
    "gutter_color": string,
    "gutter_lf": number,
    "downspouts": {
      "color": string,
      "count_1st_story": number,
      "count_2nd_story": number
    },
    "gutter_screens": boolean,
    "gutter_screens_lf": number,
    "splash_guard": boolean,
    "splash_guard_count": number,
    "splash_guard_color": string,
    "gutter_diagram_uploaded": boolean
  },
  "solar": {
    "existing": boolean,
    "keep": boolean,
    "sold_by_3mg": boolean,
    "removal": "3mg" | "homeowner",
    "electric_count": number,
    "pool_count": number,
    "hot_water_count": number,
    "inverter_type": "string_inverter" | "microinverter" | "unknown",
    "third_party_company_info": string
  },
  "additional_notes": {
    "gutter_solar_notes": string
  }
}';

-- Add flat_roof_total_sq column to store calculated flat roof square footage
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS flat_roof_total_sq NUMERIC(10,2);

-- Add pitch_gauge column to store predominant pitch
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS pitch_gauge VARCHAR(10);

-- Update the job_worksheet_templates table to include example data
INSERT INTO job_worksheet_templates (name, template_data, created_by, created_at)
VALUES (
  'Standard Shingle Job Worksheet',
  '{
    "basic_info": {
      "name": "",
      "job_type": "",
      "price_match": false,
      "address": "",
      "leak": false
    },
    "property_access": {
      "hoa": false,
      "gate": false,
      "gate_code": "",
      "gate_guard": false,
      "pool": false,
      "driveway": "",
      "rr_secondary_structure": false,
      "dumpster_notes": ""
    },
    "shingle_roof": {
      "manufacturer": "",
      "type": "",
      "color": "",
      "drip": "",
      "warranty_3mg": "",
      "warranty_gaf": "",
      "underlayment": "",
      "decking": "",
      "flat_roof_sq": 0,
      "pitch_gauge": "",
      "iso_needed": false
    },
    "ventilation": {
      "goosenecks": {
        "4_inch": 0,
        "6_inch": 0,
        "10_inch": 0,
        "12_inch": 0,
        "color": ""
      },
      "boots": {
        "1_5_inch": 0,
        "2_inch": 0,
        "3_inch": 0,
        "4_inch": 0,
        "color": ""
      },
      "ridge_vents_lf": 0,
      "off_ridge_vents": {
        "2_ft": 0,
        "4_ft": 0,
        "6_ft": 0,
        "8_ft": 0
      }
    },
    "accessories": {
      "skylight": {
        "count_2x2": 0,
        "count_2x4": 0,
        "dome": 0,
        "other": ""
      }
    },
    "gutters": {
      "existing_gutters": false,
      "keep_or_new": "",
      "photos": false,
      "gutter_size": "",
      "gutter_color": "",
      "gutter_lf": 0,
      "downspouts": {
        "color": "",
        "count_1st_story": 0,
        "count_2nd_story": 0
      },
      "gutter_screens": false,
      "gutter_screens_lf": 0,
      "splash_guard": false,
      "splash_guard_count": 0,
      "splash_guard_color": "",
      "gutter_diagram_uploaded": false
    },
    "solar": {
      "existing": false,
      "keep": false,
      "sold_by_3mg": false,
      "removal": "",
      "electric_count": 0,
      "pool_count": 0,
      "hot_water_count": 0,
      "inverter_type": "",
      "third_party_company_info": ""
    },
    "additional_notes": {
      "gutter_solar_notes": ""
    }
  }'::jsonb,
  (SELECT id FROM profiles WHERE email = 'admin@3mgroofing.com' LIMIT 1),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Create a function to calculate flat roof total from parsed measurements
CREATE OR REPLACE FUNCTION calculate_flat_roof_total(measurements jsonb)
RETURNS numeric AS $$
DECLARE
  total_sq numeric := 0;
  section jsonb;
BEGIN
  -- Check if measurements exist and have roofSections
  IF measurements IS NOT NULL AND measurements ? 'roofSections' THEN
    -- Loop through each roof section
    FOR section IN SELECT * FROM jsonb_array_elements(measurements->'roofSections')
    LOOP
      -- Check if pitch exists and is 0/12, 1/12, or 2/12
      IF section->>'pitch' IN ('0/12', '1/12', '2/12') THEN
        -- Add the area to total (convert to numeric)
        total_sq := total_sq + COALESCE((section->>'area')::numeric, 0);
      END IF;
    END LOOP;
  END IF;
  
  -- Convert square feet to squares (divide by 100)
  RETURN ROUND(total_sq / 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Create a function to get predominant pitch from parsed measurements
CREATE OR REPLACE FUNCTION get_predominant_pitch(measurements jsonb)
RETURNS text AS $$
DECLARE
  pitch_areas jsonb := '{}';
  section jsonb;
  pitch text;
  area numeric;
  max_pitch text := '';
  max_area numeric := 0;
BEGIN
  -- Check if measurements exist and have roofSections
  IF measurements IS NOT NULL AND measurements ? 'roofSections' THEN
    -- Loop through each roof section to sum areas by pitch
    FOR section IN SELECT * FROM jsonb_array_elements(measurements->'roofSections')
    LOOP
      pitch := section->>'pitch';
      area := COALESCE((section->>'area')::numeric, 0);
      
      IF pitch IS NOT NULL THEN
        -- Add to existing pitch area or create new entry
        IF pitch_areas ? pitch THEN
          pitch_areas := jsonb_set(pitch_areas, ARRAY[pitch], 
            to_jsonb((pitch_areas->>pitch)::numeric + area));
        ELSE
          pitch_areas := jsonb_set(pitch_areas, ARRAY[pitch], to_jsonb(area));
        END IF;
      END IF;
    END LOOP;
    
    -- Find the pitch with the largest total area
    FOR pitch IN SELECT * FROM jsonb_object_keys(pitch_areas)
    LOOP
      area := (pitch_areas->>pitch)::numeric;
      IF area > max_area THEN
        max_area := area;
        max_pitch := pitch;
      END IF;
    END LOOP;
  END IF;
  
  RETURN max_pitch;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to auto-calculate flat roof total and pitch gauge when measurements are updated
CREATE OR REPLACE FUNCTION update_roof_calculations()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate flat roof total
  NEW.flat_roof_total_sq := calculate_flat_roof_total(NEW.measurements);
  
  -- Get predominant pitch
  NEW.pitch_gauge := get_predominant_pitch(NEW.measurements);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_roof_calculations_trigger ON estimates;
CREATE TRIGGER update_roof_calculations_trigger
  BEFORE INSERT OR UPDATE OF measurements ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_roof_calculations();

-- Update existing estimates to calculate flat roof totals and pitch gauge
UPDATE estimates 
SET 
  flat_roof_total_sq = calculate_flat_roof_total(measurements),
  pitch_gauge = get_predominant_pitch(measurements)
WHERE measurements IS NOT NULL; 