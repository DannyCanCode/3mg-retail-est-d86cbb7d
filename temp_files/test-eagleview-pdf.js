// Test script for EagleView PDF processing
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { createCanvas } from 'canvas';

// Set up the worker source
// For ES modules, we need to use a different approach
pdfjsLib.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/legacy/build/pdf.worker.js';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://zdgicsuqfohnufowksgq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2ljc3VxZm9obnVmb3drc2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NTk2MzcsImV4cCI6MjA1NjMzNTYzN30.Zg7a-BeP6O1lkNQ2oE9EUEY32cUcbiCkD2RZ_mdsxdg';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Convert a PDF page to an image
 * @param {Object} pdf - The PDF document
 * @param {number} pageNumber - The page number to convert (1-based)
 * @param {number} scale - The scale to render at (higher = better quality but larger file)
 * @returns {Promise<string>} - Promise resolving to base64-encoded image
 */
async function convertPdfPageToImage(pdf, pageNumber, scale = 2.0) {
  try {
    // Get the page
    const page = await pdf.getPage(pageNumber);
    
    // Set the scale for rendering
    const viewport = page.getViewport({ scale });
    
    // Create a canvas to render the page
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // Render the page to the canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // Convert the canvas to a base64-encoded image (PNG format)
    const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
    
    console.log(`Converted page ${pageNumber} to image (${imageBase64.length} bytes)`);
    return imageBase64;
  } catch (error) {
    console.error(`Error converting page ${pageNumber} to image:`, error);
    throw error;
  }
}

/**
 * Convert specific pages of a PDF to images
 * @param {string} pdfPath - Path to the PDF file
 * @param {number[]} pageNumbers - Array of page numbers to convert (1-based)
 * @returns {Promise<string[]>} - Promise resolving to array of base64-encoded images
 */
async function convertPdfPagesToImages(pdfPath, pageNumbers = [1, 9, 10]) {
  try {
    console.log(`Converting PDF pages ${pageNumbers.join(', ')} to images...`);
    
    // Read the PDF file
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const numPages = pdf.numPages;
    
    console.log(`PDF loaded successfully. Total pages: ${numPages}`);
    
    // Filter out page numbers that exceed the document length
    const validPageNumbers = pageNumbers.filter(num => num <= numPages);
    
    if (validPageNumbers.length === 0) {
      throw new Error(`No valid pages to convert. PDF has ${numPages} pages.`);
    }
    
    if (validPageNumbers.length < pageNumbers.length) {
      console.warn(`Some requested pages exceed the document length (${numPages} pages).`);
    }
    
    // Convert each page to an image
    const imagePromises = validPageNumbers.map(pageNum => convertPdfPageToImage(pdf, pageNum));
    const images = await Promise.all(imagePromises);
    
    console.log(`Successfully converted ${images.length} pages to images.`);
    return images;
  } catch (error) {
    console.error('Error converting PDF pages to images:', error);
    throw error;
  }
}

/**
 * Process an EagleView PDF report
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<Object>} - Promise resolving to the measurements
 */
async function processEagleViewPdf(pdfPath) {
  try {
    const fileName = path.basename(pdfPath);
    console.log(`Processing EagleView PDF: ${fileName}`);
    
    // Convert pages 1, 9, and 10 to images
    const imageBase64Array = await convertPdfPagesToImages(pdfPath, [1, 9, 10]);
    
    // Create a unique request ID and timestamp
    const timestamp = Date.now();
    const requestId = Math.random().toString(36).substring(2, 12);
    
    // Create the request payload
    const payload = {
      fileName,
      imageBase64Array,
      timestamp,
      requestId,
      processingMode: 'regular',
      modelType: 'gpt-4o'
    };
    
    console.log('Sending images to Supabase function for analysis...');
    console.log('Request payload:', {
      fileName: payload.fileName,
      timestamp: payload.timestamp,
      requestId: payload.requestId,
      processingMode: payload.processingMode,
      modelType: payload.modelType,
      imageCount: payload.imageBase64Array.length
    });
    
    // Call the Supabase function
    const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
      body: payload
    });
    
    if (error) {
      console.error('Error calling function:', error);
      throw error;
    }
    
    console.log('Function response received:', data);
    
    return data;
  } catch (error) {
    console.error('Error processing EagleView PDF:', error);
    throw error;
  }
}

// Main function to run the test
async function main() {
  try {
    // Path to the EagleView PDF file
    const pdfPath = process.argv[2] || '/Users/danielpedraza/Downloads/EAGLEVIEW-DAISYmartinez.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.error(`Error: File not found at ${pdfPath}`);
      console.log('Usage: node test-eagleview-pdf.js [path-to-pdf]');
      process.exit(1);
    }
    
    console.log(`Testing EagleView PDF processing with file: ${pdfPath}`);
    
    // Process the PDF
    const result = await processEagleViewPdf(pdfPath);
    
    // Display the results
    console.log('\n--- RESULTS ---');
    console.log('Success:', result.success);
    console.log('Note:', result.note);
    
    if (result.error) {
      console.log('Error:', result.error);
    }
    
    console.log('\nMeasurements:');
    console.log(JSON.stringify(result.measurements, null, 2));
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
main(); 