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
      
      // Try extracting measurements from tables
      if (!foundTotalArea || !foundRidge || !foundHip || !foundValley || !foundRake || !foundEave) {
        console.log("Trying to extract measurements from tables in the text...");
        
        // Look for table-like structures with measurements
        // Example: "Ridge: 40 ft"
        const tableRowRegex = /([A-Za-z\s]+):\s*([0-9,.]+)\s*(sq\s*ft|ft|count|inches)/gi;
        let tableMatch;
        
        while ((tableMatch = tableRowRegex.exec(fullText)) !== null) {
          const [_, label, value, unit] = tableMatch;
          const numericValue = parseFloat(value.replace(/,/g, ''));
          
          if (isNaN(numericValue)) continue;
          
          const lcLabel = label.toLowerCase().trim();
          
          console.log(`Found table row: ${lcLabel}: ${numericValue} ${unit}`);
          
          if (lcLabel.includes('total area') || lcLabel.includes('roof area')) {
            if (!foundTotalArea) {
              measurements.totalArea = numericValue;
              console.log(`Found total area from table: ${numericValue} sq ft`);
            }
          } else if (lcLabel.includes('ridge')) {
            if (!foundRidge) {
              measurements.ridgeLength = numericValue;
              console.log(`Found ridge length from table: ${numericValue} ft`);
            }
          } else if (lcLabel.includes('hip')) {
            if (!foundHip) {
              measurements.hipLength = numericValue;
              console.log(`Found hip length from table: ${numericValue} ft`);
            }
          } else if (lcLabel.includes('valley')) {
            if (!foundValley) {
              measurements.valleyLength = numericValue;
              console.log(`Found valley length from table: ${numericValue} ft`);
            }
          } else if (lcLabel.includes('rake')) {
            if (!foundRake) {
              measurements.rakeLength = numericValue;
              console.log(`Found rake length from table: ${numericValue} ft`);
            }
          } else if (lcLabel.includes('eave') || lcLabel.includes('starter')) {
            if (!foundEave) {
              measurements.eaveLength = numericValue;
              console.log(`Found eave length from table: ${numericValue} ft`);
            }
          } else if (lcLabel.includes('drip edge')) {
            if (!foundDripEdge) {
              measurements.dripEdgeLength = numericValue;
              console.log(`Found drip edge length from table: ${numericValue} ft`);
            }
          } else if (lcLabel.includes('flashing') && !lcLabel.includes('step')) {
            if (!foundFlashing) {
              measurements.flashingLength = numericValue;
              console.log(`Found flashing length from table: ${numericValue} ft`);
            }
          } else if (lcLabel.includes('step flashing')) {
            if (!foundStepFlashing) {
              measurements.stepFlashingLength = numericValue;
              console.log(`Found step flashing length from table: ${numericValue} ft`);
            }
          } else if (lcLabel.includes('penetration') && lcLabel.includes('area')) {
            if (!foundPenetrationsArea) {
              measurements.penetrationsArea = numericValue;
              console.log(`Found penetrations area from table: ${numericValue} sq ft`);
            }
          } else if (lcLabel.includes('penetration') && lcLabel.includes('perimeter')) {
            if (!foundPenetrationsPerimeter) {
              measurements.penetrationsPerimeter = numericValue;
              console.log(`Found penetrations perimeter from table: ${numericValue} ft`);
            }
          }
        }
      }
      
      // Extract property address - usually found in the header section of page 1 or page 10
      // Try to match EagleView format directly from headers (e.g., "108 Poinciana Lane, Deltona, FL 32738")
      const eagleViewHeaderRegex = /(\d+\s+[A-Za-z\s]+(?:Lane|Street|Avenue|Road|Drive|Blvd|Court|Place|Way|Circle|Trail|Parkway|Highway|Terrace)),\s+([A-Za-z\s]+),\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i;
      
      // Check page 1 and page 10 specifically for EagleView header format
      const headersToCheck = [
        pageContents[1] || "",
        pageContents[10] || "",
        primaryText,
        fullText
      ];
      
      for (const text of headersToCheck) {
        const headerMatch = text.match(eagleViewHeaderRegex);
        if (headerMatch) {
          const [, street, city, state, zip] = headerMatch;
          measurements.propertyAddress = `${street}, ${city}, ${state} ${zip}`;
          console.log(`Found EagleView property address: ${measurements.propertyAddress}`);
          break;
        }
      }
      
      // If we still don't have an address, try a more generic address pattern
      if (!measurements.propertyAddress) {
        const addressRegex = /(\d+\s+[A-Za-z\s]+(?:Lane|Street|Avenue|Road|Drive|Blvd|Court|Place|Way|Circle|Trail|Parkway|Highway|Terrace)(?:\s*,\s*[A-Za-z\s]+)?(?:\s*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)?)/i;
        const addressMatch = fullText.match(addressRegex);
        
        if (addressMatch && addressMatch[1]) {
          measurements.propertyAddress = addressMatch[1].trim();
          console.log(`Found generic property address: ${measurements.propertyAddress}`);
        }
      }
      
      // Extract longitude and latitude - typically in the Property Location section
      const longitudeRegex = /Longitude\s*=\s*([-+]?\d+\.\d+)/i;
      const longitudeMatch = primaryText.match(longitudeRegex) || fullText.match(longitudeRegex);
      
      if (longitudeMatch && longitudeMatch[1]) {
        measurements.longitude = longitudeMatch[1];
        console.log(`Found longitude: ${measurements.longitude}`);
      }
      
      const latitudeRegex = /Latitude\s*=\s*([-+]?\d+\.\d+)/i;
      const latitudeMatch = primaryText.match(latitudeRegex) || fullText.match(latitudeRegex);
      
      if (latitudeMatch && latitudeMatch[1]) {
        measurements.latitude = latitudeMatch[1];
        console.log(`Found latitude: ${measurements.latitude}`);
      }
      
      // Extract areas by pitch
      console.log("Extracting areas by pitch...");
      
      // First, try to look for "Areas per Pitch" or "Roof Pitches" sections in the document
      const areasPerPitchRegex = /(?:Areas\s+per\s+Pitch|Roof\s+Pitches)[\s\S]*?(?:Total|The\s+table\s+above|Structure\s+Complexity)/i;
      const areasPerPitchMatch = fullText.match(areasPerPitchRegex);
      
      if (areasPerPitchMatch) {
        console.log("Found 'Areas per Pitch' or 'Roof Pitches' section");
        
        // Extract the section with the pitch table
        const pitchTableText = areasPerPitchMatch[0];
        console.log("Pitch table text:", pitchTableText);

        // EAGLEVIEW EXACT FORMAT: The table has this exact format:
        // Areas per Pitch
        // Roof Pitches        Area (sq ft)        % of Roof
        // 2/12   6/12   8/12   10/12
        // 14.6   2540.7   31.0   15.2
        // 0.6%   97.6%   1.2%   0.6%

        // Extract each row separately with very specific patterns
        const pitchRow = pitchTableText.match(/Roof\s+Pitches.*?\n(.*?)\n/is);
        const areaRow = pitchTableText.match(/Area.*?\n(.*?)\n/is);
        const percentRow = pitchTableText.match(/%\s+of\s+Roof.*?\n(.*?)\n/is);

        if (pitchRow && areaRow) {
          console.log("Found exact table format with pitch row and area row");
          console.log("Pitch row:", pitchRow[1]);
          console.log("Area row:", areaRow[1]);
          
          // Extract all pitch values from the pitch row
          const pitches = [];
          const pitchMatches = Array.from(pitchRow[1].matchAll(/(\d+\/\d+)/g));
          for (const match of pitchMatches) {
            pitches.push(match[1]);
          }
          
          // Extract all area values from the area row
          const areas = [];
          const areaMatches = Array.from(areaRow[1].matchAll(/([\d,.]+)/g));
          for (const match of areaMatches) {
            const area = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(area)) {
              areas.push(area);
            }
          }
          
          console.log("Extracted pitches:", pitches);
          console.log("Extracted areas:", areas);
          
          // Map pitches to areas - make sure we have matching arrays
          if (pitches.length > 0 && areas.length >= pitches.length) {
            // Map each pitch to its corresponding area
            for (let i = 0; i < pitches.length; i++) {
              measurements.areasByPitch[pitches[i]] = areas[i];
              console.log(`Mapped pitch ${pitches[i]} to area ${areas[i]} sq ft (EXACT MATCH)`);
            }
          }
        }

        // Only use fallback methods if we didn't extract any pitches with the exact pattern
        if (Object.keys(measurements.areasByPitch).length === 0) {
          // Original EagleView pattern as fallback
          const eagleViewTablePattern = /Roof\s+Pitches.*?(\d+\/\d+).*?(\d+\/\d+).*?(\d+\/\d+).*?(\d+\/\d+)?.*?Area.*?\n.*?([\d,.]+).*?([\d,.]+).*?([\d,.]+).*?([\d,.]+)?.*?%\s+of\s+Roof.*?\n.*?([\d,.]+%).*?([\d,.]+%).*?([\d,.]+%).*?([\d,.]+%)?/is;
          const eagleViewMatch = pitchTableText.match(eagleViewTablePattern);
          
          if (eagleViewMatch) {
            console.log("Found EagleView specific table format with multiple pitches");
            
            // Extract pitches and areas (up to 4 pitches from the match)
            const pitches = [
              eagleViewMatch[1], 
              eagleViewMatch[2], 
              eagleViewMatch[3],
              eagleViewMatch[4]
            ].filter(Boolean); // Remove undefined values
            
            const areas = [
              parseFloat(eagleViewMatch[5]?.replace(/,/g, '') || "0"),
              parseFloat(eagleViewMatch[6]?.replace(/,/g, '') || "0"),
              parseFloat(eagleViewMatch[7]?.replace(/,/g, '') || "0"),
              parseFloat(eagleViewMatch[8]?.replace(/,/g, '') || "0")
            ];
            
            console.log("Extracted pitches (fallback):", pitches);
            console.log("Extracted areas (fallback):", areas);
            
            // Map pitches to areas
            for (let i = 0; i < pitches.length; i++) {
              if (pitches[i] && !isNaN(areas[i])) {
                // Include ALL areas, even small ones!
                measurements.areasByPitch[pitches[i]] = areas[i];
                console.log(`Mapped pitch ${pitches[i]} to area ${areas[i]} sq ft (fallback method)`);
              }
            }
          }
        }

        // If still no pitch data, try flexible row matching
        if (Object.keys(measurements.areasByPitch).length === 0) {
          console.log("Trying flexible row pattern matching...");
          // Look for lines that follow the pattern: "x/12   123.4   56.7%"
          const rowPattern = /(\d+\/\d+)\s+([\d,.]+)\s+([\d,.]+%)/g;
          const rowMatches = Array.from(pitchTableText.matchAll(rowPattern));

          if (rowMatches.length > 0) {
            console.log(`Found ${rowMatches.length} individual pitch-area-percent rows`);
            
            for (const match of rowMatches) {
              const pitch = match[1];
              const area = parseFloat(match[2].replace(/,/g, ''));
              const percent = match[3];
              
              // Include ALL areas, even small ones!
              if (!isNaN(area)) {
                measurements.areasByPitch[pitch] = area;
                console.log(`Mapped pitch ${pitch} to area ${area} sq ft (${percent}) from individual row`);
              }
            }
          }
        }

        // If still no matches, try simpler patterns
        if (Object.keys(measurements.areasByPitch).length === 0) {
          console.log("Trying to extract pitches and areas from separate rows...");
          
          // Look for any pitch/number combinations in the table area
          const pitchAreaPattern = /(\d+\/\d+)[\s\n]*?([0-9,.]+)/g;
          const pitchAreaMatches = Array.from(pitchTableText.matchAll(pitchAreaPattern));
          
          if (pitchAreaMatches.length > 0) {
            console.log(`Found ${pitchAreaMatches.length} potential pitch-area pairs`);
            
            for (const match of pitchAreaMatches) {
              const pitch = match[1];
              const area = parseFloat(match[2].replace(/,/g, ''));
              
              // Include ALL areas, even small ones!
              if (!isNaN(area)) {
                measurements.areasByPitch[pitch] = area;
                console.log(`Found pitch ${pitch} with area ${area} sq ft (simple pattern)`);
              }
            }
          }
        }
      }
      
      // NEW: Look for the "Areas by Pitch" table that often appears in more recent EagleView reports
      if (Object.keys(measurements.areasByPitch).length === 0) {
        console.log("Checking for modern EagleView 'Areas by Pitch' table");
        
        // This pattern matches: "Pitch | Area (sq ft) | % of Total" style tables
        const modernTableRegex = /(?:Pitch|Roof\s+Pitch)\s*(?:[|]|Area)/i;
        const modernTableMatch = fullText.match(modernTableRegex);
        
        if (modernTableMatch) {
          console.log("Found modern table header format");
          
          // Get text chunk around the matched pattern for better context
          const matchPosition = modernTableMatch.index || 0;
          const startPos = Math.max(0, matchPosition - 100);
          const endPos = Math.min(fullText.length, matchPosition + 2000); // Get more text after the header
          const tableContext = fullText.substring(startPos, endPos);
          
          // Enhanced pattern to find all pitches - matches pattern like "4/12" or "4:12" followed by area and percentage
          // Use a more flexible regex that can handle different spacing and formats
          const pitchAreaPercentRegex = /(\d+[:\/]\d+)\s+([\d,.]+)(?:\s*sq\s*ft)?(?:\s+|[\s\n]+)(\d+(?:\.\d+)?%)?/g;
          const pitchAreaMatches = Array.from(tableContext.matchAll(pitchAreaPercentRegex));
          
          if (pitchAreaMatches.length > 0) {
            console.log("Found pitch-area-percent patterns:", pitchAreaMatches.length);
            
            for (const match of pitchAreaMatches) {
              const [_, pitch, areaStr, percentStr] = match;
              const area = parseFloat(areaStr.replace(/,/g, ''));
              
              // Include ALL areas, even small ones!
              if (!isNaN(area)) {
                // Normalize pitch format if needed
                const normalizedPitch = pitch.includes('/') ? pitch : pitch.replace(':', '/');
                measurements.areasByPitch[normalizedPitch] = area;
                console.log(`Found pitch ${normalizedPitch} with area ${area} sq ft ${percentStr || ''}`);
              }
            }
          }
          
          // If we still didn't find any pitches, try an even more flexible approach
          if (Object.keys(measurements.areasByPitch).length === 0) {
            // Try to find any pattern of X/12 followed by a number within reasonable distance
            const veryLoosePattern = /(\d+\/12)[\s\S]{1,50}?([\d,.]+)/g;
            const looseMatches = Array.from(tableContext.matchAll(veryLoosePattern));
            
            if (looseMatches.length > 0) {
              console.log("Found loose pitch-area matches:", looseMatches.length);
              
              for (const match of looseMatches) {
                const [_, pitch, areaStr] = match;
                const area = parseFloat(areaStr.replace(/,/g, ''));
                
                // Include ALL areas, even small ones!
                if (!isNaN(area)) {
                  measurements.areasByPitch[pitch] = area;
                  console.log(`Found pitch ${pitch} with area ${area} sq ft using flexible pattern`);
                }
              }
            }
          }
        }
      }

      // Extract all possible pitch values from the document for additional searches
      if (Object.keys(measurements.areasByPitch).length === 0) {
        // Find all pitch values in the document (not just from the table we found earlier)
        const allPitchesInDocument = Array.from(fullText.matchAll(/(\d+\/\d+)/g))
          .map(m => m[1])
          .filter((value, index, self) => self.indexOf(value) === index); // Get unique pitch values
          
        console.log("All potential pitch values found in document:", allPitchesInDocument);
        
        // Try to find areas for these pitches from the full text
        if (allPitchesInDocument.length > 0) {
          console.log("Trying to extract areas directly from full text for pitches:", allPitchesInDocument);
          
          for (const pitch of allPitchesInDocument) {
            // Look for this pattern: pitch value followed by area and percentage
            // e.g., "4/12    1234.5    56.7%"
            const pitchAreaRegex = new RegExp(`${pitch.replace('/', '\\/')}\\s+([\\d,.]+)\\s+([\\d.]+%)`, 'i');
            const pitchAreaMatch = fullText.match(pitchAreaRegex);
            
            if (pitchAreaMatch && pitchAreaMatch[1]) {
              const area = parseFloat(pitchAreaMatch[1].replace(/,/g, ''));
              // Include ALL areas, even small ones!
              if (!isNaN(area)) {
                measurements.areasByPitch[pitch] = area;
                console.log(`Found area ${area} sq ft for pitch ${pitch} from direct text match`);
              }
            }
          }
          
          // If still not found, try a broader regex that might find pitch/area pairs
          if (Object.keys(measurements.areasByPitch).length === 0) {
            // This pattern looks for any occurence of a pitch followed by a number that could be an area
            const loosePatternRegex = /(\d+\/\d+).*?([\d,.]+)\s*(?:sq\s*ft|square\s*feet)/g;
            const looseMatches = Array.from(fullText.matchAll(loosePatternRegex));
            
            for (const match of looseMatches) {
              const [_, pitch, areaStr] = match;
              const area = parseFloat(areaStr.replace(/,/g, ''));
              
              // Include ALL areas, even small ones!
              if (!isNaN(area)) {
                measurements.areasByPitch[pitch] = area;
                console.log(`Found area ${area} sq ft for pitch ${pitch} with loose pattern match`);
              }
            }
          }
        }
      }
      
      // If we still don't have pitch areas but have a predominant pitch and total area,
      // assign all area to the predominant pitch as a last resort
      if (Object.keys(measurements.areasByPitch).length === 0 && 
          measurements.predominantPitch && 
          measurements.totalArea > 0) {
        // For predominant pitch, we need to convert from "x:y" format back to "x/y" to match EagleView
        const pitchParts = measurements.predominantPitch.split(':');
        const eagleViewPitchFormat = pitchParts.join('/');
        
        measurements.areasByPitch[eagleViewPitchFormat] = measurements.totalArea;
        console.log(`Assigned total area to predominant pitch ${eagleViewPitchFormat}: ${measurements.totalArea} sq ft (last resort)`);
      }
      
      // FINAL DEBUG: Log all extracted pitch areas before returning
      console.log("FINAL EXTRACTED AREAS BY PITCH:", Object.entries(measurements.areasByPitch).map(([pitch, area]) => `${pitch}: ${area} sq ft`));
      console.log("Total number of pitches extracted:", Object.keys(measurements.areasByPitch).length);

      // If we couldn't extract some measurements, use fallback patterns from pdf-utils.ts
      if (measurements.totalArea === 0) {
        // Try generic pattern
        const totalAreaMatch = fullText.match(/Total Area:\s*([\d,]+)\s*sq\s*ft/i) || 
                             fullText.match(/Total\s*Area\s*=\s*([\d,]+)/i);
        if (totalAreaMatch) {
          measurements.totalArea = parseFloat(totalAreaMatch[1].replace(/,/g, ''));
          console.log("Found total area (fallback):", measurements.totalArea);
        }
      }
      
      // Extract ridge length if not found
      if (measurements.ridgeLength === 0) {
        const ridgeMatch = fullText.match(/Ridge Length:\s*([\d,]+)\s*ft/i) ||
                         fullText.match(/Total Ridge:\s*([\d,]+)/i);
        if (ridgeMatch) {
          measurements.ridgeLength = parseFloat(ridgeMatch[1].replace(/,/g, ''));
          console.log("Found ridge length (fallback):", measurements.ridgeLength);
        }
      }
      
      // Clean up the URL
      URL.revokeObjectURL(fileURL);
      
      // Final validation - if we have extracted areas that don't reasonably add up to total area,
      // there's likely an extraction error
      const extractedTotalArea = Object.values(measurements.areasByPitch)
        .reduce((sum, area) => sum + (Number(area) || 0), 0);
      
      console.log(`Extracted total area from pitches: ${extractedTotalArea}, Report total area: ${measurements.totalArea}`);

      // IMPORTANT: We want to preserve all pitch areas exactly as extracted
      // DO NOT reset or override the extracted pitch areas even if they don't match total area
      // Simply log a warning but keep all pitch areas intact
      if (measurements.totalArea > 0 && 
          Math.abs(extractedTotalArea - measurements.totalArea) / measurements.totalArea > 0.1) {
        console.log(`Warning: Extracted pitch areas (${extractedTotalArea}) don't match total area (${measurements.totalArea}) but keeping all pitch areas as extracted`);
      }

      // Instead of resetting to a single pitch, adjust the total area if needed
      if (extractedTotalArea > 0 && measurements.totalArea === 0) {
        measurements.totalArea = extractedTotalArea;
        console.log(`Setting total area to match sum of pitch areas: ${extractedTotalArea}`);
      }
      
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
