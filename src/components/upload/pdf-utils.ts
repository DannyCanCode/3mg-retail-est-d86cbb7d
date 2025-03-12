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
