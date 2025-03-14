// Helper function to format measurements for display
export const renderMeasurementValue = (key: string, value: any): string => {
  if (value === undefined || value === null) {
    return 'N/A';
  }
  
  // Check if value is an object (for the ParsedMeasurements case)
  if (typeof value === 'object' && key.endsWith('Length')) {
    // For length measurements, show both length and count if available
    const lengthValue = value[key];
    const countKey = key.replace('Length', 'Count');
    const countValue = value[countKey];
    
    if (lengthValue !== undefined && countValue !== undefined) {
      const itemName = key.replace('Length', '').replace(/([A-Z])/g, ' $1').trim();
      return `${lengthValue} ft (${countValue} ${itemName}s)`;
    }
    
    return lengthValue ? `${lengthValue} ft` : 'N/A';
  }
  
  // Skip count properties as they're handled with their length counterparts
  if (key.endsWith('Count')) {
    return `${value}`;
  }
  
  // Add units based on the type of measurement
  if (key === 'totalArea' || key === 'penetrationsArea') {
    return `${value} sq ft`;
  } else if (key.includes('Length') || key === 'penetrationsPerimeter' || key === 'dripEdgeLength' || key === 'parapetWallLength') {
    return `${value} ft`;
  } else if (key === 'roofPitch' || key === 'predominantPitch') {
    return value.toString();
  } else {
    return value.toString();
  }
};

// Function to validate if a file is a PDF and has the correct format
export const validatePdfFile = (file: File): boolean => {
  // Check MIME type
  if (!file.type.includes('pdf')) {
    console.error('Invalid file type:', file.type);
    return false;
  }
  
  // Check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'pdf') {
    console.error('Invalid file extension:', fileExtension);
    return false;
  }
  
  return true;
};

// Load PDF.js dynamically
export const loadPdfJs = async (): Promise<any> => {
  // Check if PDF.js is already loaded
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  // Load PDF.js from CDN
  const pdfjsScript = document.createElement('script');
  pdfjsScript.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  document.head.appendChild(pdfjsScript);

  // Wait for PDF.js to load
  return new Promise((resolve, reject) => {
    pdfjsScript.onload = () => {
      // Set workerSrc
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    pdfjsScript.onerror = reject;
  });
};

// Process PDF in browser
export const processPdfInBrowser = async (file: File): Promise<{ text: string, pageCount: number }> => {
  try {
    // Load PDF.js
    const pdfjsLib = await loadPdfJs();
    
    // Read the file
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    console.log(`PDF document loaded. Number of pages: ${pdfDocument.numPages}`);
    
    // Extract text from all pages
    let extractedText = '';
    const maxPages = Math.min(pdfDocument.numPages, 20); // Limit to first 20 pages
    
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      console.log(`Processing page ${pageNumber}...`);
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      extractedText += pageText + '\n';
    }
    
    console.log(`Text extraction complete. Extracted ${extractedText.length} characters.`);
    
    return {
      text: extractedText,
      pageCount: pdfDocument.numPages
    };
  } catch (error) {
    console.error('Error processing PDF in browser:', error);
    throw error;
  }
};

