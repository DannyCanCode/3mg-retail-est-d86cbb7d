// Test script for the parse-eagleview-pdf function
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase URL and anon key
const supabaseUrl = 'https://zdgicsuqfohnufowksgq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2ljc3VxZm9obnVmb3drc2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NTk2MzcsImV4cCI6MjA1NjMzNTYzN30.Zg7a-BeP6O1lkNQ2oE9EUEY32cUcbiCkD2RZ_mdsxdg';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Default PDF path if none provided
const DEFAULT_PDF_PATH = '/Users/danielpedraza/Downloads/EAGLEVIEW-DAISYmartinez.pdf';

// Get PDF path from command line arguments or use default
const pdfPath = process.argv[2] || DEFAULT_PDF_PATH;

// Check if debug mode is enabled
const DEBUG_MODE = process.argv.includes('--debug');

// Function to read PDF file and convert to base64
function readPdfFile(filePath) {
  console.log(`Reading PDF file: ${filePath}`);
  try {
    const pdfBuffer = fs.readFileSync(filePath);
    console.log(`PDF file size: ${pdfBuffer.length} bytes`);
    
    // Convert to base64
    const pdfBase64 = pdfBuffer.toString('base64');
    console.log(`Base64 length: ${pdfBase64.length} characters`);
    
    // Check if it's a valid PDF (simple check for PDF signature)
    const hasPdfSignature = pdfBase64.startsWith('JVBERi0');
    console.log(`Has PDF signature: ${hasPdfSignature}`);
    
    if (!hasPdfSignature) {
      console.error('Warning: The file does not appear to be a valid PDF.');
    }
    
    return pdfBase64;
  } catch (error) {
    console.error(`Error reading PDF file: ${error.message}`);
    process.exit(1);
  }
}

// Function to call the parse-eagleview-pdf function
async function callParseFunction(pdfBase64) {
  console.log('Calling parse-eagleview-pdf function...');
  
  // Create a unique request ID and timestamp
  const timestamp = Date.now();
  const requestId = Math.random().toString(36).substring(2, 12);
  
  // Create the request payload
  const payload = {
    fileName: path.basename(pdfPath),
    pdfBase64: pdfBase64,
    timestamp: timestamp,
    requestId: requestId,
    processingMode: 'regular',
    modelType: 'gpt-4o'
  };
  
  if (DEBUG_MODE) {
    console.log('Request payload:', {
      fileName: payload.fileName,
      timestamp: payload.timestamp,
      requestId: payload.requestId,
      processingMode: payload.processingMode,
      modelType: payload.modelType,
      pdfBase64Length: payload.pdfBase64.length
    });
  } else {
    console.log('Request payload:', {
      fileName: payload.fileName,
      timestamp: payload.timestamp,
      requestId: payload.requestId,
      processingMode: payload.processingMode,
      modelType: payload.modelType,
      pdfBase64Length: payload.pdfBase64.length
    });
  }
  
  try {
    // Call the function using Supabase client
    const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
      body: payload
    });
    
    if (error) {
      console.error('Error calling function:', error);
      return;
    }
    
    console.log('Function response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.measurements) {
      console.log('Successfully received measurements!');
      
      // Check if these are real or simulated measurements
      if (data.success === false) {
        console.log('\nWARNING: The function returned SIMULATED values, not actual extracted data.');
        console.log('This means the PDF text extraction or analysis process failed.');
        
        if (data.error) {
          console.log(`Error from API: ${data.error}`);
        }
      } else if (data.success === true) {
        console.log('\nSUCCESS: The function returned estimated measurements based on typical EagleView reports.');
        console.log('Note: ' + data.note);
        
        if (data.openAiResponse) {
          console.log('\nRaw OpenAI Response:');
          console.log(data.openAiResponse);
          
          try {
            // Try to parse the OpenAI response as JSON
            const openAiMeasurements = JSON.parse(data.openAiResponse);
            console.log('\nParsed OpenAI Measurements:');
            console.log(JSON.stringify(openAiMeasurements, null, 2));
          } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError.message);
          }
        }
      }
    } else {
      console.error('Error: No measurements returned from the function.');
      if (data.error) {
        console.error(`Error details: ${data.error}`);
      }
    }
    
  } catch (error) {
    console.error(`Error calling function: ${error}`);
  }
}

// Main execution
const pdfBase64 = readPdfFile(pdfPath);
callParseFunction(pdfBase64); 