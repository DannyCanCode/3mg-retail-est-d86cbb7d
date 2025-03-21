import { useState } from "react";
import { ParsedMeasurements, PitchArea } from "@/api/measurements";
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
// Add type imports
import { MeasurementValues } from "@/components/measurement/types";
import { convertAreasToArrayFormat } from "./debug-utils";

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
        
        // Debug log: Show all text items with their coordinates
        console.log(`Page ${pageNum} text items for pitch table:`, textItems.map(item => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5]
        })));
        
        // Group text items by their Y-coordinate (rounding to nearest integer to handle slight variations)
        const rowGroups: { [y: string]: Array<{str: string, x: number, y: number}> } = {};
        
        textItems.forEach(item => {
          const x = Math.round(item.transform[4]);
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
            y: parseFloat(y),
            items,
            text: items.map(i => i.str).join(' ').trim()
          }))
          .sort((b, a) => a.y - b.y);
        
        // Debug log: Show sorted rows
        console.log("Sorted rows for pitch table:", sortedRows);
        
        // Look for table start
        let tableStartIdx = -1;
        for (let i = 0; i < sortedRows.length; i++) {
          if (/Areas\s*(?:per|by)\s*Pitch/i.test(sortedRows[i].text)) {
            tableStartIdx = i;
            console.log("Found pitch table start at row", i, "with text:", sortedRows[i].text);
            break;
          }
        }
        
        if (tableStartIdx === -1) return null;
        
        const pitches: string[] = [];
        const areas: number[] = [];
        const percentages: number[] = [];
        
        // Look for the three rows we need after the table header
        for (let i = tableStartIdx + 1; i < Math.min(tableStartIdx + 10, sortedRows.length); i++) {
          const rowText = sortedRows[i].text.trim();
          
          // Extract pitches from the "Roof Pitches" row
          if (/Roof\s*Pitches/.test(rowText)) {
            const pitchMatches = rowText.match(/\d+\/12/g);
            if (pitchMatches) {
              pitches.push(...pitchMatches);
              console.log("Found pitches:", pitchMatches);
            }
          }
          
          // Extract areas from the "Area (sq ft)" row
          if (/Area.*sq.*ft/.test(rowText)) {
            const areaMatches = rowText.match(/\d+\.?\d*/g);
            if (areaMatches) {
              areas.push(...areaMatches.map(a => parseFloat(a)));
              console.log("Found areas:", areas);
            }
          }
          
          // Extract percentages from the "% of Roof" row
          if (/%\s*of\s*Roof/.test(rowText)) {
            const percentageMatches = rowText.match(/\d+\.?\d*(?=%)/g);
            if (percentageMatches) {
              percentages.push(...percentageMatches.map(p => parseFloat(p)));
              console.log("Found percentages:", percentages);
            }
          }
        }
        
        // Verify we have matching data
        if (pitches.length > 0 && pitches.length === areas.length && pitches.length === percentages.length) {
          console.log("Successfully extracted pitch table data:", {
            pitches,
            areas,
            percentages
          });
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
      
      // If we found valid data from coordinate-based extraction, use it
      if (extractedTableData && extractedTableData.pitches.length > 0) {
        const { pitches, areas, percentages } = extractedTableData;
        
        console.log("Extracted pitch table data:", { pitches, areas, percentages });
        
        // Reset areasByPitch to ensure we start fresh
        measurements.areasByPitch = {};
        
        // Store each pitch area with its percentage
        pitches.forEach((pitch, idx) => {
          const area = areas[idx];
          const percentage = percentages[idx];
          
          // Convert pitch from x/12 to x:12 format
          const normalizedPitch = pitch.replace('/', ':');
          
          if (!isNaN(area) && area > 0) {
            measurements.areasByPitch[normalizedPitch] = {
              area: area,
              percentage: percentage
            };
            console.log(`Storing pitch data: ${normalizedPitch} - ${area} sq ft - ${percentage}%`);
          }
        });
        
        // Set roofPitch for UI compatibility
        measurements.roofPitch = measurements.predominantPitch;
        
        // Validate total matches
        const sumAreas = Object.values(measurements.areasByPitch)
          .reduce((sum, data) => sum + data.area, 0);
        
        console.log(`Total area from pitch table: ${sumAreas} sq ft`);
        console.log(`Total area from measurements: ${measurements.totalArea} sq ft`);
        
        // If totals don't match within 1%, log warning
        if (Math.abs(sumAreas - measurements.totalArea) / measurements.totalArea > 0.01) {
          console.warn(`Total area from pitch table (${sumAreas}) doesn't match total area (${measurements.totalArea})`);
        }
      } else if (measurements.predominantPitch && measurements.totalArea > 0) {
        // If no pitch table found but we have predominant pitch and total area,
        // create a single entry
        measurements.areasByPitch[measurements.predominantPitch] = {
          area: measurements.totalArea,
          percentage: 100
        };
        measurements.roofPitch = measurements.predominantPitch;
      }
      
      // AFTER PITCH AREA EXTRACTION IS COMPLETE
      // Add code to extract property address, latitude, and longitude
      console.log("Extracting property information...");

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
      
      return measurements;
    } catch (error) {
      console.error("Error parsing PDF client-side:", error);
      return null;
    }
  };

  return {
    parsedData,
    processingMode,
    processingProgress,
    fileUrl,
    parsePdf
  };
}