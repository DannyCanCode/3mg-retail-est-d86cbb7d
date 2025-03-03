
// Function to convert a file to base64
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64String = reader.result.split(',')[1];
        
        // Validate that we have a proper base64 string
        if (!base64String || base64String.trim().length === 0) {
          reject(new Error('Failed to convert file to valid base64'));
          return;
        }
        
        // Additional validation that it's a PDF - check for PDF header in base64
        // PDF signature %PDF- in base64 usually starts with "JVBERi0"
        if (!base64String.startsWith('JVBERi0')) {
          console.warn('Warning: Base64 string doesn\'t start with PDF signature');
          // Continue anyway as some PDFs might be valid but have different headers
        }
        
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
};

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
