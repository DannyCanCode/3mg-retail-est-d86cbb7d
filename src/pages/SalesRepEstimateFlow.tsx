import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  Sparkles,
  Rocket,
  Zap,
  Eye,
  ArrowRight,
  Loader2,
  AlertCircle,
  Building,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Home,
  Calculator,
  Trash2
} from 'lucide-react';
import { PdfUploader } from '@/components/upload/PdfUploader';
import { SimplifiedReviewTab } from '@/components/estimates/measurement/SimplifiedReviewTab';
import { JobWorksheetForm } from '@/components/estimates/JobWorksheetForm';
import { MaterialsSelectionTab } from '@/components/estimates/materials/MaterialsSelectionTab';
import { LaborProfitTab, LaborRates } from '@/components/estimates/pricing/LaborProfitTab';
import { SalesRepSummaryTab } from '@/components/estimates/pricing/SalesRepSummaryTab';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EstimateData {
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  customer_email: string;
  measurements: any;
  jobWorksheet: any;
  materials: any;
  quantities?: {[key: string]: number};
  laborRates?: LaborRates;
  profitMargin?: number;
  totalPrice: number;
  currentStep?: number; // Add currentStep to persist progress
  pdfUrl?: string | null; // Add pdfUrl to store the PDF URL
  pdfFileName?: string | null; // Add pdfFileName to store the PDF filename
  warrantyDetails?: any; // Store warranty details
  warrantyType?: string; // Store warranty type
  selectedPackage?: string; // Store selected package
}