// Extract measurements from text
export const extractMeasurementsFromText = (text: string) => {
  console.log("Extracting measurements from text...");
  
  // Initialize measurements object with default values
  const measurements: any = {
    totalArea: 0,
    predominantPitch: "",
    ridgeLength: 0,
    hipLength: 0,
    valleyLength: 0,
    rakeLength: 0,
    eaveLength: 0,
    ridgeCount: 0,
    hipCount: 0,
    valleyCount: 0,
    rakeCount: 0,
    eaveCount: 0,
    stepFlashingLength: 0,
    stepFlashingCount: 0,
    chimneyCount: 0,
    skylightCount: 0,
    turbineVentCount: 0,
    pipeVentCount: 0,
    penetrationsArea: 0,
    penetrationsPerimeter: 0,
    areasByPitch: {}
  };

  // Extract total area
  const totalAreaMatch = text.match(/Total Area:\s*([\d,]+)\s*sq\s*ft/i) || 
                         text.match(/Total\s*Area\s*=\s*([\d,]+)/i);
  if (totalAreaMatch) {
    measurements.totalArea = parseFloat(totalAreaMatch[1].replace(/,/g, ''));
    console.log("Found total area:", measurements.totalArea);
  }

  // Extract predominant pitch
  const pitchMatch = text.match(/Predominant Pitch:\s*([\d/:.]+)/i) ||
                     text.match(/Primary Pitch:\s*([\d/:.]+)/i);
  if (pitchMatch) {
    measurements.predominantPitch = pitchMatch[1];
    console.log("Found predominant pitch:", measurements.predominantPitch);
  }

  // Extract ridge length
  const ridgeMatch = text.match(/Ridge Length:\s*([\d,]+)\s*ft/i) ||
                     text.match(/Total Ridge:\s*([\d,]+)/i);
  if (ridgeMatch) {
    measurements.ridgeLength = parseFloat(ridgeMatch[1].replace(/,/g, ''));
    console.log("Found ridge length:", measurements.ridgeLength);
  }

  // Extract hip length
  const hipMatch = text.match(/Hip Length:\s*([\d,]+)\s*ft/i) ||
                   text.match(/Total Hip:\s*([\d,]+)/i);
  if (hipMatch) {
    measurements.hipLength = parseFloat(hipMatch[1].replace(/,/g, ''));
    console.log("Found hip length:", measurements.hipLength);
  }

  // Extract valley length
  const valleyMatch = text.match(/Valley Length:\s*([\d,]+)\s*ft/i) ||
                      text.match(/Total Valley:\s*([\d,]+)/i);
  if (valleyMatch) {
    measurements.valleyLength = parseFloat(valleyMatch[1].replace(/,/g, ''));
    console.log("Found valley length:", measurements.valleyLength);
  }

  // Extract rake length
  const rakeMatch = text.match(/Rake Length:\s*([\d,]+)\s*ft/i) ||
                    text.match(/Total Rake:\s*([\d,]+)/i);
  if (rakeMatch) {
    measurements.rakeLength = parseFloat(rakeMatch[1].replace(/,/g, ''));
    console.log("Found rake length:", measurements.rakeLength);
  }

  // Extract eave length
  const eaveMatch = text.match(/Eave Length:\s*([\d,]+)\s*ft/i) ||
                    text.match(/Total Eave:\s*([\d,]+)/i);
  if (eaveMatch) {
    measurements.eaveLength = parseFloat(eaveMatch[1].replace(/,/g, ''));
    console.log("Found eave length:", measurements.eaveLength);
  }

  // Count penetrations
  const skylightMatch = text.match(/Skylight[s]?:?\s*(\d+)/i);
  if (skylightMatch) {
    measurements.skylightCount = parseInt(skylightMatch[1]);
    console.log("Found skylights:", measurements.skylightCount);
  }

  const chimneyMatch = text.match(/Chimney[s]?:?\s*(\d+)/i);
  if (chimneyMatch) {
    measurements.chimneyCount = parseInt(chimneyMatch[1]);
    console.log("Found chimneys:", measurements.chimneyCount);
  }

  const pipeVentMatch = text.match(/Pipe Vent[s]?:?\s*(\d+)/i);
  if (pipeVentMatch) {
    measurements.pipeVentCount = parseInt(pipeVentMatch[1]);
    console.log("Found pipe vents:", measurements.pipeVentCount);
  }

  // Extract areas by pitch
  const pitchAreaMatches = text.matchAll(/(\d+(?:\/\d+)?(?::\d+)?)\s*pitch\s*(?:area|=)\s*([\d,]+)\s*(?:sq\s*ft)?/gi);
  for (const match of pitchAreaMatches) {
    const pitch = match[1];
    const area = parseFloat(match[2].replace(/,/g, ''));
    measurements.areasByPitch[pitch] = area;
    console.log(`Found area for pitch ${pitch}: ${area}`);
  }

  // If we couldn't extract some values, use reasonable defaults based on what we know
  if (measurements.totalArea > 0) {
    // Estimate counts based on total area if not found
    if (measurements.ridgeCount === 0) {
      measurements.ridgeCount = Math.ceil(measurements.totalArea / 1000);
    }
    if (measurements.hipCount === 0 && measurements.hipLength > 0) {
      measurements.hipCount = Math.ceil(measurements.hipLength / 20);
    }
    if (measurements.valleyCount === 0 && measurements.valleyLength > 0) {
      measurements.valleyCount = Math.ceil(measurements.valleyLength / 20);
    }
    if (measurements.rakeCount === 0 && measurements.rakeLength > 0) {
      measurements.rakeCount = Math.ceil(measurements.rakeLength / 25);
    }
    if (measurements.eaveCount === 0 && measurements.eaveLength > 0) {
      measurements.eaveCount = Math.ceil(measurements.eaveLength / 25);
    }
    
    // Estimate penetrations area if not found
    if (measurements.penetrationsArea === 0) {
      const totalPenetrations = measurements.skylightCount + measurements.chimneyCount + measurements.pipeVentCount;
      measurements.penetrationsArea = totalPenetrations * 15; // Rough estimate: 15 sq ft per penetration
      measurements.penetrationsPerimeter = totalPenetrations * 10; // Rough estimate: 10 ft perimeter per penetration
    }
  }

  console.log("Extracted measurements:", measurements);
  return measurements;
};

// Add PDF.js type declarations
declare global {
  interface Window {
    pdfjsLib: any;
  }
}
