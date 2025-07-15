import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Wind } from 'lucide-react';
import { Package } from 'lucide-react';

interface JobWorksheetData {
  basic_info: {
    name: string;
    job_type: 'insurance' | 'retail' | '';
    price_match: boolean;
    address: string;
    leak: boolean;
  };
  property_access: {
    hoa: boolean;
    gate: boolean;
    gate_code: string;
    gate_guard: boolean;
    pool: boolean;
    driveway: 'concrete' | 'pavers' | '';
    rr_secondary_structure: boolean;
    dumpster_notes: string;
  };
  shingle_roof: {
    manufacturer: string;
    type: string;
    color: string;
    drip: string;
    warranty_3mg: '10_year' | '25_year_uhdz' | '';
    warranty_gaf: 'silver' | 'gold' | '';
    underlayment: 'synthetic' | 'peel_stick' | '';
    decking: 'plywood' | 'plank' | '';
    flat_roof_sq: number;
    pitch_gauge: string;
    iso_needed: boolean;
  };
  ventilation: {
    goosenecks: {
      '4_inch': number;
      '6_inch': number;
      '10_inch': number;
      '12_inch': number;
      color: string;
    };
    boots: {
      '1_5_inch': number;
      '2_inch': number;
      '3_inch': number;
      '4_inch': number;
      color: string;
    };
    ridge_vents_lf: number;
    off_ridge_vents: {
      '2_ft': number;
      '4_ft': number;
      '6_ft': number;
      '8_ft': number;
    };
  };
  accessories: {
    skylight: {
      count_2x2: number;
      count_2x4: number;
      other: string;
    };
  };
  gutters: {
    existing_gutters: boolean;
    keep_or_new: 'keep' | 'new' | '';
    photos: boolean;
    gutter_size: '6_inch' | '7_inch' | '';
    gutter_color: string;
    gutter_lf: number;
    downspouts: {
      color: string;
      count_1st_story: number;
      count_2nd_story: number;
    };
    detach_reset_gutters: boolean;
    detach_reset_gutter_lf: number;
  };
  solar: {
    existing: boolean;
    keep: boolean;
    sold_by_3mg: boolean;
    removal: '3mg' | 'homeowner' | '';
    electric_count: number;
    pool_count: number;
    hot_water_count: number;
    inverter_type: 'string_inverter' | 'microinverter' | 'unknown' | '';
    third_party_company_info: string;
  };
  additional_notes: {
    gutter_solar_notes: string;
  };
}

interface JobWorksheetFormProps {
  initialData?: Partial<JobWorksheetData>;
  measurements?: any;
  onSave: (data: JobWorksheetData) => void;
  readOnly?: boolean;
} 

