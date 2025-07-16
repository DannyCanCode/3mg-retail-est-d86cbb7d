import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Wind, Wrench, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface JobWorksheetData {
  ventilation: Record<string, number>;
  accessories: Record<string, number>;
  specialRequirements: Record<string, any>;
  notes: string;
}

interface JobWorksheetOption {
  id: string;
  name: string;
  unit: string;
  material_id?: string;
}

interface SpecialRequirement {
  id: string;
  name: string;
  type: 'boolean' | 'text' | 'textarea';
  placeholder?: string;
}

interface JobWorksheetTabProps {
  worksheetData: JobWorksheetData;
  onWorksheetChange: (data: JobWorksheetData) => void;
  isReadOnly?: boolean;
  saveStatus?: 'saving' | 'saved' | 'error';
}

// Default worksheet template - in production this would come from database
const DEFAULT_VENTILATION_OPTIONS: JobWorksheetOption[] = [
  { id: 'gooseneck', name: 'Gooseneck', unit: 'each', material_id: 'gaf-master-flow-box-vents' },
  { id: 'ridge_vent', name: 'Ridge Vent', unit: 'linear feet', material_id: 'gaf-cobra-ridge-vent' },
  { id: 'turtle_vent', name: 'Turtle Vent', unit: 'each', material_id: 'generic-box-vents' },
  { id: 'solar_vent', name: 'Solar Vent', unit: 'each', material_id: 'generic-solar-vent' }
];

const DEFAULT_ACCESSORY_OPTIONS: JobWorksheetOption[] = [
  { id: 'pipe_jack_small', name: 'Pipe Jack (1-3")', unit: 'each', material_id: 'pipe-jack' },
  { id: 'pipe_jack_large', name: 'Pipe Jack (4-6")', unit: 'each', material_id: 'pipe-jack-large' },
  { id: 'drip_edge', name: 'Drip Edge', unit: 'linear feet', material_id: 'generic-drip-edge' },
  { id: 'valley_metal', name: 'Valley Metal', unit: 'linear feet', material_id: 'generic-valley-metal' }
];

const DEFAULT_SPECIAL_REQUIREMENTS: SpecialRequirement[] = [
  { id: 'chimney_cricket', name: 'Chimney Cricket', type: 'boolean' },
  { id: 'satellite_removal', name: 'Satellite Dish Removal', type: 'boolean' },
  { id: 'wood_replacement', name: 'Wood Replacement', type: 'text', placeholder: 'Describe wood replacement needs' },
  { id: 'special_notes', name: 'Special Notes', type: 'textarea', placeholder: 'Any additional requirements' }
];

