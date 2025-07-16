import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Home, 
  Wrench, 
  Zap, 
  Droplets, 
  Wind, 
  Shield,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface EstimateTypeSelection {
  type: 'roof_only' | 'with_subtrades';
  selectedSubtrades: string[];
}

interface EstimateTypeSelectorProps {
  onSelectionComplete: (selection: EstimateTypeSelection) => void;
  onBack?: () => void;
}

const SUBTRADE_OPTIONS = [
  {
    id: 'hvac',
    name: 'HVAC',
    description: 'Heating, Ventilation, Air Conditioning',
    icon: Wind,
    color: 'bg-green-600/20 text-green-400 border-green-600/30'
  },
  {
    id: 'electrical',
    name: 'Electrical',
    description: 'Electrical work and installations',
    icon: Zap,
    color: 'bg-green-600/20 text-green-400 border-green-600/30'
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    description: 'Plumbing and water systems',
    icon: Droplets,
    color: 'bg-green-600/20 text-green-400 border-green-600/30'
  },
  {
    id: 'gutters',
    name: 'Gutters',
    description: 'Gutter installation and repair',
    icon: Shield,
    color: 'bg-green-600/20 text-green-400 border-green-600/30'
  },
  {
    id: 'siding',
    name: 'Siding',
    description: 'Siding installation and repair',
    icon: Home,
    color: 'bg-green-600/20 text-green-400 border-green-600/30'
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Custom subtrade requirements',
    icon: Wrench,
    color: 'bg-green-600/20 text-green-400 border-green-600/30'
  }
];

export const EstimateTypeSelector: React.FC<EstimateTypeSelectorProps> = ({
  onSelectionComplete,
  onBack
}) => {
  const [estimateType, setEstimateType] = useState<'roof_only' | 'with_subtrades'>('roof_only');
  const [selectedSubtrades, setSelectedSubtrades] = useState<string[]>([]);

  const handleSubtradeToggle = (subtradeId: string) => {
    setSelectedSubtrades(prev => 
      prev.includes(subtradeId) 
        ? prev.filter(id => id !== subtradeId)
        : [...prev, subtradeId]
    );
  };

  const handleContinue = () => {
    onSelectionComplete({
      type: estimateType,
      selectedSubtrades: estimateType === 'with_subtrades' ? selectedSubtrades : []
    });
  };

  const canContinue = estimateType === 'roof_only' || 
    (estimateType === 'with_subtrades' && selectedSubtrades.length > 0);

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 backdrop-blur-sm border-green-600/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Home className="h-5 w-5 text-green-400" />
            Select Estimate Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={estimateType} 
            onValueChange={(value) => setEstimateType(value as 'roof_only' | 'with_subtrades')}
            className="space-y-4"
          >
            {/* Roof Only Option */}
            <div className="flex items-center space-x-3 rounded-lg border border-green-600/30 bg-gray-800/30 p-4 hover:bg-green-900/20 transition-colors">
              <RadioGroupItem value="roof_only" className="text-green-400 border-green-600" />
              <Label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-green-400" />
                      <span className="font-medium text-white">Roof Shingles Only</span>
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Standard</Badge>
                    </div>
                    <p className="text-sm text-green-300/70 mt-1">
                      Traditional roofing estimate with materials and labor
                    </p>
                  </div>
                  {estimateType === 'roof_only' && (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  )}
                </div>
              </Label>
            </div>

            {/* Roof + Subtrades Option */}
            <div className="flex items-center space-x-3 rounded-lg border border-gray-700/50 bg-gray-800/20 p-4 opacity-60 cursor-not-allowed">
              <RadioGroupItem value="with_subtrades" disabled className="border-gray-600" />
              <Label className="flex-1 cursor-not-allowed">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-400">Roof + Subtrades</span>
                      <Badge className="bg-gray-700/50 text-gray-400 border-gray-600">Complex</Badge>
                      <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">
                        In Development
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Comprehensive estimate including roofing and additional services
                    </p>
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      🚧 In development - Do not click. Use "Roof Shingles Only" for now.
                    </p>
                  </div>
                  {estimateType === 'with_subtrades' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Subtrade Selection */}
          {estimateType === 'with_subtrades' && (
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div>
                <h4 className="font-medium text-sm mb-3">Select Required Subtrades</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SUBTRADE_OPTIONS.map((subtrade) => {
                    const IconComponent = subtrade.icon;
                    const isSelected = selectedSubtrades.includes(subtrade.id);
                    
                    return (
                      <div
                        key={subtrade.id}
                        className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleSubtradeToggle(subtrade.id)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onChange={() => handleSubtradeToggle(subtrade.id)}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <IconComponent className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-sm">{subtrade.name}</div>
                            <p className="text-xs text-muted-foreground">
                              {subtrade.description}
                            </p>
                          </div>
                        </div>
                        <Badge className={subtrade.color} variant="secondary">
                          {subtrade.name}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                
                {selectedSubtrades.length > 0 && (
                  <div className="mt-3 p-3 bg-green-900/20 rounded-lg border border-green-600/30">
                    <p className="text-sm text-green-400">
                      <strong>{selectedSubtrades.length}</strong> subtrade(s) selected. 
                      These will be included in your estimate workflow.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-green-600/20">
            {onBack && (
              <Button 
                variant="outline" 
                onClick={onBack}
                className="bg-gray-800/50 hover:bg-gray-800/70 text-green-300 border-green-600/30"
              >
                Back
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button 
                onClick={handleContinue}
                disabled={!canContinue}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Upload
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 