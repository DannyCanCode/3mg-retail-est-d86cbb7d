
// Function to convert a file to base64
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
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
