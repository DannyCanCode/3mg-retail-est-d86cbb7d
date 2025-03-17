import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { CalculatorIcon, ClipboardCheckIcon, ClipboardListIcon, Upload } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PdfUploader } from "@/components/upload/PdfUploader";
import { MeasurementForm } from "@/components/estimates/MeasurementForm";
import { MeasurementValues } from "@/components/estimates/measurement/types";
import { ParsedMeasurements } from "@/api/measurements";
import { cn } from "@/lib/utils";

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

// Create simplified AdditionalDetailsForm component
const AdditionalDetailsForm = ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Additional Details</h3>
      <p className="text-sm text-muted-foreground">
        Add any additional information needed for this estimate.
      </p>
      <div className="space-y-4">
        {/* Placeholder for additional details form fields */}
        <div className="h-40 rounded-md border border-dashed flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Additional details form fields would go here</p>
        </div>
      </div>
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
};

// Create simplified InsightsForm component
const InsightsForm = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Insights</h3>
      <p className="text-sm text-muted-foreground">
        View and analyze the estimate data.
      </p>
      <div className="h-40 rounded-md border border-dashed flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Insights would be displayed here</p>
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
      title: "Additional Details",
      href: "#",
      icon: <ClipboardListIcon className="h-4 w-4" />,
      value: "details",
    },
    {
      title: "Insights",
      href: "#",
      icon: <ClipboardCheckIcon className="h-4 w-4" />,
      value: "insights",
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
  };

  // Prepare data for the measurement form and switch to measurements tab
  const handleGoToMeasurements = () => {
    if (!parsedPdfData) return;

    console.log("Converting parsed PDF data to measurement values:", parsedPdfData);

    // Create measurement values from parsed PDF data
    const measurementValues: MeasurementValues = {
      totalArea: parsedPdfData.totalArea || 0,
      // Ensure areasByPitch is properly formatted for MeasurementForm
      areasByPitch: (() => {
        // First check if we have areasPerPitch in the parsed data (this is the new format)
        if (parsedPdfData.areasPerPitch && Object.keys(parsedPdfData.areasPerPitch).length > 0) {
          console.log("Using areasPerPitch data:", parsedPdfData.areasPerPitch);
          return Object.entries(parsedPdfData.areasPerPitch).map(([pitch, data]: [string, any]) => ({
            pitch,
            area: typeof data === 'object' ? (data.area || 0) : Number(data) || 0,
            percentage: typeof data === 'object' ? (data.percentage || 0) : 0
          }));
        }
        
        // Next check if areasByPitch is an array (this is an intermediate format)
        if (Array.isArray(parsedPdfData.areasByPitch)) {
          console.log("Using areasByPitch array data:", parsedPdfData.areasByPitch);
          return parsedPdfData.areasByPitch.map((area: any) => ({
            pitch: area.pitch || area.pitchValue || "6:12",
            area: area.area || 0,
            percentage: area.percentage || 0
          }));
        }
        
        // Finally, handle the case where areasByPitch is an object (the most common format)
        if (parsedPdfData.areasByPitch && typeof parsedPdfData.areasByPitch === 'object') {
          console.log("Using areasByPitch object data:", parsedPdfData.areasByPitch);
          const totalArea = parsedPdfData.totalArea || 
            Object.values(parsedPdfData.areasByPitch).reduce((sum, a) => sum + Number(a), 0);
            
          return Object.entries(parsedPdfData.areasByPitch).map(([pitch, area]) => {
            const areaValue = Number(area);
            const percentage = totalArea > 0 ? Math.round((areaValue / totalArea) * 100) : 0;
            return {
              pitch,
              area: areaValue,
              percentage
            };
          });
        }
        
        // If no areas by pitch data found, create a default entry
        return [{
          pitch: parsedPdfData.predominantPitch || "6:12",
          area: parsedPdfData.totalArea || 0,
          percentage: 100
        }];
      })(),
      ridgeLength: parsedPdfData.ridgeLength || 0,
      hipLength: parsedPdfData.hipLength || 0,
      valleyLength: parsedPdfData.valleyLength || 0,
      rakeLength: parsedPdfData.rakeLength || 0,
      eaveLength: parsedPdfData.eaveLength || 0,
      stepFlashingLength: parsedPdfData.stepFlashingLength || 0,
      flashingLength: parsedPdfData.flashingLength || 0,
      penetrationsArea: parsedPdfData.penetrationsArea || 0,
      roofPitch: parsedPdfData.predominantPitch || "6:12"
    };

    console.log("Created measurement values:", measurementValues);
    setMeasurements(measurementValues);
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
    
    // Allow jumping between tabs as long as we have PDF data
    if (hasPdfData || value === "upload") {
      setActiveTab(value);
    } else {
      // If trying to navigate elsewhere without PDF data, warn the user
      toast({
        title: "Upload an EagleView PDF first",
        description: "Please upload an EagleView PDF before proceeding.",
        variant: "default",
      });
    }
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
                      onComplete={() => setActiveTab("details")}
                    />
                  </TabsContent>
                  <TabsContent value="details" className="space-y-4">
                    <AdditionalDetailsForm
                      onBack={() => setActiveTab("measurements")}
                      onNext={() => setActiveTab("insights")}
                    />
                  </TabsContent>
                  <TabsContent value="insights" className="space-y-4">
                    <InsightsForm />
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