import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Copy, Edit, Trash, Check, X, ChevronRight, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

// Import the API functions (we'll create these later)
import { getPricingTemplates, createPricingTemplate, updatePricingTemplate, deletePricingTemplate } from "@/api/pricing-templates";
// Import our utility to create the updated default template
import { createDefaultTemplate } from "@/utils/create-default-template";

// Import the material and labor types
import { Material, MaterialCategory } from "@/components/estimates/materials/types";
import { LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { ROOFING_MATERIALS } from "@/components/estimates/materials/data";

// Template type definition
interface PricingTemplate {
  id?: string;
  name: string;
  description: string;
  materials: {[key: string]: Material};
  quantities: {[key: string]: number};
  labor_rates: LaborRates;
  profit_margin: number;
  created_at?: string;
  updated_at?: string;
  is_default?: boolean;
}

// Material Editor component for editing material properties in a template
const MaterialEditor = ({ 
  materials, 
  quantities, 
  onUpdate 
}: { 
  materials: {[key: string]: Material}, 
  quantities: {[key: string]: number},
  onUpdate: (materials: {[key: string]: Material}, quantities: {[key: string]: number}) => void
}) => {
  const [editedMaterials, setEditedMaterials] = useState<{[key: string]: Material}>(materials);
  const [editedQuantities, setEditedQuantities] = useState<{[key: string]: number}>(quantities);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  useEffect(() => {
    // Initialize with all categories expanded
    const categories = new Set<string>();
    Object.values(materials).forEach(material => {
      categories.add(material.category);
    });
    setExpandedCategories(Array.from(categories));
  }, [materials]);
  
  // Update materials in parent component
  useEffect(() => {
    onUpdate(editedMaterials, editedQuantities);
  }, [editedMaterials, editedQuantities, onUpdate]);
  
  // Handle updating a material price
  const handlePriceChange = (materialId: string, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;
    
    setEditedMaterials(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        price: price
      }
    }));
  };
  
  // Handle updating a material quantity
  const handleQuantityChange = (materialId: string, newQuantity: string) => {
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity)) return;
    
    setEditedQuantities(prev => ({
      ...prev,
      [materialId]: quantity
    }));
  };
  
  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  // Group materials by category
  const materialsByCategory: {[category: string]: Material[]} = {};
  Object.values(editedMaterials).forEach(material => {
    if (!materialsByCategory[material.category]) {
      materialsByCategory[material.category] = [];
    }
    materialsByCategory[material.category].push(material);
  });
  
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Edit material prices and quantities</p>
      
      {Object.entries(materialsByCategory).map(([category, materials]) => (
        <div key={category} className="border rounded-md overflow-hidden">
          <div 
            className="bg-muted p-2 flex justify-between items-center cursor-pointer"
            onClick={() => toggleCategory(category)}
          >
            <h3 className="text-sm font-medium">{category} ({materials.length})</h3>
            <Button variant="ghost" size="sm">
              {expandedCategories.includes(category) ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {expandedCategories.includes(category) && (
            <div className="p-3 space-y-3">
              {materials.map(material => (
                <div 
                  key={material.id} 
                  className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-2 border-b last:border-0"
                >
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-sm font-medium">{material.name}</p>
                    <p className="text-xs text-muted-foreground">{material.coverageRule.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`price-${material.id}`} className="w-12 text-xs">Price:</Label>
                    <Input
                      id={`price-${material.id}`}
                      className="h-8"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedMaterials[material.id]?.price || 0}
                      onChange={(e) => handlePriceChange(material.id, e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`quantity-${material.id}`} className="w-12 text-xs">Qty:</Label>
                    <Input
                      id={`quantity-${material.id}`}
                      className="h-8"
                      type="number"
                      min="0"
                      value={editedQuantities[material.id] || 0}
                      onChange={(e) => handleQuantityChange(material.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const Pricing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State for templates
  const [templates, setTemplates] = useState<PricingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<PricingTemplate | null>(null);
  const [creatingUpdatedTemplate, setCreatingUpdatedTemplate] = useState(false);
  
  // State for dialog operations
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<PricingTemplate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PricingTemplate | null>(null);
  
  // Add this state for material editing
  const [editedMaterials, setEditedMaterials] = useState<{[key: string]: Material}>({});
  const [editedQuantities, setEditedQuantities] = useState<{[key: string]: number}>({});
  
  // Load templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  // Create default template if none exists
  useEffect(() => {
    if (!loading && templates.length === 0) {
      createDefaultTemplate();
    }
  }, [loading, templates]);
  
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await getPricingTemplates();
      if (error) throw error;
      
      setTemplates(data || []);
      
      // Set first template as selected if there are templates
      if (data && data.length > 0) {
        setSelectedTemplate(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const createDefaultTemplate = async () => {
    // Create a default template with the current materials and pricing logic
    const defaultTemplate: PricingTemplate = {
      name: "Standard GAF Package",
      description: "Default pricing template with comprehensive GAF materials and standard labor rates",
      materials: {},
      quantities: {},
      labor_rates: {
        laborRate: 85,
        isHandload: false,
        handloadRate: 15,
        dumpsterLocation: "orlando",
        dumpsterCount: 1,
        dumpsterRate: 400,
        includePermits: true,
        permitRate: 550,
        pitchRates: {},
        wastePercentage: 12
      },
      profit_margin: 25,
      is_default: true
    };
    
    // Comprehensive list of materials by category from current estimation workflow
    const materialsByCategory = {
      // Shingles category
      shingles: [
        "gaf-timberline-hdz", 
        "gaf-timberline-hdz-sg",
        "gaf-seal-a-ridge", 
        "gaf-prostart-starter-shingle-strip",
        "oc-oakridge",
        "oc-duration",
        "oc-hip-ridge",
        "oc-starter"
      ],
      // Underlayments category
      underlayments: [
        "abc-pro-guard-20",
        "gaf-weatherwatch-ice-water-shield", 
        "gaf-feltbuster-synthetic-underlayment",
        "maxfelt-nc",
        "rhino-synthetic",
        "poly-glass-irxe",
        "rhino-g-ps",
        "polyglass-elastoflex-sbs",
        "polyglass-polyflex-app"
      ],
      // Ventilation category
      ventilation: [
        "gaf-cobra-ridge-vent",
        "gaf-cobra-rigid-vent",
        "galvanized-steel-off-ridge-vent"
      ],
      // Metal components
      metal: [
        "drip-edge-26ga",
        "millennium-galvanized-drip-edge",
        "millennium-galvanized-rake-edge",
        "millennium-galvanized-wall-flashing",
        "millennium-galvanized-step-flashing",
        "millennium-galvanized-counter-flashing",
        "millennium-galvanized-valley-metal",
        "aluminum-eave-drip-edge",
        "valley-metal-26ga"
      ],
      // Low slope materials
      lowSlope: [
        "gaf-poly-iso-4x8"
      ],
      // Accessories
      accessories: [
        "nails-roofing-1.75in",
        "gaf-tigerguard-starter",
        "black-roof-mastic",
        "synthetic-oil-caulk",
        "silver-ultraflash-aluminum-caulk",
        "lumber-2x4-8ft",
        "lumber-2x6-8ft",
        "lumber-2x8-8ft"
      ]
    };
    
    // Add all materials to the template with appropriate quantities
    Object.entries(materialsByCategory).forEach(([category, materialIds]) => {
      console.log(`Adding ${materialIds.length} materials from category ${category}`);
      
      materialIds.forEach(id => {
        const material = ROOFING_MATERIALS.find(m => m.id === id);
        if (material) {
          defaultTemplate.materials[id] = material;
          
          // Set sensible default quantities based on material type and category
          let defaultQuantity = 1;
          
          // Adjust quantities for common material types based on coverage rules
          if (material.coverageRule.description.includes("Bundle")) {
            defaultQuantity = 3; // Most shingle bundles come in threes for a square
          } else if (material.unit === "Roll" && material.coverageRule.description.includes("Squares/Roll")) {
            defaultQuantity = 1; // Default for rolls
          } else if (material.id.includes("flashing") || material.id.includes("drip-edge")) {
            defaultQuantity = 5; // Common number of metal pieces
          } else if (material.category === MaterialCategory.VENTILATION) {
            defaultQuantity = 2; // Ventilation items
          } else if (material.category === MaterialCategory.ACCESSORIES) {
            defaultQuantity = material.id.includes("nail") ? 5 : 2; // Nails vs. other accessories
          }
          
          defaultTemplate.quantities[id] = defaultQuantity;
        } else {
          console.warn(`Material ${id} not found in ROOFING_MATERIALS`);
        }
      });
    });
    
    try {
      const { data, error } = await createPricingTemplate(defaultTemplate);
      if (error) throw error;
      
      setTemplates([data]);
      setSelectedTemplate(data);
      
      toast({
        title: "Success",
        description: "Default template created successfully",
      });
    } catch (error) {
      console.error("Failed to create default template:", error);
      toast({
        title: "Error",
        description: "Failed to create default template",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteClick = (template: PricingTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    
    try {
      const { error } = await deletePricingTemplate(templateToDelete.id!);
      if (error) throw error;
      
      setTemplates(templates.filter(t => t.id !== templateToDelete.id));
      
      // If the deleted template was selected, select another one
      if (selectedTemplate?.id === templateToDelete.id) {
        setSelectedTemplate(templates.find(t => t.id !== templateToDelete.id) || null);
      }
      
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };
  
  const handleEditClick = (template: PricingTemplate) => {
    setEditingTemplate({...template});
    setEditedMaterials({...template.materials});
    setEditedQuantities({...template.quantities});
    setIsEditDialogOpen(true);
  };
  
  const handleEditSave = async () => {
    if (!editingTemplate) return;
    
    // Include the edited materials and quantities
    const updatedTemplate = {
      ...editingTemplate,
      materials: editedMaterials,
      quantities: editedQuantities
    };
    
    try {
      const { data, error } = await updatePricingTemplate(updatedTemplate);
      if (error) throw error;
      
      // Update templates list
      setTemplates(templates.map(t => t.id === editingTemplate.id ? data : t));
      
      // Update selected template if it was the one edited
      if (selectedTemplate?.id === editingTemplate.id) {
        setSelectedTemplate(data);
      }
      
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    } catch (error) {
      console.error("Failed to update template:", error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      });
    } finally {
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      setEditedMaterials({});
      setEditedQuantities({});
    }
  };
  
  const handleDuplicateClick = async (template: PricingTemplate) => {
    // Create a deep copy of the template to ensure all nested objects are duplicated
    const duplicatedTemplate: PricingTemplate = {
      ...JSON.parse(JSON.stringify(template)), // Deep copy to avoid reference issues
      name: `${template.name} (Copy)`,
      is_default: false,
    };
    
    // Remove the id to create a new record
    delete duplicatedTemplate.id;
    
    try {
      toast({
        title: "Duplicating...",
        description: "Creating template copy...",
      });
      
      const { data, error } = await createPricingTemplate(duplicatedTemplate);
      if (error) throw error;
      
      setTemplates([...templates, data]);
      setSelectedTemplate(data);
      
      toast({
        title: "Success",
        description: `Template "${template.name}" duplicated successfully. You can now edit the copy.`,
      });
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate template. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleCreateNew = () => {
    // Initialize with default values for a new template
    const newTemplate: PricingTemplate = {
      name: "New Template",
      description: "Custom pricing template",
      materials: {},
      quantities: {},
      labor_rates: {
        laborRate: 85,
        isHandload: false,
        handloadRate: 15,
        dumpsterLocation: "orlando",
        dumpsterCount: 1,
        dumpsterRate: 400,
        includePermits: true,
        permitRate: 550,
        pitchRates: {},
        wastePercentage: 12
      },
      profit_margin: 25
    };
    
    setEditingTemplate(newTemplate);
    setEditedMaterials({});
    setEditedQuantities({});
    setIsEditDialogOpen(true);
  };
  
  // Add handleMaterialsUpdate function
  const handleMaterialsUpdate = (materials: {[key: string]: Material}, quantities: {[key: string]: number}) => {
    setEditedMaterials(materials);
    setEditedQuantities(quantities);
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };
  
  const renderMaterialsList = (materials: {[key: string]: Material}, quantities: {[key: string]: number}) => {
    const materialCount = Object.keys(materials).length;
    
    if (materialCount === 0) {
      return <p className="text-muted-foreground italic">No materials selected</p>;
    }
    
    // Group materials by category
    const categorizedMaterials: {[key: string]: Material[]} = {};
    
    Object.values(materials).forEach(material => {
      if (!categorizedMaterials[material.category]) {
        categorizedMaterials[material.category] = [];
      }
      categorizedMaterials[material.category].push(material);
    });
    
    return (
      <div className="space-y-6">
        {Object.entries(categorizedMaterials).map(([category, categoryMaterials]) => (
          <div key={category} className="space-y-2">
            <h4 className="font-medium text-sm">{category}</h4>
            <div className="space-y-3">
              {categoryMaterials.map(material => (
                <div key={material.id} className="flex flex-col border rounded-md p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">{material.name}</h5>
                    <Badge variant="outline">
                      Qty: {quantities[material.id] || 0}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Pricing:</p>
                      <p className="text-sm">
                        ${material.price} per {material.unit}
                        {material.approxPerSquare && (
                          <span className="text-muted-foreground ml-1">
                            (≈${material.approxPerSquare}/square)
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Coverage Rule:</p>
                      <p className="text-sm">{material.coverageRule.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Calculation: {material.coverageRule.calculation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderLaborRates = (laborRates: LaborRates, profitMargin: number) => {
    return (
      <div className="space-y-6">
        <div className="border rounded-md p-4 bg-card">
          <h4 className="text-sm font-medium mb-3">Standard Labor Rates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Base Labor Rate:</p>
              <p className="text-sm font-semibold">${laborRates.laborRate}/square</p>
              <p className="text-xs text-muted-foreground mt-1">
                Combined rate for tear off and installation (3/12-7/12 pitches)
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Waste Percentage:</p>
              <p className="text-sm font-semibold">{laborRates.wastePercentage}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Added to material and labor calculations
              </p>
            </div>
          </div>
        </div>
        
        <div className="border rounded-md p-4 bg-card">
          <h4 className="text-sm font-medium mb-3">Pitch-Based Pricing</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Low Slope (0/12-2/12):</p>
              <p className="text-sm font-semibold">$75/square</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Standard (3/12-7/12):</p>
              <p className="text-sm font-semibold">${laborRates.laborRate}/square</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Steep (8/12+):</p>
              <p className="text-sm font-semibold">$90-$140/square</p>
              <p className="text-xs text-muted-foreground mt-1">
                Increases $5 for each pitch increase
              </p>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-muted-foreground">
            <p className="font-medium">Pitch Rate Formula:</p>
            <ul className="list-disc list-inside mt-1">
              <li>8/12 pitch: $90/square</li>
              <li>9/12 pitch: $95/square</li>
              <li>10/12 pitch: $100/square</li>
              <li>And so on...</li>
            </ul>
          </div>
        </div>
        
        <div className="border rounded-md p-4 bg-card">
          <h4 className="text-sm font-medium mb-3">Additional Labor Costs</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Handload:</p>
              <p className="text-sm font-semibold">
                {laborRates.isHandload 
                  ? `$${laborRates.handloadRate}/square` 
                  : "Not included by default"}
              </p>
              {laborRates.isHandload && (
                <p className="text-xs text-muted-foreground mt-1">
                  Additional to labor tear off and installation
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Dumpsters:</p>
              <p className="text-sm font-semibold">
                ${laborRates.dumpsterRate} per dumpster
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {laborRates.dumpsterLocation === "orlando" 
                  ? "Orlando rate" 
                  : "Outside Orlando rate"}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Permits:</p>
              <p className="text-sm font-semibold">
                {laborRates.includePermits 
                  ? `$${laborRates.permitRate}` 
                  : "Not included"}
              </p>
              {laborRates.includePermits && (
                <p className="text-xs text-muted-foreground mt-1">
                  {laborRates.dumpsterLocation === "orlando" 
                    ? "Orlando permit rate" 
                    : "Outside Orlando permit rate"}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Special Materials Labor:</p>
              <p className="text-sm">
                <span className="font-semibold">GAF Poly ISO (0/12 pitch):</span> $60/square
              </p>
              <p className="text-sm">
                <span className="font-semibold">Polyglass (1/12-2/12 pitch):</span> $100/square
              </p>
            </div>
          </div>
        </div>
        
        <div className="border rounded-md p-4 bg-card">
          <h4 className="text-sm font-medium mb-3">Profit & Margins</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Profit Margin:</p>
              <p className="text-sm font-semibold">{profitMargin}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Applied to total cost of materials and labor
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Application:</p>
              <p className="text-xs text-muted-foreground mt-1">
                Formula: Total Price = (Material Cost + Labor Cost) × (1 + Profit Margin/100)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Add a placeholder function for using the template in estimates
  const handleUseInEstimate = (template: PricingTemplate) => {
    toast({
      title: "Coming Soon",
      description: "Using pricing templates in estimates will be available in a future update.",
    });
  };
  
  const handleCreateUpdatedTemplate = async () => {
    setCreatingUpdatedTemplate(true);
    
    try {
      const { data, error } = await createDefaultTemplate();
      
      if (error) {
        toast({
          title: "Error",
          description: `Failed to create updated template: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Updated template with new materials created successfully!",
          variant: "default",
        });
        
        // Refresh the templates to show the new one
        fetchTemplates();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to create updated template: ${message}`,
        variant: "destructive",
      });
    } finally {
      setCreatingUpdatedTemplate(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Pricing Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage pricing templates for estimates
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCreateUpdatedTemplate} 
              disabled={creatingUpdatedTemplate}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {creatingUpdatedTemplate ? "Creating..." : "Create Updated Template"}
            </Button>
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>New Template</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates list */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold">Templates</h2>
            
            {loading ? (
              <div className="flex justify-center p-8">
                <p>Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <Card className="border border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <p className="text-muted-foreground mb-4">No templates found</p>
                  <Button onClick={createDefaultTemplate}>Create Default Template</Button>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {templates.map(template => (
                    <Card 
                      key={template.id} 
                      className={cn(
                        "cursor-pointer hover:bg-accent/5",
                        selectedTemplate?.id === template.id && "border-primary bg-accent/10"
                      )}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Materials:</span>
                            <span>{Object.keys(template.materials).length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Labor Rate:</span>
                            <span>${template.labor_rates.laborRate}/sq</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Profit Margin:</span>
                            <span>{template.profit_margin}%</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          Updated: {formatDate(template.updated_at)}
                        </span>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(template);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateClick(template);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!template.is_default && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(template);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          {/* Template details */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <CardDescription>{selectedTemplate.description}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditClick(selectedTemplate)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUseInEstimate(selectedTemplate)}
                      >
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Use in Estimate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="materials">
                    <TabsList>
                      <TabsTrigger value="materials">Materials</TabsTrigger>
                      <TabsTrigger value="labor">Labor & Profit</TabsTrigger>
                    </TabsList>
                    <TabsContent value="materials" className="space-y-6 mt-4">
                      {renderMaterialsList(selectedTemplate.materials, selectedTemplate.quantities)}
                    </TabsContent>
                    <TabsContent value="labor" className="mt-4">
                      {renderLaborRates(selectedTemplate.labor_rates, selectedTemplate.profit_margin)}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <p className="text-muted-foreground mb-4">Select a template to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit/Create Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              Update the template details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Details</TabsTrigger>
              <TabsTrigger value="advanced" disabled={!editingTemplate?.id}>Materials & Coverage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input 
                  id="name" 
                  value={editingTemplate?.name || ""} 
                  onChange={(e) => setEditingTemplate(prev => prev ? {...prev, name: e.target.value} : null)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  value={editingTemplate?.description || ""} 
                  onChange={(e) => setEditingTemplate(prev => prev ? {...prev, description: e.target.value} : null)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="profitMargin">Profit Margin (%)</Label>
                <Input 
                  id="profitMargin" 
                  type="number" 
                  min="0"
                  max="100"
                  value={editingTemplate?.profit_margin || 25} 
                  onChange={(e) => setEditingTemplate(prev => prev ? {...prev, profit_margin: Number(e.target.value)} : null)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Labor Rate (per square)</Label>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={editingTemplate?.labor_rates.laborRate || 85} 
                  onChange={(e) => setEditingTemplate(prev => prev ? {
                    ...prev, 
                    labor_rates: {
                      ...prev.labor_rates,
                      laborRate: Number(e.target.value)
                    }
                  } : null)} 
                />
              </div>
              
              <p className="text-sm text-muted-foreground">
                Note: For new templates, save first to enable materials editing.
              </p>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 py-4">
              <div className="text-sm mb-4">
                <p className="font-medium">Materials & Coverage Rules</p>
                <p className="text-muted-foreground">Edit material details and coverage rules for this template.</p>
              </div>
              
              {editingTemplate && Object.keys(editingTemplate.materials).length > 0 ? (
                <MaterialEditor 
                  materials={editedMaterials}
                  quantities={editedQuantities}
                  onUpdate={handleMaterialsUpdate}
                />
              ) : (
                <p className="text-sm text-blue-600 mb-4">
                  No materials in this template. Add materials or duplicate an existing template.
                </p>
              )}
              
              <div className="border rounded-md p-4">
                <p className="text-sm font-medium mb-2">Advanced Labor Settings</p>
                
                <div className="space-y-2 mb-4">
                  <Label>Waste Percentage (%)</Label>
                  <Input 
                    type="number" 
                    min="0"
                    max="100"
                    step="0.5"
                    value={editingTemplate?.labor_rates.wastePercentage || 12} 
                    onChange={(e) => setEditingTemplate(prev => prev ? {
                      ...prev, 
                      labor_rates: {
                        ...prev.labor_rates,
                        wastePercentage: Number(e.target.value)
                      }
                    } : null)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Handload Rate (per square)</Label>
                  <Input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={editingTemplate?.labor_rates.handloadRate || 15} 
                    onChange={(e) => setEditingTemplate(prev => prev ? {
                      ...prev, 
                      labor_rates: {
                        ...prev.labor_rates,
                        handloadRate: Number(e.target.value)
                      }
                    } : null)} 
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Pricing; 