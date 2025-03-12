// Simple test script for the EagleView PDF processing API
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zdgicsuqfohnufowksgq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2ljc3VxZm9obnVmb3drc2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NTk2MzcsImV4cCI6MjA1NjMzNTYzN30.Zg7a-BeP6O1lkNQ2oE9EUEY32cUcbiCkD2RZ_mdsxdg';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test function to call the Supabase function with a sample payload
async function testEagleViewApi() {
  try {
    console.log('Testing EagleView PDF processing API...');
    
    // Create a sample payload with simulated image data
    // In a real scenario, these would be base64-encoded images from the PDF
    const samplePayload = {
      fileName: 'test-eagleview.pdf',
      imageBase64Array: [
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Tiny 1x1 pixel PNG
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      ],
      timestamp: Date.now(),
      requestId: Math.random().toString(36).substring(2, 12),
      processingMode: 'regular',
      modelType: 'gpt-4o'
    };
    
    console.log('Sending request to Supabase function...');
    console.log('Request payload:', {
      fileName: samplePayload.fileName,
      timestamp: samplePayload.timestamp,
      requestId: samplePayload.requestId,
      processingMode: samplePayload.processingMode,
      modelType: samplePayload.modelType,
      imageCount: samplePayload.imageBase64Array.length
    });
    
    // Call the Supabase function
    const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
      body: samplePayload
    });
    
    if (error) {
      console.error('Error calling function:', error);
      throw error;
    }
    
    console.log('Function response received:', data);
    
    // Display the results
    console.log('\n--- RESULTS ---');
    console.log('Success:', data.success);
    console.log('Note:', data.note);
    
    if (data.error) {
      console.log('Error:', data.error);
    }
    
    console.log('\nMeasurements:');
    console.log(JSON.stringify(data.measurements, null, 2));
    
    console.log('\nTest completed successfully!');
    return data;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Run the test
testEagleViewApi().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 