import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Estimate } from '@/api/estimates';
import { MetricCard } from '@/components/ui/MetricCard';
import { Plus, FileText, Clock, CheckCircle2, XCircle, Package, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GAFPackageSelector } from '@/components/estimates/packages/GAFPackageSelector';
import { useNavigate } from 'react-router-dom';

interface Territory {
  id: string;
  name: string;
}

const SalesRepDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<'gaf1' | 'gaf2' | undefined>();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.territory_id) {
      fetchData();
    }
  }, [profile?.territory_id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMyEstimates(),
      fetchTerritory()
    ]);
    setLoading(false);
  };

  const fetchMyEstimates = async () => {
    const { data, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('created_by', profile!.id) // Only show estimates created by this sales rep
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Type assertion to handle the Json to Record conversion
      const typedEstimates = data.map(estimate => ({
        ...estimate,
        materials: typeof estimate.materials === 'string' ? JSON.parse(estimate.materials) : (estimate.materials || {}),
        quantities: typeof estimate.quantities === 'string' ? JSON.parse(estimate.quantities) : (estimate.quantities || {}),
        labor_rates: typeof estimate.labor_rates === 'string' ? JSON.parse(estimate.labor_rates) : (estimate.labor_rates || {}),
        measurements: typeof estimate.measurements === 'string' ? JSON.parse(estimate.measurements) : (estimate.measurements || {})
      })) as Estimate[];
      
      setEstimates(typedEstimates);
    } else if (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error loading estimates', 
        description: error.message 
      });
    }
  };

  const fetchTerritory = async () => {
    if (!profile?.territory_id) return;
    
    // For now, set a placeholder territory name based on the territory_id
    // This can be improved later when territory management is enhanced
    setTerritory({
      id: profile.territory_id,
      name: `Territory ${profile.territory_id.substring(0, 8)}...`
    });
  };

  const handleCreateEstimate = () => {
    if (!selectedPackage) {
      toast({
        variant: 'destructive',
        title: 'Package Required',
        description: 'Please select a GAF package before creating an estimate.'
      });
      return;
    }
    
    // Navigate to estimate creation with package pre-selected
    navigate(`/estimates?package=${selectedPackage}`);
  };

  // KPI calculations
  const pending = estimates.filter(e => e.status === 'pending');
  const approved = estimates.filter(e => e.status === 'approved');
  const rejected = estimates.filter(e => e.status === 'rejected');
  const totalValue = estimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
  const approvedValue = approved.reduce((sum, e) => sum + (e.total_price || 0), 0);

  const currency = (v: number) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(v);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const EstimateCard = ({ estimate }: { estimate: Estimate }) => {
    // Determine creator info and role-based styling
    const creatorName = estimate.creator_name || estimate.customer_name || 'Unknown Creator';
    const creatorRole = estimate.creator_role || 'rep'; // fallback to rep if no role
    
    // Role-based color themes
    const getRoleTheme = (role: string) => {
      switch (role) {
        case 'admin':
          return {
            border: 'border-blue-200',
            headerBg: 'bg-blue-50',
            titleColor: 'text-blue-900',
            accentColor: 'text-blue-600',
            badgeColors: 'bg-blue-100 text-blue-800 border-blue-300'
          };
        case 'manager':
          return {
            border: 'border-green-200',
            headerBg: 'bg-green-50',
            titleColor: 'text-green-900',
            accentColor: 'text-green-600',
            badgeColors: 'bg-green-100 text-green-800 border-green-300'
          };
        case 'rep':
          return {
            border: 'border-orange-200',
            headerBg: 'bg-orange-50',
            titleColor: 'text-orange-900',
            accentColor: 'text-orange-600',
            badgeColors: 'bg-orange-100 text-orange-800 border-orange-300'
          };
        default:
          return {
            border: 'border-gray-200',
            headerBg: 'bg-gray-50',
            titleColor: 'text-gray-900',
            accentColor: 'text-gray-600',
            badgeColors: 'bg-gray-100 text-gray-800 border-gray-300'
          };
      }
    };
    
    const theme = getRoleTheme(creatorRole);
    
    return (
      <Card className={`mb-3 overflow-hidden transition-all duration-200 hover:shadow-md ${theme.border}`}>
        <CardHeader className={`p-3 ${theme.headerBg}`}>
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <h3 className={`text-sm font-semibold ${theme.titleColor} truncate`}>
                {creatorName}
              </h3>
              <p className={`text-xs ${theme.accentColor} mt-1`}>
                {creatorRole === 'admin' ? 'Administrator' : 
                 creatorRole === 'manager' ? 'Territory Manager' : 'Sales Rep'}
              </p>
            </div>
            <Badge className={`${getStatusColor(estimate.status)} ml-2 flex items-center gap-1 text-xs`}>
              {getStatusIcon(estimate.status)}
              <span className="capitalize">{estimate.status}</span>
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-3">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Property Address</p>
              <p className="text-sm font-medium truncate">{estimate.customer_address}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{new Date(estimate.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className={`text-lg font-bold ${theme.accentColor}`}>
                  {currency(estimate.total_price || 0)}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-3">
              {estimate.status === 'approved' && (
                <Button size="sm" variant="outline" className="text-xs">
                  Download PDF
                </Button>
              )}
              
              {estimate.status === 'rejected' && estimate.rejection_reason && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs"
                  onClick={() => toast({
                    title: 'Rejection Reason',
                    description: estimate.rejection_reason
                  })}
                >
                  View Reason
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!profile?.territory_id && profile?.role !== 'admin') {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Territory Assignment Required</h2>
            <p className="text-muted-foreground">
              You need to be assigned to a territory to access the sales dashboard.
              Please contact your Territory Manager or Administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      {/* Mobile-Optimized Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Sales Dashboard</h1>
        {territory && (
          <p className="text-muted-foreground">{territory.name} Territory</p>
        )}
      </div>

      {/* KPI Cards - Mobile Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard 
          title="My Estimates" 
          value={estimates.length} 
          icon={<FileText className="h-4 w-4"/>}
        />
        <MetricCard 
          title="Pending" 
          value={pending.length} 
          icon={<Clock className="h-4 w-4 text-amber-500"/>}
        />
        <MetricCard 
          title="Accepted" 
          value={approved.length} 
          icon={<CheckCircle2 className="h-4 w-4 text-green-500"/>}
        />
        <MetricCard 
          title="Total Value" 
          value={currency(totalValue)} 
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
      </div>

      {/* Package Selection & Create Estimate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create New Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GAFPackageSelector
            selectedPackage={selectedPackage}
            onPackageSelect={setSelectedPackage}
          />
          
          <div className="mt-6">
            <Button 
              onClick={handleCreateEstimate}
              className="w-full"
              size="lg"
              disabled={!selectedPackage}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Estimate with {selectedPackage ? `GAF Package ${selectedPackage === 'gaf1' ? '1' : '2'}` : 'Selected Package'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Estimates Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                      <TabsTrigger value="approved">Accepted ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <p className="text-center py-8">Loading estimates...</p>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending estimates.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first estimate using a GAF package above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map(estimate => (
                <EstimateCard key={estimate.id} estimate={estimate} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="mt-4">
          <div className="mb-4 text-center">
            <p className="text-lg font-semibold text-green-600">
              Accepted Value: {currency(approvedValue)}
            </p>
          </div>
          {approved.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No accepted estimates yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approved.map(estimate => (
                <EstimateCard key={estimate.id} estimate={estimate} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="rejected" className="mt-4">
          {rejected.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <p className="text-muted-foreground">No rejected estimates.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rejected.map(estimate => (
                <EstimateCard key={estimate.id} estimate={estimate} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Performance Summary - Mobile Optimized */}
      <Card>
        <CardHeader>
          <CardTitle>My Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{estimates.length}</div>
              <div className="text-sm text-muted-foreground">Total Estimates</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {estimates.length > 0 ? Math.round((approved.length / estimates.length) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Approval Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesRepDashboard; 