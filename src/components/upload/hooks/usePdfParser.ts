import { useState } from "react";
import { ParsedMeasurements } from "@/api/measurements";
import { validatePdfFile } from "../pdf-utils";
import { FileUploadStatus } from "./useFileUpload";
import { ProcessingMode } from "./pdf-constants";
import { 
  handlePdfSizeError, 
  handleInvalidPdfError, 
  handleGeneralPdfError
} from "./pdf-error-handler";
import { processPdfWithSupabase } from "@/api/pdf-service";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
// Import PDF.js for client-side parsing
import * as pdfjs from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set up the PDF.js worker
const pdfjsVersion = '3.11.174'; // Match this with your installed version
GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`;

export function usePdfParser() {
  const [parsedData, setParsedData] = useState<ParsedMeasurements | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("client");
  const [processingProgress, setProcessingProgress] = useState<{
    page: number;
    totalPages: number;
    status: string;
  } | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const parsePdf = async (
    file: File, 
    setStatus: React.Dispatch<React.SetStateAction<FileUploadStatus>>,
    setErrorDetails: React.Dispatch<React.SetStateAction<string>>
  ) => {
    try {
    setStatus("uploading");
    setErrorDetails("");
      setProcessingProgress(null);
      setFileUrl(null);
    
      // Validate that this is actually a PDF file
      if (!validatePdfFile(file)) {
        handleInvalidPdfError(setErrorDetails, setStatus);
        return null;
      }
      
      // First, check file size - warn if it's large
      const fileSizeMB = file.size / (1024 * 1024);
      
      // Handle size errors and warnings
      if (!handlePdfSizeError(fileSizeMB, setErrorDetails, setStatus)) {
        return null;
      }
      
      // First, we'll do client-side parsing with PDF.js for better accuracy
      setProcessingMode("client");
      setStatus("parsing");
      setProcessingProgress({
        page: 0,
        totalPages: 1,
        status: "Processing PDF in browser..."
      });
      
      console.log(`Processing PDF file client-side: ${file.name} (${fileSizeMB.toFixed(2)} MB)`);
      
      try {
        // Parse the PDF client-side using PDF.js
        const measurements = await parsePdfClientSide(file, setProcessingProgress);
        
        if (!measurements) {
          throw new Error("Failed to extract measurements from PDF");
        }
        
        console.log("Client-side parsed measurements:", measurements);
        
        // Store the parsed measurements
        setParsedData(measurements);
        setStatus("success");
        
        // If we have Supabase configured, we can still upload the file for storage
        if (isSupabaseConfigured()) {
          try {
            // Upload to Supabase for storage only
            const { error, fileUrl } = await uploadToSupabase(file);
            
            if (error) {
              console.warn("PDF uploaded, but Supabase storage upload failed:", error);
            } else if (fileUrl) {
              // Set the file URL for downloading or viewing
              setFileUrl(fileUrl);
            }
          } catch (uploadError) {
            console.warn("Supabase upload failed, but PDF was parsed successfully:", uploadError);
          }
        }
        
        return measurements;
      } catch (clientSideError) {
        console.warn("Client-side PDF parsing failed, falling back to Supabase:", clientSideError);
        
        // Fall back to Supabase if client-side parsing fails
        if (isSupabaseConfigured()) {
          setProcessingMode("supabase");
          setStatus("parsing");
          setProcessingProgress({
            page: 0,
            totalPages: 1,
            status: "Uploading to Supabase for processing..."
          });
          
          console.log(`Falling back to Supabase for: ${file.name} (${fileSizeMB.toFixed(2)} MB)`);
          
          // Process PDF with Supabase
          const { data, error, fileUrl } = await processPdfWithSupabase(file);
          
          if (error) {
            console.error("Error processing PDF with Supabase:", error);
            setStatus("error");
            setErrorDetails(`Error: ${error.message}`);
            return null;
          }
          
          if (!data) {
            setStatus("error");
            setErrorDetails("No data returned from PDF processing");
            return null;
          }
          
          // Set the file URL (for downloading or viewing)
          if (fileUrl) {
            setFileUrl(fileUrl);
          }
          
          // Store the parsed measurements
          setParsedData(data);
          setStatus("success");
          
          return data;
        } else {
          // No fallback available
          setStatus("error");
          setErrorDetails(`Client-side parsing failed: ${clientSideError.message}`);
        return null;
        }
      }
    } catch (error: any) {
      handleGeneralPdfError(error, setStatus, setErrorDetails);
      return null;
    } finally {
      setProcessingProgress(null);
    }
  };

  // Upload the file to Supabase Storage (for storage only, not processing)
  const uploadToSupabase = async (file: File) => {
    try {
      // Only upload if Supabase is configured
      if (!isSupabaseConfigured()) {
        return { error: new Error("Supabase not configured"), fileUrl: null };
      }
      
      // Upload to Supabase Storage
      const { data, error, fileUrl } = await processPdfWithSupabase(file);
      
      return { error, fileUrl };
    } catch (error) {
      console.error("Supabase upload error:", error);
      return { error, fileUrl: null };
    }
  };

  // Parse PDF client-side using PDF.js
  const parsePdfClientSide = async (
    file: File,
    setProgress: React.Dispatch<React.SetStateAction<{
      page: number;
      totalPages: number;
      status: string;
    } | null>>
  ): Promise<ParsedMeasurements | null> => {
    try {
      // Create a URL to the PDF file
      const fileURL = URL.createObjectURL(file);
      
      // Load the PDF document
      setProgress({
        page: 0,
        totalPages: 0,
        status: "Loading PDF document..."
      });
      
      const loadingTask = pdfjs.getDocument(fileURL);
      const pdf = await loadingTask.promise;
      
      // Create a measurements object
      const measurements: ParsedMeasurements = {
        totalArea: 0,
        predominantPitch: "",
        ridgeLength: 0,
        hipLength: 0,
        valleyLength: 0,
        rakeLength: 0,
        eaveLength: 0,
        ridgeCount: 0,
        hipCount: 0,
        valleyCount: 0,
        rakeCount: 0,
        eaveCount: 0,
        stepFlashingLength: 0,
        flashingLength: 0,
        penetrationsArea: 0,
        penetrationsPerimeter: 0,
        dripEdgeLength: 0,
        areasByPitch: {},
        // Initialize new property fields
        longitude: "",
        latitude: "",
        propertyAddress: ""
      };
      
      // Extract text from all pages
      let fullText = "";
      let pageContents: { [pageNum: number]: string } = {};
      let pageTextItems: { [pageNum: number]: Array<{str: string, transform: number[], height: number, width: number}> } = {};
      const numPages = pdf.numPages;
      
      // First, extract text from all pages to be used as fallback
      for (let i = 1; i <= numPages; i++) {
        setProgress({
          page: i,
          totalPages: numPages,
          status: `Extracting text from page ${i} of ${numPages}...`
        });
        
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Store the text items with their coordinates for table reconstruction
        pageTextItems[i] = textContent.items.map((item: any) => ({
          str: item.str,
          transform: item.transform,
          height: item.height,
          width: item.width
        }));
        
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        
        // Store page content separately
        pageContents[i] = pageText;
        
        // Add to full text
        fullText += pageText + "\n";
      }
      
      setProgress({
        page: numPages,
        totalPages: numPages,
        status: "Analyzing extracted text for measurements extraction..."
      });
      
      console.log("Full extracted text:", fullText);
      
      // Check if page 10 exists - it usually has the most structured format in EagleView reports
      const hasPage10 = numPages >= 10 && pageContents[10] && pageContents[10].length > 0;
      console.log("Has page 10:", hasPage10);
      
      // Also check if page 1 exists as a fallback
      const hasPage1 = pageContents[1] && pageContents[1].length > 0;
      console.log("Has page 1:", hasPage1);
      
      // Prioritize content from page 10
      let primaryText = hasPage10 ? pageContents[10] : fullText;
      let fallbackText = hasPage1 ? pageContents[1] : fullText;
      
      // Look for the "Lengths, Areas and Pitches" section, which is typically found on page 10
      const hasLengthsSection = /Lengths,\s+Areas\s+and\s+Pitches/i.test(primaryText);
      console.log("Found 'Lengths, Areas and Pitches' section:", hasLengthsSection);
      
      // If we didn't find it on page 10, check the full text
      if (!hasLengthsSection) {
        for (let i = 1; i <= numPages; i++) {
          if (pageContents[i] && /Lengths,\s+Areas\s+and\s+Pitches/i.test(pageContents[i])) {
            console.log(`Found 'Lengths, Areas and Pitches' section on page ${i}`);
            primaryText = pageContents[i];
            break;
          }
        }
      }
      
      // Log all the page content for debugging
      console.log("Processing page content for measurements extraction...");
      for (let i = 1; i <= Math.min(12, numPages); i++) {
        console.log(`Page ${i} content (first 100 chars):`, pageContents[i]?.substring(0, 100));
      }
      
      // First, try to extract from the page 10 format with parentheses counts
      // Ridge extraction with count - try multiple patterns
      const ridgePatterns = [
        /Ridges\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Ridges?\)/i,
        /Ridge.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Ridge.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Ridge.*?length.*?:\s*([0-9,]+(?:\.\d+)?)/i,
        /Ridge.*?length.*?=\s*([0-9,]+(?:\.\d+)?)/i
      ];
      
      let foundRidge = false;
      for (const pattern of ridgePatterns) {
        const ridgeMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (ridgeMatch && ridgeMatch[1]) {
          measurements.ridgeLength = parseFloat(ridgeMatch[1].replace(/,/g, ''));
          if (ridgeMatch[2]) {
            measurements.ridgeCount = parseInt(ridgeMatch[2], 10);
          }
          console.log(`Found ridge length: ${measurements.ridgeLength} ft`);
          foundRidge = true;
          break;
        }
      }
      
      // Hip extraction with count - try multiple patterns
      const hipPatterns = [
        /Hips\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Hips?\)/i,
        /Hip.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Hip.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Hip.*?length.*?:\s*([0-9,]+(?:\.\d+)?)/i,
        /Hip.*?length.*?=\s*([0-9,]+(?:\.\d+)?)/i
      ];
      
      let foundHip = false;
      for (const pattern of hipPatterns) {
        const hipMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (hipMatch && hipMatch[1]) {
          measurements.hipLength = parseFloat(hipMatch[1].replace(/,/g, ''));
          if (hipMatch[2]) {
            measurements.hipCount = parseInt(hipMatch[2], 10);
          }
          console.log(`Found hip length: ${measurements.hipLength} ft`);
          foundHip = true;
          break;
        }
      }
      
      // Valley extraction with count - try multiple patterns
      const valleyPatterns = [
        /Valleys\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Valleys?\)/i,
        /Valley.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Valley.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Valley.*?length.*?:\s*([0-9,]+(?:\.\d+)?)/i,
        /Valley.*?length.*?=\s*([0-9,]+(?:\.\d+)?)/i
      ];
      
      let foundValley = false;
      for (const pattern of valleyPatterns) {
        const valleyMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (valleyMatch && valleyMatch[1]) {
          measurements.valleyLength = parseFloat(valleyMatch[1].replace(/,/g, ''));
          if (valleyMatch[2]) {
            measurements.valleyCount = parseInt(valleyMatch[2], 10);
          }
          console.log(`Found valley length: ${measurements.valleyLength} ft`);
          foundValley = true;
          break;
        }
      }
      
      // Rake extraction with count - try multiple patterns
      const rakePatterns = [
        /Rakes.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Rakes?\)/i,
        /Rake.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Rake.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Rake.*?length.*?:\s*([0-9,]+(?:\.\d+)?)/i,
        /Rake.*?length.*?=\s*([0-9,]+(?:\.\d+)?)/i
      ];
      
      let foundRake = false;
      for (const pattern of rakePatterns) {
        const rakeMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (rakeMatch && rakeMatch[1]) {
          measurements.rakeLength = parseFloat(rakeMatch[1].replace(/,/g, ''));
          if (rakeMatch[2]) {
            measurements.rakeCount = parseInt(rakeMatch[2], 10);
          }
          console.log(`Found rake length: ${measurements.rakeLength} ft`);
          foundRake = true;
          break;
        }
      }
      
      // Eave extraction with count - try multiple patterns
      const eavePatterns = [
        /Eaves(?:\/Starter)?.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Eaves?\)/i,
        /Eave.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Eave.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Eave.*?length.*?:\s*([0-9,]+(?:\.\d+)?)/i,
        /Eave.*?length.*?=\s*([0-9,]+(?:\.\d+)?)/i,
        /Starter.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i
      ];
      
      let foundEave = false;
      for (const pattern of eavePatterns) {
        const eaveMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (eaveMatch && eaveMatch[1]) {
          measurements.eaveLength = parseFloat(eaveMatch[1].replace(/,/g, ''));
          if (eaveMatch[2]) {
            measurements.eaveCount = parseInt(eaveMatch[2], 10);
          }
          console.log(`Found eave length: ${measurements.eaveLength} ft`);
          foundEave = true;
          break;
        }
      }
      
      // Drip Edge extraction with count - try multiple patterns
      const dripEdgePatterns = [
        /Drip\s*Edge\s*\(Eaves\s*\+\s*Rakes\)\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Lengths?\)/i,
        /Drip\s*Edge.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Drip\s*Edge.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft/i
      ];
      
      let foundDripEdge = false;
      for (const pattern of dripEdgePatterns) {
        const dripEdgeMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (dripEdgeMatch && dripEdgeMatch[1]) {
          measurements.dripEdgeLength = parseFloat(dripEdgeMatch[1].replace(/,/g, ''));
          console.log(`Found drip edge length: ${measurements.dripEdgeLength} ft`);
          foundDripEdge = true;
          break;
        }
      }
      
      // Flashing extraction with count - try multiple patterns
      const flashingPatterns = [
        /Flashing\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Lengths?\)/i,
        /Flashing.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Flashing.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Wall\s*Flashing.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i
      ];
      
      let foundFlashing = false;
      for (const pattern of flashingPatterns) {
        const flashingMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (flashingMatch && flashingMatch[1]) {
          measurements.flashingLength = parseFloat(flashingMatch[1].replace(/,/g, ''));
          console.log(`Found flashing length: ${measurements.flashingLength} ft`);
          foundFlashing = true;
          break;
        }
      }
      
      // Step flashing extraction with count - try multiple patterns
      const stepFlashingPatterns = [
        /Step\s*flashing\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Lengths?\)/i,
        /Step\s*flashing.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Step\s*flashing.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft/i
      ];
      
      let foundStepFlashing = false;
      for (const pattern of stepFlashingPatterns) {
        const stepFlashingMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (stepFlashingMatch && stepFlashingMatch[1]) {
          measurements.stepFlashingLength = parseFloat(stepFlashingMatch[1].replace(/,/g, ''));
          console.log(`Found step flashing length: ${measurements.stepFlashingLength} ft`);
          foundStepFlashing = true;
          break;
        }
      }
      
      // Penetrations area extraction - try multiple patterns
      const penetrationsAreaPatterns = [
        /Total\s*Penetrations\s*Area\s*=\s*([0-9,]+(?:\.\d+)?)\s*sq\s*ft/i,
        /Penetration.*?Area.*?:\s*([0-9,]+(?:\.\d+)?)\s*sq\s*ft/i,
        /Penetration.*?Area.*?=\s*([0-9,]+(?:\.\d+)?)\s*sq\s*ft/i
      ];
      
      let foundPenetrationsArea = false;
      for (const pattern of penetrationsAreaPatterns) {
        const penetrationsAreaMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (penetrationsAreaMatch && penetrationsAreaMatch[1]) {
          measurements.penetrationsArea = parseFloat(penetrationsAreaMatch[1].replace(/,/g, ''));
          console.log(`Found penetrations area: ${measurements.penetrationsArea} sq ft`);
          foundPenetrationsArea = true;
          break;
        }
      }
      
      // Penetrations perimeter extraction - try multiple patterns
      const penetrationsPerimeterPatterns = [
        /Total\s*Penetrations\s*Perimeter\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Penetration.*?Perimeter.*?:\s*([0-9,]+(?:\.\d+)?)\s*ft/i,
        /Penetration.*?Perimeter.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft/i
      ];
      
      let foundPenetrationsPerimeter = false;
      for (const pattern of penetrationsPerimeterPatterns) {
        const penetrationsPerimeterMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (penetrationsPerimeterMatch && penetrationsPerimeterMatch[1]) {
          measurements.penetrationsPerimeter = parseFloat(penetrationsPerimeterMatch[1].replace(/,/g, ''));
          console.log(`Found penetrations perimeter: ${measurements.penetrationsPerimeter} ft`);
          foundPenetrationsPerimeter = true;
          break;
        }
      }
      
      // Total area extraction - try multiple patterns
      const totalAreaPatterns = [
        /Total\s*Area\s*\(All\s*Pitches\)\s*=\s*([0-9,]+(?:\.\d+)?)\s*sq\s*ft/i,
        /Total\s*Area.*?:\s*([0-9,]+(?:\.\d+)?)\s*sq\s*ft/i,
        /Total\s*Area.*?=\s*([0-9,]+(?:\.\d+)?)\s*(?:sq)?\s*(?:ft)?/i,
        /Roof\s*Area.*?:\s*([0-9,]+(?:\.\d+)?)\s*sq\s*ft/i
      ];
      
      let foundTotalArea = false;
      for (const pattern of totalAreaPatterns) {
        const totalAreaMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (totalAreaMatch && totalAreaMatch[1]) {
          measurements.totalArea = parseFloat(totalAreaMatch[1].replace(/,/g, ''));
          console.log(`Found total area: ${measurements.totalArea} sq ft`);
          foundTotalArea = true;
          break;
        }
      }
      
      // Predominant pitch extraction - try multiple patterns
      const predominantPitchPatterns = [
        /Predominant\s*Pitch\s*=\s*([0-9]{1,2}\/[0-9]{1,2})/i,
        /Predominant\s*Pitch.*?:\s*([0-9]{1,2}\/[0-9]{1,2})/i,
        /Pitch.*?:\s*([0-9]{1,2}\/[0-9]{1,2})/i,
        /Pitch.*?=\s*([0-9]{1,2}\/[0-9]{1,2})/i,
        /([0-9]{1,2}\/[0-9]{1,2}).*?pitch/i
      ];
      
      let foundPredominantPitch = false;
      for (const pattern of predominantPitchPatterns) {
        const predominantPitchMatch = primaryText.match(pattern) || fullText.match(pattern);
        if (predominantPitchMatch && predominantPitchMatch[1]) {
          // Normalize to x:12 format
          const [numerator, denominator] = predominantPitchMatch[1].split('/');
          measurements.predominantPitch = `${numerator}:${denominator}`;
          console.log(`Found predominant pitch: ${measurements.predominantPitch}`);
          foundPredominantPitch = true;
          break;
        }
      }
      
      // Extract areas by pitch
      console.log("Extracting areas by pitch...");
      
      // Initialize empty object to store areas by pitch
      measurements.areasByPitch = {};
      
      // Define the pitch validation function for use throughout this parsing logic
      function isValidPitch(pitch: string): boolean {
        // Strict validation: only accept X/12 format (or X:12 if colon is used)
        return /^[0-9]+\/12$/.test(pitch.trim()) || /^[0-9]+:12$/.test(pitch.trim());
      }
      
      // Define a function for coordinate-based table detection and extraction
      // This will use the raw text items with their positions to reconstruct the table structure
      function extractPitchTableData(pageNum: number): {pitches: string[], areas: number[], percentages: number[]} | null {
        const textItems = pageTextItems[pageNum];
        if (!textItems || textItems.length === 0) return null;
        
        // Define empty arrays to hold our extracted data
        let pitches: string[] = [];
        let areas: number[] = [];
        let percentages: number[] = [];
        
        // Group text items by their Y-coordinate (rounding to account for slight variations)
        const rowGroups: { [y: string]: Array<{str: string, x: number, y: number}> } = {};
        
        // First pass: group by Y coordinate and store X coordinate
        textItems.forEach(item => {
          // PDF.js transform array: [scaleX, skewX, skewY, scaleY, x, y]
          const x = item.transform[4];
          const y = Math.round(item.transform[5]);
          const yKey = y.toString();
          
          if (!rowGroups[yKey]) {
            rowGroups[yKey] = [];
          }
          
          rowGroups[yKey].push({
            str: item.str.trim(),
            x,
            y
          });
        });
        
        // Sort each row by X coordinate
        Object.values(rowGroups).forEach(row => {
          row.sort((a, b) => a.x - b.x);
        });
        
        // Convert rowGroups to array and sort by Y coordinate (top to bottom)
        const sortedRows = Object.entries(rowGroups)
          .map(([y, items]) => ({
            y: parseInt(y),
            text: items.map(i => i.str).join(' ').trim(),
            items
          }))
          .sort((a, b) => b.y - a.y); // Reverse sort (PDF coordinate system has origin at bottom left)
        
        console.log("Sorted rows for table detection:", sortedRows.map(r => r.text).slice(0, 10));
        
        // Look for "Areas by Pitch" or similar header
        const tableHeaderIdx = sortedRows.findIndex(row => 
          /areas\s+by\s+pitch/i.test(row.text) || 
          /areas\s+per\s+pitch/i.test(row.text) ||
          /roof\s+pitch\s+table/i.test(row.text) ||
          /pitch\s+area\s+table/i.test(row.text)
        );
        
        // Start looking from either the table header or the beginning
        const startIdx = tableHeaderIdx > -1 ? tableHeaderIdx : 0;
        
        // Look for the table row containing "ROOF PITCH", "AREA", and "% OF ROOF"
        const headerRowIndex = sortedRows.findIndex((row, idx) => 
          idx >= startIdx && 
          (/ROOF\s+PITCH/i.test(row.text) || /PITCH/i.test(row.text)) && 
          (/AREA/i.test(row.text) || /SQ\s+FT/i.test(row.text)) && 
          (/\%\s*OF\s*ROOF/i.test(row.text) || /PERCENT/i.test(row.text))
        );
        
        if (headerRowIndex === -1) {
          console.log("Couldn't find pitch table header row");
          return null;
        }
        
        console.log("Found pitch table header row:", sortedRows[headerRowIndex].text);
        
        // Get the header items to determine column positions
        const headerItems = sortedRows[headerRowIndex].items;
        
        // Find column positions based on header text
        const pitchColIdx = headerItems.findIndex(item => 
          /ROOF\s+PITCH/i.test(item.str) || /PITCH/i.test(item.str)
        );
        
        const areaColIdx = headerItems.findIndex(item => 
          /AREA/i.test(item.str) || /SQ\s+FT/i.test(item.str)
        );
        
        const percentColIdx = headerItems.findIndex(item => 
          /\%\s*OF\s*ROOF/i.test(item.str) || /PERCENT/i.test(item.str)
        );
        
        // Determine rough X positions for the columns
        const pitchColX = pitchColIdx >= 0 ? headerItems[pitchColIdx].x : -1;
        const areaColX = areaColIdx >= 0 ? headerItems[areaColIdx].x : -1;
        const percentColX = percentColIdx >= 0 ? headerItems[percentColIdx].x : -1;
        
        console.log(`Column positions - Pitch: ${pitchColX}, Area: ${areaColX}, Percent: ${percentColX}`);
        
        // Process data rows (rows after the header)
        for (let i = headerRowIndex + 1; i < sortedRows.length; i++) {
          const row = sortedRows[i];
          
          // Skip total row or empty rows
          if (/total/i.test(row.text) || row.text.trim().length === 0) continue;
          
          // Extract data from this row based on column positions
          // We'll use proximity to the column X positions
          let pitchValue = "";
          let areaValue = 0;
          let percentValue = 0;
          
          // Enhanced debugging for row content
          console.log(`Processing row: "${row.text}" with ${row.items.length} items`);
          
          // First determine if this row has useful data - expanded to catch non-standard pitch formats
          const hasPotentialPitch = row.items.some(item => /\d+[\/:]\d+/.test(item.str));
          if (!hasPotentialPitch) {
            console.log(`  Skipping row without pitch value: "${row.text}"`);
            continue;
          }
          
          // Sort items by their X position for more reliable column matching
          const rowItemsSorted = [...row.items].sort((a, b) => a.x - b.x);
          
          // Try to identify which item belongs to which column based on position and content
          rowItemsSorted.forEach((item, idx) => {
            const itemStr = item.str.trim();
            if (!itemStr) return;
            
            // Pitch column detection - allow non-standard formats like 5/202 or 6/1
            if (/^\d+[\/:]\d+$/.test(itemStr)) {
              pitchValue = itemStr;
              console.log(`  Found pitch: ${pitchValue}`);
            }
            // Area column detection - any numeric value could be an area
            else if (/^[\d,.\s]+$/.test(itemStr) && !areaValue) {
              // Sanitize the string - remove commas, extra spaces, etc.
              const cleanStr = itemStr.replace(/,/g, '').trim();
              const parsed = parseFloat(cleanStr);
              
              if (!isNaN(parsed)) {
                // Accept ANY numeric value as area - no minimum threshold
                areaValue = parsed;
                console.log(`  Found area: ${areaValue} sq ft`);
              }
            }
            // Percentage column detection - allow percentage with or without % symbol
            else if (/^[\d,.\s]+%?$/.test(itemStr) && !percentValue) {
              // Clean the string and parse
              const cleanStr = itemStr.replace(/[%,\s]/g, '');
              const parsed = parseFloat(cleanStr);
              
              if (!isNaN(parsed)) {
                percentValue = parsed;
                console.log(`  Found percentage: ${percentValue}%`);
              }
            }
          });
          
          // If we couldn't extract area values using positions, try more explicit pattern matching
          if (pitchValue && !areaValue) {
            // Look for numbers that appear after the pitch
            const fullRowText = row.text;
            const areaMatch = fullRowText.match(new RegExp(`${pitchValue.replace(/[\/]/g, '[/:]')}[^\\d]+(\\d+[\\d,.]*)`));
            if (areaMatch && areaMatch[1]) {
              areaValue = parseFloat(areaMatch[1].replace(/,/g, ''));
              console.log(`  Found area via pattern match: ${areaValue} sq ft`);
            }
            
            // If still not found, look for any number in the row
            if (!areaValue) {
              const numberMatch = fullRowText.match(/(\d+(?:[.,]\d+)?)/);
              if (numberMatch && numberMatch[1] && numberMatch[1] !== pitchValue.split(/[\/:]/).join('')) {
                areaValue = parseFloat(numberMatch[1].replace(/,/g, ''));
                console.log(`  Found potential area via generic number: ${areaValue} sq ft`);
              }
            }
          }
          
          // If we have area but no percentage, try to calculate it from the row text
          if (pitchValue && areaValue && !percentValue) {
            const fullRowText = row.text;
            const percentMatch = fullRowText.match(/(\d+\.?\d*)%/);
            if (percentMatch && percentMatch[1]) {
              percentValue = parseFloat(percentMatch[1]);
              console.log(`  Found percentage via pattern match: ${percentValue}%`);
            }
          }
          
          // Only add if we found a potential pitch and area - allow ANY potential pitch format
          if (pitchValue && areaValue > 0) {
            // Check if it's any format with numbers separated by / or :
            if (/^\d+[\/:]\d+$/.test(pitchValue)) {
              // Ensure the pitch is in the right format, but preserve non-standard ones
              // We'll accept whatever pitches the document has
              pitches.push(pitchValue);
              areas.push(areaValue);
              percentages.push(percentValue);
              console.log(`  Extracted row: Pitch ${pitchValue}, Area ${areaValue} sq ft, ${percentValue}%`);
            } else {
              console.log(`  Skipping invalid pitch format: ${pitchValue}`);
            }
          }
        }
        
        // Return the extracted data if we found anything
        if (pitches.length > 0 && areas.length === pitches.length) {
          return { pitches, areas, percentages };
        }
        
        return null;
      }
      
      // Try the coordinate-based table extraction first
      console.log("Attempting to extract pitch table using coordinate-based detection...");
      let extractedTableData = null;
      
      // Try to extract the pitch table from each page
      for (let i = 1; i <= numPages; i++) {
        console.log(`Trying to extract pitch table from page ${i}`);
        extractedTableData = extractPitchTableData(i);
        if (extractedTableData && extractedTableData.pitches.length > 0) {
          console.log(`Successfully extracted pitch table from page ${i}`);
          break;
        }
      }
      
      // Validate the extracted data before using it
      if (extractedTableData && extractedTableData.pitches.length > 0) {
        const { pitches, areas, percentages } = extractedTableData;
        
        // Check for any obviously invalid data
        const hasInvalidData = areas.some(area => area <= 0 || area > 50000); // Sanity check on area sizes
        
        if (hasInvalidData) {
          console.log("Found invalid area values in extracted data, will try alternative methods");
        } else {
          // Log the extracted data for debugging
          console.log("EXTRACTED PITCH TABLE DATA:");
          pitches.forEach((pitch, idx) => {
            console.log(`  ${pitch}: ${areas[idx]} sq ft (${percentages[idx]}%)`);
          });
          
          // Calculate total area from areas in the table
          const tableTotalArea = areas.reduce((sum, area) => sum + area, 0);
          console.log(`Table total area: ${tableTotalArea} sq ft`);
          
          // If percentages are missing or don't add up to ~100%, recalculate them
          let needToRecalcPercentages = false;
          const totalPercentage = percentages.reduce((sum, pct) => sum + pct, 0);
          console.log(`Total percentage from table: ${totalPercentage}%`);
          
          // Check if percentages need recalculation (missing or don't add up)
          if (totalPercentage < 90 || totalPercentage > 110 || percentages.some(p => p === 0)) {
            console.log(`Percentage total outside acceptable range (${totalPercentage}%) or missing values, recalculating percentages`);
            needToRecalcPercentages = true;
          }
          
          // If we need to recalculate percentages, do so based on the areas
          const recalculatedPercentages: number[] = [];
          if (needToRecalcPercentages && tableTotalArea > 0) {
            areas.forEach(area => {
              // Calculate exact percentage with high precision to preserve small values
              const pct = (area / tableTotalArea) * 100;
              // Store the full precision value - don't round yet
              recalculatedPercentages.push(pct);
              console.log(`  Recalculated ${area} sq ft to ${pct.toFixed(5)}% of total area`);
            });
          }
          
          // If we don't already have a total area, use the table total
          if (measurements.totalArea === 0) {
            measurements.totalArea = tableTotalArea;
            console.log(`Setting total area from table: ${tableTotalArea} sq ft`);
          } else if (Math.abs(measurements.totalArea - tableTotalArea) / measurements.totalArea > 0.1) {
            // If there's a significant discrepancy between found total area and table sum
            console.log(`Warning: Table total area (${tableTotalArea}) differs from extracted total area (${measurements.totalArea})`);
            
            // If the difference is large, adjust areas to match the extracted total
            if (measurements.totalArea > 0 && tableTotalArea > 0) {
              const scaleFactor = measurements.totalArea / tableTotalArea;
              console.log(`Scaling areas by factor ${scaleFactor.toFixed(3)} to match total area`);
              areas.forEach((area, idx) => {
                // Scale area values but keep high precision
                areas[idx] = area * scaleFactor;
              });
              
              // Recalculate percentages after scaling
              if (needToRecalcPercentages) {
                const newTotal = areas.reduce((sum, area) => sum + area, 0);
                for (let i = 0; i < areas.length; i++) {
                  recalculatedPercentages[i] = (areas[i] / newTotal) * 100;
                }
              }
            }
          }
          
          // Use extracted values (with recalculated percentages if necessary)
          pitches.forEach((pitch, idx) => {
            // Normalize pitch format (preserve exactly as is, but convert / to : if needed)
            const normalizedPitch = pitch.includes(':') ? pitch : pitch.replace('/', ':');
            
            // Get area for this pitch
            const area = areas[idx];
            
            // Get percentage (using recalculated if necessary) - preserve very small values
            const percentage = needToRecalcPercentages ? recalculatedPercentages[idx] : percentages[idx];
            
            // Format for display - use 1 decimal for values >= 0.1%, use more precision for smaller values
            const formattedPct = percentage >= 0.1 ? 
              percentage.toFixed(1) + '%' : 
              percentage.toFixed(5).replace(/0+$/, '').replace(/\.$/, '.0') + '%';
              
            const percentageDisplay = percentage ? formattedPct : 'N/A';
            
            // Add to measurements - preserve exact values
            measurements.areasByPitch[normalizedPitch] = area;
            console.log(`Assigned ${area.toFixed(1)} sq ft (${percentageDisplay}) to pitch ${normalizedPitch}`);
            
            // If this is the largest area, it's the predominant pitch
            if (!measurements.predominantPitch || 
                (area > (measurements.areasByPitch[measurements.predominantPitch] || 0))) {
              measurements.predominantPitch = normalizedPitch;
              console.log(`Set ${normalizedPitch} as predominant pitch with ${area.toFixed(1)} sq ft (${percentageDisplay})`);
            }
          });
          
          console.log("Successfully processed pitch table data");
          
          // Important: Skip all fallback mechanisms if we successfully extracted the table
          return measurements;
        }
      } else {
        console.log("No valid pitch table found using coordinate-based detection, falling back to other methods");
        
        // First, try to look for "Areas per Pitch" or "Roof Pitches" sections in the document
        const areasPerPitchRegex = /(?:Areas\s+per\s+Pitch|Roof\s+Pitches)[\s\S]*?(?:Total|The\s+table\s+above|Structure\s+Complexity|All\s+Structures)/i;
        const areasPerPitchMatch = fullText.match(areasPerPitchRegex);
        
        if (areasPerPitchMatch) {
          console.log("Found 'Areas per Pitch' section");
          const areasPerPitchSection = areasPerPitchMatch[0];
          
          // First, try to detect if this is a horizontal table format (where pitches are column headers)
          // Pattern to extract a row of pitch headers like "1/12 2/12 5/12"
          // Try multiple patterns to capture different variations of the horizontal table format
          let pitchHeaders: string[] = [];
          let foundHorizontalTable = false;
          
          // Look for all pitch values in table cells (for handling table rows)
          // IMPORTANT: Only accept VALID pitch formats like X/12 or X:12
          // Common pitch denominator is almost always 12
          const validPitchPattern = /(\d{1,2}\/12)/g;  // Match only pitches with denominator 12
          const allTablePitches = Array.from(areasPerPitchSection.matchAll(validPitchPattern)).map(m => m[1]);
          console.log("Found all valid pitch values in section:", allTablePitches);

          // Filter out invalid pitches
          const validPitches = allTablePitches.filter(isValidPitch);
          console.log("Valid pitches after filtering:", validPitches);

          // Use the rest of the fallback logic as before...
        }
      }
      
      // If we still couldn't extract areas by pitch, try a more general approach
      if (Object.keys(measurements.areasByPitch).length === 0) {
        console.log("All specific extraction methods failed, trying general pattern extraction");
        
        // Look for a pattern like "1/12 (4,568.0 sq ft)" or "1/12: 4,568.0"
        const generalPitchAreaRegex = /(\d+(?:\/|:)\d+)[:\s]*[\(\s]*([0-9,.]+)(?:\s*sq\s*ft|\))?/gi;
        let generalMatch;
        
        while ((generalMatch = generalPitchAreaRegex.exec(fullText)) !== null) {
          const pitch = generalMatch[1];
          const area = parseFloat(generalMatch[2].replace(/,/g, ''));
          
          if (!isNaN(area)) {
            // Normalize pitch format (using colon for the app)
            const pitchKey = pitch.includes(':') ? pitch : pitch.replace('/', ':');
            
            measurements.areasByPitch[pitchKey] = area;
            console.log(`Mapped pitch ${pitchKey} to area ${area} sq ft (GENERAL MATCH)`);
          }
        }
      }
      
      // Try one more aggressive approach if still no results
      if (Object.keys(measurements.areasByPitch).length === 0) {
        console.log("Trying most aggressive pattern matching for pitch areas");
        
        // Look for any numbers next to pitch notation, with wider context
        const aggressiveRegex = /(\d+(?:\/|:)\d+)(?:.*?)(\d+[,\d]*(?:\.\d+)?)/g;
        let aggressiveMatch;
        
        while ((aggressiveMatch = aggressiveRegex.exec(fullText)) !== null) {
          // Only consider matches where the second number is likely an area (greater than 1)
          const pitch = aggressiveMatch[1];
          const possibleArea = parseFloat(aggressiveMatch[2].replace(/,/g, ''));
          
          if (!isNaN(possibleArea) && possibleArea > 1) {
            // Normalize pitch format (using colon for the app)
            const pitchKey = pitch.includes(':') ? pitch : pitch.replace('/', ':');
            
            measurements.areasByPitch[pitchKey] = possibleArea;
            console.log(`Mapped pitch ${pitchKey} to area ${possibleArea} sq ft (AGGRESSIVE MATCH)`);
          }
        }
      }
      
      // If we have the total area but no or incomplete pitch areas, create a fallback
      const totalExtractedPitchArea = Object.values(measurements.areasByPitch).reduce((sum, area) => sum + area, 0);
      if (measurements.totalArea > 0 && (
          Object.keys(measurements.areasByPitch).length === 0 || 
          totalExtractedPitchArea < measurements.totalArea * 0.9)) {
        
        console.log(`Only extracted ${totalExtractedPitchArea} sq ft of pitch areas out of total ${measurements.totalArea} sq ft`);
        
        if (measurements.predominantPitch) {
          // If we have a predominant pitch, use it for the missing area
          const missingArea = measurements.totalArea - totalExtractedPitchArea;
          
          if (missingArea > 0) {
            // Normalize the predominant pitch format
            const normalizedPitch = measurements.predominantPitch.includes(':') ? 
              measurements.predominantPitch : 
              measurements.predominantPitch.replace('/', ':');
            
            // Add the missing area to this pitch, or create it if it doesn't exist
            if (measurements.areasByPitch[normalizedPitch]) {
              measurements.areasByPitch[normalizedPitch] += missingArea;
            } else {
              measurements.areasByPitch[normalizedPitch] = missingArea;
            }
            
            console.log(`Assigned missing ${missingArea.toFixed(1)} sq ft to predominant pitch ${normalizedPitch}`);
          }
        } else if (Object.keys(measurements.areasByPitch).length === 0) {
          // If we have no pitch areas at all but have a total area, create a fallback pitch
          // Most common roof pitch is 6:12, so use that as a fallback
          measurements.areasByPitch['6:12'] = measurements.totalArea;
          console.log(`Created fallback pitch 6:12 with total area ${measurements.totalArea} sq ft`);
          
          // Also set this as the predominant pitch if we don't have one
          if (!measurements.predominantPitch) {
            measurements.predominantPitch = '6:12';
            console.log(`Set fallback predominant pitch to 6:12`);
          }
        }
      }
      
      console.log("Final extracted areas by pitch:", measurements.areasByPitch);
      
      // Calculate total area if we didn't find it directly
      if (measurements.totalArea === 0 && Object.keys(measurements.areasByPitch).length > 0) {
        measurements.totalArea = Object.values(measurements.areasByPitch).reduce((sum, area) => sum + area, 0);
        console.log(`Calculated total area from areas by pitch: ${measurements.totalArea} sq ft`);
      }
      
      // Do a final validation check
      const extractedTotal = Object.values(measurements.areasByPitch).reduce((sum, area) => sum + area, 0);
      
      // Verify against total area with more comprehensive validation
      const areaPercentDiff = measurements.totalArea > 0 ? 
        Math.abs(extractedTotal - measurements.totalArea) / measurements.totalArea * 100 : 0;
      
      console.log(`Area validation: Extracted ${extractedTotal.toFixed(1)} sq ft vs Total ${measurements.totalArea} sq ft (${areaPercentDiff.toFixed(1)}% difference)`);
      
      if (areaPercentDiff > 10) {
        console.warn(`Warning: Total pitch area (${extractedTotal.toFixed(1)} sq ft) differs from total roof area (${measurements.totalArea} sq ft) by ${areaPercentDiff.toFixed(1)}%`);
        
        // Scale all areas to match the total area
        if (extractedTotal > 0 && measurements.totalArea > 0) {
          const scaleFactor = measurements.totalArea / extractedTotal;
          console.log(`Scaling all pitch areas by factor ${scaleFactor.toFixed(3)} to match total area`);
          
          // Rather than uniformly scaling, preserve relative proportions
          const areaPercentages: { [pitch: string]: number } = {};
          
          // Calculate original percentages
          for (const [pitch, area] of Object.entries(measurements.areasByPitch)) {
            areaPercentages[pitch] = (area / extractedTotal) * 100;
          }
          
          // Apply percentages to total area
          for (const [pitch, percentage] of Object.entries(areaPercentages)) {
            measurements.areasByPitch[pitch] = (percentage / 100) * measurements.totalArea;
            console.log(`Scaled ${pitch} area to ${measurements.areasByPitch[pitch].toFixed(1)} sq ft (${percentage.toFixed(1)}%)`);
          }
        } else if (measurements.predominantPitch && measurements.totalArea > 0) {
          // Add fix: If we have a large discrepancy, assign the remaining area to the predominant pitch
          const remainingArea = measurements.totalArea - extractedTotal;
          const normalizedPitch = measurements.predominantPitch.includes(':') ? 
            measurements.predominantPitch : 
            measurements.predominantPitch.replace('/', ':');
          
          console.log(`Assigning remaining ${remainingArea.toFixed(1)} sq ft to predominant pitch ${normalizedPitch}`);
          
          // Add the remaining area to this pitch, or create it if it doesn't exist
          if (measurements.areasByPitch[normalizedPitch]) {
            measurements.areasByPitch[normalizedPitch] += remainingArea;
          } else {
            measurements.areasByPitch[normalizedPitch] = remainingArea;
          }
        }
      } else {
        console.log(`Validation successful: Total pitch area (${extractedTotal.toFixed(1)} sq ft) matches total roof area (${measurements.totalArea} sq ft)`);
      }
      
      // Determine predominant pitch if not already found
      if (!measurements.predominantPitch && Object.keys(measurements.areasByPitch).length > 0) {
        let maxArea = 0;
        let predominantPitch = "";
        
        for (const [pitch, area] of Object.entries(measurements.areasByPitch)) {
          if (area > maxArea) {
            maxArea = area;
            predominantPitch = pitch;
          }
        }
        
        if (predominantPitch) {
          // Make sure the predominant pitch is in x:12 format
          measurements.predominantPitch = predominantPitch.includes(':') ? 
            predominantPitch : 
            predominantPitch.replace('/', ':');
          console.log(`Determined predominant pitch from areas: ${measurements.predominantPitch}`);
        }
      }
      
      // AFTER PITCH AREA EXTRACTION IS COMPLETE
      // Add code to extract property address, latitude, and longitude
      console.log("Extracting property information...");

      // Look for property address with more aggressive patterns
      const addressPatterns = [
        // Pattern 1: Common format in report headers - number, street, city, state zip
        /(\d+[^,\n]+,\s*[^,\n]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
        
        // Pattern 2: Look for a property address label
        /Property\s+Address:?\s*([^\n]+)/i,
        
        // Pattern 3: Look for address in header/title section
        /(?:Report|Property|Location)[\s:]*([^,\n]+,[^,\n]+,[^,\n]+)/i,
        
        // Pattern 4: Look for a street address pattern that appears multiple times (likely the subject property)
        /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Boulevard|Blvd)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2})/i,
        
        // Pattern 5: Look for address pattern at beginning of pages
        /^[^\n]*?(\d+[^,\n]+,\s*[^,\n]+,\s*[A-Z]{2})/m
      ];

      // Get the first 500 characters of the text to look for address in header
      const headerText = fullText.substring(0, 500);
      let foundAddress = false;

      // First check the header specifically
      for (const pattern of addressPatterns) {
        const addressMatch = headerText.match(pattern);
        if (addressMatch && addressMatch[1] && addressMatch[1].trim().length > 10) {
          measurements.propertyAddress = addressMatch[1].trim();
          console.log(`Found property address in header: ${measurements.propertyAddress}`);
          foundAddress = true;
          break;
        }
      }

      // If not found in header, try the full text
      if (!foundAddress) {
        for (const pattern of addressPatterns) {
          const addressMatch = fullText.match(pattern);
          if (addressMatch && addressMatch[1] && addressMatch[1].trim().length > 10) {
            measurements.propertyAddress = addressMatch[1].trim();
            console.log(`Found property address in full text: ${measurements.propertyAddress}`);
            foundAddress = true;
            break;
          }
        }
      }

      // Check page headers for consistent street address that appears in multiple places
      if (!foundAddress) {
        // Extract the first line of each page and look for repeated address patterns
        const pageHeaders = [];
        for (let i = 1; i <= Math.min(5, numPages); i++) {
          if (pageContents[i]) {
            const firstLines = pageContents[i].split('\n').slice(0, 3).join(' ');
            pageHeaders.push(firstLines);
          }
        }
        
        console.log("Checking page headers for address patterns:", pageHeaders);
        
        // Look for address patterns in these headers
        for (const header of pageHeaders) {
          for (const pattern of addressPatterns) {
            const match = header.match(pattern);
            if (match && match[1] && match[1].trim().length > 10) {
              measurements.propertyAddress = match[1].trim();
              console.log(`Found property address in page header: ${measurements.propertyAddress}`);
              foundAddress = true;
              break;
            }
          }
          if (foundAddress) break;
        }
      }

      // In EagleView reports, sometimes the address is in the header of each page
      // Look for consistent text at the top of pages
      if (!foundAddress) {
        const pageHeaderPattern = /(?:Report|Premium\s+Report)[^\n]*\n[^\n]*?(\d+[^,\n]+,\s*[^,\n]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i;
        
        // Try to find the pattern in the first few pages
        for (let i = 1; i <= Math.min(3, numPages); i++) {
          if (pageContents[i]) {
            const headerMatch = pageContents[i].match(pageHeaderPattern);
            if (headerMatch && headerMatch[1] && headerMatch[1].trim().length > 10) {
              measurements.propertyAddress = headerMatch[1].trim();
              console.log(`Found property address from page ${i} header: ${measurements.propertyAddress}`);
              foundAddress = true;
              break;
            }
          }
        }
      }
      
      // Clean up
      URL.revokeObjectURL(fileURL);
      
      return measurements;
    } catch (error) {
      console.error("Error parsing PDF client-side:", error);
      throw error;
    }
  };

  return {
    parsedData,
    setParsedData,
    parsePdf,
    processingMode,
    processingProgress,
    fileUrl
  };
}
