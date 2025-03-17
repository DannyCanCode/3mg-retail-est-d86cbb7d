import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { CalculatorIcon, ClipboardCheckIcon, ClipboardListIcon, HardHatIcon, DollarSignIcon, Upload } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { MeasurementForm } from "@/components/estimates/MeasurementForm";
import { MeasurementValues } from "@/components/estimates/measurement/types";
import { ParsedMeasurements } from "@/api/measurements";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { AreaByPitch } from "../components/estimates/measurement/types";

// Create the SidebarNav component
interface SidebarNavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  value: string;
  disabled?: boolean;
}

interface SidebarNavProps {
  items: SidebarNavItem[];
  activeItem: string;
  onSelect: (value: string) => void;
}

const SidebarNav = ({ items, activeItem, onSelect }: SidebarNavProps) => {
  return (
    <nav className="flex flex-col space-y-1">
      {items.map((item) => (
        <Button
          key={item.value}
          variant={activeItem === item.value ? "default" : "ghost"}
          size="sm"
          className={cn(
            "justify-start w-full text-left px-3 py-2",
            item.disabled ? "opacity-50 cursor-not-allowed" : ""
          )}
          onClick={() => !item.disabled && onSelect(item.value)}
          disabled={item.disabled}
        >
          <div className="flex items-center">
            {item.icon && <div className="mr-2">{item.icon}</div>}
            {item.title}
          </div>
        </Button>
      ))}
    </nav>
  );
};

// Create simplified MaterialsForm component
const MaterialsForm = ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Select Materials</h3>
      <p className="text-sm text-muted-foreground">
        Choose the materials for your roofing project.
      </p>
      <div className="space-y-4">
        {/* Placeholder for materials selection form fields */}
        <div className="h-40 rounded-md border border-dashed flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Materials selection form would go here</p>
        </div>
      </div>
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
};

// Create simplified LaborProfitForm component
const LaborProfitForm = ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Labor and Profit</h3>
      <p className="text-sm text-muted-foreground">
        Set labor rates and profit margins for this estimate.
      </p>
      <div className="space-y-4">
        {/* Placeholder for labor and profit form fields */}
        <div className="h-40 rounded-md border border-dashed flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Labor and profit settings would go here</p>
        </div>
      </div>
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
};

// Create simplified SummaryForm component
const SummaryForm = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Estimate Summary</h3>
      <p className="text-sm text-muted-foreground">
        Review your complete estimate details.
      </p>
      <div className="space-y-4">
        {/* Placeholder for summary details */}
        <div className="h-40 rounded-md border border-dashed flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Estimate summary would be displayed here</p>
        </div>
      </div>
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button variant="default">Save Estimate</Button>
      </div>
    </div>
  );
};

// Create simplified ManageFiles component
const ManageFiles = () => {
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-lg font-medium mb-2">Recent Files</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Your recently uploaded files will appear here.
      </p>
      <div className="h-40 rounded-md border border-dashed flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No recent files</p>
      </div>
    </div>
  );
};