const SalesRepEstimateFlow: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [estimateData, setEstimateData] = useLocalStorage<EstimateData>('salesRepEstimate', {
    customer_name: '',
    customer_address: '',
    customer_phone: '',
    customer_email: '',
    measurements: null,
    jobWorksheet: null,
    materials: {},
    quantities: {},
    laborRates: undefined,
    profitMargin: 30, // Fixed 30% for sales reps
    totalPrice: 0,
    currentStep: 0,
    pdfUrl: null,
    pdfFileName: null,
    warrantyDetails: null,
    warrantyType: '',
    selectedPackage: ''
  });
  const [currentStep, setCurrentStep] = useState(estimateData?.currentStep || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync current step to localStorage whenever it changes
  useEffect(() => {
    setEstimateData(prev => ({ ...prev, currentStep }));
  }, [currentStep]);

  // Separate effect for scrolling to avoid conflicts
  useEffect(() => {
    // Scroll to top whenever step changes - with slight delay for React rendering
    const scrollTimer = setTimeout(() => {
      // Try multiple scroll methods to ensure it works
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Scroll the container ref if it exists
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      
      // Also try to find and scroll any scrollable containers
      const mainContent = document.querySelector('main');
      if (mainContent) mainContent.scrollTop = 0;
      
      // Find any overflow containers
      const scrollableElements = document.querySelectorAll('.overflow-y-auto, .overflow-y-scroll, [style*="overflow"]');
      scrollableElements.forEach(el => {
        (el as HTMLElement).scrollTop = 0;
      });

      // Force focus to top of page
      const firstFocusable = document.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus({ preventScroll: true });
        firstFocusable.blur();
      }
    }, 150);

    return () => clearTimeout(scrollTimer);
  }, [currentStep]);

  // Prevent UI flash on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      // setInitialLoad(false); // This line was removed
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Show loading state during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  const steps = [
    { id: 'upload', title: 'Upload PDF', icon: <Upload className="h-5 w-5" /> },
    { id: 'review', title: 'Review Measurements', icon: <Eye className="h-5 w-5" /> },
    { id: 'worksheet', title: 'Job Worksheet', icon: <FileText className="h-5 w-5" /> },
    { id: 'materials', title: 'Select Materials', icon: <Building className="h-5 w-5" /> },
    { id: 'labor', title: 'Labor & Profit', icon: <Calculator className="h-5 w-5" /> },
    { id: 'summary', title: 'Summary Review', icon: <CheckCircle2 className="h-5 w-5" /> }
  ];

  // Handle PDF upload success
  const handlePdfSuccess = (data: any, fileName: string, fileUrl?: string | null) => {
    // Extract property address from measurements if available
    const propertyAddress = data?.propertyAddress || '';
    // Note: We don't extract customer name from PDF because it shows who ordered the report,
    // not the actual homeowner
    
    setEstimateData(prev => ({ 
      ...prev, 
      measurements: data,
      customer_address: propertyAddress, // Auto-populate address from PDF
      // customer_name is NOT set here - user will enter it manually
      pdfUrl: fileUrl, // Store PDF URL for viewing
      pdfFileName: fileName // Store PDF filename
    }));
    setIsProcessing(true);
    
    // Auto-advance to review step
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep(1);
      toast({
        title: "PDF Processed Successfully! 🎉",
        description: "Review the extracted measurements.",
      });
    }, 2000);
  };

  // Handle review completion
  const handleReviewComplete = () => {
    setCurrentStep(2); // Go to Job Worksheet
    toast({
      title: "Measurements Confirmed ✓",
      description: "Please fill out the job worksheet.",
    });
  };

  // Handle job worksheet completion
  const handleWorksheetComplete = (worksheetData: any) => {
    setEstimateData(prev => ({ 
      ...prev, 
      jobWorksheet: worksheetData,
      customer_name: worksheetData.basic_info?.name || prev.customer_name,
      customer_address: worksheetData.basic_info?.address || prev.customer_address
    }));
    setCurrentStep(3); // Go to Materials
    toast({
      title: "Job Worksheet Complete 📋",
      description: "Materials auto-populated based on your selections.",
    });
  };

  // Handle materials selection completion
  const handleMaterialsComplete = (update: any) => {
    const totalPrice = Object.entries(update.selectedMaterials).reduce((sum, [id, material]: [string, any]) => {
      const quantity = update.quantities[id] || 0;
      return sum + (material.price * quantity);
    }, 0);
    
    setEstimateData(prev => ({ 
      ...prev, 
      materials: update.selectedMaterials,
      quantities: update.quantities,
      totalPrice,
      // Preserve warranty and package selections
      warrantyDetails: update.warrantyDetails,
      warrantyType: update.warrantyType,
      selectedPackage: update.selectedPackage
    }));
    // Don't auto-advance or submit - let user click continue
  };

  // Handle continuing from materials to labor & profit
  const handleMaterialsContinue = () => {
    setCurrentStep(4); // Go to Labor & Profit
  };

  // Handle labor & profit completion
  const handleLaborProfitComplete = (laborRates: LaborRates, profitMargin: number) => {
    // Merge the laborRates with gutters data from job worksheet
    const mergedLaborRates = {
      ...laborRates,
      // Ensure gutters data from job worksheet is preserved
      includeGutters: laborRates.includeGutters || estimateData.jobWorksheet?.gutters?.gutter_lf > 0 || false,
      gutterLinearFeet: laborRates.gutterLinearFeet || estimateData.jobWorksheet?.gutters?.gutter_lf || 0,
      includeDetachResetGutters: laborRates.includeDetachResetGutters || estimateData.jobWorksheet?.gutters?.detach_reset_gutters || false,
      detachResetGutterLinearFeet: laborRates.detachResetGutterLinearFeet || estimateData.jobWorksheet?.gutters?.detach_reset_gutter_lf || 0,
      includeDownspouts: laborRates.includeDownspouts || (estimateData.jobWorksheet?.gutters?.downspouts?.count > 0) || false,
      downspoutCount: laborRates.downspoutCount || estimateData.jobWorksheet?.gutters?.downspouts?.count || 0,
      // Preserve skylights data too
      includeSkylights2x2: laborRates.includeSkylights2x2 || estimateData.jobWorksheet?.accessories?.skylight?.count_2x2 > 0 || false,
      skylights2x2Count: laborRates.skylights2x2Count || estimateData.jobWorksheet?.accessories?.skylight?.count_2x2 || 0,
      includeSkylights2x4: laborRates.includeSkylights2x4 || estimateData.jobWorksheet?.accessories?.skylight?.count_2x4 > 0 || false,
      skylights2x4Count: laborRates.skylights2x4Count || estimateData.jobWorksheet?.accessories?.skylight?.count_2x4 || 0,
    };
    
    setEstimateData(prev => ({ 
      ...prev, 
      laborRates: mergedLaborRates,
      profitMargin 
    }));
    // Don't submit yet, go to summary review
    setCurrentStep(5); // Go to Summary Review
  };

  // Handle summary review completion
  const handleSummaryComplete = () => {
    submitEstimate();
  };

  // Navigation functions
  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Start fresh - clear all data and reset to beginning
  const startFresh = () => {
    // Clear localStorage
    localStorage.removeItem('salesRepEstimate');
    
    // Reset state to initial values
    setEstimateData({
      customer_name: '',
      customer_address: '',
      customer_phone: '',
      customer_email: '',
      measurements: null,
      jobWorksheet: null,
      materials: null,
      quantities: {},
      laborRates: undefined,
      profitMargin: 30,
      totalPrice: 0,
      currentStep: 0,
      pdfUrl: null,
      pdfFileName: null
    });
    
    // Reset to first step
    setCurrentStep(0);
    
    toast({
      title: "Starting Fresh! 🆕",
      description: "All data cleared. Ready for a new estimate.",
    });
  };

  // Submit estimate for manager approval
  const submitEstimate = async () => {
    setIsProcessing(true);
    
    try {
      // Create the estimate in Supabase
      const { data, error } = await supabase
        .from('estimates')
        .insert({
          customer_name: estimateData.customer_name,
          customer_address: estimateData.customer_address,
          customer_phone: estimateData.customer_phone,
          customer_email: estimateData.customer_email,
          measurements: estimateData.measurements || {},
          materials: estimateData.materials || {},
          quantities: estimateData.quantities || {},
          labor_rates: estimateData.laborRates ? JSON.parse(JSON.stringify(estimateData.laborRates)) : {},
          profit_margin: estimateData.profitMargin || 30,
          total_price: estimateData.totalPrice,
          status: 'pending',
          submission_status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: profile?.id,
          created_by: profile?.id,
          territory_id: profile?.territory_id,
          // @ts-ignore - job_worksheet field exists in database but types not updated yet
          job_worksheet: estimateData.jobWorksheet || {}
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Estimate Submitted! 🚀",
        description: "Your estimate has been sent for manager approval.",
      });
      
      // Clear local storage
      localStorage.removeItem('salesRepEstimate');
      
      // Navigate back to dashboard
      setTimeout(() => {
        navigate('/sales');
      }, 1500);
    } catch (error) {
      console.error('Error submitting estimate:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Animated background (same as Documents Library)
  const AnimatedBackground = () => (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/40 via-green-900/20 to-emerald-900/15" />
      
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-[1000px] h-[1000px] bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-emerald-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-green-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>
      
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${3 + Math.random() * 7}s`
          }}
        />
      ))}
      
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  );

  // Progress indicator
  const ProgressIndicator = () => (
    <div className="relative mb-12">
      <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-3xl blur-xl" />
      <div className="relative bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-green-700/30">
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => index <= currentStep && goToStep(index)}
                disabled={index > currentStep}
                className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full
                  ${index <= currentStep 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 cursor-pointer hover:scale-110' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }
                  transition-all duration-500
                `}
              >
                {index < currentStep ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  step.icon
                )}
                {index === currentStep && (
                  <div className="absolute inset-0 rounded-full animate-ping bg-green-500/30" />
                )}
              </button>
              
              {index < steps.length - 1 && (
                <div className={`
                  w-24 h-1 mx-2 rounded-full transition-all duration-500
                  ${index < currentStep 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                    : 'bg-gray-700'
                  }
                `} />
              )}
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            {steps[currentStep].title}
          </h3>
          <p className="text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>
    </div>
  );

  // Step content renderer
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Upload PDF
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-3xl blur-xl" />
            <Card className="relative bg-gray-800/30 backdrop-blur-xl border-green-600/20 p-8">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-500 to-cyan-500 p-6 shadow-xl mb-6">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-blue-500/20 to-purple-500/20 animate-pulse" />
                
                {/* Glass morphism overlay */}
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                
                {/* Content */}
                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center justify-center p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg mb-3">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">Upload EagleView PDF</h2>
                  <p className="text-white/80 text-sm">Drop your PDF here or click to browse</p>
                </div>
              </div>
              
              <PdfUploader 
                onDataExtracted={handlePdfSuccess}
              />
              
              {isProcessing && (
                <div className="mt-6 text-center">
                  <Loader2 className="h-8 w-8 text-green-400 animate-spin mx-auto mb-2" />
                  <p className="text-green-300/70">Processing your PDF with advanced algorithms...</p>
                </div>
              )}
            </Card>
          </div>
        );

      case 1: // Review Measurements
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-3xl blur-xl" />
            <Card className="relative bg-gray-800/50 backdrop-blur-xl border-green-700/30 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Eye className="h-6 w-6 text-green-400" />
                  Review Measurements
                </h2>
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Extracted
                </Badge>
              </div>
              
              <div className="mb-4">
                <Button
                  onClick={goBack}
                  variant="outline"
                  className="bg-gray-700/50 hover:bg-gray-700/70 text-green-400 border-green-600/30"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Upload
                </Button>
              </div>
              
              <SimplifiedReviewTab 
                measurements={estimateData.measurements}
                onMeasurementsUpdate={(updatedMeasurements) => {
                  setEstimateData(prev => ({ ...prev, measurements: updatedMeasurements }));
                }}
                onContinue={handleReviewComplete}
                pdfUrl={estimateData.pdfUrl}
                extractedFileName={estimateData.pdfFileName}
              />
            </Card>
          </div>
        );

      case 2: // Job Worksheet
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-3xl blur-xl" />
            <Card className="relative bg-gray-800/50 backdrop-blur-xl border-green-700/30 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FileText className="h-6 w-6 text-emerald-400" />
                  Job Worksheet Details
                </h2>
                <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                  <Zap className="h-3 w-3 mr-1" />
                  Auto-Populated
                </Badge>
              </div>
              
              <div className="mb-4">
                <Button
                  onClick={goBack}
                  variant="outline"
                  className="bg-gray-700/50 hover:bg-gray-700/70 text-green-400 border-green-600/30"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Review
                </Button>
              </div>
              
              <JobWorksheetForm
                measurements={estimateData.measurements}
                onSave={handleWorksheetComplete}
                initialData={{
                  ...estimateData.jobWorksheet,
                  basic_info: {
                    ...estimateData.jobWorksheet?.basic_info,
                    name: estimateData.customer_name || estimateData.jobWorksheet?.basic_info?.name || '',
                    address: estimateData.customer_address || ''
                  }
                }}
              />
            </Card>
          </div>
        );

      case 3: // Materials Selection
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-teal-600/20 rounded-3xl blur-xl" />
            <Card className="relative bg-gray-800/50 backdrop-blur-xl border-green-700/30 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Building className="h-6 w-6 text-green-400" />
                  Material Selection
                </h2>
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                  <Rocket className="h-3 w-3 mr-1" />
                  {estimateData.jobWorksheet?.shingle_roof?.manufacturer || 'GAF'} Premium Package
                </Badge>
              </div>
              
              <div className="mb-4">
                <Button
                  onClick={goBack}
                  variant="outline"
                  className="bg-gray-700/50 hover:bg-gray-700/70 text-green-400 border-green-600/30"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Worksheet
                </Button>
              </div>
              
              <MaterialsSelectionTab
                measurements={estimateData.measurements}
                onMaterialsUpdate={handleMaterialsComplete}
                readOnly={false}
                jobWorksheet={estimateData.jobWorksheet}
                selectedMaterials={estimateData.materials || {}}
                quantities={estimateData.quantities || {}}
              />
              
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleMaterialsContinue} 
                  disabled={!estimateData.materials || Object.keys(estimateData.materials).length === 0}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300"
                >
                  Continue to Labor & Profit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        );

      case 4: // Labor & Profit
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-3xl blur-xl" />
            <Card className="relative bg-gray-800/50 backdrop-blur-xl border-green-700/30 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Calculator className="h-6 w-6 text-green-400" />
                  Labor & Profit
                </h2>
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                  <Zap className="h-3 w-3 mr-1" />
                  Fixed 30% Margin
                </Badge>
              </div>
              
              <LaborProfitTab
                onBack={goBack}
                measurements={estimateData.measurements}
                selectedMaterials={estimateData.materials || {}}
                quantities={estimateData.quantities || {}}
                onLaborProfitContinue={handleLaborProfitComplete}
                initialLaborRates={estimateData.laborRates || {
                  laborRate: 85,
                  tearOff: 0,
                  installation: 0,
                  isHandload: false,
                  handloadRate: 10,
                  dumpsterLocation: "orlando",
                  dumpsterCount: 1,
                  dumpsterRate: 400,
                  includePermits: true,
                  permitRate: 450,
                  permitCount: 1,
                  permitAdditionalRate: 450,
                  pitchRates: {},
                  wastePercentage: 12,
                  // Sync gutters from job worksheet
                  includeGutters: estimateData.jobWorksheet?.gutters?.gutter_lf > 0 || false,
                  gutterLinearFeet: estimateData.jobWorksheet?.gutters?.gutter_lf || 0,
                  gutterRate: 8,
                  includeDetachResetGutters: estimateData.jobWorksheet?.gutters?.detach_reset_gutters || false,
                  detachResetGutterLinearFeet: estimateData.jobWorksheet?.gutters?.detach_reset_gutter_lf || 0,
                  detachResetGutterRate: 1,
                  includeDownspouts: (estimateData.jobWorksheet?.gutters?.downspouts?.count > 0) || false,
                  downspoutCount: estimateData.jobWorksheet?.gutters?.downspouts?.count || 0,
                  downspoutRate: 75,
                  // Sync skylights from job worksheet
                  includeSkylights2x2: estimateData.jobWorksheet?.accessories?.skylight?.count_2x2 > 0 || false,
                  skylights2x2Count: estimateData.jobWorksheet?.accessories?.skylight?.count_2x2 || 0,
                  skylights2x2Rate: 280,
                  includeSkylights2x4: estimateData.jobWorksheet?.accessories?.skylight?.count_2x4 > 0 || false,
                  skylights2x4Count: estimateData.jobWorksheet?.accessories?.skylight?.count_2x4 || 0,
                  skylights2x4Rate: 370,
                  includeLowSlopeLabor: true,
                  includeSteepSlopeLabor: true
                }}
                initialProfitMargin={30} // Fixed 30% for sales reps
                readOnly={false}
              />
            </Card>
          </div>
        );

      case 5: // Summary Review
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-3xl blur-xl" />
            <Card className="relative bg-gray-800/50 backdrop-blur-xl border-green-700/30 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                  Summary Review
                </h2>
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Final Check
                </Badge>
              </div>
              
              <div className="mb-4">
                <Button
                  onClick={goBack}
                  variant="outline"
                  className="bg-gray-700/50 hover:bg-gray-700/70 text-green-400 border-green-600/30"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Labor & Profit
                </Button>
              </div>
              
              <SalesRepSummaryTab
                measurements={estimateData.measurements}
                selectedMaterials={estimateData.materials || {}}
                quantities={estimateData.quantities || {}}
                laborRates={estimateData.laborRates || {
                  laborRate: 85,
                  tearOff: 0,
                  installation: 0,
                  isHandload: false,
                  handloadRate: 10,
                  dumpsterLocation: "orlando",
                  dumpsterCount: 1,
                  dumpsterRate: 400,
                  includePermits: true,
                  permitRate: 450,
                  permitCount: 1,
                  permitAdditionalRate: 450,
                  pitchRates: {},
                  wastePercentage: 12,
                  includeGutters: false,
                  gutterLinearFeet: 0,
                  gutterRate: 8,
                  includeDownspouts: false,
                  downspoutCount: 0,
                  downspoutRate: 75,
                  includeDetachResetGutters: false,
                  detachResetGutterLinearFeet: 0,
                  detachResetGutterRate: 1,
                  includeSkylights2x2: false,
                  skylights2x2Count: 0,
                  skylights2x2Rate: 280,
                  includeSkylights2x4: false,
                  skylights2x4Count: 0,
                  skylights2x4Rate: 370,
                  includeLowSlopeLabor: true,
                  includeSteepSlopeLabor: true
                }}
                profitMargin={estimateData.profitMargin || 30}
                jobWorksheet={estimateData.jobWorksheet}
                customerInfo={{
                  name: estimateData.customer_name,
                  address: estimateData.customer_address,
                  phone: estimateData.customer_phone,
                  email: estimateData.customer_email
                }}
                onBack={goBack}
                onSubmit={handleSummaryComplete}
                isSubmitting={isProcessing}
              />
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="relative min-h-screen bg-gray-900 text-white">
      <AnimatedBackground />
      
      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Button 
              onClick={() => navigate('/sales')}
              variant="outline"
              className="bg-green-950/40 backdrop-blur-sm border-green-800/50 text-green-300 hover:bg-green-900/50 hover:text-white hover:border-green-700 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Command Center
            </Button>
            
            <Button
              onClick={startFresh}
              variant="outline"
              className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border-red-600/30 hover:border-red-600/50 transition-all"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Start Fresh
            </Button>
          </div>
          
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-500 to-cyan-500 p-8 shadow-2xl mb-8">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-blue-500/20 to-purple-500/20 animate-pulse" />
            
            {/* Glass morphism overlay */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
            
            {/* Content */}
            <div className="relative z-10 text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                3MG Estimator
              </h1>
              <p className="text-xl text-white/90 font-medium">
                Professional Roofing Estimate Generation
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator />

        {/* Step Content */}
        <div className="animate-in fade-in duration-500">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default SalesRepEstimateFlow; 