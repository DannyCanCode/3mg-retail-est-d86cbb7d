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
          /roof\s+pitch\s+table/i.test(row.text)
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
          
          for (const item of row.items) {
            // Only process non-empty items
            if (!item.str.trim()) continue;
            
            // Check which column this item is closest to
            const distToPitchCol = Math.abs(item.x - pitchColX);
            const distToAreaCol = Math.abs(item.x - areaColX);
            const distToPercentCol = Math.abs(item.x - percentColX);
            
            // Find the minimum distance
            const minDist = Math.min(
              pitchColX >= 0 ? distToPitchCol : Infinity, 
              areaColX >= 0 ? distToAreaCol : Infinity, 
              percentColX >= 0 ? distToPercentCol : Infinity
            );
            
            // Assign to appropriate column
            if (minDist === distToPitchCol && pitchColX >= 0) {
              // Check if this looks like a pitch value
              if (/\d+\/\d+/.test(item.str)) {
                pitchValue = item.str;
              }
            } else if (minDist === distToAreaCol && areaColX >= 0) {
              // Parse as a number, removing commas
              const parsed = parseFloat(item.str.replace(/,/g, ''));
              if (!isNaN(parsed)) {
                areaValue = parsed;
              }
            } else if (minDist === distToPercentCol && percentColX >= 0) {
              // Parse percentage, removing % sign
              const parsed = parseFloat(item.str.replace(/[%\s]/g, ''));
              if (!isNaN(parsed)) {
                percentValue = parsed;
              }
            }
          }
          
          // Only add if we found a potential pitch and area
          if (pitchValue && areaValue > 0) {
            // Check if it's a valid pitch format
            if (isValidPitch(pitchValue) || /^\d+\/\d+$/.test(pitchValue)) {
              // Fix common OCR errors in pitches - ensure it's X/12 format
              if (!/\/12$/.test(pitchValue) && /\/\d+$/.test(pitchValue)) {
                const numerator = pitchValue.split('/')[0];
                pitchValue = `${numerator}/12`;
                console.log(`Corrected pitch format to ${pitchValue}`);
              }
              
              // Add to our arrays if it's a valid pitch
              if (isValidPitch(pitchValue)) {
                pitches.push(pitchValue);
                areas.push(areaValue);
                percentages.push(percentValue);
                console.log(`Extracted row from table: Pitch ${pitchValue}, Area ${areaValue}, ${percentValue}%`);
              } else {
                console.log(`Skipping invalid pitch format: ${pitchValue}`);
              }
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
      
      // If we found a valid table, use it
      if (extractedTableData && extractedTableData.pitches.length > 0) {
        const { pitches, areas, percentages } = extractedTableData;
        
        // Calculate total area from areas in the table
        const tableTotalArea = areas.reduce((sum, area) => sum + area, 0);
        console.log(`Table total area: ${tableTotalArea} sq ft`);
        
        // Cross-check percentages to validate our extraction
        const totalPercentage = percentages.reduce((sum, pct) => sum + pct, 0);
        console.log(`Total percentage from table: ${totalPercentage}%`);
        
        // If total percentage is close to 100%, we have a valid table
        const isValidPercentage = totalPercentage >= 95 && totalPercentage <= 105;
        console.log(`Percentage validation: ${isValidPercentage ? 'PASSED' : 'FAILED'}`);
        
        // If we don't already have a total area, use the table total
        if (measurements.totalArea === 0) {
          measurements.totalArea = tableTotalArea;
          console.log(`Setting total area from table: ${tableTotalArea} sq ft`);
        }
        
        // Assign areas to pitches
        pitches.forEach((pitch, idx) => {
          // Normalize pitch format (using colon for the app)
          const normalizedPitch = pitch.includes(':') ? pitch : pitch.replace('/', ':');
          
          // Get area for this pitch
          const area = areas[idx];
          
          // Add to measurements
          measurements.areasByPitch[normalizedPitch] = area;
          console.log(`Assigned ${area} sq ft (${percentages[idx]}%) to pitch ${normalizedPitch}`);
          
          // If this is the largest area, it's the predominant pitch
          if (!measurements.predominantPitch || 
              (area > (measurements.areasByPitch[measurements.predominantPitch] || 0))) {
            measurements.predominantPitch = normalizedPitch;
            console.log(`Set ${normalizedPitch} as predominant pitch with ${area} sq ft (${percentages[idx]}%)`);
          }
        });
        
        console.log("Successfully processed pitch table data");
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

          // Extract rows of the table - look for rows containing both pitch values and numbers
          const tableRows = areasPerPitchSection.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && 
              (validPitchPattern.test(line) || 
               /Area\s+\(sq\s+ft\)/.test(line) || 
               /\%\s+of\s+Roof/.test(line))
          );

          console.log("Extracted table rows:", tableRows);

          // Try to find the column of pitch values - we'll try multiple patterns
          const pitchHeaderPatterns = [
            // Pattern 1: "Roof Pitches 1/12 2/12 5/12" (on one line)
            new RegExp(`Roof\\s+Pitches\\s+((?:\\d{1,2}\\/12\\s+)*\\d{1,2}\\/12)`, 'i'),
            
            // Pattern 2: Look for a line with just pitch values (after "Roof Pitches" appearing earlier)
            new RegExp(`(?:Roof\\s+Pitches.*?)(?:\\n.*?)?\\s*?^((?:\\d{1,2}\\/12\\s+)*\\d{1,2}\\/12)`, 'im'),
            
            // Pattern 3: Just look for a line with multiple pitches in the expected format
            new RegExp(`^\\s*((?:\\d{1,2}\\/12\\s+)+\\d{1,2}\\/12)\\s*$`, 'm'),
            
            // Pattern 4: Explicitly extract from table cells - look for individual pitches in a row
            new RegExp(`Roof\\s+Pitches[^\\n]*\\n[^\\n]*?((?:\\d{1,2}\\/12)[^\\n]*?)(?:\\n|$)`, 'i')
          ];

          // If we find multiple valid pitch values in the section but the regular patterns don't work,
          // we can try to use them directly
          let foundSpecificPitches = false;
          if (validPitches.length > 0 && validPitches.length <= 8) { // Reasonable limit for number of pitches
            console.log("Using directly extracted valid pitch values");
            pitchHeaders = [...new Set(validPitches)]; // Remove duplicates
            foundHorizontalTable = true;
            foundSpecificPitches = true;
          }

          // If we couldn't extract valid pitches, try the pattern-based approach
          if (pitchHeaders.length === 0) {
            for (const pattern of pitchHeaderPatterns) {
              const headerMatch = areasPerPitchSection.match(pattern);
              if (headerMatch && headerMatch[1]) {
                const potentialPitches = headerMatch[1].trim().split(/\s+/);
                // Only use pitches that pass validation
                const validHeaderPitches = potentialPitches.filter(isValidPitch);
                
                if (validHeaderPitches.length > 0) {
                  pitchHeaders = validHeaderPitches;
                  console.log(`Detected ${pitchHeaders.length} valid pitch headers using pattern:`, pattern, pitchHeaders);
                  foundHorizontalTable = true;
                  break;
                }
              }
            }
          }

          // If we still couldn't find valid pitches, look for any X/12 pitch values in the entire text
          if (pitchHeaders.length === 0) {
            console.log("No valid pitches found in section, searching entire document");
            const allDocumentPitches = Array.from(fullText.matchAll(/(\d{1,2}\/12)/g)).map(m => m[1]);
            const uniqueValidPitches = [...new Set(allDocumentPitches.filter(isValidPitch))];
            
            if (uniqueValidPitches.length > 0) {
              pitchHeaders = uniqueValidPitches;
              console.log("Found valid pitches from entire document:", pitchHeaders);
              foundHorizontalTable = true;
              foundSpecificPitches = true;
            }
          }

          // FINAL FALLBACK: If we still don't have any pitches but have a predominant pitch, use that
          if (pitchHeaders.length === 0 && measurements.predominantPitch) {
            // Convert from x:12 to x/12 format
            const pitchValue = measurements.predominantPitch.replace(':', '/');
            if (isValidPitch(pitchValue)) {
              pitchHeaders = [pitchValue];
              console.log("Using predominant pitch as fallback:", pitchHeaders);
              foundHorizontalTable = true;
              foundSpecificPitches = true;
            }
          }

          // If we found pitch headers, look for the corresponding area values
          if (foundHorizontalTable && pitchHeaders.length > 0) {          
            // Declare areaValues at the beginning of the block
            let areaValues: number[] = [];
            
            // Look for all numbers that could be area values
            // Focus on larger numbers which are more likely to be areas
            const allTableNumbers = Array.from(
              areasPerPitchSection.matchAll(/(\d+(?:[.,]\d+)?)/g)
            ).map(m => parseFloat(m[1].replace(/,/g, '')));

            // Filter out small numbers that are likely not areas
            const potentialAreaNumbers = allTableNumbers.filter(num => num > 10);
            console.log("All possible area values (>10) in the section:", potentialAreaNumbers);
            
            // First check if we have area values in the PDF
            const areaValuePattern = /(\d+(?:\.\d+)?)(?:\s*sq\s*ft)?/i;
            const areaRowText = Object.values(pageContents).join(" ");
            const potentialAreaValues = Array.from(areaRowText.matchAll(/(\d+(?:\.\d+)?)(?:\s*sq\s*ft)?/gi))
              .map(m => parseFloat(m[1]))
              .filter(n => !isNaN(n) && n > 0);

            console.log("Found potential area values:", potentialAreaValues);

            // If we have at least as many area values as pitch headers, try to use them
            if (potentialAreaValues.length >= pitchHeaders.length) {
              // Use the largest values first as they're more likely to be areas
              const sortedAreaValues = [...potentialAreaValues].sort((a, b) => b - a).slice(0, pitchHeaders.length);
              console.log("Using sorted area values:", sortedAreaValues);
              
              // Calculate total of these values
              const totalExtracted = sortedAreaValues.reduce((sum, val) => sum + val, 0);
              
              // If the total is reasonably close to our expected total area, use these values
              if (totalExtracted > measurements.totalArea * 0.7 && totalExtracted < measurements.totalArea * 1.3) {
                console.log(`Using extracted area values (total ${totalExtracted.toFixed(1)} sq ft)`);
                
                // Scale values to match total area
                const scaleFactor = measurements.totalArea / totalExtracted;
                const adjustedAreas = sortedAreaValues.map(area => area * scaleFactor);
                
                pitchHeaders.forEach((pitch, index) => {
                  const normalizedPitch = pitch.replace('/', ':');
                  const areaForPitch = index < adjustedAreas.length ? adjustedAreas[index] : 0;
                  measurements.areasByPitch[normalizedPitch] = areaForPitch;
                  console.log(`Assigned ${areaForPitch.toFixed(1)} sq ft to pitch ${normalizedPitch}`);
                });
              } else {
                // Fallback with more dynamic distribution - don't hardcode 95%
                console.log("Area values don't match total area, using dynamic distribution");
                
                // Use a more reasonable distribution - predominant pitch gets most but not hardcoded 95%
                const predominantShare = Math.min(0.85, 1 - (0.05 * (pitchHeaders.length - 1)));
                const predominantArea = measurements.totalArea * predominantShare;
                const remainingArea = measurements.totalArea * (1 - predominantShare);
                
                // Find which pitch is likely the predominant one
                let predominantPitchIndex = 0;
                if (measurements.predominantPitch) {
                  const normPredominant = measurements.predominantPitch.replace(':', '/');
                  predominantPitchIndex = pitchHeaders.findIndex(p => p === normPredominant);
                  if (predominantPitchIndex < 0) predominantPitchIndex = 0;
                }
                
                pitchHeaders.forEach((pitch, index) => {
                  const normalizedPitch = pitch.replace('/', ':');
                  
                  if (index === predominantPitchIndex) {
                    measurements.areasByPitch[normalizedPitch] = predominantArea;
                    console.log(`Assigned ${predominantArea.toFixed(1)} sq ft (${(predominantShare*100).toFixed(0)}%) to predominant pitch ${normalizedPitch}`);
                  } else {
                    // Distribute remaining area equally among other pitches
                    const otherPitchCount = pitchHeaders.length - 1;
                    const areaPerPitch = otherPitchCount > 0 ? remainingArea / otherPitchCount : 0;
                    measurements.areasByPitch[normalizedPitch] = areaPerPitch;
                    console.log(`Assigned ${areaPerPitch.toFixed(1)} sq ft to secondary pitch ${normalizedPitch}`);
                  }
                });
              }
            } else {
              // Fallback with more dynamic distribution - don't hardcode 95%
              console.log("Not enough area values found, using dynamic distribution");
              
              // Use a more reasonable distribution - predominant pitch gets most but not hardcoded 95%
              const predominantShare = Math.min(0.85, 1 - (0.05 * (pitchHeaders.length - 1)));
              const predominantArea = measurements.totalArea * predominantShare;
              const remainingArea = measurements.totalArea * (1 - predominantShare);
              
              // Find which pitch is likely the predominant one
              let predominantPitchIndex = 0;
              if (measurements.predominantPitch) {
                const normPredominant = measurements.predominantPitch.replace(':', '/');
                predominantPitchIndex = pitchHeaders.findIndex(p => p === normPredominant);
                if (predominantPitchIndex < 0) predominantPitchIndex = 0;
              }
              
              pitchHeaders.forEach((pitch, index) => {
                const normalizedPitch = pitch.replace('/', ':');
                
                if (index === predominantPitchIndex) {
                  measurements.areasByPitch[normalizedPitch] = predominantArea;
                  console.log(`Assigned ${predominantArea.toFixed(1)} sq ft (${(predominantShare*100).toFixed(0)}%) to predominant pitch ${normalizedPitch}`);
                } else {
                  // Distribute remaining area equally among other pitches
                  const otherPitchCount = pitchHeaders.length - 1;
                  const areaPerPitch = otherPitchCount > 0 ? remainingArea / otherPitchCount : 0;
                  measurements.areasByPitch[normalizedPitch] = areaPerPitch;
                  console.log(`Assigned ${areaPerPitch.toFixed(1)} sq ft to secondary pitch ${normalizedPitch}`);
                }
              });
            }
          } else {
            console.warn("Could not find matching area values for pitches in horizontal table");
            foundHorizontalTable = false;
          }
        }
        
        // Check for pitch information in the Pitch Diagram section
        if (Object.keys(measurements.areasByPitch).length === 0 || 
            Object.values(measurements.areasByPitch).reduce((sum, area) => sum + area, 0) < measurements.totalArea * 0.9) {
          
          console.log("Looking for pitch data in Pitch Diagram section");
          
          // Search for the pitch diagram section
          const pitchDiagramSectionRegex = /PITCH\s+DIAGRAM[\s\S]*?(?:PAGE|NOTE|\d{1,2}\/\d{1,2}\/\d{4})/i;
          const pitchDiagramMatch = fullText.match(pitchDiagramSectionRegex);
          
          if (pitchDiagramMatch) {
            console.log("Found Pitch Diagram section");
            const pitchDiagramText = pitchDiagramMatch[0];
            
            // Extract all pitch values mentioned in this section
            const pitchValues = Array.from(pitchDiagramText.matchAll(/(?:predominant|pitch|roof)\s+(?:is|on)\s+(\d+\/\d+)/gi))
              .map(match => match[1])
              .filter(Boolean);
            
            // Try to find a predominant pitch statement
            const predominantPitchMatch = pitchDiagramText.match(/predominant\s+pitch\s+(?:is|on)\s+(\d+\/\d+)/i);
            
            if (predominantPitchMatch && measurements.totalArea > 0 && Object.keys(measurements.areasByPitch).length === 0) {
              // If we have a predominant pitch and total area but no areas by pitch,
              // assume the predominant pitch covers most of the roof
              const predominantPitch = predominantPitchMatch[1];
              const normalizedPitch = predominantPitch.replace('/', ':');
              
              // Check if we already have this pitch in our areas
              if (!measurements.areasByPitch[normalizedPitch]) {
                // Use a more dynamic distribution - predominant gets most but not hardcoded 95%
                const otherPitchCount = pitchValues.length - 1;
                const predominantShare = Math.min(0.85, 1 - (0.05 * otherPitchCount));
                const area = measurements.totalArea * predominantShare;
                measurements.areasByPitch[normalizedPitch] = area;
                console.log(`Using predominant pitch ${normalizedPitch} for ${area.toFixed(1)} sq ft (${(predominantShare*100).toFixed(0)}% of total area)`);
              }
            }
            
            // Check if we have enough of the roof area covered
            const currentTotalPitchArea = Object.values(measurements.areasByPitch).reduce((sum, area) => sum + area, 0);
            if (pitchValues.length > 0 && currentTotalPitchArea < measurements.totalArea * 0.9) {
              // We still don't have enough of the roof covered, try to find all mentioned pitches
              console.log(`Only found ${currentTotalPitchArea.toFixed(1)} sq ft in pitch areas out of ${measurements.totalArea} total`);
              
              // Look for any additional pitch values from the diagram
              for (const pitchValue of pitchValues) {
                const normalizedPitch = pitchValue.replace('/', ':');
                
                // If we don't already have this pitch, try to estimate its area
                if (!measurements.areasByPitch[normalizedPitch]) {
                  // Get remaining area not accounted for
                  const remainingArea = measurements.totalArea - currentTotalPitchArea;
                  
                  // If it's the predominant pitch, give it most of the remaining area
                  const isPredominant = predominantPitchMatch && predominantPitchMatch[1] === pitchValue;
                  const estimatedArea = isPredominant ? 
                    remainingArea * 0.9 : // 90% of remaining area for predominant pitch
                    remainingArea / (pitchValues.length - Object.keys(measurements.areasByPitch).length); // Equal distribution
                  
                  measurements.areasByPitch[normalizedPitch] = estimatedArea;
                  console.log(`Estimated ${normalizedPitch} pitch with ${estimatedArea.toFixed(1)} sq ft from pitch diagram`);
                }
              }
            }
          }
        }
      }
      
      // If we couldn't extract from the "Areas per Pitch" section, try looking for table-like structures
      if (Object.keys(measurements.areasByPitch).length === 0) {
        console.log("Trying to extract pitch areas from table-like structures");
        
        // Look for table-like patterns with rows containing pitch and area
        // This handles cases where the PDF has a table with columns for pitch and area
        for (let i = 1; i <= numPages; i++) {
          if (pageContents[i] && (pageContents[i].includes('/12') || pageContents[i].includes(':12'))) {
            console.log(`Analyzing page ${i} for pitch and area data`);
            
            // Look for patterns like "5/12    315.2    6.1%" or similar table structures
            const tableRowRegex = /(\d+(?:\/|:)\d+)\s+([0-9,\.]+)\s+(?:\(?\s*([0-9\.]+)\s*%\)?)?/g;
            let tableMatch;
            
            while ((tableMatch = tableRowRegex.exec(pageContents[i])) !== null) {
              const pitch = tableMatch[1];
              const area = parseFloat(tableMatch[2].replace(/,/g, ''));
              
              if (!isNaN(area)) {
                // Normalize pitch format (using colon for the app)
                const pitchKey = pitch.includes(':') ? pitch : pitch.replace('/', ':');
                
                measurements.areasByPitch[pitchKey] = area;
                console.log(`Mapped pitch ${pitchKey} to area ${area} sq ft (from table structure)`);
              }
            }
          }
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
          
          for (const [pitch, area] of Object.entries(measurements.areasByPitch)) {
            measurements.areasByPitch[pitch] = area * scaleFactor;
            console.log(`Scaled ${pitch} area to ${measurements.areasByPitch[pitch].toFixed(1)} sq ft`);
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
