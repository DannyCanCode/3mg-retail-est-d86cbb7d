
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

// Display measurement values in a readable format
export const renderMeasurementValue = (key: string, value: any) => {
  if (typeof value === 'undefined' || value === null) return 'N/A';
  
  if (key.toLowerCase().includes('length')) {
    return `${value} ft`;
  } else if (key === 'totalArea') {
    return `${value} sq ft`;
  } else if (key.toLowerCase().includes('count')) {
    return value;
  } else if (key === 'roofPitch') {
    return value;
  }
  
  return value;
};
