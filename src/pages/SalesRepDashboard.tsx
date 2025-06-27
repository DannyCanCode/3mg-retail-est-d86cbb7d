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
    
    if (!error) {
      setEstimates(data as Estimate[]);
    } else {
      toast({ 
        variant: 'destructive', 
        title: 'Error loading estimates', 
        description: error.message 
      });
    }
  };

  const fetchTerritory = async () => {
    if (!profile?.territory_id) return;
    
    const { data, error } = await supabase
      .from('territories')
      .select('*')
      .eq('id', profile.territory_id)
      .single();
    
    if (!error) setTerritory(data as Territory);
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

  const EstimateCard = ({ estimate }: { estimate: Estimate }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{estimate.customer_address}</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(estimate.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge className={`${getStatusColor(estimate.status)} ml-2 flex items-center gap-1`}>
            {getStatusIcon(estimate.status)}
            <span className="capitalize">{estimate.status}</span>
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-green-600">
            {currency(estimate.total_price || 0)}
          </span>
          
          {estimate.status === 'approved' && (
            <Button size="sm" variant="outline">
              Download PDF
            </Button>
          )}
          
          {estimate.status === 'rejected' && estimate.rejection_reason && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => toast({
                title: 'Rejection Reason',
                description: estimate.rejection_reason
              })}
            >
              View Reason
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

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