export const JobWorksheetForm: React.FC<JobWorksheetFormProps> = ({
  initialData,
  measurements,
  onSave,
  readOnly = false
}) => {
  const [formData, setFormData] = useState<JobWorksheetData>({
    basic_info: {
      name: '',
      job_type: '',
      price_match: false,
      address: '',
      leak: false,
      ...initialData?.basic_info
    },
    property_access: {
      hoa: false,
      gate: false,
      gate_code: '',
      gate_guard: false,
      pool: false,
      driveway: '',
      rr_secondary_structure: false,
      dumpster_notes: '',
      ...initialData?.property_access
    },
    shingle_roof: {
      manufacturer: '',
      type: 'Asphalt', // Default to Asphalt
      color: '',
      drip: '',
      warranty_3mg: '',
      warranty_gaf: '',
      underlayment: '',
      decking: '',
      flat_roof_sq: 0,
      pitch_gauge: '',
      iso_needed: false,
      ...initialData?.shingle_roof
    },
    ventilation: {
      goosenecks: {
        '4_inch': 0,
        '6_inch': 0,
        '10_inch': 0,
        '12_inch': 0,
        color: '',
        ...initialData?.ventilation?.goosenecks
      },
      boots: {
        '1_5_inch': 0,
        '2_inch': 0,
        '3_inch': 0,
        '4_inch': 0,
        color: '',
        ...initialData?.ventilation?.boots
      },
      ridge_vents_lf: initialData?.ventilation?.ridge_vents_lf || 0,
      off_ridge_vents: {
        '2_ft': 0,
        '4_ft': 0,
        '6_ft': 0,
        '8_ft': 0,
        ...initialData?.ventilation?.off_ridge_vents
      }
    },
    accessories: {
      skylight: {
        count_2x2: 0,
        count_2x4: 0,
        other: '',
        ...initialData?.accessories?.skylight
      }
    },
    gutters: {
      existing_gutters: false,
      keep_or_new: '',
      photos: false,
      gutter_size: '',
      gutter_color: '',
      gutter_lf: 0,
      downspouts: {
        color: '',
        count_1st_story: 0,
        count_2nd_story: 0,
        ...initialData?.gutters?.downspouts
      },
      detach_reset_gutters: false,
      detach_reset_gutter_lf: 0,
      ...initialData?.gutters
    },
    solar: {
      existing: false,
      keep: false,
      sold_by_3mg: false,
      removal: '',
      electric_count: 0,
      pool_count: 0,
      hot_water_count: 0,
      inverter_type: '',
      third_party_company_info: '',
      ...initialData?.solar
    },
    additional_notes: {
      gutter_solar_notes: '',
      ...initialData?.additional_notes
    }
  });

  // Auto-calculate flat roof sq and pitch gauge from measurements
  useEffect(() => {
    if (measurements?.areasByPitch && Array.isArray(measurements.areasByPitch)) {
      // Calculate flat roof total (0/12, 1/12, 2/12 pitches)
      let flatRoofTotal = 0;
      const pitchAreas: Record<string, number> = {};

      measurements.areasByPitch.forEach((pitchData: any) => {
        const pitch = pitchData.pitch || '';
        const area = parseFloat(pitchData.area) || 0;

        // Add to flat roof total if low slope (0/12, 1/12, 2/12)
        if (['0/12', '1/12', '2/12', '0:12', '1:12', '2:12'].includes(pitch)) {
          flatRoofTotal += area;
        }

        // Track areas by pitch for predominant pitch calculation
        if (pitch && area > 0) {
          pitchAreas[pitch] = (pitchAreas[pitch] || 0) + area;
        }
      });

      // Find predominant pitch (highest total area)
      let predominantPitch = '';
      let maxArea = 0;
      Object.entries(pitchAreas).forEach(([pitch, area]) => {
        if (area > maxArea) {
          maxArea = area;
          predominantPitch = pitch;
        }
      });

      // Update form data with calculated values
      setFormData(prev => ({
        ...prev,
        shingle_roof: {
          ...prev.shingle_roof,
          flat_roof_sq: Math.round(flatRoofTotal / 100), // Convert to squares (area is in sq ft, divide by 100)
          pitch_gauge: predominantPitch,
          // Auto-check ISO Needed if there's flat roof area
          iso_needed: flatRoofTotal > 0 ? true : prev.shingle_roof.iso_needed
        }
      }));
    }
  }, [measurements]);

  const updateField = (section: keyof JobWorksheetData, field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const sectionData = { ...newData[section] } as any;
      
      // Handle nested fields (e.g., "goosenecks.4_inch")
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        sectionData[parent] = {
          ...sectionData[parent],
          [child]: value
        };
      } else {
        sectionData[field] = value;
      }
      
      newData[section] = sectionData;
      return newData;
    });
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="shingle">Shingle Roof</TabsTrigger>
          <TabsTrigger value="ventilation">Ventilation</TabsTrigger>
          <TabsTrigger value="skylights">Skylights</TabsTrigger>
          <TabsTrigger value="gutters">Gutters</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Owner Name</Label>
                  <Input
                    id="name"
                    value={formData.basic_info.name}
                    onChange={(e) => updateField('basic_info', 'name', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label htmlFor="job_type">Job Type</Label>
                  <RadioGroup
                    value={formData.basic_info.job_type}
                    onValueChange={(value) => updateField('basic_info', 'job_type', value)}
                    disabled={readOnly}
                  >
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="insurance" id="insurance" />
                        <Label htmlFor="insurance">Insurance</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="retail" id="retail" />
                        <Label htmlFor="retail">Retail</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.basic_info.address}
                  onChange={(e) => updateField('basic_info', 'address', e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hoa"
                    checked={formData.property_access.hoa}
                    onCheckedChange={(checked) => updateField('property_access', 'hoa', checked)}
                    disabled={readOnly}
                  />
                  <Label htmlFor="hoa">HOA</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gate"
                    checked={formData.property_access.gate}
                    onCheckedChange={(checked) => updateField('property_access', 'gate', checked)}
                    disabled={readOnly}
                  />
                  <Label htmlFor="gate">Gate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pool"
                    checked={formData.property_access.pool}
                    onCheckedChange={(checked) => updateField('property_access', 'pool', checked)}
                    disabled={readOnly}
                  />
                  <Label htmlFor="pool">Pool</Label>
                </div>
              </div>

              {formData.property_access.gate && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gate_code">Gate Code</Label>
                    <Input
                      id="gate_code"
                      value={formData.property_access.gate_code}
                      onChange={(e) => updateField('property_access', 'gate_code', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Gate Guard</Label>
                    <RadioGroup
                      value={formData.property_access.gate_guard ? 'yes' : 'no'}
                      onValueChange={(value) => updateField('property_access', 'gate_guard', value === 'yes')}
                      disabled={readOnly}
                    >
                      <div className="flex space-x-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="gate_guard_yes" />
                          <Label htmlFor="gate_guard_yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="gate_guard_no" />
                          <Label htmlFor="gate_guard_no">No</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              <div>
                <Label>Driveway</Label>
                <RadioGroup
                  value={formData.property_access.driveway}
                  onValueChange={(value) => updateField('property_access', 'driveway', value)}
                  disabled={readOnly}
                >
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="concrete" id="concrete" />
                      <Label htmlFor="concrete">Concrete</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pavers" id="pavers" />
                      <Label htmlFor="pavers">Pavers</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rr_secondary_structure"
                  checked={formData.property_access.rr_secondary_structure}
                  onCheckedChange={(checked) => updateField('property_access', 'rr_secondary_structure', checked)}
                  disabled={readOnly}
                />
                <Label htmlFor="rr_secondary_structure">R&R Secondary Roofing Structure?</Label>
              </div>

              <div>
                <Label htmlFor="dumpster_notes">Dumpster Notes</Label>
                <Textarea
                  id="dumpster_notes"
                  value={formData.property_access.dumpster_notes}
                  onChange={(e) => updateField('property_access', 'dumpster_notes', e.target.value)}
                  disabled={readOnly}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shingle Roof Tab */}
        <TabsContent value="shingle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shingle Roof Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Select
                    value={formData.shingle_roof.manufacturer}
                    onValueChange={(value) => updateField('shingle_roof', 'manufacturer', value)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="manufacturer">
                      <SelectValue placeholder="Select manufacturer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GAF">GAF</SelectItem>
                      <SelectItem value="CertainTeed">CertainTeed</SelectItem>
                      <SelectItem value="Owens Corning">Owens Corning</SelectItem>
                      <SelectItem value="TAMKO">TAMKO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.shingle_roof.type}
                    onValueChange={(value) => updateField('shingle_roof', 'type', value)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asphalt">Asphalt</SelectItem>
                      <SelectItem value="Architectural">Architectural</SelectItem>
                      <SelectItem value="3-Tab">3-Tab</SelectItem>
                      <SelectItem value="Designer">Designer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Select
                    value={formData.shingle_roof.color}
                    onValueChange={(value) => updateField('shingle_roof', 'color', value)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="color">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* GAF Timberline HDZ Colors from the images */}
                      <SelectItem value="Golden Harvest">Golden Harvest</SelectItem>
                      <SelectItem value="Hickory">Hickory</SelectItem>
                      <SelectItem value="Hunter Green">Hunter Green</SelectItem>
                      <SelectItem value="Mission Brown">Mission Brown</SelectItem>
                      <SelectItem value="Nantucket Morning">Nantucket Morning</SelectItem>
                      <SelectItem value="Oyster Gray">Oyster Gray</SelectItem>
                      <SelectItem value="Shakewood">Shakewood</SelectItem>
                      <SelectItem value="Slate">Slate</SelectItem>
                      <SelectItem value="Sunset Brick">Sunset Brick</SelectItem>
                      <SelectItem value="Weathered Wood">Weathered Wood</SelectItem>
                      <SelectItem value="Pewter Gray">Pewter Gray</SelectItem>
                      <SelectItem value="Appalachian Sky">Appalachian Sky</SelectItem>
                      <SelectItem value="Barkwood">Barkwood</SelectItem>
                      <SelectItem value="Birchwood">Birchwood</SelectItem>
                      <SelectItem value="Cedar Falls">Cedar Falls</SelectItem>
                      <SelectItem value="Charcoal">Charcoal</SelectItem>
                      <SelectItem value="Driftwood">Driftwood</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="drip">Drip</Label>
                <Input
                  id="drip"
                  value={formData.shingle_roof.drip}
                  onChange={(e) => updateField('shingle_roof', 'drip', e.target.value)}
                  disabled={readOnly}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>3MG Warranty</Label>
                  <RadioGroup
                    value={formData.shingle_roof.warranty_3mg}
                    onValueChange={(value) => updateField('shingle_roof', 'warranty_3mg', value)}
                    disabled={readOnly}
                  >
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="10_year" id="10_year" />
                        <Label htmlFor="10_year">10 Year</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="25_year_uhdz" id="25_year_uhdz" />
                        <Label htmlFor="25_year_uhdz">25 Year (UHDZ)</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>GAF Warranty</Label>
                  <RadioGroup
                    value={formData.shingle_roof.warranty_gaf}
                    onValueChange={(value) => updateField('shingle_roof', 'warranty_gaf', value)}
                    disabled={readOnly}
                  >
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="silver" id="silver" />
                        <Label htmlFor="silver">Silver</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gold" id="gold" />
                        <Label htmlFor="gold">Gold</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Underlayment</Label>
                  <RadioGroup
                    value={formData.shingle_roof.underlayment}
                    onValueChange={(value) => updateField('shingle_roof', 'underlayment', value)}
                    disabled={readOnly}
                  >
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="synthetic" id="synthetic" />
                        <Label htmlFor="synthetic">Synthetic</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="peel_stick" id="peel_stick" />
                        <Label htmlFor="peel_stick">Peel & Stick</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Decking</Label>
                  <RadioGroup
                    value={formData.shingle_roof.decking}
                    onValueChange={(value) => updateField('shingle_roof', 'decking', value)}
                    disabled={readOnly}
                  >
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="plywood" id="plywood" />
                        <Label htmlFor="plywood">Plywood</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="plank" id="plank" />
                        <Label htmlFor="plank">Plank</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="flat_roof_sq">Flat Roof (SQ)</Label>
                  <Input
                    id="flat_roof_sq"
                    type="number"
                    value={formData.shingle_roof.flat_roof_sq}
                    onChange={(e) => updateField('shingle_roof', 'flat_roof_sq', parseFloat(e.target.value) || 0)}
                    disabled={readOnly}
                    step="0.01"
                  />
                  {measurements && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Auto-calculated from measurements
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pitch_gauge">Pitch Gauge</Label>
                  <Input
                    id="pitch_gauge"
                    value={formData.shingle_roof.pitch_gauge}
                    onChange={(e) => updateField('shingle_roof', 'pitch_gauge', e.target.value)}
                    disabled={readOnly}
                  />
                  {measurements && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Predominant pitch from measurements
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <Checkbox
                    id="iso_needed"
                    checked={formData.shingle_roof.iso_needed}
                    onCheckedChange={(checked) => updateField('shingle_roof', 'iso_needed', checked)}
                    disabled={readOnly}
                  />
                  <Label htmlFor="iso_needed">ISO Needed?</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ventilation Tab */}
        <TabsContent value="ventilation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventilation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goosenecks4">Goosenecks (4")</Label>
                  <Select
                    value={formData.ventilation.goosenecks['4_inch']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'goosenecks', { ...formData.ventilation.goosenecks, '4_inch': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="goosenecks4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="goosenecks6">Goosenecks (6")</Label>
                  <Select
                    value={formData.ventilation.goosenecks['6_inch']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'goosenecks', { ...formData.ventilation.goosenecks, '6_inch': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="goosenecks6">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goosenecks10">Goosenecks (10")</Label>
                  <Select
                    value={formData.ventilation.goosenecks['10_inch']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'goosenecks', { ...formData.ventilation.goosenecks, '10_inch': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="goosenecks10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="goosenecks12">Goosenecks (12")</Label>
                  <Select
                    value={formData.ventilation.goosenecks['12_inch']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'goosenecks', { ...formData.ventilation.goosenecks, '12_inch': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="goosenecks12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Goosenecks Color</Label>
                <Input
                  value={formData.ventilation.goosenecks.color}
                  onChange={(e) => updateField('ventilation', 'goosenecks', { ...formData.ventilation.goosenecks, color: e.target.value })}
                  disabled={readOnly}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Boots (1.5")</Label>
                  <Select
                    value={formData.ventilation.boots['1_5_inch']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'boots', { ...formData.ventilation.boots, '1_5_inch': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="boots15">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Boots (2")</Label>
                  <Select
                    value={formData.ventilation.boots['2_inch']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'boots', { ...formData.ventilation.boots, '2_inch': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="boots2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Boots (3")</Label>
                  <Select
                    value={formData.ventilation.boots['3_inch']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'boots', { ...formData.ventilation.boots, '3_inch': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="boots3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Boots (4")</Label>
                  <Select
                    value={formData.ventilation.boots['4_inch']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'boots', { ...formData.ventilation.boots, '4_inch': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="boots4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Boots Color</Label>
                <Input
                  value={formData.ventilation.boots.color}
                  onChange={(e) => updateField('ventilation', 'boots', { ...formData.ventilation.boots, color: e.target.value })}
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label>Ridge Vents (LF)</Label>
                <Input
                  type="number"
                  value={formData.ventilation.ridge_vents_lf}
                  onChange={(e) => updateField('ventilation', 'ridge_vents_lf', parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Off Ridge Vents (2ft)</Label>
                  <Select
                    value={formData.ventilation.off_ridge_vents['2_ft']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'off_ridge_vents', { ...formData.ventilation.off_ridge_vents, '2_ft': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="offRidgeVents2ft">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Off Ridge Vents (4ft)</Label>
                  <Select
                    value={formData.ventilation.off_ridge_vents['4_ft']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'off_ridge_vents', { ...formData.ventilation.off_ridge_vents, '4_ft': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="offRidgeVents4ft">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Off Ridge Vents (6ft)</Label>
                  <Select
                    value={formData.ventilation.off_ridge_vents['6_ft']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'off_ridge_vents', { ...formData.ventilation.off_ridge_vents, '6_ft': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="offRidgeVents6ft">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Off Ridge Vents (8ft)</Label>
                  <Select
                    value={formData.ventilation.off_ridge_vents['8_ft']?.toString() || "0"}
                    onValueChange={(value) => updateField('ventilation', 'off_ridge_vents', { ...formData.ventilation.off_ridge_vents, '8_ft': parseInt(value) || 0 })}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="offRidgeVents8ft">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skylights Tab */}
        <TabsContent value="skylights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Skylights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 2x2 Skylights */}
              <div className="flex items-center space-x-4">
                <Checkbox
                  id="includeSkylights2x2"
                  checked={formData.accessories.skylight.count_2x2 > 0}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      updateField('accessories', 'skylight', { ...formData.accessories.skylight, count_2x2: 0 });
                    } else {
                      updateField('accessories', 'skylight', { ...formData.accessories.skylight, count_2x2: 1 });
                    }
                  }}
                  disabled={readOnly}
                />
                <Label htmlFor="includeSkylights2x2" className="flex-1">
                  Install 2X2 Skylights ($280 per unit)
                </Label>
                {formData.accessories.skylight.count_2x2 > 0 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Quantity:</Label>
                    <Select
                      value={formData.accessories.skylight.count_2x2?.toString() || "1"}
                      onValueChange={(value) => updateField('accessories', 'skylight', { ...formData.accessories.skylight, count_2x2: parseInt(value) || 0 })}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* 2x4 Skylights */}
              <div className="flex items-center space-x-4">
                <Checkbox
                  id="includeSkylights2x4"
                  checked={formData.accessories.skylight.count_2x4 > 0}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      updateField('accessories', 'skylight', { ...formData.accessories.skylight, count_2x4: 0 });
                    } else {
                      updateField('accessories', 'skylight', { ...formData.accessories.skylight, count_2x4: 1 });
                    }
                  }}
                  disabled={readOnly}
                />
                <Label htmlFor="includeSkylights2x4" className="flex-1">
                  Install 2X4 Skylights ($370 per unit)
                </Label>
                {formData.accessories.skylight.count_2x4 > 0 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Quantity:</Label>
                    <Select
                      value={formData.accessories.skylight.count_2x4?.toString() || "1"}
                      onValueChange={(value) => updateField('accessories', 'skylight', { ...formData.accessories.skylight, count_2x4: parseInt(value) || 0 })}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Other Skylights */}
              <div className="pt-2">
                <Label htmlFor="skylightOther">Other Skylight Needs</Label>
                <Textarea
                  id="skylightOther"
                  value={formData.accessories.skylight.other}
                  onChange={(e) => updateField('accessories', 'skylight', { ...formData.accessories.skylight, other: e.target.value })}
                  disabled={readOnly}
                  placeholder="Describe any other skylight requirements..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gutters Tab */}
        <TabsContent value="gutters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gutters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Install Gutters */}
              <div className="flex items-center space-x-4">
                <Checkbox
                  id="includeGutters"
                  checked={formData.gutters.gutter_lf > 0}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      updateField('gutters', 'gutter_lf', 0);
                    }
                  }}
                  disabled={readOnly}
                />
                <Label htmlFor="includeGutters" className="flex-1">
                  Install 6" Aluminum Seamless Gutters ($8 per linear foot)
                </Label>
              </div>

              {formData.gutters.gutter_lf > 0 && (
                <div className="ml-10 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gutterLf">Linear Feet</Label>
                      <Input
                        id="gutterLf"
                        type="number"
                        value={formData.gutters.gutter_lf}
                        onChange={(e) => updateField('gutters', 'gutter_lf', parseInt(e.target.value) || 0)}
                        disabled={readOnly}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gutterColor">Gutter Color</Label>
                      <Input
                        id="gutterColor"
                        value={formData.gutters.gutter_color}
                        onChange={(e) => updateField('gutters', 'gutter_color', e.target.value)}
                        disabled={readOnly}
                        placeholder="e.g., White, Brown, Black"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Gutter Size</Label>
                      <RadioGroup
                        value={formData.gutters.gutter_size}
                        onValueChange={(value) => updateField('gutters', 'gutter_size', value)}
                        disabled={readOnly}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="6_inch" id="6inch" />
                          <Label htmlFor="6inch">6"</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="7_inch" id="7inch" />
                          <Label htmlFor="7inch">7"</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="existingGutters"
                          checked={formData.gutters.existing_gutters}
                          onCheckedChange={(checked) => updateField('gutters', 'existing_gutters', checked)}
                          disabled={readOnly}
                        />
                        <Label htmlFor="existingGutters">Existing Gutters?</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gutterPhotos"
                          checked={formData.gutters.photos}
                          onCheckedChange={(checked) => updateField('gutters', 'photos', checked)}
                          disabled={readOnly}
                        />
                        <Label htmlFor="gutterPhotos">Photos Taken?</Label>
                      </div>
                    </div>
                  </div>

                  {formData.gutters.existing_gutters && (
                    <div>
                      <Label>Keep or Install New?</Label>
                      <RadioGroup
                        value={formData.gutters.keep_or_new}
                        onValueChange={(value) => updateField('gutters', 'keep_or_new', value)}
                        disabled={readOnly}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="keep" id="keepGutters" />
                          <Label htmlFor="keepGutters">Keep Existing</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="newGutters" />
                          <Label htmlFor="newGutters">Install New</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              )}

              {/* Detach and Reset Gutters */}
              <div className="flex items-center space-x-4">
                <Checkbox
                  id="detachResetGutters"
                  checked={formData.gutters.detach_reset_gutters || false}
                  onCheckedChange={(checked) => updateField('gutters', 'detach_reset_gutters', checked)}
                  disabled={readOnly}
                />
                <Label htmlFor="detachResetGutters" className="flex-1">
                  Detach and Reset Gutters ($1 per linear foot)
                </Label>
              </div>

              {formData.gutters.detach_reset_gutters && (
                <div className="ml-10">
                  <Label htmlFor="detachResetGutterLf">Detach/Reset Linear Feet</Label>
                  <Input
                    id="detachResetGutterLf"
                    type="number"
                    value={formData.gutters.detach_reset_gutter_lf || 0}
                    onChange={(e) => updateField('gutters', 'detach_reset_gutter_lf', parseInt(e.target.value) || 0)}
                    disabled={readOnly}
                    min="0"
                    className="w-32 mt-2"
                  />
                </div>
              )}

              {/* Downspouts */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Downspouts</h4>
                  <span className="text-sm text-muted-foreground">($75 each)</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="downspoutColor">Color</Label>
                    <Input
                      id="downspoutColor"
                      value={formData.gutters.downspouts.color}
                      onChange={(e) => updateField('gutters', 'downspouts', { ...formData.gutters.downspouts, color: e.target.value })}
                      disabled={readOnly}
                      placeholder="e.g., White, Brown"
                    />
                  </div>
                  <div>
                    <Label htmlFor="downspout1st">1st Story Count</Label>
                    <Input
                      id="downspout1st"
                      type="number"
                      value={formData.gutters.downspouts.count_1st_story}
                      onChange={(e) => updateField('gutters', 'downspouts', { ...formData.gutters.downspouts, count_1st_story: parseInt(e.target.value) || 0 })}
                      disabled={readOnly}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="downspout2nd">2nd Story Count</Label>
                    <Input
                      id="downspout2nd"
                      type="number"
                      value={formData.gutters.downspouts.count_2nd_story}
                      onChange={(e) => updateField('gutters', 'downspouts', { ...formData.gutters.downspouts, count_2nd_story: parseInt(e.target.value) || 0 })}
                      disabled={readOnly}
                      min="0"
                    />
                  </div>
                </div>
                {(formData.gutters.downspouts.count_1st_story > 0 || formData.gutters.downspouts.count_2nd_story > 0) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Total downspouts: {formData.gutters.downspouts.count_1st_story + formData.gutters.downspouts.count_2nd_story}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSubmit} disabled={readOnly}>
        Save Worksheet
      </Button>
    </div>
  );
};