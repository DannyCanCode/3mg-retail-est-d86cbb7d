import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  CheckCircle2, 
  FileText, 
  Calculator,
  Home,
  Phone,
  Mail,
  MapPin,
  Package,
  Wrench,
  DollarSign,
  TrendingUp,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';
import { MeasurementValues } from '../measurement/types';
import { Material } from '../materials/types';
import { LaborRates } from './LaborProfitTab';

interface SalesRepSummaryTabProps {
  measurements?: MeasurementValues;
  selectedMaterials: {[key: string]: Material};
  quantities: {[key: string]: number};
  laborRates: LaborRates;
  profitMargin: number;
  peelStickAddonCost?: number;
  onBack?: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  customerInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  jobWorksheet?: any;
}

export const SalesRepSummaryTab: React.FC<SalesRepSummaryTabProps> = ({
  measurements,
  selectedMaterials,
  quantities,
  laborRates,
  profitMargin,
  peelStickAddonCost = 0,
  onBack,
  onSubmit,
  isSubmitting = false,
  customerInfo,
  jobWorksheet
}) => {
  // Calculate totals
  const calculateMaterialTotal = () => {
    let total = 0;
    Object.entries(selectedMaterials).forEach(([id, material]) => {
      const quantity = quantities[id] || 0;
      total += material.price * quantity;
    });
    return total + peelStickAddonCost;
  };

  // Calculate labor costs by pitch
  const calculateLaborByPitch = () => {
    if (!measurements?.areasByPitch) return [];
    
    const laborDetails = measurements.areasByPitch.map(area => {
      const squares = area.area / 100;
      const pitch = area.pitch;
      
      // Determine labor rate based on pitch
      let rate = laborRates.laborRate || 85;
      
      // Apply pitch-specific rates
      if (pitch.includes('8/12') || pitch.includes('8:12')) rate = 90;
      else if (pitch.includes('9/12') || pitch.includes('9:12')) rate = 100;
      else if (pitch.includes('10/12') || pitch.includes('10:12')) rate = 110;
      else if (pitch.includes('11/12') || pitch.includes('11:12')) rate = 120;
      else if (pitch.includes('12/12') || pitch.includes('12:12')) rate = 130;
      else if (parseInt(pitch) > 12) rate = 140;
      
      const cost = squares * rate;
      
      return {
        pitch,
        area: area.area,
        squares,
        rate,
        cost
      };
    });
    
    return laborDetails;
  };

  const calculateLaborTotal = () => {
    const totalArea = measurements?.totalArea || 0;
    const totalSquares = totalArea / 100;
    
    // Base labor cost
    let laborCost = 0;
    const laborByPitch = calculateLaborByPitch();
    laborByPitch.forEach(item => {
      laborCost += item.cost;
    });
    
    // Add handload if applicable
    if (laborRates.isHandload) {
      laborCost += totalSquares * (laborRates.handloadRate || 10);
    }
    
    // Add dumpster
    const dumpsterCost = (laborRates.dumpsterCount || 1) * (laborRates.dumpsterRate || 400);
    
    // Add permits
    const permitCost = laborRates.includePermits ? (laborRates.permitRate || 450) : 0;
    
    // Add gutters
    const gutterCost = laborRates.includeGutters ? 
      (laborRates.gutterLinearFeet || 0) * (laborRates.gutterRate || 8) : 0;
    
    // Add downspouts
    const downspoutCost = laborRates.includeDownspouts ? 
      (laborRates.downspoutCount || 0) * (laborRates.downspoutRate || 75) : 0;
    
    // Add detach and reset gutters
    const detachResetGutterCost = laborRates.includeDetachResetGutters ?
      (laborRates.detachResetGutterLinearFeet || 0) * (laborRates.detachResetGutterRate || 1) : 0;
    
    // Add skylights
    const skylightCost = 
      (laborRates.includeSkylights2x2 ? (laborRates.skylights2x2Count || 0) * (laborRates.skylights2x2Rate || 280) : 0) +
      (laborRates.includeSkylights2x4 ? (laborRates.skylights2x4Count || 0) * (laborRates.skylights2x4Rate || 370) : 0);
    
    return laborCost + dumpsterCost + permitCost + gutterCost + downspoutCost + detachResetGutterCost + skylightCost;
  };

  const materialTotal = calculateMaterialTotal();
  const laborTotal = calculateLaborTotal();
  const subtotal = materialTotal + laborTotal;
  const profitAmount = subtotal * (profitMargin / 100);
  const grandTotal = subtotal + profitAmount;

  const totalSquares = measurements?.totalArea ? (measurements.totalArea / 100).toFixed(1) : '0';
  const predominantPitch = measurements?.predominantPitch || measurements?.roofPitch || 'Unknown';
  const materialCount = Object.keys(selectedMaterials).length;

  // Group materials by category
  const groupedMaterials = Object.entries(selectedMaterials).reduce((acc, [id, material]) => {
    const category = material.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ id, material, quantity: quantities[id] || 0 });
    return acc;
  }, {} as Record<string, Array<{ id: string; material: Material; quantity: number }>>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-bold">Estimate Summary Review</h2>
            <p className="text-green-100 text-sm">Review all details before submitting for approval</p>
          </div>
        </div>
      </div>

      {/* Customer Info & Project Overview Combined */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-1">
                <Home className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-gray-500" />
                  <span>{customerInfo?.address || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-gray-500" />
                  <span>{customerInfo?.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-gray-500" />
                  <span>{customerInfo?.email || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Project Overview */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Project Overview
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Total Area</p>
                  <p className="font-bold">{measurements?.totalArea || 0} sq ft</p>
                  <p className="text-xs text-gray-600">({totalSquares} sq)</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Pitch</p>
                  <p className="font-bold">{predominantPitch}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Materials</p>
                  <p className="font-bold">{materialCount}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials & Labor Combined */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Materials Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(groupedMaterials).map(([category, items]) => (
              <div key={category}>
                <h4 className="font-medium text-xs text-gray-600 mb-1">{category}</h4>
                <div className="space-y-1">
                  {items.map(({ id, material, quantity }) => (
                    <div key={id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <div className="flex-1 pr-2">
                        <p className="font-medium text-sm">{material.name}</p>
                      </div>
                      <p className="font-semibold text-sm">{quantity} {material.unit}s</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {peelStickAddonCost > 0 && (
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                <p className="font-medium">Full W.W. Peel & Stick System</p>
                <p className="font-semibold">Included</p>
              </div>
            )}
            
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center font-bold text-sm">
                <span>Materials Subtotal</span>
                <span>${materialTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Labor Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Labor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Labor by Pitch - Compact */}
            <div>
              <h4 className="font-medium text-xs text-gray-600 mb-1">Labor by Pitch</h4>
              <div className="space-y-1">
                {calculateLaborByPitch().map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <span className="font-medium">Pitch {item.pitch}</span>
                    <span className="text-gray-600">{item.squares.toFixed(1)} sq @ ${item.rate}/sq</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Items - Compact List */}
            <div className="space-y-1">
              {laborRates.isHandload && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Handload</span>
                  <span className="text-gray-600">{totalSquares} sq × ${laborRates.handloadRate}/sq</span>
                </div>
              )}

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                <span className="font-medium">Dumpster ({laborRates.dumpsterCount || 1})</span>
                <span className="text-gray-600">{laborRates.dumpsterLocation === 'orlando' ? 'Orlando' : 'Outside'}</span>
              </div>

              {laborRates.includePermits && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Permits</span>
                  <span className="text-gray-600">Required</span>
                </div>
              )}

              {laborRates.includeGutters && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Gutters</span>
                  <span className="text-gray-600">{laborRates.gutterLinearFeet} LF</span>
                </div>
              )}

              {laborRates.includeDownspouts && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Downspouts</span>
                  <span className="text-gray-600">Qty: {laborRates.downspoutCount}</span>
                </div>
              )}

              {laborRates.includeDetachResetGutters && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Detach & Reset Gutters</span>
                  <span className="text-gray-600">{laborRates.detachResetGutterLinearFeet} LF</span>
                </div>
              )}

              {(laborRates.includeSkylights2x2 || laborRates.includeSkylights2x4) && (
                <>
                  {laborRates.includeSkylights2x2 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">Skylights 2x2</span>
                      <span className="text-gray-600">Qty: {laborRates.skylights2x2Count}</span>
                    </div>
                  )}
                  {laborRates.includeSkylights2x4 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">Skylights 2x4</span>
                      <span className="text-gray-600">Qty: {laborRates.skylights2x4Count}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center font-bold text-sm">
                <span>Labor Subtotal</span>
                <span>${laborTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Summary - Compact */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Materials Total</span>
              <span className="font-semibold">${materialTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Labor Total</span>
              <span className="font-semibold">${laborTotal.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Profit Margin ({profitMargin}%)</span>
              <span className="font-semibold text-green-600">+${profitAmount.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Grand Total</span>
              <span className="text-green-600">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Labor & Profit
        </Button>
        
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Activity className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Submit for Approval
            </>
          )}
        </Button>
      </div>
    </div>
  );
}; 