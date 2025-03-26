import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParsedMeasurements } from "@/api/measurements";
import React, { useEffect } from "react";
import { cn, formatMeasurement } from "@/lib/utils";

interface MeasurementDisplayProps {
  measurements: ParsedMeasurements;
  className?: string;
}

export function MeasurementDisplay({ measurements, className = "" }: MeasurementDisplayProps) {
  // Helper function to format measurements with units
  const formatValue = (value: number | undefined, unit: string, decimals: number = 0) => {
    if (value === undefined || value === 0) return "-";
    return `${formatMeasurement(value, decimals)} ${unit}`;
  };

  // Only show counts if they are greater than 0
  const showCounts = 
    measurements.ridgeCount > 0 || 
    measurements.hipCount > 0 || 
    measurements.valleyCount > 0 || 
    measurements.rakeCount > 0 || 
    measurements.eaveCount > 0;

  // Debug: Log pitch information for debugging
  useEffect(() => {
    console.log("Areas by Pitch data:", measurements.areasByPitch);
    console.log("Number of pitches:", Object.keys(measurements.areasByPitch || {}).length);
  }, [measurements.areasByPitch]);
  
  // Calculate total area for percentage calculations
  const totalArea = measurements.totalArea || 
    Object.values(measurements.areasByPitch || {}).reduce((sum, data) => {
      if (typeof data === 'object') {
        return sum + data.area;
      }
      return sum + (typeof data === 'number' ? data : 0);
    }, 0);
  
  // Format pitch areas as array for display
  const pitchAreas = React.useMemo(() => {
    if (!measurements.areasByPitch) return [];
    
    const getNumericPitch = (pitch: string): number => {
      return parseFloat(pitch.split(/[:\/]/)[0]);
    };

    return measurements.areasByPitch
      .map(data => ({
        pitch: data.pitch,
        displayPitch: data.pitch, // Keep original format
        area: data.area,
        percentage: data.percentage
      }))
      .sort((a, b) => getNumericPitch(a.pitch) - getNumericPitch(b.pitch));
  }, [measurements.areasByPitch]);

  // Store pitch data in DOM for debugging and data recovery
  useEffect(() => {
    if (measurements.areasByPitch && measurements.areasByPitch.length > 0) {
      // Create or update a hidden element with the pitch data
      let debugElement = document.querySelector('[data-debug-pitch-data]');
      if (!debugElement) {
        debugElement = document.createElement('div');
        debugElement.setAttribute('data-debug-pitch-data', 'true');
        (debugElement as HTMLElement).style.display = 'none';
        document.body.appendChild(debugElement);
      }
      
      debugElement.setAttribute('data-pitch-data', JSON.stringify(measurements.areasByPitch));
      console.log("Stored pitch data in DOM for recovery:", measurements.areasByPitch);
    }
  }, [measurements.areasByPitch]);

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Main Area Summary */}
      <div>
        <h3 className="text-lg font-medium mb-3">Area Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <div className="flex justify-between">
            <span className="text-sm">Total Area:</span>
            <span className="text-sm font-medium">{formatValue(measurements.totalArea, "sq ft")}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Predominant Pitch:</span>
            <span className="text-sm font-medium">{measurements.predominantPitch || "-"}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Penetrations Area:</span>
            <span className="text-sm font-medium">{formatValue(measurements.penetrationsArea, "sq ft")}</span>
          </div>
          
          {measurements.penetrationsPerimeter > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">Penetrations Perimeter:</span>
              <span className="text-sm font-medium">{formatValue(measurements.penetrationsPerimeter, "ft")}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Roof Features */}
      <div>
        <h3 className="text-lg font-medium mb-3">Roof Features</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div className="flex justify-between">
            <span className="text-sm">Ridge:</span>
            <span className="text-sm font-medium">{formatValue(measurements.ridgeLength, "ft")}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Hip:</span>
            <span className="text-sm font-medium">{formatValue(measurements.hipLength, "ft")}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Valley:</span>
            <span className="text-sm font-medium">{formatValue(measurements.valleyLength, "ft")}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Rake:</span>
            <span className="text-sm font-medium">{formatValue(measurements.rakeLength, "ft")}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Eave:</span>
            <span className="text-sm font-medium">{formatValue(measurements.eaveLength, "ft")}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Drip Edge:</span>
            <span className="text-sm font-medium">{formatValue(measurements.dripEdgeLength, "ft")}</span>
          </div>
        </div>
      </div>
      
      {/* Flashing */}
      <div>
        <h3 className="text-lg font-medium mb-3">Flashing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <div className="flex justify-between">
            <span className="text-sm">Step Flashing:</span>
            <span className="text-sm font-medium">{formatValue(measurements.stepFlashingLength, "ft")}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Wall Flashing:</span>
            <span className="text-sm font-medium">{formatValue(measurements.flashingLength, "ft")}</span>
          </div>
        </div>
      </div>
      
      {/* Feature Counts - only show if we have counts */}
      {showCounts && (
        <div>
          <h3 className="text-lg font-medium mb-3">Feature Counts</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            {measurements.ridgeCount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm">Ridge Count:</span>
                <span className="text-sm font-medium">{measurements.ridgeCount}</span>
              </div>
            )}
            
            {measurements.hipCount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm">Hip Count:</span>
                <span className="text-sm font-medium">{measurements.hipCount}</span>
              </div>
            )}
            
            {measurements.valleyCount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm">Valley Count:</span>
                <span className="text-sm font-medium">{measurements.valleyCount}</span>
              </div>
            )}
            
            {measurements.rakeCount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm">Rake Count:</span>
                <span className="text-sm font-medium">{measurements.rakeCount}</span>
              </div>
            )}
            
            {measurements.eaveCount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm">Eave Count:</span>
                <span className="text-sm font-medium">{measurements.eaveCount}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Property Location Information - only display if we have data */}
      {(measurements.propertyAddress || measurements.longitude || measurements.latitude) && (
        <div>
          <h3 className="text-lg font-medium mb-3">Property Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
            {measurements.propertyAddress && (
              <div className="flex justify-between col-span-3 md:col-span-2">
                <span className="text-sm">Address:</span>
                <span className="text-sm font-medium ml-2">{measurements.propertyAddress}</span>
              </div>
            )}
            {measurements.longitude && (
              <div className="flex justify-between">
                <span className="text-sm">Longitude:</span>
                <span className="text-sm font-medium">{measurements.longitude}</span>
              </div>
            )}
            {measurements.latitude && (
              <div className="flex justify-between">
                <span className="text-sm">Latitude:</span>
                <span className="text-sm font-medium">{measurements.latitude}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 