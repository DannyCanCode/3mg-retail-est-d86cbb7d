# Supabase Setup for 3MG Retail Estimator

This document provides instructions for setting up and using the Supabase backend for the 3MG Retail Estimator application.

## Project Configuration

- **Supabase Project URL**: `https://wycitvqqomdpbwpqsgpb.supabase.co`
- **Supabase API Key**: Your API key (keep this secure)

## Database Schema

The database includes the following tables:

1. **measurements** - Stores measurements extracted from EagleView PDFs
2. **pricing** - Stores pricing information for materials
3. **estimates** - Stores estimate header information
4. **estimate_items** - Stores line items for each estimate

## Upcoming Database Extensions

To support new features, we'll need to extend the database schema:

1. **packages** - To store GAF package definitions (GAF 1 and GAF 2)
2. **warranties** - To store warranty options (Silver Pledge and Gold Pledge)
3. **package_materials** - To define which materials are included in each package
4. **warranty_requirements** - To define material requirements for each warranty type

### Example Schema for New Tables

```sql
CREATE TABLE packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE warranties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  package_id INTEGER REFERENCES packages(id),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE package_materials (
  package_id INTEGER REFERENCES packages(id),
  material_id TEXT REFERENCES materials(id),
  is_required BOOLEAN DEFAULT false,
  PRIMARY KEY (package_id, material_id)
);

CREATE TABLE warranty_requirements (
  warranty_id INTEGER REFERENCES warranties(id),
  material_id TEXT REFERENCES materials(id),
  PRIMARY KEY (warranty_id, material_id)
);
```

## Edge Functions

### parse-eagleview-pdf

This Edge Function processes EagleView PDF reports to extract measurements.

#### How It Works

1. The frontend uploads a PDF to Supabase Storage in the `eagleview-pdfs` bucket
2. The frontend gets the public URL for the uploaded PDF
3. The frontend calls the `parse-eagleview-pdf` Edge Function with the PDF URL
4. The Edge Function fetches the PDF from the URL
5. The Edge Function extracts text from pages 1, 9, and 10 of the PDF
6. The Edge Function processes the text to extract measurements
7. The Edge Function returns the measurements to the frontend

#### Request Format

```json
{
  "pdfUrl": "https://wycitvqqomdpbwpqsgpb.supabase.co/storage/v1/object/public/eagleview-pdfs/pdf-uploads/123e4567-e89b-12d3-a456-426614174000-example.pdf",
  "fileName": "example.pdf"
}
```

#### Response Format

```json
{
  "measurements": {
    "totalArea": 2500,
    "predominantPitch": "5:12",
    "ridgeLength": 120,
    "hipLength": 80,
    "valleyLength": 60,
    "rakeLength": 100,
    "eaveLength": 140,
    "ridgeCount": 3,
    "hipCount": 4,
    "valleyCount": 2,
    "rakeCount": 4,
    "eaveCount": 5,
    "stepFlashingLength": 50,
    "stepFlashingCount": 10,
    "chimneyCount": 1,
    "skylightCount": 2,
    "turbineVentCount": 1,
    "pipeVentCount": 4,
    "penetrationsArea": 150,
    "penetrationsPerimeter": 100,
    "areasByPitch": {
      "3/12": 5.0,
      "4/12": 19.6,
      "6/12": 2096.8
    }
  },
  "success": true,
  "processingTime": 2.5,
  "fileName": "example.pdf"
}
```

## Planned Edge Functions

### calculate-package-materials

A new Edge Function that will calculate materials based on the selected GAF package and warranty options.

#### Request Format (Planned)

```json
{
  "measurementId": "123e4567-e89b-12d3-a456-426614174000",
  "packageId": 1,
  "warrantyId": 1,
  "includeLowSlopeIso": true
}
```

#### Response Format (Planned)

```json
{
  "materials": [
    {
      "id": "gaf-timberline-hdz",
      "quantity": 75,
      "totalSquares": 25,
      "price": 3139.50
    },
    {
      "id": "gaf-cobra-ridge-vent",
      "quantity": 30,
      "price": 669.30
    }
  ],
  "lowSlopeMaterials": [
    {
      "id": "modified-base-sheet",
      "quantity": 1,
      "price": 65.92
    }
  ],
  "warrantyRequirements": {
    "isMet": true,
    "missingMaterials": []
  },
  "total": 3874.72
}
```

## Storage Buckets

### eagleview-pdfs

This bucket stores the uploaded EagleView PDF reports. The PDFs are stored in the `pdf-uploads` folder with a unique ID prefix.

## Testing

You can test the Edge Function using the provided `test-pdf-url.js` script:

```bash
node test-pdf-url.js path/to/your/eagleview.pdf
```

Make sure to update the Supabase URL and API key in the script before running it.

## Deployment

To deploy the Edge Function:

```bash
supabase functions deploy parse-eagleview-pdf --project-ref wycitvqqomdpbwpqsgpb
```

## Troubleshooting

If you encounter issues with the Edge Function:

1. Check the Supabase Dashboard for function logs
2. Ensure the PDF URL is accessible
3. Verify that the PDF has the expected format and content
4. Check that the Storage bucket has the correct permissions

## Security Considerations

- The Edge Function uses public URLs for PDFs, but these URLs contain a unique ID that makes them difficult to guess
- Consider implementing additional security measures for production use, such as signed URLs with expiration times
- Ensure that sensitive data is not exposed in the PDF URLs or function responses
- For warranty and package related data, ensure proper access controls are in place 