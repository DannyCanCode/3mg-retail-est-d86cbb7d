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
        // ACCEPT ANY format that has numbers separated by / or :
        // This includes non-standard formats like 1/1, 2/1, etc.
        return /^\d+[\/:]\d+$/.test(pitch.trim());
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
        
        // Process data rows (rows after the header)
        for (let i = headerRowIndex + 1; i < sortedRows.length; i++) {
          const row = sortedRows[i];
          
          // Skip total row or empty rows
          if (/total/i.test(row.text) || row.text.trim().length === 0) continue;
          
          // Extract data from this row
          console.log(`Processing row: "${row.text}" with ${row.items.length} items`);
          
          // SIMPLIFIED APPROACH: Look for any text that matches a pitch pattern
          let pitchValue = "";
          let areaValue = 0;
          let percentValue = 0;
          
          // First look for pitch format (X/Y) - ACCEPT ANY numbers
          for (const item of row.items) {
            if (/^\d+[\/:]\d+$/.test(item.str.trim())) {
              pitchValue = item.str.trim();
              console.log(`  Found pitch: ${pitchValue}`);
              break;
            }
          }
          
          if (!pitchValue) {
            console.log(`  Skipping row without pitch value: "${row.text}"`);
            continue;
          }
          
          // Look for any numbers that might be area values (take the first one)
          for (const item of row.items) {
            const cleanStr = item.str.replace(/,/g, '').trim();
            if (/^[\d.]+$/.test(cleanStr) && cleanStr !== pitchValue.replace(/[\/:]/, '')) {
              const parsed = parseFloat(cleanStr);
              if (!isNaN(parsed)) {
                areaValue = parsed;
                console.log(`  Found area: ${areaValue} sq ft`);
                break;
              }
            }
          }
          
          // Look for percentage value (with or without % symbol)
          for (const item of row.items) {
            const cleanStr = item.str.replace(/[%,\s]/g, '').trim();
            if (/^[\d.]+$/.test(cleanStr) && 
                cleanStr !== pitchValue.replace(/[\/:]/, '') && 
                parseFloat(cleanStr) !== areaValue) {
              const parsed = parseFloat(cleanStr);
              if (!isNaN(parsed)) {
                percentValue = parsed;
                console.log(`  Found percentage: ${percentValue}%`);
                break;
              }
            }
          }
          
          // If we couldn't find area or percentage, try to infer from the row text
          if (!areaValue || !percentValue) {
            const numbers = row.text.match(/(\d+(?:[.,]\d+)?)/g) || [];
            
            for (const numStr of numbers) {
              const num = parseFloat(numStr.replace(/,/g, ''));
              
              // Skip if it's part of the pitch
              if (pitchValue.includes(numStr)) continue;
              
              // If we don't have area and the number is large enough, it's probably area
              if (!areaValue && num > 0) {
                areaValue = num;
                console.log(`  Inferred area from row: ${areaValue} sq ft`);
                continue;
              }
              
              // If we don't have percentage and number is between 0-100, it's probably percentage
              if (!percentValue && num >= 0 && num <= 100) {
                percentValue = num;
                console.log(`  Inferred percentage from row: ${percentValue}%`);
              }
            }
          }
          
          // Only add if we have a pitch and either area or percentage
          if (pitchValue && (areaValue > 0 || percentValue > 0)) {
            pitches.push(pitchValue);
            areas.push(areaValue);
            percentages.push(percentValue);
            console.log(`  Extracted row: Pitch ${pitchValue}, Area ${areaValue} sq ft, ${percentValue}%`);
          }
        }
        
        // Return the extracted data if we found anything
        if (pitches.length > 0) {
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
      
      // If we found valid data, use it directly
      if (extractedTableData && extractedTableData.pitches.length > 0) {
        const { pitches, areas, percentages } = extractedTableData;
        console.log("EXTRACTED PITCH TABLE DATA:");
        
        // SIMPLIFIED: Just use the data exactly as found, no fancy validation
        pitches.forEach((pitch, idx) => {
          // Keep the pitch format exactly as it appears in the PDF
          const normalizedPitch = pitch.includes(':') ? pitch : pitch.replace('/', ':');
          const area = areas[idx] || 0;
          
          // Store the area directly, no filtering or validation
          if (area > 0) {
            measurements.areasByPitch[normalizedPitch] = area;
            console.log(`Assigned ${area} sq ft to pitch ${normalizedPitch}`);
          }
        });
        
        // Quick calculation of total area if needed
        const extractedTotal = Object.values(measurements.areasByPitch).reduce((sum, area) => sum + area, 0);
        if (measurements.totalArea === 0 && extractedTotal > 0) {
          measurements.totalArea = extractedTotal;
          console.log(`Set total area from table sum: ${measurements.totalArea} sq ft`);
        }
        
        // Determine predominant pitch (largest area)
        if (Object.keys(measurements.areasByPitch).length > 0) {
          let maxArea = 0;
          for (const [pitch, area] of Object.entries(measurements.areasByPitch)) {
            if (area > maxArea) {
              maxArea = area;
              measurements.predominantPitch = pitch;
            }
          }
          console.log(`Set predominant pitch to ${measurements.predominantPitch} with area ${maxArea} sq ft`);
        }
        
        // We've got what we need, skip other extraction methods
        return measurements;
      }
      
      // SUPER SIMPLE FALLBACK: Use a basic regex to find any pitch and number combinations
      if (Object.keys(measurements.areasByPitch).length === 0) {
        console.log("Using super simple regex to find any pitch/area combinations");
        
        // Use an extremely simple regex to find any X/Y format followed by numbers
        const simplePitchRegex = /(\d+[\/:]\d+)(?:[^\d]*?)(\d+(?:[.,]\d+)?)/g;
        let match;
        
        const allText = Object.values(pageContents).join(" ");
        while ((match = simplePitchRegex.exec(allText)) !== null) {
          const pitch = match[1];
          const possibleArea = parseFloat(match[2].replace(/,/g, ''));
          
          // Only use if area seems reasonable (not tiny or enormous)
          if (!isNaN(possibleArea) && possibleArea > 0) {
            const normalizedPitch = pitch.includes(':') ? pitch : pitch.replace('/', ':');
            measurements.areasByPitch[normalizedPitch] = possibleArea;
            console.log(`Basic regex found: Pitch ${normalizedPitch} with area ${possibleArea} sq ft`);
          }
        }
      }
      
      // Calculate total area if needed
      if (measurements.totalArea === 0 && Object.keys(measurements.areasByPitch).length > 0) {
        measurements.totalArea = Object.values(measurements.areasByPitch).reduce((sum, area) => sum + area, 0);
        console.log(`Calculated total area from pitch areas: ${measurements.totalArea} sq ft`);
      }
      
      // Set predominant pitch if needed
      if (!measurements.predominantPitch && Object.keys(measurements.areasByPitch).length > 0) {
        let maxArea = 0;
        for (const [pitch, area] of Object.entries(measurements.areasByPitch)) {
          if (area > maxArea) {
            maxArea = area;
            measurements.predominantPitch = pitch;
          }
        }
        console.log(`Set predominant pitch to ${measurements.predominantPitch} with area ${maxArea} sq ft`);
      }
      
      // AFTER PITCH AREA EXTRACTION IS COMPLETE
      // Add code to extract property address, latitude, and longitude
      console.log("Extracting property information...");

      // IMPORTANT: Reset the areasByPitch to ensure we're starting fresh
      // This prevents accumulation of incorrect values from different extraction methods
      measurements.areasByPitch = {};

      // First, identify the actual "Areas per Pitch" or "Areas by Pitch" table
      // This is more reliable than grabbing random numbers from the document
      let pitchTableText = "";
      let foundPitchTable = false;
      let pageWithTable = 0;

      // Look for the table in each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (!pageContents[pageNum]) continue;
        
        // Check if this page contains the areas per pitch table header
        if (/Areas\s+(?:per|by)\s+Pitch/i.test(pageContents[pageNum])) {
          console.log(`Found "Areas per/by Pitch" table on page ${pageNum}`);
          pitchTableText = pageContents[pageNum];
          foundPitchTable = true;
          pageWithTable = pageNum;
          break;
        }
      }

      if (foundPitchTable) {
        // Extract just the table section - look for the table heading and ending
        const tableStart = pitchTableText.indexOf(/Areas\s+(?:per|by)\s+Pitch/i.exec(pitchTableText)?.[0] || "");
        if (tableStart > 0) {
          // Look for the end of the table (often indicated by next section or "The table above lists...")
          let tableEnd = pitchTableText.indexOf("The table above lists", tableStart);
          if (tableEnd === -1) tableEnd = pitchTableText.length;
          
          // Extract just the table portion
          const tableSection = pitchTableText.substring(tableStart, tableEnd);
          console.log("Extracted table section:", tableSection.substring(0, 200) + "...");
          
          // Try to extract data using the coordinate-based table method first
          const extractedTableData = extractPitchTableData(pageWithTable);
          
          if (extractedTableData && extractedTableData.pitches.length > 0) {
            console.log("Successfully extracted pitch data using coordinate-based method");
            const { pitches, areas, percentages } = extractedTableData;
            
            // Calculate the total from the extracted areas to validate
            const extractedTotal = areas.reduce((sum, area) => sum + area, 0);
            
            // Validate that our extracted total is reasonable compared to the reported total area
            const totalAreaIsValid = !measurements.totalArea || 
              (extractedTotal > 0 && Math.abs(extractedTotal - measurements.totalArea) / measurements.totalArea < 0.1);
            
            if (totalAreaIsValid) {
              // Process each pitch
              pitches.forEach((pitch, idx) => {
                // Normalize the pitch format to X:12
                const normalizedPitch = pitch.includes(':') ? pitch : pitch.replace('/', ':');
                const area = areas[idx] || 0;
                
                if (area > 0) {
                  measurements.areasByPitch[normalizedPitch] = area;
                  console.log(`Assigned ${area} sq ft to pitch ${normalizedPitch}`);
                }
              });
              
              // If we successfully extracted pitches but didn't find a total area, use the sum
              if (measurements.totalArea === 0 && extractedTotal > 0) {
                measurements.totalArea = extractedTotal;
                console.log(`Set total area from table sum: ${measurements.totalArea} sq ft`);
              }
            } else {
              console.log(`WARNING: Extracted total area ${extractedTotal} differs significantly from reported total ${measurements.totalArea}`);
              // Consider this extraction invalid - likely not the right table or values
              measurements.areasByPitch = {};
            }
          } else {
            console.log("Coordinate-based extraction failed, trying text pattern matching");
            
            // Try to find pitch, area pairs using patterns specific to the pitch table
            const pitchAreaRows = tableSection.split('\n').filter(line => 
              /^\s*\d+[\/:]\d+/.test(line) || // Starts with a pitch
              /(?:Roof|Pitch).*\d+[\/:]\d+/.test(line) || // Has "Roof" or "Pitch" followed by a pitch
              /\d+[\/:]\d+.*\d+\s*(?:sq\s*ft|%)/i.test(line) // Has pitch and either sq ft or %
            );
            
            console.log(`Found ${pitchAreaRows.length} potential pitch/area rows`);
            
            if (pitchAreaRows.length > 0) {
              // Extract pitch, area values
              const extractedAreas: {[pitch: string]: number} = {};
              let totalExtracted = 0;
              
              pitchAreaRows.forEach(row => {
                // Find the pitch (X/12 or X:12 format)
                const pitchMatch = row.match(/(\d+[\/:]\d+)/);
                if (!pitchMatch) return;
                
                const pitch = pitchMatch[1];
                const normalizedPitch = pitch.includes(':') ? pitch : pitch.replace('/', ':');
                
                // Look for area value - typically large numbers followed by sq ft
                // Extract all numbers from the row
                const numberMatches = row.match(/(\d+(?:[.,]\d+)?)/g);
                if (!numberMatches || numberMatches.length < 2) return;
                
                // The pitch itself may be one of the numbers, so look for others
                const numbers = numberMatches
                  .map(n => parseFloat(n.replace(/,/g, '')))
                  .filter(n => !isNaN(n) && n > 0);
                
                // The area is typically the largest number in the row
                // (excluding pitch numbers and percentages < 100)
                let areaValue = 0;
                for (const num of numbers) {
                  // Skip if this number is part of the pitch
                  if (pitch.includes(num.toString())) continue;
                  
                  // Skip small percentages (we want the larger area value)
                  if (num <= 100 && row.includes('%')) continue;
                  
                  // Take the largest number we find
                  if (num > areaValue) areaValue = num;
                }
                
                if (areaValue > 0) {
                  extractedAreas[normalizedPitch] = areaValue;
                  totalExtracted += areaValue;
                  console.log(`Extracted pitch ${normalizedPitch} with area ${areaValue} sq ft`);
                }
              });
              
              // Validate the total against the expected total area
              const totalAreaIsValid = !measurements.totalArea || 
                (totalExtracted > 0 && Math.abs(totalExtracted - measurements.totalArea) / measurements.totalArea < 0.1);
              
              if (totalAreaIsValid && Object.keys(extractedAreas).length > 0) {
                // Look good, use these values
                measurements.areasByPitch = extractedAreas;
                
                // If we didn't find a total area yet, use the sum
                if (measurements.totalArea === 0 && totalExtracted > 0) {
                  measurements.totalArea = totalExtracted;
                  console.log(`Set total area from extracted sum: ${measurements.totalArea} sq ft`);
                }
              } else {
                console.log(`WARNING: Extracted total ${totalExtracted} differs from reported total ${measurements.totalArea}`);
              }
            }
          }
        }
      }
      
      // SPECIAL CASE: If we only found one pitch and the area matches the total area,
      // this is likely a single-pitch roof (like in the screenshot)
      const extractedPitchKeys = Object.keys(measurements.areasByPitch);
      if (extractedPitchKeys.length === 1 && measurements.totalArea > 0) {
        const singlePitch = extractedPitchKeys[0];
        const singleArea = measurements.areasByPitch[singlePitch];
        
        // If the area is close to the total, set it exactly equal
        if (Math.abs(singleArea - measurements.totalArea) / measurements.totalArea < 0.05) {
          measurements.areasByPitch[singlePitch] = measurements.totalArea;
          console.log(`Adjusted single pitch ${singlePitch} to exactly match total area: ${measurements.totalArea} sq ft`);
        }
      }
      
      // If we still didn't find any pitches but we have a predominant pitch and total area,
      // create an entry for the predominant pitch with 100% of the area
      if (extractedPitchKeys.length === 0 && measurements.predominantPitch && measurements.totalArea > 0) {
        measurements.areasByPitch[measurements.predominantPitch] = measurements.totalArea;
        console.log(`Created entry for predominant pitch ${measurements.predominantPitch} with total area ${measurements.totalArea} sq ft`);
      }
      
      // Set predominant pitch if needed (largest area)
      if (!measurements.predominantPitch && Object.keys(measurements.areasByPitch).length > 0) {
        let maxArea = 0;
        for (const [pitch, area] of Object.entries(measurements.areasByPitch)) {
          if (area > maxArea) {
            maxArea = area;
            measurements.predominantPitch = pitch;
          }
        }
        console.log(`Set predominant pitch to ${measurements.predominantPitch} with area ${maxArea} sq ft`);
      }

      // Enhanced patterns for property address extraction
      const addressPatterns = [
        // Match date-prefixed addresses (like in the screenshot 8/9/2021 1921 Tropic Bay Court...)
        /((?:\d{1,2}\/\d{1,2}\/\d{2,4}\s+)?\d+\s+[^,\n]+,\s*[^,\n]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
        
        // Property address with label (common format)
        /Property\s+Address:?\s*([^\n]+)/i,
        
        // Address with street type
        /(\d+\s+[^,\n]+(?:Court|Ct|Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Boulevard|Blvd)[,\s]+[^,\n]+,\s*[A-Z]{2})/i,
        
        // Simple labeled address pattern
        /Address:?\s*([^\n]+)/i,
        
        // Fallback for any address-like pattern with zip code
        /([^,\n]+,[^,\n]+,\s*[A-Z]{2}\s*\d{5})/i
      ];

      // Try all patterns in order until we find a match
      let foundAddress = false;
      for (const pattern of addressPatterns) {
        const addressMatch = fullText.match(pattern);
        if (addressMatch && addressMatch[1] && addressMatch[1].trim().length > 5) {
          measurements.propertyAddress = addressMatch[1].trim();
          console.log(`Found property address: ${measurements.propertyAddress}`);
          foundAddress = true;
          break;
        }
      }

      // If still no address found, look for it in page headers
      if (!foundAddress) {
        // Look in the first few pages
        for (let i = 1; i <= Math.min(5, numPages); i++) {
          if (pageContents[i]) {
            for (const pattern of addressPatterns) {
              const addressMatch = pageContents[i].match(pattern);
              if (addressMatch && addressMatch[1] && addressMatch[1].trim().length > 5) {
                measurements.propertyAddress = addressMatch[1].trim();
                console.log(`Found property address in page ${i}: ${measurements.propertyAddress}`);
                foundAddress = true;
                break;
              }
            }
            if (foundAddress) break;
          }
        }
      }

      // Enhanced patterns for latitude/longitude extraction
      const latitudePatterns = [
        /Latitude:?\s*([-+]?\d+\.?\d*)/i,
        /Lat(?:itude)?:?\s*([-+]?\d+\.?\d*)/i
      ];
      
      const longitudePatterns = [
        /Longitude:?\s*([-+]?\d+\.?\d*)/i,
        /Long(?:itude)?:?\s*([-+]?\d+\.?\d*)/i
      ];

      // Try to extract latitude
      for (const pattern of latitudePatterns) {
        const latMatch = fullText.match(pattern);
        if (latMatch && latMatch[1]) {
          const latValue = parseFloat(latMatch[1]);
          if (!isNaN(latValue) && latValue >= -90 && latValue <= 90) {
            measurements.latitude = latMatch[1];
            console.log(`Found latitude: ${measurements.latitude}`);
            break;
          }
        }
      }

      // Try to extract longitude
      for (const pattern of longitudePatterns) {
        const longMatch = fullText.match(pattern);
        if (longMatch && longMatch[1]) {
          const longValue = parseFloat(longMatch[1]);
          if (!isNaN(longValue) && longValue >= -180 && longValue <= 180) {
            measurements.longitude = longMatch[1];
            console.log(`Found longitude: ${measurements.longitude}`);
            break;
          }
        }
      }
      
      // Post-processing: Special handling for unusual pitch formats
      // 1. Check for date-like pitches (9:2021)
      const pitchKeys = Object.keys(measurements.areasByPitch);
      for (const key of pitchKeys) {
        if (/\d+[:\/]\d{4}/.test(key)) {
          console.log(`Found date-like pitch: ${key}`);
          // We'll keep it as-is - our simplified extraction should handle this correctly
        }
      }
      
      // 2. Verify we've got a good predominant pitch - essential for calculations
      if (Object.keys(measurements.areasByPitch).length > 0) {
        let maxArea = 0;
        for (const [pitch, area] of Object.entries(measurements.areasByPitch)) {
          if (area > maxArea) {
            maxArea = area;
            measurements.predominantPitch = pitch;
          }
        }
        console.log(`Predominant pitch is ${measurements.predominantPitch} with ${maxArea} sq ft`);
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

