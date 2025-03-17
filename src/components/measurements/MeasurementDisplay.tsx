import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParsedMeasurements } from "@/api/measurements";
import React from "react";
import { cn } from "@/lib/utils";

interface MeasurementDisplayProps {
  measurements: ParsedMeasurements;
  className?: string;
}

export function MeasurementDisplay({
  measurements,
  className,
}: MeasurementDisplayProps) {
  const {
    totalArea,
    predominantPitch,
    ridgeLength,
    hipLength,
    valleyLength,
    rakeLength,
    eaveLength,
    stepFlashingLength,
    flashingLength,
    penetrationsArea,
    penetrationsPerimeter,
    dripEdgeLength,
    areasByPitch,
    propertyAddress,
    longitude,
    latitude
  } = measurements;

  // Calculate total roof area less penetrations
  const totalAreaLessPenetrations = totalArea - penetrationsArea;

  // Format the areas by pitch as an array for display
  const pitchAreas = Object.entries(areasByPitch || {}).map(([pitch, area]) => ({
    pitch,
    area: typeof area === 'number' ? area : Number(area),
    // Convert from X:12 to X/12 format for display
    displayPitch: pitch.replace(':', '/')
  })).sort((a, b) => {
    // Sort by pitch value (numerically)
    const pitchA = parseFloat(a.pitch.split(':')[0]);
    const pitchB = parseFloat(b.pitch.split(':')[0]);
    return pitchA - pitchB; // Sort ascending (lowest pitch first, like EagleView)
  });

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Extracted Measurements</CardTitle>
        <CardDescription>
          These values will be used in your estimate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Areas and Pitches */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Total Area (All Pitches):</h3>
            <p className="text-2xl font-bold">{totalArea.toLocaleString()} sq ft</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Predominant Pitch:</h3>
            <p className="text-2xl font-bold">{predominantPitch.replace(':', '/')}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Total Penetrations Area:</h3>
            <p className="text-2xl">{penetrationsArea.toLocaleString()} sq ft</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Total Roof Area Less Penetrations:</h3>
            <p className="text-2xl">{totalAreaLessPenetrations.toLocaleString()} sq ft</p>
          </div>
        </div>

        {/* Property Location Information - only display if we have data */}
        {(propertyAddress || longitude || latitude) && (
          <div>
            <h3 className="text-lg font-medium mb-3">Property Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
              {propertyAddress && (
                <div className="flex justify-between col-span-3 md:col-span-2">
                  <span className="text-sm">Address:</span>
                  <span className="text-sm font-medium ml-2">{propertyAddress}</span>
                </div>
              )}
              {longitude && (
                <div className="flex justify-between">
                  <span className="text-sm">Longitude:</span>
                  <span className="text-sm font-medium">{longitude}</span>
                </div>
              )}
              {latitude && (
                <div className="flex justify-between">
                  <span className="text-sm">Latitude:</span>
                  <span className="text-sm font-medium">{latitude}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lengths section styled like EagleView reports */}
        <div>
          <h3 className="text-lg font-medium mb-3">Lengths, Areas and Pitches</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Ridges =</span>
              <span className="text-sm font-medium">{ridgeLength} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Hips =</span>
              <span className="text-sm font-medium">{hipLength} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Valleys =</span>
              <span className="text-sm font-medium">{valleyLength} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Rakes† =</span>
              <span className="text-sm font-medium">{rakeLength} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Eaves/Starter‡ =</span>
              <span className="text-sm font-medium">{eaveLength} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Drip Edge (Eaves + Rakes) =</span>
              <span className="text-sm font-medium">{dripEdgeLength} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Flashing =</span>
              <span className="text-sm font-medium">{flashingLength} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Step flashing =</span>
              <span className="text-sm font-medium">{stepFlashingLength} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total Penetrations Area =</span>
              <span className="text-sm font-medium">{penetrationsArea.toLocaleString()} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total Penetrations Perimeter =</span>
              <span className="text-sm font-medium">{penetrationsPerimeter} ft</span>
            </div>
          </div>
        </div>

        {/* Areas by pitch section - styled exactly like EagleView report */}
        {pitchAreas.length > 0 && (
          <div className="mt-6">
            <div className="bg-gray-600 text-white p-2 font-medium">
              Areas per Pitch
            </div>
            <div className="border border-gray-300">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-medium border-b border-r border-gray-300 w-1/4">Roof Pitches</th>
                    {pitchAreas.map(({ pitch, displayPitch }) => (
                      <th key={pitch} className="p-2 text-center font-medium border-b border-r border-gray-300 bg-white">
                        {displayPitch}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 text-left font-medium border-b border-r border-gray-300">Area (sq ft)</td>
                    {pitchAreas.map(({ pitch, area }) => (
                      <td key={pitch} className="p-2 text-center border-b border-r border-gray-300 bg-blue-50">
                        {Number(area).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 text-left font-medium border-b border-r border-gray-300">% of Roof</td>
                    {pitchAreas.map(({ pitch, area }) => (
                      <td key={pitch} className="p-2 text-center border-b border-r border-gray-300 bg-blue-50">
                        {totalArea > 0 ? `${(area / totalArea * 100).toFixed(1)}%` : '0.0%'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              The table above lists each pitch on this roof and the total area and percent (both rounded) of the roof with that pitch.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 