export function JobWorksheetTab({
  worksheetData,
  onWorksheetChange,
  isReadOnly = false,
  saveStatus = 'saved'
}: JobWorksheetTabProps) {
  const [localData, setLocalData] = useState<JobWorksheetData>(worksheetData);

  // Update local data when props change
  useEffect(() => {
    setLocalData(worksheetData);
  }, [worksheetData]);

  const handleVentilationChange = (id: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const newData = {
      ...localData,
      ventilation: {
        ...localData.ventilation,
        [id]: numValue
      }
    };
    setLocalData(newData);
    onWorksheetChange(newData);
  };

  const handleAccessoryChange = (id: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const newData = {
      ...localData,
      accessories: {
        ...localData.accessories,
        [id]: numValue
      }
    };
    setLocalData(newData);
    onWorksheetChange(newData);
  };

  const handleSpecialRequirementChange = (id: string, value: any) => {
    const newData = {
      ...localData,
      specialRequirements: {
        ...localData.specialRequirements,
        [id]: value
      }
    };
    setLocalData(newData);
    onWorksheetChange(newData);
  };

  const handleNotesChange = (value: string) => {
    const newData = {
      ...localData,
      notes: value
    };
    setLocalData(newData);
    onWorksheetChange(newData);
  };

  const getTotalItems = () => {
    const ventilationCount = Object.values(localData.ventilation).reduce((sum, val) => sum + val, 0);
    const accessoryCount = Object.values(localData.accessories).reduce((sum, val) => sum + val, 0);
    return ventilationCount + accessoryCount;
  };

  return (
    <div className="space-y-6">
      {/* Save Status Indicator */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Job Worksheet</h2>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <Badge variant="outline" className="animate-pulse">
              Saving...
            </Badge>
          )}
          {saveStatus === 'saved' && (
            <Badge variant="outline" className="text-green-600">
              Saved
            </Badge>
          )}
          {saveStatus === 'error' && (
            <Badge variant="outline" className="text-red-600">
              Error saving
            </Badge>
          )}
        </div>
      </div>

      {/* Instructions */}
      {!isReadOnly && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Fill out this worksheet to specify ventilation, accessories, and special requirements. 
            These items will be automatically added to the materials list.
          </AlertDescription>
        </Alert>
      )}

      {/* Ventilation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5" />
            Ventilation
          </CardTitle>
          <CardDescription>
            Specify the quantity of ventilation items needed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEFAULT_VENTILATION_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-center justify-between">
              <Label htmlFor={`vent-${option.id}`} className="flex-1">
                {option.name}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`vent-${option.id}`}
                  type="number"
                  min="0"
                  value={localData.ventilation[option.id] || 0}
                  onChange={(e) => handleVentilationChange(option.id, e.target.value)}
                  disabled={isReadOnly}
                  className="w-24"
                  autoComplete="off"
                />
                <span className="text-sm text-muted-foreground w-20">
                  {option.unit}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Accessories Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Accessories
          </CardTitle>
          <CardDescription>
            Specify the quantity of accessory items needed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEFAULT_ACCESSORY_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-center justify-between">
              <Label htmlFor={`acc-${option.id}`} className="flex-1">
                {option.name}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`acc-${option.id}`}
                  type="number"
                  min="0"
                  value={localData.accessories[option.id] || 0}
                  onChange={(e) => handleAccessoryChange(option.id, e.target.value)}
                  disabled={isReadOnly}
                  className="w-24"
                  autoComplete="off"
                />
                <span className="text-sm text-muted-foreground w-20">
                  {option.unit}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Special Requirements Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Special Requirements
          </CardTitle>
          <CardDescription>
            Additional items or special instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEFAULT_SPECIAL_REQUIREMENTS.map((requirement) => {
            if (requirement.type === 'boolean') {
              return (
                <div key={requirement.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={requirement.id}
                    checked={localData.specialRequirements[requirement.id] || false}
                    onCheckedChange={(checked) => 
                      handleSpecialRequirementChange(requirement.id, checked)
                    }
                    disabled={isReadOnly}
                  />
                  <Label htmlFor={requirement.id} className="cursor-pointer">
                    {requirement.name}
                  </Label>
                </div>
              );
            } else if (requirement.type === 'text') {
              return (
                <div key={requirement.id} className="space-y-2">
                  <Label htmlFor={requirement.id}>{requirement.name}</Label>
                  <Input
                    id={requirement.id}
                    type="text"
                    value={localData.specialRequirements[requirement.id] || ''}
                    onChange={(e) => 
                      handleSpecialRequirementChange(requirement.id, e.target.value)
                    }
                    placeholder={requirement.placeholder}
                    disabled={isReadOnly}
                  />
                </div>
              );
            } else if (requirement.type === 'textarea') {
              return (
                <div key={requirement.id} className="space-y-2">
                  <Label htmlFor={requirement.id}>{requirement.name}</Label>
                  <Textarea
                    id={requirement.id}
                    value={localData.specialRequirements[requirement.id] || ''}
                    onChange={(e) => 
                      handleSpecialRequirementChange(requirement.id, e.target.value)
                    }
                    placeholder={requirement.placeholder}
                    disabled={isReadOnly}
                    rows={4}
                  />
                </div>
              );
            }
            return null;
          })}
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>
            Any other information relevant to this job
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={localData.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Enter any additional notes here..."
            disabled={isReadOnly}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Items Selected:</span>
            <Badge variant="secondary" className="text-lg">
              {getTotalItems()}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 