export default function Estimates() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upload");
  const [measurements, setMeasurements] = useState<MeasurementValues | null>(null);
  const [parsedPdfData, setParsedPdfData] = useState<ParsedMeasurements | null>(null);
  const [hasPdfData, setHasPdfData] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [measurementsProcessed, setMeasurementsProcessed] = useState(false);

  const sidebarNavItems = [
    {
      title: "Upload",
      href: "#",
      icon: <Upload className="h-4 w-4" />,
      value: "upload",
    },
    {
      title: "Measurements",
      href: "#",
      icon: <CalculatorIcon className="h-4 w-4" />,
      value: "measurements",
      disabled: !hasPdfData,
    },
    {
      title: "Materials",
      href: "#",
      icon: <ClipboardListIcon className="h-4 w-4" />,
      value: "materials",
    },
    {
      title: "Labor & Profit",
      href: "#",
      icon: <HardHatIcon className="h-4 w-4" />,
      value: "labor-profit",
    },
    {
      title: "Summary",
      href: "#",
      icon: <ClipboardCheckIcon className="h-4 w-4" />,
      value: "summary",
    },
  ];

  const form = useForm<any>({
    defaultValues: {},
  });

  const onSubmit = (data: any) => {
    console.log(data);
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  };

  // Reset the entire workflow
  const handleResetWorkflow = () => {
    setParsedPdfData(null);
    setHasPdfData(false);
    setPdfFileName(null);
    setMeasurements(null);
    setActiveTab("upload");
  };

  // Store parsed PDF data and set state to indicate we have data
  const handlePdfParsed = (data: ParsedMeasurements, fileName: string) => {
    console.log("PDF successfully parsed:", data);
    setParsedPdfData(data);
    setHasPdfData(true);
    setPdfFileName(fileName);
    setMeasurementsProcessed(false);
    
    // Debug log to check areasByPitch data
    console.log("PDF areasByPitch data:", data.measurements?.areasByPitch);
    
    // Immediately process the data to be ready for the measurements form
    processParsedPdfData(data);
  };
  
  // Process the parsed PDF data into the format needed for the measurement form
  const processParsedPdfData = (data: ParsedMeasurements) => {
    if (!data || !data.measurements) {
      console.warn("No valid measurement data found in the PDF");
      return;
    }
    
    // Process the areasByPitch data from the PDF to ensure it's in the correct format
    let formattedAreasByPitch: AreaByPitch[] = [];
    
    if (data.measurements.areasByPitch && Object.keys(data.measurements.areasByPitch).length > 0) {
      console.log("Raw areasByPitch data:", data.measurements.areasByPitch);
      
      // Transform the object format to array format required by the RoofAreaTab
      formattedAreasByPitch = Object.entries(data.measurements.areasByPitch).map(([pitch, area]) => {
        // Round the area to 2 decimal places to avoid excessive digits
        const roundedArea = Math.round(Number(area) * 100) / 100;
        
        // Calculate percentage of total roof area
        const totalArea = data.measurements.totalArea || 0;
        const percentage = totalArea > 0 ? (roundedArea / totalArea) * 100 : 0;
        
        return {
          pitch,
          area: roundedArea,
          percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
        };
      });
      
      console.log("Formatted areasByPitch with rounded values:", formattedAreasByPitch);
    } else {
      console.warn("No areasByPitch data found in the parsed PDF");
      
      // If we have a predominant pitch but no areas by pitch data, create a default entry
      if (data.measurements.predominantPitch && data.measurements.totalArea) {
        formattedAreasByPitch = [{
          pitch: data.measurements.predominantPitch,
          area: Math.round(data.measurements.totalArea * 100) / 100, // Round to 2 decimal places
          percentage: 100
        }];
        console.log("Created default areasByPitch entry:", formattedAreasByPitch);
      }
    }

    // Set state for measurement values - ensure all numeric values are properly rounded
    const measurementValues: MeasurementValues = {
      totalArea: Math.round((data.measurements.totalArea || 0) * 100) / 100,
      ridgeLength: Math.round((data.measurements.ridgeLength || 0) * 100) / 100,
      hipLength: Math.round((data.measurements.hipLength || 0) * 100) / 100,
      valleyLength: Math.round((data.measurements.valleyLength || 0) * 100) / 100,
      rakeLength: Math.round((data.measurements.rakeLength || 0) * 100) / 100,
      eaveLength: Math.round((data.measurements.eaveLength || 0) * 100) / 100,
      roofPitch: data.measurements.predominantPitch || "",
      areasByPitch: formattedAreasByPitch,
      stepFlashingLength: Math.round((data.measurements.stepFlashingLength || 0) * 100) / 100,
      flashingLength: Math.round((data.measurements.flashingLength || 0) * 100) / 100,
      penetrationsArea: Math.round((data.measurements.penetrationsArea || 0) * 100) / 100,
    };
    
    setMeasurements(measurementValues);
    setMeasurementsProcessed(true);

    // Save the measurementValues to localStorage for persistence
    localStorage.setItem("measurementValues", JSON.stringify(measurementValues));
    
    console.log("Measurements processed and ready:", measurementValues);
  };

  // Effect to auto-navigate to measurements tab when data is ready
  useEffect(() => {
    if (measurementsProcessed && hasPdfData && parsedPdfData) {
      // After measurements are processed, automatically navigate to measurements tab
      console.log("Auto-navigating to measurements tab with processed data");
      setActiveTab("measurements");
    }
  }, [measurementsProcessed, hasPdfData, parsedPdfData]);

  // Prepare data for the measurement form and switch to measurements tab
  const handleGoToMeasurements = () => {
    console.log("Navigating to measurements", { parsedPdfData, hasPdfData, measurements });
    
    if (!parsedPdfData) {
      toast({
        title: "Error",
        description: "Please upload a PDF first",
        variant: "destructive",
      });
      return;
    }

    // If we don't have measurements yet, process the PDF data now
    if (!measurements && parsedPdfData) {
      processParsedPdfData(parsedPdfData);
    }
    
    // Navigate to measurements tab
    setActiveTab("measurements");
  };

  // Handle tab changes separately from active tab state to preserve state when navigating
  const handleTabChange = (value: string) => {
    console.log(`Tab change requested: ${activeTab} -> ${value}`);
    
    // Special case for navigating to measurements tab
    if (value === "measurements") {
      // If we have parsed PDF data but no measurements yet, convert the data
      if (parsedPdfData && !measurements) {
        handleGoToMeasurements();
        return;
      }
      
      // If measurements tab is disabled, don't navigate
      if (!hasPdfData) {
        console.log("Measurements tab is disabled, not navigating");
        toast({
          title: "Upload an EagleView PDF first",
          description: "Please upload an EagleView PDF to access the measurements tab.",
          variant: "default",
        });
        return;
      }
    }
    
    // Allow jumping between tabs
    setActiveTab(value);
  };

  return (
    <MainLayout>
      <div className="hidden space-y-6 pb-16 md:block">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Estimates</h2>
          <p className="text-muted-foreground">
            Create a new estimate by uploading measurements or entering them manually.
          </p>
        </div>
        <Separator className="my-6" />
      </div>

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-8 lg:space-y-0">
        <aside className="lg:w-1/5">
          <SidebarNav items={sidebarNavItems} activeItem={activeTab} onSelect={handleTabChange} />
        </aside>
        <div className="flex-1 lg:max-w-4xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="space-y-4"
              >
                <TabsList className="w-full">
                  {sidebarNavItems.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className={cn(
                        "flex-1",
                        item.disabled ? "cursor-not-allowed opacity-50" : ""
                      )}
                      disabled={item.disabled}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {item.icon}
                        <span>{item.title}</span>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollArea className="h-full max-h-[calc(100vh-250px)] overflow-auto rounded-md border p-8">
                  <TabsContent value="upload" className="space-y-4">
                    <h3 className="text-lg font-medium">Upload Measurements</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a PDF file containing the measurements for your estimate.
                    </p>
                    <p className="text-sm font-medium">Supported file types</p>
                    <div className="flex gap-2">
                      <div className="rounded bg-muted px-2 py-1 text-xs">PDF</div>
                    </div>
                    
                    {hasPdfData && (
                      <div className="my-4 rounded-md bg-green-50 p-4">
                        <p className="text-sm font-medium text-green-800">
                          Successfully processed: {pdfFileName}
                        </p>
                        <div className="mt-3 flex space-x-4">
                          <Button
                            type="button"
                            variant="default"
                            onClick={handleGoToMeasurements}
                          >
                            Continue to Measurements
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetWorkflow}
                          >
                            Start Fresh
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <PdfUploader onPdfParsed={handlePdfParsed} />
                  </TabsContent>
                  <TabsContent value="measurements" className="space-y-4">
                    <h3 className="text-lg font-medium">Measurements</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter or edit the measurements for your estimate.
                    </p>
                    {/* Pass the processed measurements to the MeasurementForm */}
                    <MeasurementForm 
                      initialValues={measurements}
                      onComplete={() => setActiveTab("materials")}
                    />
                  </TabsContent>
                  <TabsContent value="materials" className="space-y-4">
                    <MaterialsForm
                      onBack={() => setActiveTab("measurements")}
                      onNext={() => setActiveTab("labor-profit")}
                    />
                  </TabsContent>
                  <TabsContent value="labor-profit" className="space-y-4">
                    <LaborProfitForm
                      onBack={() => setActiveTab("materials")}
                      onNext={() => setActiveTab("summary")}
                    />
                  </TabsContent>
                  <TabsContent value="summary" className="space-y-4">
                    <SummaryForm
                      onBack={() => setActiveTab("labor-profit")}
                    />
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </form>
          </Form>
        </div>
        <aside className="hidden lg:block lg:w-1/4">
          <ManageFiles />
        </aside>
      </div>
    </MainLayout>
  );
} 