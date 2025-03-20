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
      
      // Extract areas by pitch
      console.log("Extracting areas by pitch...");
      
      // Initialize empty object to store areas by pitch
      measurements.areasByPitch = {};
      
      // First, try to look for "Areas per Pitch" or "Roof Pitches" sections in the document
      const areasPerPitchRegex = /(?:Areas\s+per\s+Pitch|Roof\s+Pitches)[\s\S]*?(?:Total|The\s+table\s+above|Structure\s+Complexity)/i;
      const areasPerPitchMatch = fullText.match(areasPerPitchRegex);
      
      if (areasPerPitchMatch) {
        console.log("Found 'Areas per Pitch' section");
        const areasPerPitchSection = areasPerPitchMatch[0];
        
        // First, try to detect if this is a horizontal table format (where pitches are column headers)
        // Pattern to extract a row of pitch headers like "1/12 2/12 5/12"
        // Try multiple patterns to capture different variations of the horizontal table format
        let pitchHeaders: string[] = [];
        let foundHorizontalTable = false;
        
        // Try to find the column of pitch values - we'll try multiple patterns
        const pitchHeaderPatterns = [
          // Pattern 1: "Roof Pitches 1/12 2/12 5/12" (on one line)
          /Roof\s+Pitches\s+((?:\d+\/\d+\s+)*\d+\/\d+)/i,
          
          // Pattern 2: Look for a line with just pitch values (after "Roof Pitches" appearing earlier)
          /(?:Roof\s+Pitches.*?)(?:\n.*?)?\s*?^((?:\d+\/\d+\s+)*\d+\/\d+)/im,
          
          // Pattern 3: Just look for a line with multiple pitches in the expected format
          /^\s*((?:\d+\/\d+\s+)+\d+\/\d+)\s*$/m
        ];
        
        for (const pattern of pitchHeaderPatterns) {
          const headerMatch = areasPerPitchSection.match(pattern);
          if (headerMatch && headerMatch[1]) {
            pitchHeaders = headerMatch[1].trim().split(/\s+/);
            if (pitchHeaders.length > 0) {
              console.log(`Detected ${pitchHeaders.length} pitch headers using pattern:`, pattern, pitchHeaders);
              foundHorizontalTable = true;
              break;
            }
          }
        }
        
        // If we found pitch headers, look for the corresponding area values
        if (foundHorizontalTable && pitchHeaders.length > 0) {          
          // Look for the area row, with multiple patterns to handle different formats
          const areaRowPatterns = [
            // Pattern 1: Standard format with label and values on same line
            /Area\s+\(?sq\s+ft\)?\s+((?:\d+[.,]?\d*\s+)*\d+[.,]?\d*)/i,
            
            // Pattern 2: Values on the line after "Area (sq ft)"
            /Area\s+\(?sq\s+ft\)?\s*\n\s*((?:\d+[.,]?\d*\s+)*\d+[.,]?\d*)/i,
            
            // Pattern 3: More precise pattern to find area values in the row after "Area (sq ft)"
            /Area\s+\(?sq\s+ft\)?\s*[\r\n][\s\r\n]*([0-9.,]+(?:\s+[0-9.,]+)*)/i,
            
            // Pattern 4: Even more precise pattern for finding areas, searching for numbers positioned under pitch values
            new RegExp(`Area\\s+\\(?sq\\s+ft\\)?.*?\\n.*?(${pitchHeaders.map(() => '\\s*[0-9.,]+').join('')})`, 'i'),
            
            // Pattern 5: Look for lines with just numeric values that could be area values
            /^\s*([0-9.,]+(?:\s+[0-9.,]+)*)\s*$/m
          ];
          
          let areaValues: number[] = [];
          
          for (const pattern of areaRowPatterns) {
            const areaMatch = areasPerPitchSection.match(pattern);
            if (areaMatch && areaMatch[1]) {
              // Clean up the matched string - remove extra whitespace, split by whitespace
              const cleanMatch = areaMatch[1].trim().replace(/\s+/g, ' ');
              console.log("Possible area values raw match:", cleanMatch);
              
              const candidateValues = cleanMatch.split(/\s+/)
                .map(val => parseFloat(val.replace(/,/g, '')))
                .filter(val => !isNaN(val) && val > 0); // Only include positive, non-zero values
                
              console.log("Candidate area values:", candidateValues);
                
              // Check if the number of values matches the number of pitch headers
              if (candidateValues.length === pitchHeaders.length) {
                areaValues = candidateValues;
                console.log("Found area values matching pitch count:", areaValues);
                break;
              } else if (candidateValues.length > 0) {
                console.log("Area count doesn't match pitch count, trying next pattern");
                console.log(`Found ${candidateValues.length} areas but have ${pitchHeaders.length} pitches`);
              }
            }
          }
          
          // If we couldn't match the exact number of areas to pitches, do a more thorough search
          if (areaValues.length === 0 || areaValues.length !== pitchHeaders.length) {
            console.log("Standard patterns failed. Attempting more thorough search for area values...");
            
            // Look for lines with just numbers that might be area values
            const numberLines = areasPerPitchSection.split('\n')
              .map(line => line.trim())
              .filter(line => /^[0-9., ]+$/.test(line))
              .map(line => line.split(/\s+/).map(val => parseFloat(val.replace(/,/g, ''))).filter(val => !isNaN(val) && val > 0));
            
            console.log("Found number-only lines:", numberLines);
            
            // Find a line with the same number of values as pitch headers
            for (const line of numberLines) {
              if (line.length === pitchHeaders.length) {
                areaValues = line;
                console.log("Found matching area values from standalone line:", areaValues);
                break;
              }
            }
            
            // If still no match, try to find area values from specific patterns near "sq ft" text
            if (areaValues.length === 0 || areaValues.length !== pitchHeaders.length) {
              const areaTextMatches = Array.from(areasPerPitchSection.matchAll(/([0-9.,]+)\s*(?:sq\s*ft|square\s*feet)/gi));
              console.log("Found specific area text matches:", areaTextMatches.map(m => m[1]));
              
              if (areaTextMatches.length === pitchHeaders.length) {
                areaValues = areaTextMatches.map(m => parseFloat(m[1].replace(/,/g, '')));
                console.log("Extracted area values from specific area mentions:", areaValues);
              }
            }
          }
          
          // Try to also extract the percentage row for validation
          const percentRowPatterns = [
            // Pattern 1: Standard format with label and percentage values on same line
            /%\s+of\s+Roof\s+((?:\d+[.,]?\d*\s*%\s+)*\d+[.,]?\d*\s*%)/i,
            
            // Pattern 2: Values on the line after "% of Roof"
            /%\s+of\s+Roof\s*\n\s*((?:\d+[.,]?\d*\s*%\s+)*\d+[.,]?\d*\s*%)/i,
            
            // Pattern 3: More precise pattern for finding percentages
            /%\s+of\s+Roof.*?[\r\n][\s\r\n]*([0-9.,]+%(?:\s+[0-9.,]+%)*)/i,
            
            // Pattern 4: Look for lines with just percentage values
            /^\s*([0-9.,]+%(?:\s+[0-9.,]+%)*)\s*$/m
          ];
          
          let percentValues: number[] = [];
          
          for (const pattern of percentRowPatterns) {
            const percentMatch = areasPerPitchSection.match(pattern);
            if (percentMatch && percentMatch[1]) {
              // Clean up the matched string
              const cleanMatch = percentMatch[1].trim().replace(/\s+/g, ' ');
              console.log("Possible percentage values raw match:", cleanMatch);
              
              // Extract numeric values from percentages (remove % symbols)
              percentValues = cleanMatch.split(/\s+/)
                .map(val => parseFloat(val.replace(/[%,]/g, '')))
                .filter(val => !isNaN(val) && val >= 0 && val <= 100); // Only include valid percentage values
                
              console.log("Candidate percentage values:", percentValues);
                
              if (percentValues.length === pitchHeaders.length) {
                console.log("Found percentage values matching pitch count:", percentValues);
                break;
              }
            }
          }
          
          // If we couldn't find percentages with standard patterns, look for percentage values in lines
          if (percentValues.length === 0 || percentValues.length !== pitchHeaders.length) {
            // Look for lines with just percentage values
            const percentLines = areasPerPitchSection.split('\n')
              .map(line => line.trim())
              .filter(line => /^[0-9., %]+$/.test(line) && line.includes('%'))
              .map(line => {
                // Extract all percentage values from the line
                const matches = Array.from(line.matchAll(/([0-9.,]+)\s*%/g));
                return matches.map(m => parseFloat(m[1].replace(/,/g, '')));
              })
              .filter(percentages => percentages.length > 0);
            
            console.log("Found percentage-only lines:", percentLines);
            
            // Find a line with the same number of values as pitch headers
            for (const line of percentLines) {
              if (line.length === pitchHeaders.length) {
                percentValues = line;
                console.log("Found matching percentage values from standalone line:", percentValues);
                break;
              }
            }
          }
          
          // Final validation: make sure areaValues look reasonable
          if (areaValues.length > 0 && measurements.totalArea > 0) {
            // Calculate sum of areas to validate against total area
            const sumAreas = areaValues.reduce((sum, area) => sum + area, 0);
            
            // If the sum of areas is dramatically different from total area (more than 20% off),
            // something might be wrong with our extraction
            if (Math.abs(sumAreas - measurements.totalArea) / measurements.totalArea > 0.2) {
              console.warn(`Warning: Sum of extracted areas (${sumAreas.toFixed(1)}) differs significantly from total area (${measurements.totalArea})`);
              
              // If we have percentage values, we can use them to recalculate areas
              if (percentValues.length === pitchHeaders.length) {
                console.log("Attempting to recalculate areas using percentage values");
                
                // Recalculate areas using percentages and total area
                areaValues = percentValues.map(percent => (percent / 100) * measurements.totalArea);
                
                console.log("Recalculated areas using percentages:", areaValues);
              }
            } else {
              console.log(`Validation: Sum of areas (${sumAreas.toFixed(1)}) is close to total area (${measurements.totalArea})`);
            }
          }
          
          // Map the pitches to areas, and log the percentages for validation if available
          if (areaValues.length > 0 && areaValues.length === pitchHeaders.length) {
            pitchHeaders.forEach((pitch, index) => {
              // Clean up the pitch value - ensure it's in the correct format
              let cleanPitch = pitch.trim();
              
              // Handle special cases like "flat" or numeric-only values
              if (cleanPitch.toLowerCase() === 'flat') {
                cleanPitch = '0/12';
              } else if (/^\d+$/.test(cleanPitch)) {
                // If it's just a number like "4", assume it's "4/12"
                cleanPitch = `${cleanPitch}/12`;
              } else if (!cleanPitch.includes('/') && !cleanPitch.includes(':')) {
                // If it doesn't contain a slash or colon, it might be malformed
                // Try to extract a number and assume it's x/12
                const matchNum = cleanPitch.match(/(\d+)/);
                if (matchNum) {
                  cleanPitch = `${matchNum[1]}/12`;
                }
              }
              
              // Normalize to use colon instead of slash for the internal format
              const normalizedPitch = cleanPitch.replace('/', ':');
              
              measurements.areasByPitch[normalizedPitch] = areaValues[index];
              
              if (percentValues.length === pitchHeaders.length) {
                const calculatedPercent = measurements.totalArea > 0 
                  ? (areaValues[index] / measurements.totalArea) * 100 
                  : 0;
                console.log(`Mapped pitch ${normalizedPitch} to area ${areaValues[index]} sq ft (${percentValues[index]}%, calculated: ${calculatedPercent.toFixed(1)}%)`);
              } else {
                console.log(`Mapped pitch ${normalizedPitch} to area ${areaValues[index]} sq ft (from horizontal table)`);
              }
            });
            
            // Successfully parsed horizontal table
            console.log("Successfully parsed horizontal table format for areas by pitch");
          } else {
            console.warn("Could not find matching area values for pitches in horizontal table");
            foundHorizontalTable = false;
          }
        }
        
        // If we couldn't parse the horizontal table format, fall back to the vertical format
        if (!foundHorizontalTable) {
          console.log("Falling back to vertical table pattern matching");
          // More robust pattern to extract pitch and area values from a table-like structure
          // This pattern looks for:
          // 1. A pitch value (like 5/12, 7/12, etc.)
          // 2. Followed by an area value (potentially with commas and decimal points)
          // 3. Optionally followed by a percentage
          const pitchAreaRegex = /(\d+\/\d+|flat)\s*[:\(\s]*([0-9,\.]+)(?:\s*sq\s*ft|\))?(?:\s*(?:\(|=|:|\s)\s*([0-9\.]+)\s*%)?/gi;
          
          let pitchMatch;
          while ((pitchMatch = pitchAreaRegex.exec(areasPerPitchSection)) !== null) {
            const pitch = pitchMatch[1];
            // Clean up the area value - remove commas and ensure it's a valid number
            const area = parseFloat(pitchMatch[2].replace(/,/g, ''));
            
            if (!isNaN(area)) {
              // Convert to standard format (e.g., "7/12" instead of variations)
              const normalizedPitch = pitch.toLowerCase() === 'flat' ? '0/12' : pitch;
              
              // Store with the correct format for the app (using a colon instead of slash if needed)
              const pitchKey = normalizedPitch.replace('/', ':');
              
              measurements.areasByPitch[pitchKey] = area;
              console.log(`Mapped pitch ${pitchKey} to area ${area} sq ft (from vertical table format)`);
            }
          }
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
              // Assume this pitch covers at least 95% of the roof
              const area = measurements.totalArea * 0.95;
              measurements.areasByPitch[normalizedPitch] = area;
              console.log(`Using predominant pitch ${normalizedPitch} for ${area.toFixed(1)} sq ft (95% of total area)`);
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
      if (Math.abs(extractedTotal - measurements.totalArea) > measurements.totalArea * 0.1) {
        console.warn(`Warning: Total pitch area (${extractedTotal.toFixed(1)} sq ft) differs from total roof area (${measurements.totalArea} sq ft) by more than 10%`);
        
        // Add fix: If we have a large discrepancy, assign the remaining area to the predominant pitch
        if (measurements.predominantPitch && extractedTotal < measurements.totalArea * 0.9) {
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
