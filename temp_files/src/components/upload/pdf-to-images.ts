import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from "@/integrations/supabase/client";
import { ParsedMeasurements } from "@/api/measurements";

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Converts a single PDF page to a base64-encoded image
 * @param pdfDoc The PDF document
 * @param pageNumber The page number to convert (1-indexed)
 * @param scale The scale to render the page at (default: 2.0 for better quality)
 * @returns A Promise that resolves to a base64-encoded image string
 */
export async function convertPdfPageToImage(
  pdfDoc: any,
  pageNumber: number,
  scale: number = 2.0
): Promise<string> {
  try {
    // Get the page
    const page = await pdfDoc.getPage(pageNumber);
    
    // Calculate viewport dimensions
    const viewport = page.getViewport({ scale });
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    
    // Set canvas dimensions to match the viewport
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render the page to the canvas
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;
    
    // Convert canvas to base64 image (PNG format)
    const base64Image = canvas.toDataURL('image/png').split(',')[1];
    
    console.log(`Converted page ${pageNumber} to image (${base64Image.length} bytes)`);
    return base64Image;
  } catch (error) {
    console.error(`Error converting page ${pageNumber} to image:`, error);
    throw error;
  }
}

/**
 * Converts specific pages of a PDF to images
 * @param pdfData The PDF data (File, Blob, or ArrayBuffer)
 * @param pageNumbers Array of page numbers to convert (1-indexed)
 * @returns A Promise that resolves to an array of base64-encoded image strings
 */
export async function convertPdfPagesToImages(
  pdfData: File | Blob | ArrayBuffer,
  pageNumbers: number[] = [1, 9, 10] // Default to pages 1, 9, and 10 for EagleView reports
): Promise<string[]> {
  try {
    console.log(`Converting PDF pages ${pageNumbers.join(', ')} to images...`);
    
    // Convert File or Blob to ArrayBuffer if needed
    let pdfArrayBuffer: ArrayBuffer;
    
    if (pdfData instanceof File || pdfData instanceof Blob) {
      pdfArrayBuffer = await pdfData.arrayBuffer();
    } else {
      pdfArrayBuffer = pdfData;
    }
    
    // Load the PDF document
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
    
    // Check if the requested pages exist
    const numPages = pdfDoc.numPages;
    console.log(`PDF loaded successfully. Total pages: ${numPages}`);
    
    const validPageNumbers = pageNumbers.filter(pageNum => pageNum > 0 && pageNum <= numPages);
    
    if (validPageNumbers.length === 0) {
      throw new Error(`No valid pages found. PDF has ${numPages} pages.`);
    }
    
    if (validPageNumbers.length < pageNumbers.length) {
      console.warn(`Some requested pages exceed the document length (${numPages} pages).`);
    }
    
    // Convert each page to an image
    const imagePromises = validPageNumbers.map(pageNum => 
      convertPdfPageToImage(pdfDoc, pageNum)
    );
    
    // Wait for all conversions to complete
    const images = await Promise.all(imagePromises);
    
    console.log(`Successfully converted ${images.length} pages to images.`);
    return images;
  } catch (error) {
    console.error('Error converting PDF pages to images:', error);
    throw error;
  }
}

/**
 * Processes an EagleView PDF report by converting specific pages to images
 * and sending them to the Supabase function for analysis
 * @param pdfFile The PDF file to process
 * @param modelType The OpenAI model to use (default: "gpt-4o")
 * @returns A Promise that resolves to the parsed measurements
 */
export async function processEagleViewPdf(
  pdfFile: File,
  modelType: string = "gpt-4o"
): Promise<{
  measurements: ParsedMeasurements,
  success: boolean,
  note?: string,
  error?: string
}> {
  try {
    console.log(`Processing EagleView PDF: ${pdfFile.name} (${pdfFile.size} bytes)`);
    
    // Convert PDF pages to images
    const imageBase64Array = await convertPdfPagesToImages(pdfFile);
    console.log(`Converted ${imageBase64Array.length} pages to images`);
    
    // Add a timestamp to prevent caching on the Supabase side
    const timestamp = new Date().getTime();
    const requestId = crypto.randomUUID(); // Generate unique request ID
    
    // Call the Supabase function with the images
    const { data, error } = await supabase.functions.invoke('parse-eagleview-pdf', {
      body: { 
        imageBase64Array,
        fileName: pdfFile.name,
        timestamp,
        requestId,
        modelType,
        processingMode: 'regular'
      }
    });
    
    if (error) {
      console.error("Supabase function error:", error);
      throw error;
    }
    
    if (!data || !data.measurements) {
      throw new Error("The parsing service returned invalid data");
    }
    
    console.log("Parsed measurements:", data.measurements);
    
    return data;
  } catch (error: any) {
    console.error('Error processing EagleView PDF:', error);
    throw error;
  }
} 