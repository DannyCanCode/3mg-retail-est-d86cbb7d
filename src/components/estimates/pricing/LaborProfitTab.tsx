
import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface LaborProfitTabProps {
  goToPreviousTab: () => void;
  onContinue: (laborRates: LaborRates, profitMargin: number) => void;
  initialLaborRates?: LaborRates;
  initialProfitMargin?: number;
}

export interface LaborRates {
  tearOff: number;
  installation: number;
  cleanup: number;
  supervision: number;
}

export function LaborProfitTab({
  goToPreviousTab,
  onContinue,
  initialLaborRates = {
    tearOff: 55,
    installation: 125,
    cleanup: 35,
    supervision: 45
  },
  initialProfitMargin = 25
}: LaborProfitTabProps) {
  const [laborRates, setLaborRates] = useState<LaborRates>(initialLaborRates);
  const [profitMargin, setProfitMargin] = useState(initialProfitMargin);
  
  const handleLaborRateChange = (field: keyof LaborRates, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLaborRates(prev => ({
      ...prev,
      [field]: numValue
    }));
  };
  
  const handleProfitMarginChange = (value: number[]) => {
    setProfitMargin(value[0]);
  };
  
  const handleContinue = () => {
    onContinue(laborRates, profitMargin);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Labor Rates & Profit Margin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Labor Rates (per square)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tearOff">Tear Off Rate ($/square)</Label>
                <Input
                  id="tearOff"
                  type="number"
                  value={laborRates.tearOff.toString()}
                  onChange={(e) => handleLaborRateChange("tearOff", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="installation">Installation Rate ($/square)</Label>
                <Input
                  id="installation"
                  type="number"
                  value={laborRates.installation.toString()}
                  onChange={(e) => handleLaborRateChange("installation", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cleanup">Cleanup Rate ($/square)</Label>
                <Input
                  id="cleanup"
                  type="number"
                  value={laborRates.cleanup.toString()}
                  onChange={(e) => handleLaborRateChange("cleanup", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supervision">Supervision Rate ($/square)</Label>
                <Input
                  id="supervision"
                  type="number"
                  value={laborRates.supervision.toString()}
                  onChange={(e) => handleLaborRateChange("supervision", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Profit Margin</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="profitMargin">Profit Margin (%)</Label>
              <span className="font-medium">{profitMargin}%</span>
            </div>
            <Slider
              id="profitMargin"
              value={[profitMargin]}
              min={0}
              max={50}
              step={1}
              onValueChange={handleProfitMarginChange}
            />
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Labor rates are applied per square of roof area. The profit margin is applied to the total cost of materials and labor.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline"
          onClick={goToPreviousTab}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Materials
        </Button>
        <Button 
          type="button" 
          onClick={handleContinue}
          className="flex items-center gap-2"
        >
          Continue to Summary
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
