import React from "react";
import { MeasurementValues } from "@/components/measurement/types";

interface MeasurementSummaryProps {
  measurements: MeasurementValues;
}

export const MeasurementSummary: React.FC<MeasurementSummaryProps> = ({ measurements }) => {
  const renderAreasByPitch = () => {
    // Convert areasByPitch object to array format
    const pitchAreas = Object.entries(measurements.areasByPitch || {})
      .map(([pitch, area]) => {
        const [numerator] = pitch.split(':');
        return {
          pitch: `${numerator}/12`,
          area: typeof area === 'number' ? area : 0,
          percentage: ((area / measurements.totalArea) * 100) || 0
        };
      });

    // Sort pitches numerically by the numerator
    const sortedPitchAreas = [...pitchAreas].sort((a, b) => {
      const getPitchValue = (p: string) => parseInt(p.split('/')[0]);
      return getPitchValue(a.pitch) - getPitchValue(b.pitch);
    });

    return (
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-2">Areas per Pitch</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border text-left">Roof Pitches</th>
                {sortedPitchAreas.map((item, index) => (
                  <th key={index} className="py-2 px-4 border text-center">{item.pitch}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-4 border">Area (sq ft)</td>
                {sortedPitchAreas.map((item, index) => (
                  <td key={index} className="py-2 px-4 border text-center">{item.area.toFixed(1)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-4 border">% of Roof</td>
                {sortedPitchAreas.map((item, index) => (
                  <td key={index} className="py-2 px-4 border text-center">{item.percentage.toFixed(1)}%</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          The table above lists each pitch on this roof and the total area and percent (both rounded) of the roof with that pitch.
        </p>
      </div>
    );
  };

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
            <p className="text-2xl font-bold">{(measurements.roofPitch || "").replace(":", "/")}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}; 