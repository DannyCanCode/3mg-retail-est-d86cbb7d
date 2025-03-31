import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Eye, Building, Download } from "lucide-react";
import { format } from "date-fns";
import { getMeasurements } from "@/api/measurements";
import { MeasurementValues } from "@/components/estimates/measurement/types";
import { useNavigate, useLocation } from "react-router-dom";

interface Measurement {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  reportDate: string;
  totalArea: number;
  areasByPitch: Array<{
    pitch: string;
    area: number;
  }>;
  ridgeLength: number;
  hipLength: number;
  valleyLength: number;
  eaveLength: number;
  rakeLength: number;
  eagleViewReportId?: string;
  createdAt: string;
  updatedAt: string;
}

const MeasurementsPage = () => {
  const { toast } = useToast();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchMeasurements();
  }, []);

  useEffect(() => {
    fetchMeasurements();
  }, [location]);

  const fetchMeasurements = async () => {
    setLoading(true);
    try {
      const { data, error } = await getMeasurements();
      if (error) throw error;
      
      // Sort measurements by date, newest first
      const sortedMeasurements = (data || []).sort((a, b) => 
        new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
      );
      
      // Transform data to match our component's expected format
      const formattedMeasurements = sortedMeasurements.map(item => {
        // Extract measurement data safely
        const measurements = item.measurements || {};
        
        // Try to extract address from raw_text if not already available
        let address = item.address || "Unknown Address";
        
        // Check if we have raw_text that might contain propertyAddress
        if (!address || address === "Unknown Address") {
          try {
            if (item.raw_text) {
              const rawData = JSON.parse(item.raw_text);
              if (rawData.propertyAddress) {
                address = rawData.propertyAddress;
              }
            }
          } catch (e) {
            console.log("Could not parse raw_text for address:", e);
          }
        }
        
        // Extract areas by pitch data properly
        let areasByPitchArray = [];
        try {
          // First try to parse from areas_per_pitch if it exists
          if (item.areas_per_pitch) {
            // If it's a string, parse it as JSON
            const areasData = typeof item.areas_per_pitch === 'string' 
              ? JSON.parse(item.areas_per_pitch)
              : item.areas_per_pitch;
              
            // Convert from object format to array format expected by the component
            areasByPitchArray = Object.entries(areasData).map(([pitch, data]) => {
              const areaValue = typeof data === 'object' ? (data as any).area : data;
              return {
                pitch: pitch,
                area: Number(areaValue) || 0
              };
            });
          } 
          // If no areas found in areas_per_pitch, try raw_text
          else if (item.raw_text) {
            const rawData = JSON.parse(item.raw_text);
            if (rawData.areasByPitch && Array.isArray(rawData.areasByPitch)) {
              areasByPitchArray = rawData.areasByPitch;
            }
          }
        } catch (e) {
          console.log("Error parsing pitch data:", e);
          areasByPitchArray = [];
        }
        
        // Build formatted measurement object with safe fallbacks
        return {
          id: item.id || "",
          address: address,
          city: item.city || "",
          state: item.state || "",
          zipCode: item.zip_code || "",
          reportDate: item.report_date || item.created_at || new Date().toISOString(),
          totalArea: item.total_area || measurements.totalArea || 0,
          areasByPitch: areasByPitchArray,
          ridgeLength: item.ridges || measurements.ridgeLength || 0,
          hipLength: item.hips || measurements.hipLength || 0,
          valleyLength: item.valleys || measurements.valleyLength || 0,
          eaveLength: item.eaves || measurements.eaveLength || 0,
          rakeLength: item.rakes || measurements.rakeLength || 0,
          eagleViewReportId: item.eagleview_report_id,
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || item.created_at || new Date().toISOString()
        };
      });
      
      setMeasurements(formattedMeasurements);
      
      // Select the first measurement by default if available
      if (formattedMeasurements.length > 0) {
        setSelectedMeasurement(formattedMeasurements[0]);
      }
    } catch (error) {
      console.error("Failed to fetch measurements:", error);
      toast({
        title: "Error",
        description: "Failed to load measurements data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return "Invalid date";
    }
  };

  const calculateTotalSquares = (area: number) => {
    return (area / 100).toFixed(1);
  };

  const createEstimateFromMeasurement = (measurement: Measurement) => {
    // Navigate to the estimates page with the measurement ID as a query parameter
    navigate(`/estimates?measurementId=${measurement.id}`);
    
    toast({
      title: "Creating Estimate",
      description: `Creating new estimate for ${measurement.address}`,
    });
  };

  const downloadMeasurementData = (measurement: Measurement) => {
    // Create a JSON blob and download it
    const measurementData = JSON.stringify(measurement, null, 2);
    const blob = new Blob([measurementData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `measurement-${measurement.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Measurement data downloaded successfully",
    });
  };

  // Helper to render pitch areas table
  const renderPitchAreas = (areasByPitch: Array<{pitch: string; area: number}>) => {
    if (!areasByPitch || areasByPitch.length === 0) {
      return <p className="text-muted-foreground text-sm">No pitch data available</p>;
    }

    return (
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left py-2 px-4">Pitch</th>
              <th className="text-right py-2 px-4">Area (sq ft)</th>
              <th className="text-right py-2 px-4">Squares</th>
            </tr>
          </thead>
          <tbody>
            {areasByPitch.map((area, index) => (
              <tr key={index} className={index < areasByPitch.length - 1 ? "border-b" : ""}>
                <td className="py-2 px-4">{area.pitch}</td>
                <td className="text-right py-2 px-4">{area.area.toFixed(2)}</td>
                <td className="text-right py-2 px-4">{calculateTotalSquares(area.area)}</td>
              </tr>
            ))}
            <tr className="border-t bg-muted/30">
              <td className="py-2 px-4 font-semibold">Total</td>
              <td className="text-right py-2 px-4 font-semibold">
                {areasByPitch.reduce((sum, item) => sum + item.area, 0).toFixed(2)}
              </td>
              <td className="text-right py-2 px-4 font-semibold">
                {calculateTotalSquares(areasByPitch.reduce((sum, item) => sum + item.area, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Helper to render lengths table
  const renderLengths = (measurement: Measurement) => {
    const lengths = [
      { name: "Ridge", value: measurement.ridgeLength },
      { name: "Hip", value: measurement.hipLength },
      { name: "Valley", value: measurement.valleyLength },
      { name: "Eave", value: measurement.eaveLength },
      { name: "Rake", value: measurement.rakeLength }
    ];

    return (
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left py-2 px-4">Type</th>
              <th className="text-right py-2 px-4">Length (ft)</th>
            </tr>
          </thead>
          <tbody>
            {lengths.map((length, index) => (
              <tr key={index} className={index < lengths.length - 1 ? "border-b" : ""}>
                <td className="py-2 px-4">{length.name}</td>
                <td className="text-right py-2 px-4">{length.value.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Measurements</h1>
            <p className="text-muted-foreground mt-1">
              View and manage roof measurements from EagleView reports
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Measurements list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Properties</h2>
              <Badge variant="outline">{measurements.length} Reports</Badge>
            </div>
            
            {loading ? (
              <div className="flex justify-center p-8">
                <p>Loading measurements...</p>
              </div>
            ) : measurements.length === 0 ? (
              <Card className="border border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <p className="text-muted-foreground mb-4">No measurements found</p>
                  <p className="text-sm text-center">Upload EagleView reports through the Dashboard to generate measurements</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {measurements.map((measurement) => (
                    <Card 
                      key={measurement.id} 
                      className={`cursor-pointer hover:bg-accent/5 ${
                        selectedMeasurement?.id === measurement.id ? "border-primary bg-accent/10" : ""
                      }`}
                      onClick={() => setSelectedMeasurement(measurement)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1 truncate">
                            <CardTitle className="text-lg truncate">{measurement.address}</CardTitle>
                            <CardDescription className="truncate">
                              {[measurement.city, measurement.state, measurement.zipCode].filter(Boolean).join(", ")}
                            </CardDescription>
                          </div>
                          {measurement.eagleViewReportId && (
                            <Badge variant="secondary" className="ml-2 whitespace-nowrap">
                              EagleView
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Area:</span>
                          <span>{calculateTotalSquares(measurement.totalArea)} squares</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pitches:</span>
                          <span>{measurement.areasByPitch?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Created:</span>
                          <span>{formatDate(measurement.createdAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          {/* Measurement details */}
          <div className="lg:col-span-2">
            {selectedMeasurement ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{selectedMeasurement.address}</CardTitle>
                      <CardDescription>
                        {[selectedMeasurement.city, selectedMeasurement.state, selectedMeasurement.zipCode].filter(Boolean).join(", ")}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadMeasurementData(selectedMeasurement)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => createEstimateFromMeasurement(selectedMeasurement)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create Estimate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="pitches">
                    <TabsList>
                      <TabsTrigger value="pitches">Pitches & Areas</TabsTrigger>
                      <TabsTrigger value="lengths">Roof Lengths</TabsTrigger>
                      <TabsTrigger value="details">Property Details</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="pitches" className="space-y-6 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="border rounded-md p-4 bg-card">
                          <h3 className="text-sm font-medium mb-2">Total Roof Area</h3>
                          <p className="text-2xl font-bold">{calculateTotalSquares(selectedMeasurement.totalArea)} squares</p>
                          <p className="text-sm text-muted-foreground">({selectedMeasurement.totalArea.toFixed(2)} sq ft)</p>
                        </div>
                        <div className="border rounded-md p-4 bg-card">
                          <h3 className="text-sm font-medium mb-2">Number of Pitches</h3>
                          <p className="text-2xl font-bold">{selectedMeasurement.areasByPitch?.length || 0}</p>
                          <p className="text-sm text-muted-foreground">Pitch-specific measurements</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Areas by Pitch</h3>
                        {renderPitchAreas(selectedMeasurement.areasByPitch || [])}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="lengths" className="space-y-6 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="border rounded-md p-4 bg-card">
                          <h3 className="text-sm font-medium mb-2">Ridge Length</h3>
                          <p className="text-2xl font-bold">{selectedMeasurement.ridgeLength.toFixed(1)} ft</p>
                        </div>
                        <div className="border rounded-md p-4 bg-card">
                          <h3 className="text-sm font-medium mb-2">Hip Length</h3>
                          <p className="text-2xl font-bold">{selectedMeasurement.hipLength.toFixed(1)} ft</p>
                        </div>
                        <div className="border rounded-md p-4 bg-card">
                          <h3 className="text-sm font-medium mb-2">Valley Length</h3>
                          <p className="text-2xl font-bold">{selectedMeasurement.valleyLength.toFixed(1)} ft</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="border rounded-md p-4 bg-card">
                          <h3 className="text-sm font-medium mb-2">Eave Length</h3>
                          <p className="text-2xl font-bold">{selectedMeasurement.eaveLength.toFixed(1)} ft</p>
                        </div>
                        <div className="border rounded-md p-4 bg-card">
                          <h3 className="text-sm font-medium mb-2">Rake Length</h3>
                          <p className="text-2xl font-bold">{selectedMeasurement.rakeLength.toFixed(1)} ft</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">All Lengths</h3>
                        {renderLengths(selectedMeasurement)}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="details" className="space-y-6 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="border rounded-md p-4 bg-card">
                            <h3 className="text-sm font-medium mb-2">Property Address</h3>
                            <p className="text-base">{selectedMeasurement.address}</p>
                            <p className="text-sm">
                              {[selectedMeasurement.city, selectedMeasurement.state, selectedMeasurement.zipCode].filter(Boolean).join(", ")}
                            </p>
                          </div>
                          
                          {selectedMeasurement.eagleViewReportId && (
                            <div className="border rounded-md p-4 bg-card">
                              <h3 className="text-sm font-medium mb-2">EagleView Report</h3>
                              <div className="flex justify-between items-center">
                                <p className="text-sm">Report ID: {selectedMeasurement.eagleViewReportId}</p>
                                <Badge>EagleView</Badge>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          <div className="border rounded-md p-4 bg-card">
                            <h3 className="text-sm font-medium mb-2">Report Dates</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Report Date</p>
                                <p className="text-sm">{formatDate(selectedMeasurement.reportDate)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Created</p>
                                <p className="text-sm">{formatDate(selectedMeasurement.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border rounded-md p-4 bg-card">
                            <h3 className="text-sm font-medium mb-2">Actions</h3>
                            <div className="flex flex-col space-y-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => createEstimateFromMeasurement(selectedMeasurement)}
                                className="justify-start"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Create New Estimate
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => downloadMeasurementData(selectedMeasurement)}
                                className="justify-start"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export Measurement Data
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <Building className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">Select a property to view measurements</p>
                  <p className="text-sm text-center text-muted-foreground">
                    Measurement data includes pitch areas, roof lengths, and property details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MeasurementsPage; 