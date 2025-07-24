import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MeasurementValues } from "../measurement/types";
import { Material } from "../materials/types";
import { toast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { RoleBasedProfitMargin } from "./RoleBasedProfitMargin";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/components/RoleGuard";

interface LaborProfitTabProps {
  onBack: () => void;
  initialLaborRates?: LaborRates;
  initialProfitMargin?: number;
  measurements?: MeasurementValues;
  selectedMaterials: {[key: string]: Material};
  quantities: {[key: string]: number};
  onLaborProfitContinue: (laborRates: LaborRates, profitMargin: number) => void;
  readOnly?: boolean;
  laborRates?: LaborRates;
  // Admin edit mode props
  isAdminEditMode?: boolean;
  originalCreator?: string | null;
  originalCreatorRole?: string | null;
}

export interface LaborRates {
  laborRate?: number; // Combined tear off and installation rate
  tearOff?: number; // For backward compatibility
  installation?: number; // For backward compatibility
  isHandload: boolean;
  handloadRate: number;
  dumpsterLocation: "orlando" | "outside";
  dumpsterCount: number;
  dumpsterRate: number;
  includePermits: boolean; // Add permits flag
  permitRate: number; // Base permit rate
  permitCount: number; // Number of permits
  permitAdditionalRate: number; // Cost for each additional permit
  pitchRates: {[pitch: string]: number};
  wastePercentage: number;
  includeGutters?: boolean; // Whether to include gutters
  gutterLinearFeet?: number; // Linear feet of 6" aluminum gutters
  gutterRate?: number; // Rate per linear foot for gutters
  includeDownspouts?: boolean; // Whether to include downspouts
  downspoutCount?: number; // Number of downspouts
  downspoutRate?: number; // Rate per downspout
  includeDetachResetGutters?: boolean; // Whether to include detach and reset gutters
  detachResetGutterLinearFeet?: number; // Linear feet of gutters to detach and reset
  detachResetGutterRate?: number; // Rate per linear foot for detach and reset
  includeSkylights2x2?: boolean; // Whether to include 2x2 skylights
  skylights2x2Count?: number; // Number of 2x2 skylights
  skylights2x2Rate?: number; // Rate per 2x2 skylight ($280)
  includeSkylights2x4?: boolean; // Whether to include 2x4 skylights
  skylights2x4Count?: number; // Number of 2x4 skylights
  skylights2x4Rate?: number; // Rate per 2x4 skylight ($370)
  includeLowSlopeLabor?: boolean; // New: Toggle for low slope area labor
  includeSteepSlopeLabor?: boolean; // New: Toggle for steep slope area labor
}

export function LaborProfitTab({
  onBack,
  initialLaborRates: initialLaborRatesProp,
  initialProfitMargin: initialProfitMarginProp,
  measurements,
  selectedMaterials,
  quantities,
  onLaborProfitContinue,
  readOnly,
  laborRates: laborRatesFromProps,
  // Admin edit mode props
  isAdminEditMode = false,
  originalCreator = null,
  originalCreatorRole = null,
}: LaborProfitTabProps) {
  const { profile } = useAuth();
  const { isAdmin } = useRoleAccess();
  const userRole = profile?.role;
  
  // Safety check: If we're in the sales rep flow, force rep role
  const location = window.location.pathname;
  const effectiveUserRole = location.includes('/sales-estimate') ? 'rep' : userRole;
  
  // Debug logging to track role changes
  useEffect(() => {
    console.log('🔍 [LaborProfitTab] User role:', userRole, 'Effective role:', effectiveUserRole, 'Path:', location, 'Profile:', profile);
  }, [userRole, effectiveUserRole, location, profile]);
  
  // 🔐 CRITICAL SECURITY: Permission functions
  const canEditLaborRates = () => {
    // Admin override: If in admin edit mode and current user is admin, allow editing
    if (isAdminEditMode && isAdmin) {
      return true; // Admins can edit any estimate when in admin edit mode
    }
    
    // Normal operation: Only admins can edit labor rates (not Territory Managers)
    if (!readOnly && isAdmin) {
      return true; // Admins can edit material prices
    }
    
    // Territory Managers, Sales Reps, and other roles cannot edit labor rates
    return false;
  };

  // 🔓 NEW: Territory Managers can edit quantities and toggles
  const canEditQuantitiesAndToggles = () => {
    // Admin override: If in admin edit mode and current user is admin, allow editing
    if (isAdminEditMode && isAdmin) {
      return true; // Admins can edit any estimate when in admin edit mode
    }
    
    // Normal operation: Territory Managers AND Admins can edit quantities/toggles
    if (!readOnly && (isAdmin || userRole === 'manager')) {
      return true; // Territory Managers can edit quantities and toggles
    }
    
    // Sales Reps and other roles cannot edit quantities
    return false;
  };

  // 🔓 NEW: Sales Reps can edit dumpster location and permits toggles only
  const canEditDumpsterLocationAndPermits = () => {
    // Admin override: If in admin edit mode and current user is admin, allow editing
    if (isAdminEditMode && isAdmin) {
      return true; // Admins can edit any estimate when in admin edit mode
    }
    
    // Normal operation: Sales Reps, Territory Managers AND Admins can edit dumpster location and permits
    if (!readOnly && (isAdmin || effectiveUserRole === 'manager' || effectiveUserRole === 'rep')) {
      return true; // Sales Reps can select dumpster location and permits
    }
    
    // Other roles cannot edit
    return false;
  };

  // 🔓 NEW: Sales Reps can edit gutters and skylights
  const canEditGuttersAndSkylights = () => {
    // Admin override: If in admin edit mode and current user is admin, allow editing
    if (isAdminEditMode && isAdmin) {
      return true; // Admins can edit any estimate when in admin edit mode
    }
    
    // Normal operation: Sales Reps, Territory Managers AND Admins can edit gutters and skylights
    if (!readOnly && (isAdmin || effectiveUserRole === 'manager' || effectiveUserRole === 'rep')) {
      return true; // Sales Reps can edit gutters and skylights
    }
    
    // Other roles cannot edit
    return false;
  };

  // 🔓 NEW: Sales Reps can edit specific labor toggles (handload and labor scope)
  const canEditSalesRepLaborToggles = () => {
    // Admin override: If in admin edit mode and current user is admin, allow editing
    if (isAdminEditMode && isAdmin) {
      return true; // Admins can edit any estimate when in admin edit mode
    }
    
    // Normal operation: Sales Reps, Territory Managers AND Admins can edit these specific toggles
    if (!readOnly && (isAdmin || effectiveUserRole === 'manager' || effectiveUserRole === 'rep')) {
      return true; // Sales Reps can toggle handload and labor scope options
    }
    
    // Other roles cannot edit
    return false;
  };

  // 🔓 Everyone can edit permit count (but minimum 1 is enforced)
  const canEditPermitCount = () => {
    // Admin override: If in admin edit mode and current user is admin, allow editing
    if (isAdminEditMode && isAdmin) {
      return true; // Admins can edit any estimate when in admin edit mode
    }
    
    // Normal operation: Everyone can edit permit count when not in read-only mode
    // This includes Sales Reps, Territory Managers, and Admins
    if (!readOnly) {
      return true; // All users can adjust permit count
    }
    
    // Read-only mode: no one can edit
    return false;
  };

  const getSafeInitialRates = useCallback((initialRates?: LaborRates): LaborRates => {
    // Calculate recommended dumpster count based on roof area
    const recommendedDumpsterCount = measurements?.totalArea && measurements.totalArea > 0 
      ? Math.max(1, Math.ceil((measurements.totalArea / 100) / 28)) 
      : 1;

    const defaults: LaborRates = {
      laborRate: 85, tearOff: 0, installation: 0, isHandload: false, handloadRate: 10,
      dumpsterLocation: "orlando", 
      dumpsterCount: recommendedDumpsterCount, // Always start with the recommendation
      dumpsterRate: 400, 
      includePermits: true, permitRate: 450, permitCount: 1, permitAdditionalRate: 450, 
      pitchRates: {}, wastePercentage: 12, includeGutters: false, gutterLinearFeet: 0, 
      gutterRate: 8, includeDownspouts: false, downspoutCount: 0, downspoutRate: 75,
      includeDetachResetGutters: false, detachResetGutterLinearFeet: 0, detachResetGutterRate: 1,
      includeSkylights2x2: false, skylights2x2Count: 0, skylights2x2Rate: 280,
      includeSkylights2x4: false, skylights2x4Count: 0, skylights2x4Rate: 370,
      includeLowSlopeLabor: true, // Default to true
      includeSteepSlopeLabor: true, // Default to true
    };
    
    let combined = { ...defaults, ...(initialRates || {}) };

    // ALWAYS use the fresh calculation for dumpster count when measurements are available
    // This ensures the recommendation is applied even with existing saved data
    if (measurements?.totalArea && measurements.totalArea > 0) {
      combined.dumpsterCount = recommendedDumpsterCount;
    }
    
    // Ensure permit count is at least 1 (minimum one permit per job)
    combined.permitCount = Math.max(1, combined.permitCount || 1);
    
    // Always include permits
    combined.includePermits = true;
    
    // Fixed rates for demo (Central Florida rates)
    combined.dumpsterLocation = "orlando";
    combined.dumpsterRate = initialRates?.dumpsterRate !== undefined ? initialRates.dumpsterRate : 400;
    combined.permitRate = initialRates?.permitRate !== undefined ? initialRates.permitRate : 450;

    if (!combined.laborRate && (combined.tearOff || combined.installation)) {
      combined.laborRate = (combined.tearOff || 0) + (combined.installation || 0);
    }
    return combined;
  }, [measurements]);

  const [laborRates, setLaborRates] = useState<LaborRates>(() => getSafeInitialRates(initialLaborRatesProp));
  const [profitMargin, setProfitMargin] = useState(() => {
    // Set default profit margin based on role
    if (initialProfitMarginProp !== undefined) {
      return initialProfitMarginProp;
    }
    // Default to 30% for sales reps, 25% for others
    return effectiveUserRole === 'rep' ? 30 : 25;
  });

  const isInitialMount = useRef(true);
  const hasUserInteracted = useRef(false);
  const hasComponentStabilized = useRef(false);

  useEffect(() => {
    setLaborRates(getSafeInitialRates(initialLaborRatesProp));
    // Set default profit margin based on role when updating
    setProfitMargin(initialProfitMarginProp !== undefined ? initialProfitMarginProp : (effectiveUserRole === 'rep' ? 30 : 25));
    hasUserInteracted.current = false; 
  }, [initialLaborRatesProp, initialProfitMarginProp, getSafeInitialRates, effectiveUserRole]);

  // Add a delay to allow component to stabilize before allowing callbacks
  useEffect(() => {
    const timer = setTimeout(() => {
      hasComponentStabilized.current = true;
      console.log('🎯 [LaborProfitTab] Component stabilized, callbacks now allowed');
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // 🔧 FIX: Track if user has manually changed dumpster count to prevent glitching
  const [hasUserChangedDumpsterCount, setHasUserChangedDumpsterCount] = useState(false);
  
  // 🔧 FIX: Reduce excessive dumpster logging to prevent console spam
  const lastDumpsterLogTime = useRef(0);
  const lastDumpsterRecommendation = useRef(0);

  // 🔧 NEW: Update dumpster count when measurements change (for fresh PDF uploads)
  // Only auto-populate if user hasn't manually changed the count
  useEffect(() => {
    if (measurements?.totalArea && measurements.totalArea > 0 && !hasUserChangedDumpsterCount) {
      const newRecommendedCount = Math.max(1, Math.ceil((measurements.totalArea / 100) / 28));
      
      // 🔧 PERFORMANCE FIX: Removed all dumpster logging to prevent console spam
      lastDumpsterRecommendation.current = newRecommendedCount;
      
      // Only update if the recommendation has changed to prevent unnecessary re-renders
      if (laborRates.dumpsterCount !== newRecommendedCount) {
        setLaborRates(prev => ({
          ...prev,
          dumpsterCount: newRecommendedCount
        }));
        // Don't mark as user interaction since this is an automatic update
      }
    }
  }, [measurements?.totalArea, hasUserChangedDumpsterCount]); // Include hasUserChangedDumpsterCount in dependencies

  // 🔧 CRITICAL FIX: Completely removed problematic dumpster calculation effect
  // Users can manually set dumpster count - no automatic calculation
  // This prevents the infinite loop between 1 and 2

  // 🔧 PERFORMANCE: Simplified permit rate effect - only trigger on location change
  useEffect(() => {
    const expectedPermitRate = laborRates.dumpsterLocation === "orlando" ? 450 : 550;
    
    if (laborRates.permitRate !== expectedPermitRate) {
      setLaborRates(prev => ({
        ...prev,
        permitRate: expectedPermitRate
      }));
    }
  }, [laborRates.dumpsterLocation]); // REMOVED permitRate from deps to prevent circular updates

  // 🔧 PERFORMANCE: Drastically reduced callback effect dependencies to prevent infinite loops
  // Commented out to prevent automatic navigation - user must click Continue button
  /*
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; 
    }
    
    console.log('🎯 [LaborProfitTab] useEffect triggered - laborRate:', laborRates.laborRate, 'hasUserInteracted:', hasUserInteracted.current, 'hasComponentStabilized:', hasComponentStabilized.current);
    
    // Only call parent callback if user has interacted AND component has stabilized
    if (hasUserInteracted.current && hasComponentStabilized.current && onLaborProfitContinue) {
        onLaborProfitContinue(laborRates, profitMargin);
      }
  }, [
    // 🔧 MINIMAL DEPENDENCIES: Only laborRate to prevent excessive re-renders
    laborRates.laborRate
    // Removed profitMargin - it's handled manually in handleProfitMarginCommit
    // Removed all other fields that were causing infinite loops
  ]);
  */

  const commonStateUpdater = (updater: (prev: LaborRates) => LaborRates, shouldSyncImmediately = false) => {
    setLaborRates(prev => {
      const newState = updater(prev);
      // 🔧 CRITICAL FIX: Only sync critical changes immediately, not every toggle
      if (shouldSyncImmediately && hasUserInteracted.current && hasComponentStabilized.current && onLaborProfitContinue) {
        // Use setTimeout to ensure state update completes first
        setTimeout(() => {
          onLaborProfitContinue(newState, profitMargin);
        }, 0);
      }
      return newState;
    });
    hasUserInteracted.current = true;
  };
  
  const handleLaborRateChange = (
    field: keyof Omit<LaborRates, "pitchRates" | "permitRate">,
    value: string | boolean | number
  ) => {
    let processedValue = value;
    const locationDefaultDumpsterRate = laborRates.dumpsterLocation === "orlando" ? 400 : 500;

    // Determine if this change should sync immediately
    const criticalFields = ['laborRate', 'wastePercentage'];
    const shouldSyncImmediately = criticalFields.includes(field);

    if (field === "dumpsterCount") {
        // 🔧 FIX: Allow 0 temporarily for better input UX
        if (typeof value === 'number') {
            // Direct numeric value from onChange
            processedValue = value;
        } else {
            const valStr = String(value).trim();
            if (valStr === "") {
                processedValue = 0; // Allow 0 temporarily
            } else {
                const parsed = parseInt(valStr, 10);
                if (!isNaN(parsed) && parsed >= 0) {
                    processedValue = parsed;
                } else {
                    processedValue = 1; // Fallback to 1 if parsing fails
                }
            }
        }
        // Ignore manual changes to dumpster count - always auto-calculated based on roof area
        return;
    } else if (field === "skylights2x2Count" || field === "skylights2x4Count" || field === "downspoutCount" || field === "gutterLinearFeet" || field === "detachResetGutterLinearFeet") {
        const valStr = String(value).trim();
        if (valStr === "") {
            processedValue = 0;
        } else {
            const parsed = parseInt(valStr, 10);
            if (!isNaN(parsed) && parsed >= 0) {
                processedValue = parsed;
            } else {
                processedValue = 0;
            }
        }
    } else if (field === "permitCount") {
        // Allow editing permit count but enforce minimum of 1
        const valStr = String(value).trim();
        if (valStr === "") {
            processedValue = 1; // Default to 1 if empty
        } else {
            const parsed = parseInt(valStr, 10);
            if (!isNaN(parsed) && parsed >= 1) {
                processedValue = parsed;
            } else {
                processedValue = 1; // Minimum 1 permit
            }
        }
    } else if (typeof value === "string" && field !== "dumpsterLocation") {
      if (value.trim() === "") {
        if (field === 'laborRate' || field === 'handloadRate') { // dumpsterCount handled above
          processedValue = 0;
        } else if (field === 'dumpsterRate') {
          processedValue = locationDefaultDumpsterRate;
        } else {
          processedValue = undefined; 
        }
      } else {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
          if (field === 'laborRate' || field === 'handloadRate') { // dumpsterCount handled above
            processedValue = 0; 
          } else if (field === 'dumpsterRate') {
            processedValue = locationDefaultDumpsterRate; 
          } else {
            processedValue = undefined;
          }
        } else {
          processedValue = parsed;
        }
      }
    }

    // Add specific logging for permits toggle
    if (field === "includePermits") {
      console.log('🎯 [LaborProfitTab] Permits toggle changed to:', value, 'shouldSyncImmediately:', shouldSyncImmediately);
    }

    // Add specific logging for labor scope toggles
    if (field === "includeLowSlopeLabor" || field === "includeSteepSlopeLabor") {
      console.log(`🎯 [LaborProfitTab] ${field} changed to:`, value, 'Current laborRates:', laborRates);
    }

    commonStateUpdater(prev => {
      const updatedRates = {
        ...prev,
        [field]: processedValue 
      } as LaborRates; 
      
      if (field === "dumpsterLocation") {
        // When location changes, also reset dumpsterRate to the default for the new location
        // and permitRate.
        updatedRates.dumpsterRate = value === "orlando" ? 400 : 500;
        updatedRates.permitRate = value === "orlando" ? 450 : 550;
      }
      return updatedRates;
    }, shouldSyncImmediately);
  };
  
  const handlePitchRateChange = (pitch: string, value: string) => {
    let numValue: number | undefined;
    if (value.trim() === "") {
      numValue = undefined; 
    } else {
      const parsed = parseFloat(value);
      numValue = isNaN(parsed) ? undefined : parsed;
    }
    commonStateUpdater(prev => ({
      ...prev,
      pitchRates: { ...prev.pitchRates, [pitch]: numValue }
    }), true); // Pitch rates are critical for pricing
  };
  
  const handleProfitMarginChange = (value: number[]) => {
    const newMargin = value[0];
    console.log('🎯 [LaborProfitTab] handleProfitMarginChange called with:', newMargin);
    setProfitMargin(newMargin);
    // Don't call parent on every change, only on commit
  };
  
  const handleProfitMarginCommit = (value: number[]) => {
    console.log('🎯 [LaborProfitTab] handleProfitMarginCommit called with:', value[0]);
    hasUserInteracted.current = true;
    setProfitMargin(value[0]);
    // Don't automatically navigate - let user click Continue button
  };
  
  const handleDumpsterLocationChange = (value: string) => {
    const location = value as "orlando" | "outside";
    setLaborRates(prev => {
      const isLocationChanging = prev.dumpsterLocation !== location;
      const newRate = isLocationChanging ? (location === "orlando" ? 400 : 500) : prev.dumpsterRate;
      return {
        ...prev,
        dumpsterLocation: location,
        dumpsterRate: newRate,
        permitRate: location === "orlando" ? 450 : 550
      };
    });
    hasUserInteracted.current = true;
  };
  
  // 🔧 PERFORMANCE: Memoized pitch rate calculation to prevent excessive re-calculations
  const getPitchRate = useCallback((pitch: string = "6:12") => {
    try {
      // Handle potential undefined or malformed input
      if (!pitch) {
        return 85; // Default rate for standard pitch
      }
      
      // Make sure we have a valid string to parse
      const pitchValue = parseInt(pitch.split(/[:\/]/)[0]) || 0;
      
      // Different rate logic based on pitch range
      if (pitchValue >= 8) {
        // 8/12-18/12 has increasing rates
        const basePitchValue = 8; // 8/12 is the base pitch
        const baseRate = 90; // Base rate for 8/12
        const increment = 5; // $5 increment per pitch level
        return baseRate + (pitchValue - basePitchValue) * increment;
      } else if (pitchValue === 0) {
        // Flat roof default rate
        const overrideRate = laborRates.pitchRates["0:12"] !== undefined ? laborRates.pitchRates["0:12"] : 159;
        return overrideRate;
      } else if (pitchValue <= 2) {
        // 1/12-2/12 has $109/sq labor rate
        return 109;
      } else {
        // 3/12-7/12 has the standard $85 rate
        return 85;
      }
    } catch (e) {
      console.error("Error in getPitchRate:", e);
      return 85; // Default fallback
    }
  }, [laborRates.pitchRates]); // Only recalculate when pitch overrides change
  
  // Get labor cost for a specific material
  const getLaborCostForMaterial = (materialId: string, squaresArea: number): number => {
    // Special case for GAF Poly ISO 4X8 (0/12 pitch) - $50/sq
    if (materialId === "gaf-poly-iso-4x8") {
      return squaresArea * 50;
    }
    
    // Special case for Polyglass Base Sheet (1/12 or 2/12 pitch) - $109/sq
    if (materialId === "polyglass-elastoflex-sbs") {
      return squaresArea * 109;
    }
    
    // Special case for Polyglass Cap Sheet (1/12 or 2/12 pitch) - $109/sq
    if (materialId === "polyglass-polyflex-app") {
      return squaresArea * 109;
    }
    
    // Default labor rate for standard pitches
    return squaresArea * (laborRates.laborRate || 85);
  };
  
  const calculateTotalLaborCost = (measurements: MeasurementValues, laborRates: LaborRates, selectedMaterials: {[key: string]: Material} = {}, quantities: {[key: string]: number} = {}) => {
    // Start with base assumptions
    const totalArea = measurements?.totalArea || 0;
    const squares = totalArea / 100;
    const wasteMultiplier = 1 + (laborRates.wastePercentage || 12) / 100;
    
    let totalLaborCost = 0;
    // No longer need these specific material checks here as we will iterate by pitch area
    // let has0PitchMaterial = false;
    // let has12PitchMaterial = false;
    
    // if (selectedMaterials) {
    //   has0PitchMaterial = Object.values(selectedMaterials).some(material => 
    //     material.id === "gaf-poly-iso-4x8");
      
    //   has12PitchMaterial = Object.values(selectedMaterials).some(material => 
    //     material.id === "polyglass-elastoflex-sbs" || material.id === "polyglass-polyflex-app");
    // }
    
    // Calculate labor based on pitch areas
    if (measurements?.areasByPitch && measurements.areasByPitch.length > 0) {
      measurements.areasByPitch.forEach(area => {
        const pitchRaw = area.pitch;
        const pitchValue = parseInt(pitchRaw.split(/[:\/]/)[0]) || 0;
        const pitchSquares = Math.ceil((area.area || 0) / 100);

        if (pitchSquares === 0) return; // No area for this pitch, skip

        let isLowSlopePitch = pitchValue >= 0 && pitchValue <= 2;
        let isSteepSlopePitch = pitchValue >= 3; // Assuming anything 3/12 and up is "steep" for this toggle logic

        if (isLowSlopePitch && !(laborRates.includeLowSlopeLabor ?? true)) {
          // Skipping labor for low slope pitch as includeLowSlopeLabor is false
          return; // Skip this low slope pitch area - no labor cost added
        }
        if (isSteepSlopePitch && !(laborRates.includeSteepSlopeLabor ?? true)) {
          // Skipping labor for steep slope pitch as includeSteepSlopeLabor is false
          return; // Skip this steep slope pitch area - no labor cost added
        }
        
        // Apply different labor rates based on pitch
        if (pitchValue === 0) {
          // Flat roof: round up to full squares and use $159 per square unless overridden.
          const flatSquares = Math.ceil(pitchSquares);
          const overrideRate = laborRates.pitchRates["0:12"] !== undefined ? laborRates.pitchRates["0:12"] : 159;
          totalLaborCost += flatSquares * overrideRate * wasteMultiplier;
        } else if (pitchValue === 1 || pitchValue === 2) {
          // 1/12 or 2/12 pitch uses $109/sq labor rate
          totalLaborCost += pitchSquares * 109 * wasteMultiplier;
        } else if (pitchValue >= 8) {
          // Steep slopes 8/12 and up
          const specificPitchRate = laborRates.pitchRates[pitchRaw] || getPitchRate(pitchRaw);
          totalLaborCost += pitchSquares * specificPitchRate * wasteMultiplier;
        } else { // This covers 3/12 to 7/12
          // Regular labor rate for standard pitches (3/12-7/12)
          totalLaborCost += pitchSquares * (laborRates.laborRate || 85) * wasteMultiplier;
        }
      });
    } else if (squares > 0 && (laborRates.includeSteepSlopeLabor ?? true)) {
      // Fallback if no pitch data, assume it's standard steep slope labor if that toggle is on
      totalLaborCost = squares * (laborRates.laborRate || 85) * wasteMultiplier;
    } else {
      // No areasByPitch and either no squares or steep slope labor is off
      totalLaborCost = 0;
    }
    
    // Add handload cost if applicable, applied to the total squares with waste
    if (laborRates.isHandload && totalLaborCost > 0) { 
      totalLaborCost += squares * (laborRates.handloadRate || 10) * wasteMultiplier;
    }
    
    return totalLaborCost;
  };
  
  // 🔧 PERFORMANCE: Memoized labor cost calculation to prevent excessive recalculations
  const estTotalLaborCost = useMemo(() => 
    measurements ? calculateTotalLaborCost(measurements, laborRates, selectedMaterials, quantities) : 0,
    [measurements, laborRates, selectedMaterials, quantities]
  );
  
  // 🔧 PERFORMANCE: Memoized pitch options to prevent recreation on every render
  const pitchOptions = useMemo(() => 
    Array.from({ length: 11 }, (_, i) => `${i + 8}:12`), []
  );
  
  // 🔧 PERFORMANCE: Memoized pitch rate display to prevent excessive getPitchRate calls
  const pitchRateDisplay = useMemo(() => 
    pitchOptions.map(pitch => ({
      pitch,
      rate: getPitchRate(pitch)
    })), [pitchOptions, getPitchRate]
  );
  
  // Calculate total squares for display
  const totalSquares = measurements?.totalArea ? Math.round(measurements.totalArea / 100 * 10) / 10 : 0;
  
  // Check if any pitches are 8/12 or steeper
  const hasSteeperPitches = React.useMemo(() => {
    if (!measurements?.areasByPitch) return false;
    
    return measurements.areasByPitch.some(areaByPitch => {
      const pitchParts = areaByPitch.pitch.split(/[:\/]/);
      if (pitchParts.length < 2) return false;
      
      const numerator = parseInt(pitchParts[0]);
      return numerator >= 8;
    });
  }, [measurements?.areasByPitch]);
  
  // Check if any pitches are low slope (0/12, 1/12, 2/12)
  const hasLowSlopePitches = React.useMemo(() => {
    if (!measurements?.areasByPitch) return false;
    
    return measurements.areasByPitch.some(areaByPitch => {
      const pitchParts = areaByPitch.pitch.split(/[:\/]/);
      if (pitchParts.length < 2) return false;
      
      const numerator = parseInt(pitchParts[0]);
      return numerator >= 0 && numerator <= 2;
    });
  }, [measurements?.areasByPitch]);
  
  // Get steepest pitch for display
  const steepestPitch = React.useMemo(() => {
    if (!measurements?.areasByPitch || measurements.areasByPitch.length === 0) {
      return "8:12"; // Default if no pitches
    }
    
    let maxPitch = 0;
    let pitchText = "8:12";
    
    measurements.areasByPitch.forEach(areaByPitch => {
      const pitchParts = areaByPitch.pitch.split(/[:\/]/);
      if (pitchParts.length < 2) return;
      
      const numerator = parseInt(pitchParts[0]);
      if (numerator > maxPitch) {
        maxPitch = numerator;
        pitchText = areaByPitch.pitch;
      }
    });
    
    return pitchText;
  }, [measurements?.areasByPitch]);
  
  // Get lowest pitch for display
  const lowestPitch = React.useMemo(() => {
    if (!measurements?.areasByPitch || measurements.areasByPitch.length === 0) {
      return null; // No pitches detected
    }
    
    let minPitch = 100; // Start with high value
    let pitchText = "";
    
    measurements.areasByPitch.forEach(areaByPitch => {
      const pitchParts = areaByPitch.pitch.split(/[:\/]/);
      if (pitchParts.length < 2) return;
      
      const numerator = parseInt(pitchParts[0]);
      if (numerator < minPitch) {
        minPitch = numerator;
        pitchText = areaByPitch.pitch;
      }
    });
    
    return pitchText || null;
  }, [measurements?.areasByPitch]);
  
  // 🔧 PERFORMANCE: Memoized low slope pitch options
  const lowSlopePitchOptions = useMemo(() => ["0:12", "1:12", "2:12"], []);
  
  // 🔧 PERFORMANCE: Memoized low slope pitch rate display
  const lowSlopePitchRateDisplay = useMemo(() => 
    lowSlopePitchOptions.map(pitch => ({
      pitch,
      rate: getPitchRate(pitch)
    })), [lowSlopePitchOptions, getPitchRate]
  );
  
  const handleContinue = () => {
    if (!laborRates || (!laborRates.laborRate && !laborRates.tearOff && !laborRates.installation)) {
      toast({
        title: "Missing Labor Rates",
        description: "Please set a valid base labor rate.",
        variant: "destructive"
      });
      return;
    }
    if (onLaborProfitContinue) {
      onLaborProfitContinue(laborRates, profitMargin);
    }
  };

  // 🔧 PERFORMANCE: Calculate recommended count for display
  const recommendedCount = measurements?.totalArea && measurements.totalArea > 0 
    ? Math.max(1, Math.ceil((measurements.totalArea / 100) / 28)) 
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Labor Rates & Profit Margin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dumpster Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Dumpsters</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Based on roof area of {totalSquares.toFixed(1)} squares, we recommend {recommendedCount} dumpster(s).
            <span className="text-green-600 font-medium"> ✓ Auto-calculated based on roof area</span>
          </p>
          
          <div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {effectiveUserRole !== 'rep' && (
                <div className="space-y-2">
                  <Label htmlFor="labor-dumpsterRate">Rate per Dumpster ($)</Label>
                  <Input
                    id="labor-dumpsterRate"
                  type="number"
                  autoComplete="off"
                  defaultValue={(laborRates.dumpsterRate !== undefined ? laborRates.dumpsterRate : (laborRates.dumpsterLocation === "orlando" ? 400 : 500)).toString()} 
                  onBlur={(e) => handleLaborRateChange("dumpsterRate", e.target.value)}
                  key={`dumpsterRate-input-${laborRates.dumpsterLocation}-${laborRates.dumpsterRate}`}
                  min="0"
                  step="0.01"
                  disabled={!canEditLaborRates()}
                  placeholder={laborRates.dumpsterLocation === "orlando" ? "400" : "500"}
                />
              </div>
              )}
              {effectiveUserRole !== 'rep' && (
                <div className="space-y-2">
                  <Label htmlFor="dumpsterTotal">Total Dumpster Cost</Label>
                  <Input
                    id="dumpsterTotal"
                    type="text"
                    value={`$${((laborRates.dumpsterCount || 0) * (laborRates.dumpsterRate || 0)).toFixed(2)}`}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Permits Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Permits</h3>
          
          {/* Admin-only access indicator for rate fields only */}
          {!canEditLaborRates() && canEditQuantitiesAndToggles() && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-700">
                🔒 <strong>Admin Only:</strong> Labor rates and pricing can only be modified by administrators. You can modify quantities and toggles.
              </p>
            </div>
          )}
          

          
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                ✅ <strong>Permits Required:</strong> All estimates must include at least one permit. This ensures compliance with local regulations.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Permit Count */}
              <div className="space-y-2">
                <Label htmlFor="permitCount">Number of Permits</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="permitCount"
                    type="number"
                    min="1"
                    value={laborRates.permitCount || 1}
                    onChange={(e) => handleLaborRateChange("permitCount", e.target.value)}
                    disabled={!canEditPermitCount()}
                    className={canEditPermitCount() ? "" : "bg-muted"}
                  />
                  {!canEditPermitCount() && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This field is read-only</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum 1 permit required per job
                </p>
              </div>
              
              {/* Permit Cost */}
              {effectiveUserRole !== 'rep' && (
                <div className="space-y-2">
                  <Label htmlFor="permitTotal">Total Permit Cost</Label>
                  <Input
                    id="permitTotal"
                    type="text"
                    value={`$${((laborRates.permitCount || 1) * (laborRates.permitRate || 450)).toFixed(2)}`}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Gutters Section - HIDE FOR SALES REPS */}
        {effectiveUserRole !== 'rep' && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-4">Gutters</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Switch
                    id="includeGutters"
                    checked={!!laborRates.includeGutters}
                    onCheckedChange={(checked) => {
                      handleLaborRateChange("includeGutters", checked);
                      // Clear quantity when toggled off
                      if (!checked) {
                        handleLaborRateChange("gutterLinearFeet", 0);
                      }
                    }}
                    disabled={!canEditGuttersAndSkylights()}
                  />
                  <Label htmlFor="includeGutters">
                    Install 6" Aluminum Seamless Gutters ($8 per linear foot)
                  </Label>
                </div>
                
                {!!laborRates.includeGutters && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gutterLinearFeet">Linear Feet</Label>
                                      <Input
                      id="gutterLinearFeet"
                      type="number"
                      defaultValue={(laborRates.gutterLinearFeet || 0).toString()}
                      onBlur={(e) => handleLaborRateChange("gutterLinearFeet", e.target.value)}
                      key={`gutterLinearFeet-${laborRates.gutterLinearFeet}`}
                      min="0"
                      step="1"
                      disabled={!canEditGuttersAndSkylights()}
                    />
                </div>
                {effectiveUserRole !== 'rep' && (
                  <div className="space-y-2">
                    <Label htmlFor="gutterTotal">Total Gutter Cost</Label>
                    <Input
                      id="gutterTotal"
                      type="text"
                      value={`$${((laborRates.gutterLinearFeet || 0) * (laborRates.gutterRate || 8)).toFixed(2)}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-4 mt-4">
              <Switch
                id="includeDetachResetGutters"
                checked={!!laborRates.includeDetachResetGutters}
                onCheckedChange={(checked) => {
                  handleLaborRateChange("includeDetachResetGutters", checked);
                  // Clear quantity when toggled off
                  if (!checked) {
                    handleLaborRateChange("detachResetGutterLinearFeet", 0);
                  }
                }}
                disabled={!canEditGuttersAndSkylights()}
              />
              <Label htmlFor="includeDetachResetGutters">
                Detach and Reset Gutters ($1 per linear foot)
              </Label>
            </div>
            
            {!!laborRates.includeDetachResetGutters && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="detachResetGutterLinearFeet">Linear Feet</Label>
                  <Input
                    id="detachResetGutterLinearFeet"
                    type="number"
                    defaultValue={(laborRates.detachResetGutterLinearFeet || 0).toString()}
                    onBlur={(e) => handleLaborRateChange("detachResetGutterLinearFeet", e.target.value)}
                    key={`detachResetGutterLinearFeet-${laborRates.detachResetGutterLinearFeet}`}
                    min="0"
                    step="1"
                      disabled={!canEditGuttersAndSkylights()}
                  />
                </div>
                {effectiveUserRole !== 'rep' && (
                  <div className="space-y-2">
                    <Label htmlFor="detachResetGutterTotal">Total Detach/Reset Cost</Label>
                    <Input
                      id="detachResetGutterTotal"
                      type="text"
                      value={`$${((laborRates.detachResetGutterLinearFeet || 0) * (laborRates.detachResetGutterRate || 1)).toFixed(2)}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-4 mt-4">
              <Switch
                id="includeDownspouts"
                checked={!!laborRates.includeDownspouts}
                onCheckedChange={(checked) => {
                  handleLaborRateChange("includeDownspouts", checked);
                  // Clear quantity when toggled off
                  if (!checked) {
                    handleLaborRateChange("downspoutCount", 0);
                  }
                }}
                disabled={!canEditGuttersAndSkylights()}
              />
              <Label htmlFor="includeDownspouts">
                Install 3" x 4" Downspouts ($75 each)
              </Label>
            </div>
            
            {!!laborRates.includeDownspouts && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="downspoutCount">Number of Downspouts</Label>
                  <Input
                    id="downspoutCount"
                    type="number"
                    defaultValue={(laborRates.downspoutCount || 0).toString()}
                    onBlur={(e) => handleLaborRateChange("downspoutCount", e.target.value)}
                    key={`downspoutCount-${laborRates.downspoutCount}`}
                    min="0"
                    step="1"
                      disabled={!canEditGuttersAndSkylights()}
                  />
                </div>
                {effectiveUserRole !== 'rep' && (
                  <div className="space-y-2">
                    <Label htmlFor="downspoutTotal">Total Downspout Cost</Label>
                    <Input
                      id="downspoutTotal"
                      type="text"
                      value={`$${((laborRates.downspoutCount || 0) * (laborRates.downspoutRate || 75)).toFixed(2)}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </>
        )}
        
        <Separator />
        
        {/* Skylights Section - HIDE FOR SALES REPS */}
        {effectiveUserRole !== 'rep' && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-4">Skylights</h3>
              <div className="space-y-4">
                {/* 2x2 Skylights */}
                <div className="flex items-center space-x-4">
                  <Switch
                    id="includeSkylights2x2"
                    checked={!!laborRates.includeSkylights2x2}
                    onCheckedChange={(checked) => {
                      handleLaborRateChange("includeSkylights2x2", checked);
                      // Clear quantity when toggled off
                      if (!checked) {
                        handleLaborRateChange("skylights2x2Count", 0);
                      }
                    }}
                    disabled={!canEditGuttersAndSkylights()}
                  />
                  <Label htmlFor="includeSkylights2x2">
                    Install 2X2 Skylights ($280 per unit)
                  </Label>
                </div>
            
            {!!laborRates.includeSkylights2x2 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skylights2x2Count">Number of 2X2 Skylights</Label>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleLaborRateChange("skylights2x2Count", Math.max(0, (laborRates.skylights2x2Count || 0) - 1))}
                      disabled={(laborRates.skylights2x2Count || 0) <= 0 || !canEditGuttersAndSkylights()}
                      className="h-8 w-8 rounded-r-none"
                    >
                      <span className="sr-only">Decrease</span>
                      <span className="text-lg font-bold">-</span>
                    </Button>
                    <Input
                      id="skylights2x2Count"
                      type="number"
                      defaultValue={(laborRates.skylights2x2Count || 0).toString()}
                      onBlur={(e) => handleLaborRateChange("skylights2x2Count", e.target.value)}
                      key={`skylights2x2Count-${laborRates.skylights2x2Count}`}
                      min="0"
                      step="1"
                      className="h-8 rounded-none text-center"
                      disabled={!canEditGuttersAndSkylights()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleLaborRateChange("skylights2x2Count", (laborRates.skylights2x2Count || 0) + 1)}
                      disabled={!canEditGuttersAndSkylights()}
                      className="h-8 w-8 rounded-l-none"
                    >
                      <span className="sr-only">Increase</span>
                      <span className="text-lg font-bold">+</span>
                    </Button>
                  </div>
                </div>
                {effectiveUserRole !== 'rep' && (
                  <div className="space-y-2">
                    <Label htmlFor="skylights2x2Total">Total 2X2 Skylight Cost</Label>
                    <Input
                      id="skylights2x2Total"
                      type="text"
                      value={`$${((laborRates.skylights2x2Count || 0) * (laborRates.skylights2x2Rate || 280)).toFixed(2)}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* 2x4 Skylights */}
            <div className="flex items-center space-x-4 mt-4">
              <Switch
                id="includeSkylights2x4"
                checked={!!laborRates.includeSkylights2x4}
                onCheckedChange={(checked) => {
                  handleLaborRateChange("includeSkylights2x4", checked);
                  // Clear quantity when toggled off
                  if (!checked) {
                    handleLaborRateChange("skylights2x4Count", 0);
                  }
                }}
                disabled={!canEditGuttersAndSkylights()}
              />
              <Label htmlFor="includeSkylights2x4">
                2X4 Skylight ($370 per unit)
              </Label>
            </div>
            
            {!!laborRates.includeSkylights2x4 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skylights2x4Count">Number of 2X4 Skylights</Label>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleLaborRateChange("skylights2x4Count", Math.max(0, (laborRates.skylights2x4Count || 0) - 1))}
                      disabled={(laborRates.skylights2x4Count || 0) <= 0 || !canEditGuttersAndSkylights()}
                      className="h-8 w-8 rounded-r-none"
                    >
                      <span className="sr-only">Decrease</span>
                      <span className="text-lg font-bold">-</span>
                    </Button>
                    <Input
                      id="skylights2x4Count"
                      type="number"
                      defaultValue={(laborRates.skylights2x4Count || 0).toString()}
                      onBlur={(e) => handleLaborRateChange("skylights2x4Count", e.target.value)}
                      key={`skylights2x4Count-${laborRates.skylights2x4Count}`}
                      min="0"
                      step="1"
                      className="h-8 rounded-none text-center"
                      disabled={!canEditGuttersAndSkylights()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleLaborRateChange("skylights2x4Count", (laborRates.skylights2x4Count || 0) + 1)}
                      disabled={!canEditGuttersAndSkylights()}
                      className="h-8 w-8 rounded-l-none"
                    >
                      <span className="sr-only">Increase</span>
                      <span className="text-lg font-bold">+</span>
                    </Button>
                  </div>
                </div>
                {effectiveUserRole !== 'rep' && (
                  <div className="space-y-2">
                    <Label htmlFor="skylights2x4Total">Total 2X4 Skylight Cost</Label>
                    <Input
                      id="skylights2x4Total"
                      type="text"
                      value={`$${((laborRates.skylights2x4Count || 0) * (laborRates.skylights2x4Rate || 370)).toFixed(2)}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </>
        )}
        
        <Separator />
        
        {/* Handload Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Handload</h3>
          
          {/* Sales rep message about handload */}
          {effectiveUserRole === 'rep' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                💡 <strong>Tip:</strong> Toggle handload on if the job requires manual material handling due to difficult access.
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Switch
                id="labor-handload"
                checked={!!laborRates.isHandload}
                onCheckedChange={(checked) => handleLaborRateChange("isHandload", checked)}
                disabled={!canEditSalesRepLaborToggles()}
              />
              <Label htmlFor="labor-handload">
                Include Handload (Additional to labor tear off and installation)
              </Label>
            </div>
            
            {!!laborRates.isHandload && (
              <>
                {effectiveUserRole !== 'rep' && (
                  <div className="space-y-2">
                    <Label htmlFor="labor-handloadRate">Handload Rate ($/square)</Label>
                    <Input
                      id="labor-handloadRate"
                      type="number"
                      autoComplete="off"
                      defaultValue={(laborRates.handloadRate || 10).toString()}
                      onBlur={(e) => handleLaborRateChange("handloadRate", e.target.value)}
                      key={`handloadRate-${laborRates.handloadRate}`}
                      min="0"
                      step="0.01"
                      disabled={!canEditLaborRates()}
                    />
                  </div>
                )}
                {effectiveUserRole !== 'rep' && (
                  <p className="text-sm text-muted-foreground">
                    Handload cost with {laborRates.wastePercentage || 12}% waste: 
                    ${(totalSquares * (1 + (laborRates.wastePercentage || 12)/100) * (laborRates.handloadRate || 10)).toFixed(2)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Combined Labor Rate - HIDE FOR SALES REPS */}
        {effectiveUserRole !== 'rep' && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-4">Labor Rates (per square)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                                  <div className="space-y-2">
                      <Label htmlFor="labor-laborRate">Labor Rate ($/square)</Label>
                      <Input
                        id="labor-laborRate"
                      type="number"
                      autoComplete="off"
                      defaultValue={(laborRates.laborRate !== undefined ? laborRates.laborRate : 85).toString()}
                      onBlur={(e) => handleLaborRateChange("laborRate", e.target.value)}
                      key={`laborRate-input-${laborRates.laborRate}`}
                      min="0"
                      step="0.01"
                      disabled={!canEditLaborRates()}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Combined rate for tear off and installation (3/12-7/12 pitches)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wastePercentage">Waste Percentage (%)</Label>
                    <Input
                      id="wastePercentage"
                      type="number"
                      autoComplete="off"
                      value={(laborRates.wastePercentage || 12).toString()}
                      readOnly
                      className="bg-muted"
                      disabled={!canEditLaborRates()}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm mb-2">Fixed 12% waste factored into calculations</p>
                  <div className="bg-muted p-3 rounded-md flex items-center gap-2">
                    <p className="text-sm">
                      Total labor (all pitches, incl. {(laborRates.wastePercentage ?? 12)}% waste):
                      &nbsp;${estTotalLaborCost.toFixed(2)}
                    </p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Calculates labor for every pitch using its specific rate (0–2/12, 3–7/12 base, 8/12+ escalating), applies the fixed {(laborRates.wastePercentage ?? 12)}% waste factor, and adds hand-load if enabled.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
          </>
        )}
        
        {/* Labor Scope Section - NEW */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Labor Scope</h3>
          
          {/* Sales rep message about labor scope */}
          {effectiveUserRole === 'rep' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                📐 <strong>Labor Scope:</strong> Both options are enabled by default. Only disable if specific roof sections won't be worked on.
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex items-center space-x-4 p-3 border rounded-md">
              <Switch
                id="labor-includeLowSlopeLabor"
                checked={laborRates.includeLowSlopeLabor ?? true}
                onCheckedChange={(checked) => handleLaborRateChange("includeLowSlopeLabor", checked)}
                disabled={!canEditSalesRepLaborToggles()}
              />
              <div className="flex-1">
                <Label htmlFor="labor-includeLowSlopeLabor" className="font-medium">
                  Include Low Slope Labor (0/12-2/12)
              </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Enable labor calculation for flat and low slope roof areas
                </p>
            </div>
            </div>
            
            <div className="flex items-center space-x-4 p-3 border rounded-md">
              <Switch
                id="labor-includeSteepSlopeLabor"
                checked={laborRates.includeSteepSlopeLabor ?? true}
                onCheckedChange={(checked) => handleLaborRateChange("includeSteepSlopeLabor", checked)}
                disabled={!canEditSalesRepLaborToggles()}
              />
              <div className="flex-1">
                <Label htmlFor="labor-includeSteepSlopeLabor" className="font-medium">
                  Include Steep Slope Labor (3/12+)
              </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Enable labor calculation for standard and steep slope roof areas
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Pitch Based Pricing - HIDE FOR SALES REPS */}
        {effectiveUserRole !== 'rep' && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-4">Pitch-Based Labor Rates</h3>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Labor rates for steeper pitches (starting at 8/12 with $90/square):
                </p>
                
                {hasLowSlopePitches && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-yellow-700">
                      <strong>Note:</strong> This roof has low slope pitches (0/12 to 2/12). 
                      The lowest pitch is {lowestPitch}, which will require a labor rate of 
                      ${getPitchRate(lowestPitch?.replace("/", ":") || "0:12")}/square.
                    </p>
                  </div>
                )}
                
                {hasSteeperPitches && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-yellow-700">
                      <strong>Note:</strong> This roof has pitches that are 8/12 or steeper. 
                      The steepest pitch is {steepestPitch}, which will require a labor rate of 
                      ${getPitchRate(steepestPitch?.replace("/", ":") || "8:12")}/square.
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Low Slope Pitches Section */}
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Low Slope Pitches (0/12-2/12)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {lowSlopePitchOptions.map((pitch) => {
                        const currentRate = laborRates.pitchRates[pitch] !== undefined ? laborRates.pitchRates[pitch] : getPitchRate(pitch);
                        return (
                          <div key={pitch} className="flex items-center space-x-2">
                            <Label htmlFor={`labor-pitch-rate-${pitch}`} className="min-w-[40px]">{pitch}</Label>                        
                            <Input
                              id={`labor-pitch-rate-${pitch}`}
                              type="number"
                              step="0.01"
                              defaultValue={laborRates.pitchRates[pitch] !== undefined ? String(laborRates.pitchRates[pitch]) : getPitchRate(pitch).toString()}
                              onBlur={(e) => handlePitchRateChange(pitch, e.target.value)}
                              key={`low_pitch_rate_input_${pitch}`}
                              className="h-9 text-sm flex-1"
                              disabled={!canEditLaborRates()}
                              placeholder={getPitchRate(pitch).toString()}
                            />
                            <span className="text-sm text-muted-foreground">/square</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Steep Pitches Section */}
                  <div>
                    <h4 className="text-md font-medium mb-2">Steep Pitches (8/12-18/12)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {pitchOptions.map((pitch) => {
                        const currentRate = laborRates.pitchRates[pitch] !== undefined ? laborRates.pitchRates[pitch] : getPitchRate(pitch);
                        return (
                          <div key={pitch} className="flex items-center space-x-2">
                            <Label htmlFor={`labor-pitch-rate-${pitch}`} className="min-w-[40px]">{pitch}</Label>
                            <Input
                              id={`labor-pitch-rate-${pitch}`}
                              type="number"
                              step="0.01"
                              defaultValue={laborRates.pitchRates[pitch] !== undefined ? String(laborRates.pitchRates[pitch]) : getPitchRate(pitch).toString()}
                              onBlur={(e) => handlePitchRateChange(pitch, e.target.value)}
                              key={`steep_pitch_rate_input_${pitch}`}
                              className="h-9 text-sm flex-1"
                              disabled={!canEditLaborRates()}
                              placeholder={getPitchRate(pitch).toString()}
                            />
                            <span className="text-sm text-muted-foreground">/square</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Different labor rates apply for different pitch ranges:
                    <br />• 0/12-2/12 (low slope): ${getPitchRate("0:12")}-${getPitchRate("2:12")}/square
                    <br />• 3/12-7/12 (standard): ${laborRates.laborRate || 85}/square
                    <br />• 8/12+ (steep): ${getPitchRate("8:12")}/square and up
                  </p>
                </div>
              </div>
            </div>
            
            <Separator />
          </>
        )}
        
        {/* Profit Margin */}
        <div className="space-y-4">
          <RoleBasedProfitMargin
            profitMargin={profitMargin}
            onProfitMarginChange={handleProfitMarginChange}
            onProfitMarginCommit={handleProfitMarginCommit}
            readOnly={readOnly}
            isAdminEditMode={isAdminEditMode}
            originalCreator={originalCreator}
            originalCreatorRole={originalCreatorRole}
            effectiveUserRole={effectiveUserRole}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Materials
        </Button>
        <Button 
          type="button" 
          onClick={() => {
            if (onLaborProfitContinue) {
              onLaborProfitContinue(laborRates, profitMargin);
            }
          }}
          className="flex items-center gap-2"
        >
          Continue to Summary
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
