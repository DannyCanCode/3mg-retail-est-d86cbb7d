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
        status: "Analyzing extracted text for measurements..."
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
      
      // First, try to extract from the page 10 format with parentheses counts
      // Ridge extraction with count
      const ridgeWithCountRegex = /Ridges\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Ridges?\)/i;
      let ridgeWithCountMatch = primaryText.match(ridgeWithCountRegex);
      
      if (ridgeWithCountMatch && ridgeWithCountMatch[1] && ridgeWithCountMatch[2]) {
        measurements.ridgeLength = parseFloat(ridgeWithCountMatch[1].replace(/,/g, ''));
        measurements.ridgeCount = parseInt(ridgeWithCountMatch[2], 10);
        console.log(`Found ridge length with count: ${measurements.ridgeLength} ft (${measurements.ridgeCount} ridges)`);
      }
      
      // Hip extraction with count
      const hipWithCountRegex = /Hips\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Hips?\)/i;
      let hipWithCountMatch = primaryText.match(hipWithCountRegex);
      
      if (hipWithCountMatch && hipWithCountMatch[1] && hipWithCountMatch[2]) {
        measurements.hipLength = parseFloat(hipWithCountMatch[1].replace(/,/g, ''));
        measurements.hipCount = parseInt(hipWithCountMatch[2], 10);
        console.log(`Found hip length with count: ${measurements.hipLength} ft (${measurements.hipCount} hips)`);
      }
      
      // Valley extraction with count
      const valleyWithCountRegex = /Valleys\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Valleys?\)/i;
      let valleyWithCountMatch = primaryText.match(valleyWithCountRegex);
      
      if (valleyWithCountMatch && valleyWithCountMatch[1] && valleyWithCountMatch[2]) {
        measurements.valleyLength = parseFloat(valleyWithCountMatch[1].replace(/,/g, ''));
        measurements.valleyCount = parseInt(valleyWithCountMatch[2], 10);
        console.log(`Found valley length with count: ${measurements.valleyLength} ft (${measurements.valleyCount} valleys)`);
      }
      
      // Rake extraction with count
      const rakeWithCountRegex = /Rakes.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Rakes?\)/i;
      let rakeWithCountMatch = primaryText.match(rakeWithCountRegex);
      
      if (rakeWithCountMatch && rakeWithCountMatch[1] && rakeWithCountMatch[2]) {
        measurements.rakeLength = parseFloat(rakeWithCountMatch[1].replace(/,/g, ''));
        measurements.rakeCount = parseInt(rakeWithCountMatch[2], 10);
        console.log(`Found rake length with count: ${measurements.rakeLength} ft (${measurements.rakeCount} rakes)`);
      }
      
      // Eave extraction with count
      const eaveWithCountRegex = /Eaves(?:\/Starter)?.*?=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Eaves?\)/i;
      let eaveWithCountMatch = primaryText.match(eaveWithCountRegex);
      
      if (eaveWithCountMatch && eaveWithCountMatch[1] && eaveWithCountMatch[2]) {
        measurements.eaveLength = parseFloat(eaveWithCountMatch[1].replace(/,/g, ''));
        measurements.eaveCount = parseInt(eaveWithCountMatch[2], 10);
        console.log(`Found eave length with count: ${measurements.eaveLength} ft (${measurements.eaveCount} eaves)`);
      }
      
      // Drip Edge extraction with count
      const dripEdgeWithCountRegex = /Drip\s*Edge\s*\(Eaves\s*\+\s*Rakes\)\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Lengths?\)/i;
      let dripEdgeWithCountMatch = primaryText.match(dripEdgeWithCountRegex);
      
      if (dripEdgeWithCountMatch && dripEdgeWithCountMatch[1] && dripEdgeWithCountMatch[2]) {
        measurements.dripEdgeLength = parseFloat(dripEdgeWithCountMatch[1].replace(/,/g, ''));
        console.log(`Found drip edge length with count: ${measurements.dripEdgeLength} ft (${dripEdgeWithCountMatch[2]} lengths)`);
      }
      
      // Flashing extraction with count
      const flashingWithCountRegex = /Flashing\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Lengths?\)/i;
      let flashingWithCountMatch = primaryText.match(flashingWithCountRegex);
      
      if (flashingWithCountMatch && flashingWithCountMatch[1] && flashingWithCountMatch[2]) {
        measurements.flashingLength = parseFloat(flashingWithCountMatch[1].replace(/,/g, ''));
        console.log(`Found flashing length with count: ${measurements.flashingLength} ft (${flashingWithCountMatch[2]} lengths)`);
      }
      
      // Step flashing extraction with count
      const stepFlashingWithCountRegex = /Step\s*flashing\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft\s*\((\d+)\s*Lengths?\)/i;
      let stepFlashingWithCountMatch = primaryText.match(stepFlashingWithCountRegex);
      
      if (stepFlashingWithCountMatch && stepFlashingWithCountMatch[1] && stepFlashingWithCountMatch[2]) {
        measurements.stepFlashingLength = parseFloat(stepFlashingWithCountMatch[1].replace(/,/g, ''));
        console.log(`Found step flashing length with count: ${measurements.stepFlashingLength} ft (${stepFlashingWithCountMatch[2]} lengths)`);
      }
      
      // Penetrations area extraction
      const penetrationsAreaWithCountRegex = /Total\s*Penetrations\s*Area\s*=\s*([0-9,]+(?:\.\d+)?)\s*sq\s*ft/i;
      let penetrationsAreaMatch = primaryText.match(penetrationsAreaWithCountRegex);
      
      if (penetrationsAreaMatch && penetrationsAreaMatch[1]) {
        measurements.penetrationsArea = parseFloat(penetrationsAreaMatch[1].replace(/,/g, ''));
        console.log(`Found penetrations area: ${measurements.penetrationsArea} sq ft`);
      }
      
      // Penetrations perimeter extraction
      const penetrationsPerimeterWithCountRegex = /Total\s*Penetrations\s*Perimeter\s*=\s*([0-9,]+(?:\.\d+)?)\s*ft/i;
      let penetrationsPerimeterMatch = primaryText.match(penetrationsPerimeterWithCountRegex);
      
      if (penetrationsPerimeterMatch && penetrationsPerimeterMatch[1]) {
        measurements.penetrationsPerimeter = parseFloat(penetrationsPerimeterMatch[1].replace(/,/g, ''));
        console.log(`Found penetrations perimeter: ${measurements.penetrationsPerimeter} ft`);
      }
      
      // Total area extraction
      const totalAreaWithCountRegex = /Total\s*Area\s*\(All\s*Pitches\)\s*=\s*([0-9,]+(?:\.\d+)?)\s*sq\s*ft/i;
      let totalAreaMatch = primaryText.match(totalAreaWithCountRegex);
      
      if (totalAreaMatch && totalAreaMatch[1]) {
        measurements.totalArea = parseFloat(totalAreaMatch[1].replace(/,/g, ''));
        console.log(`Found total area: ${measurements.totalArea} sq ft`);
      }
      
      // Predominant pitch extraction
      const predominantPitchRegex = /Predominant\s*Pitch\s*=\s*([0-9]{1,2}\/[0-9]{1,2})/i;
      let predominantPitchMatch = primaryText.match(predominantPitchRegex);
      
      if (predominantPitchMatch && predominantPitchMatch[1]) {
        // Normalize to x:12 format
        const [numerator, denominator] = predominantPitchMatch[1].split('/');
        measurements.predominantPitch = `${numerator}:${denominator}`;
        console.log(`Found predominant pitch: ${measurements.predominantPitch}`);
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
      const pitchAreaRegex = /(\d+[:/]\d+)\s*[Pp]itch[:\s]*(\d+(?:[,.]\d+)?)\s*(?:sq)?\s*(?:ft|feet)/g;
      let pitchMatch;
      while ((pitchMatch = pitchAreaRegex.exec(fullText)) !== null) {
        let pitch = pitchMatch[1].replace("/", ":");
        const area = parseFloat(pitchMatch[2].replace(",", ""));
        measurements.areasByPitch[pitch] = area;
        console.log(`Found area for pitch ${pitch}: ${area} sq ft`);
      }
      
      // If we didn't find any pitch areas, try another format
      if (Object.keys(measurements.areasByPitch).length === 0) {
        const alternativePitchRegex = /Pitch\s+(\d+[:/]\d+):\s*(\d+(?:[,.]\d+)?)/g;
        while ((pitchMatch = alternativePitchRegex.exec(fullText)) !== null) {
          let pitch = pitchMatch[1].replace("/", ":");
          const area = parseFloat(pitchMatch[2].replace(",", ""));
          measurements.areasByPitch[pitch] = area;
          console.log(`Found area for pitch ${pitch} (alt format): ${area} sq ft`);
        }
      }
      
      // If we still don't have pitch areas but have a predominant pitch and total area,
      // assign all area to the predominant pitch
      if (Object.keys(measurements.areasByPitch).length === 0 && 
          measurements.predominantPitch && 
          measurements.totalArea > 0) {
        measurements.areasByPitch[measurements.predominantPitch] = measurements.totalArea;
        console.log(`Assigned total area to predominant pitch ${measurements.predominantPitch}: ${measurements.totalArea} sq ft`);
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
