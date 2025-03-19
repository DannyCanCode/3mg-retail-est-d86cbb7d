import { useState } from 'react';
import { MeasurementValues, AreaByPitch } from '../measurement/types';

interface LowSlopeOptionsProps {
  measurements: MeasurementValues;
  includeIso: boolean;
  onIsoToggle: (includeIso: boolean) => void;
}

const LowSlopeOptions = ({ 
  measurements, 
  includeIso, 
  onIsoToggle 
}: LowSlopeOptionsProps) => {
  // Check if the roof has 2/12 pitch areas
  const lowSlopePitchArea = measurements.areasByPitch.find(
    area => area.pitch === "2:12" || area.pitch === "2/12"
  );
  
  const has2_12PitchAreas = Boolean(lowSlopePitchArea);
  const lowSlopeArea = lowSlopePitchArea ? lowSlopePitchArea.area : 0;
  
  // Calculate low slope costs
  const lowSlopeCost = lowSlopeArea ? (lowSlopeArea / 100) * 100 * 1.1 : 0; // $100/sq with 10% waste
  const isoCost = includeIso && lowSlopeArea ? (lowSlopeArea / 100) * 50 : 0; // $50/sq for ISO
  const totalLowSlopeCost = lowSlopeCost + isoCost;
  
  if (!has2_12PitchAreas) {
    return null; // Don't show this component if there are no 2/12 pitch areas
  }
  
  return (
    <div className="bg-white p-4 rounded-md shadow-sm mt-4">
      <h3 className="text-lg font-medium mb-3">Low Slope Area Options (2/12 Pitch)</h3>
      
      <div className="border p-3 rounded-md bg-blue-50 mb-3">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium">Low Slope Area Detected</h4>
            <p className="text-sm text-gray-600">2/12 pitch area: {lowSlopeArea.toFixed(2)} sq ft ({(lowSlopeArea / 100).toFixed(2)} squares)</p>
          </div>
          <div className="bg-white px-3 py-2 rounded-md shadow-sm border">
            <p className="text-sm font-medium">Fixed Pricing</p>
            <p className="text-xs text-gray-600">$100/square with 10% waste</p>
          </div>
        </div>
      </div>
      
      <div className="border p-3 rounded-md">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">ISO Installation</h4>
            <p className="text-sm text-gray-600 mt-1">Add ISO insulation to 2/12 pitch areas ($50/square)</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={includeIso} 
              onChange={(e) => onIsoToggle(e.target.checked)} 
              className="sr-only peer"
              aria-label="Include ISO insulation for low slope areas"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
      
      <div className="mt-3 p-3 bg-gray-50 rounded-md">
        <h4 className="font-medium text-sm">Low Slope Area Summary</h4>
        <div className="flex justify-between mt-2 text-sm">
          <span>Base Cost (2/12 area):</span>
          <span>${lowSlopeCost.toFixed(2)}</span>
        </div>
        {includeIso && (
          <div className="flex justify-between mt-1 text-sm">
            <span>ISO Installation:</span>
            <span>${isoCost.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between mt-2 font-medium">
          <span>Total Low Slope Cost:</span>
          <span>${totalLowSlopeCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default LowSlopeOptions; 