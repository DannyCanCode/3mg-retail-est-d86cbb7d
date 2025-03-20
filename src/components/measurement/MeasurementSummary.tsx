import React from "react";
import { MeasurementValues } from "./types";

interface MeasurementSummaryProps {
  measurements: MeasurementValues;
}

export const MeasurementSummary: React.FC<MeasurementSummaryProps> = ({ measurements }) => {
  // Display areas by pitch table
  const renderAreasByPitch = () => {
    // Convert the areasByPitch object to an array for easier rendering
    const pitchAreas = Object.entries(measurements.areasByPitch || {})
      .map(([pitch, area]) => ({ 
        pitch: pitch.replace(':', '/'),  // Convert from "5:12" format to "5/12" display format
        area: typeof area === 'number' ? Math.round(area) : 0  // Ensure area is a number and round it
      }))
      .sort((a, b) => {
        // Sort by pitch (numerically, not alphabetically)
        const getPitchValue = (p: string) => {
          const [numerator, denominator] = p.split('/').map(Number);
          return numerator / denominator;
        };
        return getPitchValue(a.pitch) - getPitchValue(b.pitch);
      });

    // Calculate total area from the areas by pitch to ensure consistency
    const totalArea = pitchAreas.reduce((sum, item) => sum + item.area, 0);
    
    return (
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-2">Areas by Pitch</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border text-left">ROOF PITCH</th>
                <th className="py-2 px-4 border text-left">AREA (SQ FT)</th>
                <th className="py-2 px-4 border text-left">% OF ROOF</th>
              </tr>
            </thead>
            <tbody>
              {pitchAreas.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{item.pitch}</td>
                  <td className="py-2 px-4 border">{item.area.toLocaleString()}</td>
                  <td className="py-2 px-4 border">
                    {totalArea > 0 ? ((item.area / totalArea) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              <tr className="font-medium bg-gray-50">
                <td className="py-2 px-4 border">Total</td>
                <td className="py-2 px-4 border">{totalArea.toLocaleString()}</td>
                <td className="py-2 px-4 border">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          The table above lists each pitch on this roof and the total area and percent of the roof with that pitch.
        </p>
      </div>
    );
  };

  // Render the whole measurement summary
  return (
    <div className="space-y-6">
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Measurement Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-md p-4 shadow-sm">
            <h3 className="text-lg font-medium mb-2">Total Area</h3>
            <p className="text-2xl font-bold">{Math.round(measurements.totalArea || 0).toLocaleString()} sq ft</p>
          </div>
          <div className="bg-white rounded-md p-4 shadow-sm">
            <h3 className="text-lg font-medium mb-2">Predominant Pitch</h3>
            <p className="text-2xl font-bold">{(measurements.predominantPitch || "").replace(":", "/")}</p>
          </div>
        </div>

        {/* Areas by Pitch */}
        {renderAreasByPitch()}

        {/* Roof Features */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-2">Roof Features</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-600">Ridge</div>
              <div className="text-lg font-medium">{Math.round(measurements.ridgeLength || 0)} ft</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-600">Hip</div>
              <div className="text-lg font-medium">{Math.round(measurements.hipLength || 0)} ft</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-600">Valley</div>
              <div className="text-lg font-medium">{Math.round(measurements.valleyLength || 0)} ft</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-600">Rake</div>
              <div className="text-lg font-medium">{Math.round(measurements.rakeLength || 0)} ft</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-600">Eave</div>
              <div className="text-lg font-medium">{Math.round(measurements.eaveLength || 0)} ft</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-600">Drip Edge</div>
              <div className="text-lg font-medium">{Math.round(measurements.dripEdgeLength || 0)} ft</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 