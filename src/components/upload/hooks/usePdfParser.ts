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

        // NEW: Try to find the table with "Roof Pitch", "Area (sq ft)", and "% of Roof" rows
        // This pattern matches typical EagleView table format
        const eagleViewTableRegex = /Roof\s+Pitch(?:es)?.*?Area\s*\(sq\s*ft\).*?%\s*of\s*Roof/is;
        const eagleViewTableMatch = fullText.match(eagleViewTableRegex);
        
        if (eagleViewTableMatch) {
          console.log("Found EagleView pitch table format");
          const tableContent = eagleViewTableMatch[0];
          
          // Extract all rows from the table that have a pitch, area, and percentage
          const pitchRows = Array.from(tableContent.matchAll(/(\d+\/\d+)\s+(\d[\d,.]+)\s+(\d+(?:\.\d+)?%)/g));
          console.log("Extracted pitch rows:", pitchRows);
          
          if (pitchRows.length > 0) {
            for (const row of pitchRows) {
              const [_, pitch, areaStr, percentStr] = row;
              const area = parseFloat(areaStr.replace(/,/g, ''));
              
              if (!isNaN(area) && area > 10) {
                measurements.areasByPitch[pitch] = area;
                console.log(`Extracted from EagleView table: ${pitch} = ${area} sq ft (${percentStr})`);
              }
            }
          }
        }
        
        // If no pitch rows found with the specific pattern, try another format
        if (Object.keys(measurements.areasByPitch).length === 0) {
          // NEW: Try a different table pattern with a row-based approach
          const tableLines = pitchTableText.split(/[\r\n]+/).filter(line => line.trim().length > 0);
          console.log("Table lines:", tableLines);
          
          // Looking for lines that have three columns: pitch, area, percentage
          // These often appear as: "4/12    1234.5    42.3%"
          for (const line of tableLines) {
            const rowMatch = line.match(/(\d+\/\d+)\s+([\d,.]+)\s+(\d+(?:\.\d+)?%)/);
            if (rowMatch) {
              const [_, pitch, areaStr, percentStr] = rowMatch;
              const area = parseFloat(areaStr.replace(/,/g, ''));
              
              if (!isNaN(area) && area > 10) {
                measurements.areasByPitch[pitch] = area;
                console.log(`Extracted from table line: ${pitch} = ${area} sq ft (${percentStr})`);
              }
            }
          }
        }
        
        // Find all pitch values in the table - accept ANY format that appears in the "Roof Pitches" row
        // We want to exactly preserve what's in the EagleView report
        const roofPitchesRowMatch = pitchTableText.match(/Roof\s+Pitches[\s\S]*?(?:Area|%|The)/i);
        let pitchValues = [];
        
        if (roofPitchesRowMatch) {
          // Extract from the Roof Pitches row specifically
          const roofPitchesRow = roofPitchesRowMatch[0];
          console.log("Roof Pitches row:", roofPitchesRow);
          
          // DIRECT TABLE PATTERN: Look for the specific pattern in the Areas per Pitch table
          // This pattern matches the exact format seen in many EagleView reports with pitches at the top
          // For example: "0/12   1/12   4/12"
          const directTablePattern = /Roof\s+Pitches.*?(\d+\/\d+)\s+(\d+\/\d+)\s+(\d+\/\d+)/s;
          const directTableMatch = pitchTableText.match(directTablePattern);
          
          if (directTableMatch) {
            // Extract all capture groups which should be the pitch values
            pitchValues = [];
            for (let i = 1; i < directTableMatch.length; i++) {
              if (directTableMatch[i]) {
                pitchValues.push(directTableMatch[i]);
              }
            }
            console.log("Found pitches using direct table pattern:", pitchValues);
          }
          
          // If we don't find pitches with the direct pattern, try a more flexible approach
          if (pitchValues.length === 0) {
            // Extract all x/12 patterns that appear in the table
            const allPitchesInTable = Array.from(pitchTableText.matchAll(/(\d+\/12)/g))
              .map(m => m[1]);
            
            if (allPitchesInTable.length > 0) {
              pitchValues = [...new Set(allPitchesInTable)]; // Get unique values
              console.log("Found pitches using x/12 pattern:", pitchValues);
            }
          }
          
          // If still no pitches, try the original improved approach
          if (pitchValues.length === 0) {
            // IMPROVED: Be more strict about identifying actual pitch values
            // Only consider values that are in x/12 format (standard roof pitches)
            // or that appear in a table cell context
            const pitchCandidates = Array.from(roofPitchesRow.matchAll(/(?:^|\s|\t|>)(\d+(?:\/\d+)?)(?:\s|$|\t|<)/g));
            
            // Filter pitch values more aggressively to only include likely roof pitch formats
            pitchValues = [...new Set(pitchCandidates
              .map(match => match[1])
              .filter(val => {
                // Valid pitch formats:
                // 1. Standard x/12 format (most common) - like 4/12, 5/12, etc.
                // 2. Fraction-like format with slash - must be a reasonable roof pitch
                if (val && val.includes('/')) {
                  const parts = val.split('/');
                  
                  // Check if it's a standard roof pitch (x/12 format)
                  if (parts.length === 2 && parts[1] === '12') {
                    return true;
                  }
                  
                  // Check if it's in the Roof Pitches row header specifically
                  // This is for formats like 0/12, 1/12, 4/12 that appear in the header
                  const isInHeader = roofPitchesRow.includes(`>${val}<`) || 
                                    roofPitchesRow.includes(`\t${val}\t`) || 
                                    roofPitchesRow.includes(` ${val} `);
                  
                  // Extra validation for non-standard formats - they must appear in correct context
                  return isInHeader || 
                         // Is it a date-like pattern? If so, reject
                         !val.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/);
                }
                return false;
              })
            )];
            
            // If we didn't find any standard pitches, look for table column headers
            // which often contain the pitch values
            if (pitchValues.length === 0) {
              console.log("No standard pitches found, checking table column headers");
              
              // Look for pitch values in table headers or columns
              // This will find values that appear in HTML-like table structures
              const tableHeaderMatches = Array.from(pitchTableText.matchAll(/[<|]\s*(\d+\/\d+)\s*[>|]/g));
              pitchValues = [...new Set(tableHeaderMatches.map(match => match[1]))];
              
              console.log("Found pitch values in table headers:", pitchValues);
            }
          }
        }
        
        console.log("Found roof pitch values:", pitchValues);
        
        // If we have identified pitch values, now we need to find their corresponding areas
        if (pitchValues.length > 0) {
          // DIRECT TABLE MATCH: Try to parse the Areas per Pitch table as a whole
          // This approach works well for the standard EagleView table format
          const directTableFormat = pitchTableText.match(/Roof\s+Pitches\s+([\d\/]+\s+[\d\/]+\s+[\d\/]+)[\s\S]*?Area\s+\(sq\s+ft\)\s+([\d\.,]+\s+[\d\.,]+\s+[\d\.,]+)[\s\S]*?%\s+of\s+Roof\s+([\d\.,]+%\s+[\d\.,]+%\s+[\d\.,]+%)/i);
          
          if (directTableFormat) {
            console.log("Found complete table format match");
            
            // Extract the three rows: pitches, areas, and percentages
            const pitchRow = directTableFormat[1].trim().split(/\s+/);
            const areaRow = directTableFormat[2].trim().split(/\s+/);
            
            console.log("Pitch row:", pitchRow);
            console.log("Area row:", areaRow);
            
            // Make sure we have the same number of items in both rows
            if (pitchRow.length === areaRow.length) {
              // Map each pitch to its corresponding area
              for (let i = 0; i < pitchRow.length; i++) {
                const pitch = pitchRow[i];
                const area = parseFloat(areaRow[i].replace(/,/g, ''));
                
                if (!isNaN(area) && area > 0) {
                  measurements.areasByPitch[pitch] = area;
                  console.log(`Mapped pitch ${pitch} to area ${area} sq ft from direct table match`);
                }
              }
            }
          }
          
          // If direct table match didn't work, try a more flexible approach for the table structure
          if (Object.keys(measurements.areasByPitch).length === 0) {
            // Try a different pattern that can match varying numbers of pitches in the table
            console.log("Trying flexible table pattern match");
            
            // Extract the full table content and analyze it line by line
            const tableLines = pitchTableText.split(/\r?\n/);
            let pitchLine = '';
            let areaLine = '';
            
            // Find the lines containing pitches and areas
            for (let i = 0; i < tableLines.length; i++) {
              const line = tableLines[i].trim();
              
              if (line.includes('Roof Pitches') || /^\s*\d+\/\d+\s+\d+\/\d+/.test(line)) {
                pitchLine = line;
              } else if (line.includes('Area (sq ft)') || /^\s*\d+\.\d+\s+\d+\.\d+/.test(line)) {
                areaLine = line;
              }
            }
            
            // If we found both lines, try to extract and match the values
            if (pitchLine && areaLine) {
              console.log("Found pitch line:", pitchLine);
              console.log("Found area line:", areaLine);
              
              // Extract all pitch values from the pitch line
              const pitchesInLine = Array.from(pitchLine.matchAll(/(\d+\/\d+)/g))
                .map(m => m[1]);
              
              // Extract all area values from the area line
              const areasInLine = Array.from(areaLine.matchAll(/(\d+(?:\.\d+)?)/g))
                .map(m => parseFloat(m[1]));
              
              console.log("Extracted pitches:", pitchesInLine);
              console.log("Extracted areas:", areasInLine);
              
              // If we have the same number of values, map them directly
              if (pitchesInLine.length > 0 && pitchesInLine.length === areasInLine.length) {
                for (let i = 0; i < pitchesInLine.length; i++) {
                  const pitch = pitchesInLine[i];
                  const area = areasInLine[i];
                  
                  if (!isNaN(area) && area > 0) {
                    measurements.areasByPitch[pitch] = area;
                    console.log(`Mapped pitch ${pitch} to area ${area} sq ft from flexible table match`);
                  }
                }
              }
            }
          }
          
          // If direct table match didn't work, try the area row approach
          if (Object.keys(measurements.areasByPitch).length === 0) {
            // Look for an "Area (sq ft)" row which should contain the area values
            const areaRowMatch = pitchTableText.match(/Area\s*\(sq\s*ft\)([\s\S]*?)(?:%|of\s*Roof|The\s+table|$)/i);
            
            if (areaRowMatch) {
              console.log("Found 'Area (sq ft)' row");
              const areaRowText = areaRowMatch[0];
              
              // Extract numbers from this row that are likely areas
              const areaRowNumbers = Array.from(areaRowText.matchAll(/(\d+(?:[,.]\d+)?)/g))
                .map(match => parseFloat(match[1].replace(/,/g, '')))
                .filter(num => num > 10); // Areas should be substantial
                
              console.log("Area row numbers:", areaRowNumbers);
              
              // Attempt to match areas with pitches in same order as they appear in the table
              if (areaRowNumbers.length >= pitchValues.length) {
                // EagleView tables typically list areas directly under the corresponding pitch
                for (let i = 0; i < pitchValues.length; i++) {
                  const pitch = pitchValues[i];
                  const area = areaRowNumbers[i];
                  
                  if (!isNaN(area) && area > 0) {
                    measurements.areasByPitch[pitch] = area;
                    console.log(`Mapped pitch ${pitch} to area ${area} sq ft from area row`);
                  }
                }
              } else {
                console.log("Not enough area values found in Area row, trying alternative approach");
                
                // Try to find area values specifically associated with each pitch
                for (const pitch of pitchValues) {
                  // For each pitch, try to find a more specific area association
                  // Look for patterns like "{pitch} [spaces or tabs] {area value}"
                  const pitchAreaPattern = new RegExp(`${pitch.replace('/', '\\/')}[\\s\\S]{0,30}?(\\d{2,}(?:[,.]\\d+)?)\\s*(?:sq\\s*ft|$)`, 'i');
                  const specificAreaMatch = fullText.match(pitchAreaPattern);
                  
                  if (specificAreaMatch && specificAreaMatch[1]) {
                    const area = parseFloat(specificAreaMatch[1].replace(/,/g, ''));
                    if (!isNaN(area) && area > 10) {
                      measurements.areasByPitch[pitch] = area;
                      console.log(`Found specific area ${area} sq ft for pitch ${pitch}`);
                    }
                  }
                }
              }
            } else {
              // If we can't find the Area row, try to locate the specific "Areas per Pitch" table
              console.log("Trying to extract from Areas per Pitch table structure");
              
              // This looks for the standard EagleView table format with rows for pitches and areas
              const areaTableMatch = fullText.match(/Areas\s+per\s+Pitch[\s\S]*?Roof\s+Pitches([\s\S]*?)Total/i);
              
              if (areaTableMatch) {
                const areaTableSection = areaTableMatch[0];
                console.log("Found Areas per Pitch table section");
                
                // For each pitch, find the corresponding area in the table
                for (const pitch of pitchValues) {
                  // Look for area values that appear after this pitch in the table
                  const pitchSectionPattern = new RegExp(`${pitch.replace('/', '\\/')}[\\s\\S]{0,100}?Area[\\s\\S]{0,50}?(\\d{2,}(?:[,.]\\d+))`, 'i');
                  const pitchSectionMatch = areaTableSection.match(pitchSectionPattern);
                  
                  if (pitchSectionMatch && pitchSectionMatch[1]) {
                    const area = parseFloat(pitchSectionMatch[1].replace(/,/g, ''));
                    if (!isNaN(area) && area > 10) {
                      measurements.areasByPitch[pitch] = area;
                      console.log(`Found area ${area} sq ft for pitch ${pitch} in Areas per Pitch table`);
                    }
                  }
                }
              }
            }
          }
        }
        
        // If we still haven't found areas for all pitches, try a last direct approach
        const missingPitches = pitchValues.filter(pitch => !measurements.areasByPitch[pitch]);
        if (missingPitches.length > 0) {
          console.log("Some pitches are missing areas, trying direct pattern matching");
          
          // Look for direct associations in the text
          for (const pitch of missingPitches) {
            // Expanded context search for better accuracy
            const contextRange = 150; // Characters before and after
            const pitchIndex = fullText.indexOf(pitch);
            
            if (pitchIndex !== -1) {
              const startIndex = Math.max(0, pitchIndex - contextRange);
              const endIndex = Math.min(fullText.length, pitchIndex + contextRange);
              const context = fullText.substring(startIndex, endIndex);
              
              // Look for a number that could be an area value
              const areaInContextMatch = context.match(/(\d{2,}(?:\.\d+)?)(?:\s*sq\s*ft|\s*square\s*feet)/i);
              
              if (areaInContextMatch && areaInContextMatch[1]) {
                const area = parseFloat(areaInContextMatch[1].replace(/,/g, ''));
                if (!isNaN(area) && area > 10) {
                  measurements.areasByPitch[pitch] = area;
                  console.log(`Found area ${area} sq ft for pitch ${pitch} using context search`);
                }
              }
            }
          }
        }
        
        // Final validation: remove any pitch with unreasonable area values
        for (const pitch in measurements.areasByPitch) {
          const area = measurements.areasByPitch[pitch];
          // Remove areas that are too small (likely not real areas) or suspiciously large
          if (area < 10 || area > measurements.totalArea * 1.5) {
            console.log(`Removing suspicious pitch-area mapping: ${pitch} -> ${area} sq ft`);
            delete measurements.areasByPitch[pitch];
          }
        }
      }
      
      // If we still don't have pitch areas but have a predominant pitch and total area,
      // assign all area to the predominant pitch
      if (Object.keys(measurements.areasByPitch).length === 0 && 
          measurements.predominantPitch && 
          measurements.totalArea > 0) {
        // For predominant pitch, we need to convert from "x:y" format back to "x/y" to match EagleView
        const pitchParts = measurements.predominantPitch.split(':');
        const eagleViewPitchFormat = pitchParts.join('/');
        
        measurements.areasByPitch[eagleViewPitchFormat] = measurements.totalArea;
        console.log(`Assigned total area to predominant pitch ${eagleViewPitchFormat}: ${measurements.totalArea} sq ft`);
      }
      
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
      
      // If the extracted total is very different from the reported total area, 
      // we might have extracted incorrect values
      if (measurements.totalArea > 0 && 
          (extractedTotalArea < measurements.totalArea * 0.9 || 
           extractedTotalArea > measurements.totalArea * 1.1)) {
        console.log(`Warning: Extracted pitch areas (${extractedTotalArea}) don't match total area (${measurements.totalArea})`);
        
        // If the difference is too significant, reset and use predominant pitch only
        if (extractedTotalArea < measurements.totalArea * 0.7 || 
            extractedTotalArea > measurements.totalArea * 1.3) {
          console.log("Significant mismatch in area totals - resetting to predominant pitch only");
          
          // Clear existing pitch areas
          measurements.areasByPitch = {};
          
          // Use predominant pitch if available, or default to a common pitch
          const pitchToUse = measurements.predominantPitch ? 
            measurements.predominantPitch.replace(':', '/') : '4/12';
          
          measurements.areasByPitch[pitchToUse] = measurements.totalArea;
          console.log(`Reset to single pitch: ${pitchToUse} = ${measurements.totalArea} sq ft`);
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
          
          // Find all instances of "x/12  1234.5  56.7%" patterns in the document
          const pitchAreaPercentRegex = /(\d+\/\d+)\s+([\d,.]+)\s+(\d+(?:\.\d+)?%)/g;
          const pitchAreaMatches = Array.from(fullText.matchAll(pitchAreaPercentRegex));
          
          if (pitchAreaMatches.length > 0) {
            console.log("Found pitch-area-percent patterns:", pitchAreaMatches.length);
            
            for (const match of pitchAreaMatches) {
              const [_, pitch, areaStr, percentStr] = match;
              const area = parseFloat(areaStr.replace(/,/g, ''));
              
              if (!isNaN(area) && area > 10) {
                measurements.areasByPitch[pitch] = area;
                console.log(`Found pitch ${pitch} with area ${area} sq ft (${percentStr})`);
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
              if (!isNaN(area) && area > 10) {
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
              
              if (!isNaN(area) && area > 10 && allPitchesInDocument.includes(pitch)) {
                measurements.areasByPitch[pitch] = area;
                console.log(`Found area ${area} sq ft for pitch ${pitch} with loose pattern match`);
              }
            }
          }
        }
      }
      
      // If we still don't have any pitch areas OR have only assigned to the predominant pitch but suspect more pitches exist,
      // try another approach targeting the specific table format shown in the UI screenshot
      if (Object.keys(measurements.areasByPitch).length <= 1) {
        console.log("Attempting to extract from specific table format with Roof Pitch, Area, % of Roof columns");
        
        // Look for "Roof Pitch", "Area (sq ft)", "% of Roof" columns that appear in some reports
        const specificTableFormat = /(?:Roof\s+Pitch|Pitch)\s*(?:\r?\n).*?(?:Area.*?sq\s*ft).*?(?:%\s*of\s*Roof)/is;
        const specificTableMatch = fullText.match(specificTableFormat);
        
        if (specificTableMatch) {
          console.log("Found specific table format with columns for Pitch, Area, %");
          const tableText = specificTableMatch[0];
          
          // Extract rows with a pattern like: 5/12   454.6   15.9%
          const rowPattern = /(\d+\/\d+)\s+([\d,.]+)\s+(\d+(?:\.\d+)?%)/g;
          const rowMatches = Array.from(tableText.matchAll(rowPattern));
          
          if (rowMatches.length > 0) {
            // If we're here, we found specific rows that match the expected format
            // Clear existing pitch areas if we've only assigned to predominant pitch
            if (Object.keys(measurements.areasByPitch).length === 1) {
              console.log("Clearing single predominant pitch assignment to use multiple found pitches");
              measurements.areasByPitch = {};
            }
            
            for (const match of rowMatches) {
              const [_, pitch, areaStr, percentStr] = match;
              const area = parseFloat(areaStr.replace(/,/g, ''));
              
              if (!isNaN(area) && area > 10) {
                measurements.areasByPitch[pitch] = area;
                console.log(`Found pitch ${pitch} with area ${area} sq ft (${percentStr}) in specific table format`);
              }
            }
          }
        }
      }
      
      // If we've extracted pitch areas but the sum is significantly different from the total area,
      // scale the values to match the total area while preserving proportions
      const extractedAreaSum = Object.values(measurements.areasByPitch)
        .reduce((sum, area) => sum + (Number(area) || 0), 0);
      
      if (measurements.totalArea > 0 && 
          Object.keys(measurements.areasByPitch).length > 1 &&
          Math.abs(extractedAreaSum - measurements.totalArea) / measurements.totalArea > 0.1) {
        
        console.log(`Scaling extracted areas (sum: ${extractedAreaSum}) to match total area (${measurements.totalArea})`);
        
        // Calculate scaling factor
        const scaleFactor = measurements.totalArea / extractedAreaSum;
        
        // Scale each area value
        for (const pitch in measurements.areasByPitch) {
          const originalArea = measurements.areasByPitch[pitch];
          const scaledArea = originalArea * scaleFactor;
          measurements.areasByPitch[pitch] = scaledArea;
          console.log(`Scaled ${pitch} area from ${originalArea} to ${scaledArea} sq ft`);
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
