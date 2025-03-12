// Test script for the parse-eagleview-pdf function with URL-based approach
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://wycitvqqomdpbwpqsgpb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5Y2l0dnFxb21kcGJ3cHFzZ3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI0NzU1NzYsImV4cCI6MjAzODA1MTU3Nn0.Yd-Yk-Yx-Yx-Yd-Yx-Yx-Yd-Yx-Yx-Yd-Yx-Yx'; // Replace with your actual key
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to upload a PDF file to Supabase Storage
async function uploadPdfToStorage(filePath) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Generate a unique file path
    const uniqueId = crypto.randomUUID();
    const storagePath = `pdf-uploads/${uniqueId}-${fileName}`;
    
    console.log(`Uploading ${fileName} to Supabase Storage...`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('eagleview-pdfs')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (error) {
      console.error("Error uploading PDF to storage:", error);
      throw error;
    }
    
    console.log(`File uploaded successfully to ${storagePath}`);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('eagleview-pdfs')
      .getPublicUrl(storagePath);
    
    console.log(`Public URL: ${urlData.publicUrl}`);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error("Failed to upload PDF to storage:", error);
    throw error;
  }
}

// Function to call the parse-eagleview-pdf function
async function callParseFunction(pdfUrl, fileName) {
  try {
    console.log('Calling parse-eagleview-pdf function...');
    
    const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
      body: { 
        pdfUrl,
        fileName
      }
    });
    
    if (error) {
      console.error("Error calling function:", error);
      return null;
    }
    
    console.log('Function response:', data);
    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

// Main function
async function main() {
  try {
    // Check if a file path was provided
    const filePath = process.argv[2];
    if (!filePath) {
      console.error('Please provide a path to a PDF file');
      process.exit(1);
    }
    
    // Upload the PDF to Supabase Storage
    const pdfUrl = await uploadPdfToStorage(filePath);
    
    // Call the parse-eagleview-pdf function
    const fileName = filePath.split('/').pop();
    const result = await callParseFunction(pdfUrl, fileName);
    
    if (result) {
      console.log('Measurements:', result.measurements);
      console.log('Processing time:', result.processingTime, 'seconds');
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the main function
main(); 