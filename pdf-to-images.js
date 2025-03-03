// PDF to Images Converter for EagleView Reports
// This script converts pages 1, 9, and 10 of an EagleView PDF to images
// and sends them to the Supabase function for analysis

/**
 * IMPORTANT: This is a client-side implementation for use in a browser environment.
 * To use this in your React application:
 * 
 * 1. Install the required dependencies:
 *    npm install pdfjs-dist @supabase/supabase-js
 * 
 * 2. Import this file in your React component:
 *    import { processEagleViewPdf } from './pdf-to-images';
 * 
 * 3. Call the processEagleViewPdf function with a PDF file:
 *    const result = await processEagleViewPdf(file, file.name);
 * 
 * 4. Use the returned measurements in your UI
 */

// Import the required dependencies
// Note: In your React app, you would import these at the component level
import { createClient } from '@supabase/supabase-js';
import * as pdfjs from 'pdfjs-dist';

// Set the PDF.js worker source
// In your React app, you should add this in your main entry file (e.g., index.js or App.js)
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// Supabase configuration
// In a production app, you should use environment variables for these values
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
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
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
 * @param {File|Blob|ArrayBuffer} pdfFile - The PDF file to convert
 * @param {number[]} pageNumbers - Array of page numbers to convert (1-based)
 * @returns {Promise<string[]>} - Promise resolving to array of base64-encoded images
 */
export async function convertPdfPagesToImages(pdfFile, pageNumbers = [1, 9, 10]) {
  try {
    console.log(`Converting PDF pages ${pageNumbers.join(', ')} to images...`);
    
    // Convert File/Blob to ArrayBuffer if needed
    let arrayBuffer;
    if (pdfFile instanceof File || pdfFile instanceof Blob) {
      arrayBuffer = await pdfFile.arrayBuffer();
    } else if (pdfFile instanceof ArrayBuffer) {
      arrayBuffer = pdfFile;
    } else {
      throw new Error('Invalid PDF file format. Expected File, Blob, or ArrayBuffer.');
    }
    
    // Load the PDF document
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
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
 * @param {File|Blob|ArrayBuffer} pdfFile - The PDF file to process
 * @param {string} fileName - The name of the file
 * @returns {Promise<Object>} - Promise resolving to the measurements
 */
export async function processEagleViewPdf(pdfFile, fileName) {
  try {
    console.log(`Processing EagleView PDF: ${fileName}`);
    
    // Convert pages 1, 9, and 10 to images
    const imageBase64Array = await convertPdfPagesToImages(pdfFile, [1, 9, 10]);
    
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

// Example React component implementation:
/*
import React, { useState } from 'react';
import { processEagleViewPdf } from './pdf-to-images';

function EagleViewUploader() {
  const [measurements, setMeasurements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await processEagleViewPdf(file, file.name);
      setMeasurements(result.measurements);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">EagleView PDF Analyzer</h2>
      <p className="mb-4">Upload an EagleView PDF report to extract measurements</p>
      
      <div className="mb-4">
        <label className="block mb-2">
          <span className="text-gray-700">Select PDF file:</span>
          <input 
            type="file" 
            accept=".pdf" 
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
          />
        </label>
      </div>
      
      {loading && (
        <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded">
          Processing PDF... This may take a moment.
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      
      {measurements && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Extracted Measurements</h3>
          <div className="bg-gray-50 p-4 rounded overflow-auto">
            <pre className="text-sm">{JSON.stringify(measurements, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default EagleViewUploader;
*/ 