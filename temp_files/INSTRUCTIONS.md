# EagleView PDF Processing Instructions

This document provides instructions for using the PDF-to-images functionality to process EagleView PDF reports in the 3MG Retail Estimator application.

## Overview

The application now supports two methods for processing EagleView PDF reports:

1. **Direct PDF Processing**: Sends the entire PDF as base64 to the Supabase function (original method).
2. **PDF-to-Images Processing**: Converts specific pages (1, 9, and 10) of the PDF to images and sends only those images to the Supabase function (new method).

The PDF-to-Images method is recommended for better accuracy and reliability, as it allows the OpenAI Vision API to analyze the visual content of the PDF pages directly.

## How to Use

1. Navigate to the "Upload EagleView PDF" section in the application.
2. You'll see a toggle switch labeled "Use PDF-to-Images for EagleView PDFs" at the top of the upload area.
3. Make sure this toggle is enabled (it's enabled by default).
4. Upload your EagleView PDF report using the drag-and-drop area or the "Browse Files" button.
5. The application will automatically:
   - Detect that it's an EagleView PDF
   - Convert pages 1, 9, and 10 to images
   - Send these images to the Supabase function for analysis
   - Display the extracted measurements

## Troubleshooting

If you encounter issues with the PDF-to-Images method:

1. **Toggle Off the Feature**: You can disable the PDF-to-Images feature by turning off the toggle switch. This will revert to the original method of sending the entire PDF.

2. **Check Console Logs**: Open your browser's developer tools (F12 or right-click > Inspect) and check the console for any error messages.

3. **File Size Issues**: If your PDF is very large, try using a compressed version or a PDF with fewer pages.

4. **PDF Format Issues**: Ensure your PDF is not encrypted or password-protected.

## Technical Details

The PDF-to-Images functionality works as follows:

1. The PDF is loaded in the browser using PDF.js.
2. Pages 1, 9, and 10 (which typically contain the key measurements in EagleView reports) are rendered to canvas elements.
3. These canvas elements are converted to base64-encoded PNG images.
4. The images are sent to the Supabase Edge Function `parse-eagleview-pdf`.
5. The function uses OpenAI's Vision API to analyze the images and extract measurements.
6. The extracted measurements are returned to the frontend and displayed to the user.

This approach provides better results than sending the entire PDF because:
- It focuses only on the pages that contain the relevant information
- It allows the Vision API to "see" the visual content of the PDF
- It reduces the amount of data sent to the API, improving performance

## Supported Measurements

The system extracts the following measurements from EagleView reports:

- Total Area (in square feet)
- Predominant Pitch (e.g., "5:12")
- Ridge Length (in feet)
- Hip Length (in feet)
- Valley Length (in feet)
- Rake Length (in feet)
- Eave Length (in feet)
- Ridge Count
- Hip Count
- Valley Count
- Rake Count
- Eave Count
- Step Flashing Length (in feet)
- Step Flashing Count
- Chimney Count
- Skylight Count
- Turbine Vent Count
- Pipe Vent Count
- Penetrations Area (in square feet)
- Penetrations Perimeter (in feet) 