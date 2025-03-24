import React from "react";
import { MeasurementValues } from "@/components/measurement/types";

interface MeasurementSummaryProps {
  measurements: MeasurementValues;
}

export const MeasurementSummary: React.FC<MeasurementSummaryProps> = ({ measurements }) => {
  const renderAreasByPitch = () => {
    if (!measurements.areasByPitch || Object.keys(measurements.areasByPitch).length === 0) {
      return null;
    }

    // Convert areasByPitch object to array format
    const pitchAreas = Object.entries(measurements.areasByPitch).map(([pitch, area]) => {
      const percentage = (area / measurements.totalArea) * 100;
      return {
        pitch: pitch.replace(':', '/'),
        area: area,
        percentage: percentage
      };
    });

    // Filter out pitches with 0 area and sort by pitch numerically
    const sortedPitchAreas = pitchAreas
      .filter(item => item.area > 0)
      .sort((a, b) => {
        const aNum = parseInt(a.pitch.split('/')[0]);
        const bNum = parseInt(b.pitch.split('/')[0]);
        return aNum - bNum;
      });

    // Calculate total area for verification
    const totalArea = sortedPitchAreas.reduce((sum, item) => sum + item.area, 0);
    console.log('Areas by Pitch - Total Check:', {
      sum: totalArea.toFixed(1),
      totalArea: measurements.totalArea.toFixed(1),
      difference: (measurements.totalArea - totalArea).toFixed(1)
    });

    return (
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-2">Areas by Pitch</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border text-left">ROOF PITCH</th>
                <th className="py-2 px-4 border text-center">AREA (SQ FT)</th>
                <th className="py-2 px-4 border text-center">% OF ROOF</th>
              </tr>
            </thead>
            <tbody>
              {sortedPitchAreas.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{item.pitch}</td>
                  <td className="py-2 px-4 border text-center">{item.area.toFixed(1)}</td>
                  <td className="py-2 px-4 border text-center">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td className="py-2 px-4 border">Total</td>
                <td className="py-2 px-4 border text-center">{measurements.totalArea.toFixed(1)}</td>
                <td className="py-2 px-4 border text-center">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
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