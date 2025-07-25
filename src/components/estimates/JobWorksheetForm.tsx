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
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';
import { Wind } from 'lucide-react';
import { Package } from 'lucide-react';
import { useRoleAccess } from '@/components/RoleGuard';
import { useAuth } from '@/contexts/AuthContext';

interface JobWorksheetData {
  basic_info: {
    name: string;
    address: string;
    email: string;
    phone: string;
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
    };
  };
  accessories: {
    skylight: {
      count_2x2: number;
      count_2x4: number;
    };
    solar_attic_fans: {
      kennedy_35w: number;
      attic_breeze_45w: number;
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
      count: number;
    };
    detach_reset_gutters: boolean;
    detach_reset_gutter_lf: number;
    leaf_guards: {
      install: boolean;
      linear_feet: number;
    };
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
  const { profile } = useAuth();
  const userRole = profile?.role;
  
  // Safety check: If we're in the sales rep flow, force rep role
  const location = window.location.pathname;
  const effectiveUserRole = location.includes('/sales-estimate') ? 'rep' : userRole;
  
  const [formData, setFormData] = useState<JobWorksheetData>({
    basic_info: {
      name: '',
      address: '',
      email: '',
      phone: '',
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
        ...initialData?.ventilation?.off_ridge_vents
      }
    },
    accessories: {
      skylight: {
        count_2x2: 0,
        count_2x4: 0,
        ...initialData?.accessories?.skylight
      },
      solar_attic_fans: {
        kennedy_35w: 0,
        attic_breeze_45w: 0,
        ...initialData?.accessories?.solar_attic_fans
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
        count: 0,
        ...initialData?.gutters?.downspouts
      },
      detach_reset_gutters: false,
      detach_reset_gutter_lf: 0,
      leaf_guards: {
        install: false,
        linear_feet: 0,
        ...initialData?.gutters?.leaf_guards
      },
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

  const { isSalesRep } = useRoleAccess();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Homeowner Info</TabsTrigger>
          <TabsTrigger value="ventilation">Ventilation</TabsTrigger>
          <TabsTrigger value="skylights">Accessories</TabsTrigger>
          <TabsTrigger value="gutters">Gutters</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Homeowner Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.basic_info.address}
                  onChange={(e) => updateField('basic_info', 'address', e.target.value)}
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.basic_info.email}
                  onChange={(e) => updateField('basic_info', 'email', e.target.value)}
                  disabled={readOnly}
                  placeholder="homeowner@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.basic_info.phone}
                  onChange={(e) => {
                    // Format phone number as user types
                    const cleaned = e.target.value.replace(/\D/g, '');
                    let formatted = cleaned;
                    if (cleaned.length >= 6) {
                      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
                    } else if (cleaned.length >= 3) {
                      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
                    }
                    updateField('basic_info', 'phone', formatted);
                  }}
                  disabled={readOnly}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
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
            <CardContent className="space-y-6">
              {/* 3-Column Layout for Better Organization */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1: Goosenecks */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Goosenecks</h4>
                  <div className="space-y-3">
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
                  </div>
                </div>

                {/* Column 2: Boots */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Boots</h4>
                  <div className="space-y-3">
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
                </div>

                {/* Column 3: Ridge Vents & Off Ridge Vents */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Ridge & Off Ridge Vents</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="ridgeVentLF">Ridge Vent (Linear Feet)</Label>
                      <Input
                        id="ridgeVentLF"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={formData.ventilation.ridge_vents_lf || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          updateField('ventilation', 'ridge_vents_lf', parseInt(value) || 0);
                        }}
                        onFocus={(e) => {
                          e.target.select();
                        }}
                        placeholder="Enter linear feet"
                        disabled={readOnly}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Linear feet of ridge that needs ridge vent coverage
                      </div>
                    </div>
                    <div>
                      <Label>2ft Off Ridge Vents (Lomanco 750D Vent)</Label>
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
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessories Tab */}
        <TabsContent value="skylights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Accessories
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
                  Install 2X2 Skylights {effectiveUserRole !== 'rep' && '($280 per unit)'}
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
                  Install 2X4 Skylights {effectiveUserRole !== 'rep' && '($370 per unit)'}
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

              {/* Solar Attic Fans Section */}
              <div className="pt-6 border-t">
                <h4 className="text-lg font-semibold mb-4">Solar Attic Fans</h4>
                
                {/* Kennedy 35W Solar Fan */}
                <div className="flex items-center space-x-4">
                  <Checkbox
                    id="kennedySolarFan35w"
                    checked={formData.accessories.solar_attic_fans.kennedy_35w > 0}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        updateField('accessories', 'solar_attic_fans', { ...formData.accessories.solar_attic_fans, kennedy_35w: 0 });
                      } else {
                        updateField('accessories', 'solar_attic_fans', { ...formData.accessories.solar_attic_fans, kennedy_35w: 1 });
                      }
                    }}
                    disabled={readOnly}
                  />
                  <Label htmlFor="kennedySolarFan35w" className="flex-1">
                    Kennedy Roof Mount Solar Attic Fan - 35W {effectiveUserRole !== 'rep' && '($550.00 per unit)'}
                  </Label>
                  {formData.accessories.solar_attic_fans.kennedy_35w > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Quantity:</Label>
                      <Select
                        value={formData.accessories.solar_attic_fans.kennedy_35w?.toString() || "1"}
                        onValueChange={(value) => updateField('accessories', 'solar_attic_fans', { ...formData.accessories.solar_attic_fans, kennedy_35w: parseInt(value) || 0 })}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map(num => (
                            <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Attic Breeze 45W Solar Fan */}
                <div className="flex items-center space-x-4 mt-4">
                  <Checkbox
                    id="atticBreezeSolarFan45w"
                    checked={formData.accessories.solar_attic_fans.attic_breeze_45w > 0}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        updateField('accessories', 'solar_attic_fans', { ...formData.accessories.solar_attic_fans, attic_breeze_45w: 0 });
                      } else {
                        updateField('accessories', 'solar_attic_fans', { ...formData.accessories.solar_attic_fans, attic_breeze_45w: 1 });
                      }
                    }}
                    disabled={readOnly}
                  />
                  <Label htmlFor="atticBreezeSolarFan45w" className="flex-1">
                    Attic Breeze Self Flashed Solar Attic Fan - 45W {effectiveUserRole !== 'rep' && '($725.00 per unit)'}
                  </Label>
                  {formData.accessories.solar_attic_fans.attic_breeze_45w > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Quantity:</Label>
                      <Select
                        value={formData.accessories.solar_attic_fans.attic_breeze_45w?.toString() || "1"}
                        onValueChange={(value) => updateField('accessories', 'solar_attic_fans', { ...formData.accessories.solar_attic_fans, attic_breeze_45w: parseInt(value) || 0 })}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map(num => (
                            <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
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
            <CardContent className="space-y-6">
              {/* Install Gutters */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Install 6" Aluminum Seamless Gutters</div>
                    {effectiveUserRole !== 'rep' && <div className="text-sm text-muted-foreground">$8 per linear foot</div>}
                  </div>
                  <Switch
                    id="installGutters"
                    checked={formData.gutters.existing_gutters || formData.gutters.gutter_lf > 0}
                    onCheckedChange={(checked) => {
                      updateField('gutters', 'existing_gutters', checked);
                      if (!checked) {
                        updateField('gutters', 'gutter_lf', 0);
                      }
                    }}
                    disabled={readOnly}
                  />
                </div>
                
                {(formData.gutters.existing_gutters || formData.gutters.gutter_lf > 0) && (
                  <div className="mt-3 flex items-center gap-4">
                    <Label className="text-sm">Linear Feet:</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.gutters.gutter_lf || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        updateField('gutters', 'gutter_lf', parseInt(value) || 0);
                      }}
                      onFocus={(e) => {
                        // Select all text on focus for easy replacement
                        e.target.select();
                      }}
                      placeholder="Enter linear feet"
                      disabled={readOnly}
                      className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                )}
              </div>



              {/* Detach and Reset Gutters */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Detach and Reset Gutters</div>
                    {effectiveUserRole !== 'rep' && <div className="text-sm text-muted-foreground">$1 per linear foot</div>}
                  </div>
                  <Switch
                    id="detachResetGutters"
                    checked={formData.gutters.detach_reset_gutters || false}
                    onCheckedChange={(checked) => {
                      updateField('gutters', 'detach_reset_gutters', checked);
                      if (!checked) {
                        updateField('gutters', 'detach_reset_gutter_lf', 0);
                      }
                    }}
                    disabled={readOnly}
                  />
                </div>

                {formData.gutters.detach_reset_gutters && (
                  <div className="mt-3 flex items-center gap-4">
                    <Label className="text-sm">Linear Feet:</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.gutters.detach_reset_gutter_lf || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        updateField('gutters', 'detach_reset_gutter_lf', parseInt(value) || 0);
                      }}
                      onFocus={(e) => {
                        // Select all text on focus for easy replacement
                        e.target.select();
                      }}
                      placeholder="Enter linear feet"
                      disabled={readOnly}
                      className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                )}
              </div>

              {/* Downspouts */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Install Downspouts</div>
                    {effectiveUserRole !== 'rep' && <div className="text-sm text-muted-foreground">$75 each</div>}
                  </div>
                  <Switch
                    id="includeDownspouts"
                    checked={formData.gutters.photos || formData.gutters.downspouts.count > 0}
                    onCheckedChange={(checked) => {
                      updateField('gutters', 'photos', checked);
                      if (!checked) {
                        updateField('gutters', 'downspouts', { ...formData.gutters.downspouts, count: 0 });
                      }
                    }}
                    disabled={readOnly}
                  />
                </div>
                
                {(formData.gutters.photos || formData.gutters.downspouts.count > 0) && (
                  <div className="mt-3 flex items-center gap-4">
                    <Label className="text-sm">Quantity:</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.gutters.downspouts.count || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        updateField('gutters', 'downspouts', { ...formData.gutters.downspouts, count: parseInt(value) || 0 });
                      }}
                      onFocus={(e) => {
                        // Select all text on focus for easy replacement
                        e.target.select();
                      }}
                      placeholder="Enter quantity"
                      disabled={readOnly}
                      className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                )}
              </div>

              {/* Gutter Leaf Guards */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Gutter Leaf Guards</div>
                    {effectiveUserRole !== 'rep' && <div className="text-sm text-muted-foreground">$7 per linear foot</div>}
                  </div>
                  <Switch
                    id="installLeafGuards"
                    checked={formData.gutters.leaf_guards.install}
                    onCheckedChange={(checked) => {
                      updateField('gutters', 'leaf_guards', { ...formData.gutters.leaf_guards, install: checked });
                      if (!checked) {
                        updateField('gutters', 'leaf_guards', { ...formData.gutters.leaf_guards, linear_feet: 0 });
                      }
                    }}
                    disabled={readOnly}
                  />
                </div>
                
                {formData.gutters.leaf_guards.install && (
                  <div className="mt-3 flex items-center gap-4">
                    <Label className="text-sm">Linear Feet:</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.gutters.leaf_guards.linear_feet || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        updateField('gutters', 'leaf_guards', { ...formData.gutters.leaf_guards, linear_feet: parseInt(value) || 0 });
                      }}
                      onFocus={(e) => {
                        // Select all text on focus for easy replacement
                        e.target.select();
                      }}
                      placeholder="Enter linear feet"
                      disabled={readOnly}
                      className="w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
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