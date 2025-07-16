import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

// Import the API functions and the unified type
import { 
  getPricingTemplates, 
  createPricingTemplate, 
  updatePricingTemplate, 
  deletePricingTemplate,
  PricingTemplate // Import the type
} from "@/api/pricing-templates";
// Import our utility to create the updated default template
import { createDefaultTemplate } from "@/utils/create-default-template";

// Import the material and labor types
import { Material, MaterialCategory } from "@/components/estimates/materials/types";
import { LaborRates } from "@/components/estimates/pricing/LaborProfitTab";
import { ROOFING_MATERIALS } from "@/components/estimates/materials/data";

// Material Editor component for editing material properties in a template
const MaterialEditor = ({ 
  materials, 
  quantities, 
  onUpdate,
  readOnly = false
}: { 
  materials: {[key: string]: Material}, 
  quantities: {[key: string]: number},
  onUpdate: (materials: {[key: string]: Material}, quantities: {[key: string]: number}) => void,
  readOnly?: boolean
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
                      disabled={readOnly}
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
                      disabled={readOnly}
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
  const { profile } = useAuth();
  const isManager = profile?.role === 'manager';
  
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
    const duplicatedTemplate: Omit<PricingTemplate, "id" | "created_at" | "updated_at"> = {
      ...JSON.parse(JSON.stringify(template)), // Deep copy to avoid reference issues
      name: `${template.name} (Copy)`,
      is_default: false,
    };
    
    // Remove the id to create a new record
    delete (duplicatedTemplate as any).id;
    
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
    const newTemplate: Omit<PricingTemplate, "id" | "created_at" | "updated_at"> = {
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
        permitCount: 1,
        permitAdditionalRate: 450,
        pitchRates: {},
        wastePercentage: 12
      },
      profit_margin: 25,
      is_default: false,
    };
    
    // Create a complete temporary template object for the editing state
    const tempEditingTemplate: PricingTemplate = {
      ...newTemplate,
      id: `new-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setEditingTemplate(tempEditingTemplate);
    setEditedMaterials(tempEditingTemplate.materials);
    setEditedQuantities(tempEditingTemplate.quantities);
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
                  ? "Central Florida rate" 
                  : "Outside Central Florida rate"}
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
                    ? "Central Florida permit rate" 
                    : "Outside Central Florida permit rate"}
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
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Pricing Templates (Work in Progress)</h1>
      <p className="text-muted-foreground">This page is being refactored. Functionality will return once migration is complete.</p>
    </div>
  );
};

export default Pricing; 