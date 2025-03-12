// Test script for PDF to images conversion
// This script demonstrates how to use the PDF-to-images conversion in a Node.js environment
// Note: This is for testing purposes only. In production, use the browser-based approach.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';
import { createClient } from '@supabase/supabase-js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use PDF.js for Node.js environments
// Set the PDFJS_DISABLE_WORKER environment variable to disable worker
process.env.PDFJS_DISABLE_WORKER = true;
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

console.log('Using PDF.js with disabled worker for Node.js environment');

// Supabase configuration
const supabaseUrl = 'https://zdgicsuqfohnufowksgq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2ljc3VxZm9obnVmb3drc2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NTk2MzcsImV4cCI6MjA1NjMzNTYzN30.Zg7a-BeP6O1lkNQ2oE9EUEY32cUcbiCkD2RZ_mdsxdg';
const supabase = createClient(supabaseUrl, supabaseKey);

// Default PDF path if none provided
const DEFAULT_PDF_PATH = '/Users/danielpedraza/3MG-AZURE-RETAIL ESTIMATOR/test_pdfs/Eagleview-daisy.pdf';

// Get PDF path from command line arguments or use default
const pdfPath = process.argv[2] || DEFAULT_PDF_PATH;

/**
 * Convert a PDF page to an image in Node.js environment
 * @param {Object} pdf - The PDF document
 * @param {number} pageNumber - The page number to convert (1-based)
 * @param {number} scale - The scale to render at
 * @returns {Promise<string>} - Promise resolving to base64-encoded image
 */
async function convertPdfPageToImage(pdf, pageNumber, scale = 2.0) {
  try {
    console.log(`Converting page ${pageNumber} to image...`);
    
    // Get the page
    const page = await pdf.getPage(pageNumber);
    
    // Set the scale for rendering
    const viewport = page.getViewport({ scale });
    
    // Create a canvas using node-canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // Set up the canvas for rendering
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    // Render the page to the canvas
    await page.render(renderContext).promise;
    
    // Convert the canvas to a base64-encoded image
    const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
    
    console.log(`Page ${pageNumber} converted to image (${imageBase64.length} bytes)`);
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
    console.log(`Reading PDF file: ${pdfPath}`);
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
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
    console.log(`Processing EagleView PDF: ${pdfPath}`);
    
    // Convert pages 1, 9, and 10 to images
    const imageBase64Array = await convertPdfPagesToImages(pdfPath, [1, 9, 10]);
    
    // Create a unique request ID and timestamp
    const timestamp = Date.now();
    const requestId = Math.random().toString(36).substring(2, 12);
    
    // Create the request payload
    const payload = {
      fileName: path.basename(pdfPath),
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
    
    console.log('Function response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.measurements) {
      console.log('Successfully received measurements!');
      
      if (data.success === false) {
        console.log('\nWARNING: The function returned SIMULATED values, not actual extracted data.');
        console.log('This means the image analysis process failed.');
        
        if (data.error) {
          console.log(`Error from API: ${data.error}`);
        }
      } else if (data.success === true) {
        console.log('\nSUCCESS: The function returned measurements extracted from the images.');
        console.log('Note: ' + data.note);
      }
    } else {
      console.error('Error: No measurements returned from the function.');
      if (data.error) {
        console.error(`Error details: ${data.error}`);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error processing EagleView PDF:', error);
    throw error;
  }
}

// Main execution
processEagleViewPdf(pdfPath).catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 