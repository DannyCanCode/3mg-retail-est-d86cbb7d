import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Estimate, updateEstimateStatus } from '@/api/estimates';
import { MetricCard } from '@/components/ui/MetricCard';
import { ClipboardCheck, Clock, CheckCircle2, MapPin, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';

interface Territory {
  id: string;
  name: string;
  address: string;
  phone?: string;
}

interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

// Extend Estimate type to include rejection_reason
interface ExtendedEstimate extends Estimate {
  rejection_reason?: string;
}

const ManagerDashboard: React.FC = () => {
  const { profile, loading: authLoading } = useAuth();
  const [estimates, setEstimates] = useState<ExtendedEstimate[]>([]);
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
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
      fetchEstimates(),
      fetchTerritory(),
      fetchTeamMembers()
    ]);
    setLoading(false);
  };

  const fetchEstimates = async () => {
    try {
      console.log('🔄 [Manager] Fetching estimates for territory:', profile?.territory_id);
      
      const { data, error } = await supabase
        .from('estimates' as any)
        .select('*')
        .eq('territory_id', profile!.territory_id)
        .neq('status', 'deleted') // Filter out soft-deleted estimates
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('🚨 [Manager] Error fetching estimates:', error);
        toast({ variant: 'destructive', title: 'Error loading estimates', description: error.message });
        return;
      }
      
      if (data) {
        console.log('✅ [Manager] Successfully fetched estimates:', data.length, 'estimates');
        setEstimates(data as unknown as ExtendedEstimate[]);
      } else {
        console.log('⚠️ [Manager] No estimates data returned');
        setEstimates([]);
      }
    } catch (error) {
      console.error('🚨 [Manager] Exception fetching estimates:', error);
    }
  };

  const fetchTerritory = async () => {
    try {
      const { data, error } = await supabase
        .from('territories' as any)
        .select('*')
        .eq('id', profile!.territory_id)
        .single();
      
      if (!error && data) setTerritory(data as unknown as Territory);
    } catch (error) {
      console.error('Error fetching territory:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('id, email, full_name, role')
        .eq('territory_id', profile!.territory_id);
      
      if (!error && data) setTeamMembers(data as unknown as TeamMember[]);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleCreateEstimate = () => {
    // Navigate to estimate creation with manager context
    navigate('/estimates?role=manager');
  };

  const handleMarkAsSold = async (estimate: ExtendedEstimate) => {
    try {
      console.log('🏆 [Manager] Starting mark as sold for estimate:', estimate.id);
      
      if (!estimate.id) {
        throw new Error('Estimate ID is required');
      }
      
      // Import markEstimateAsSold function from API
      const { markEstimateAsSold } = await import('@/api/estimates');
      
      // For now, default to 'Retail' job type. In the future, we can add a dialog to select job type
      const result = await markEstimateAsSold(estimate.id, 'Retail', '');
      
      console.log('✅ [Manager] Mark as sold successful');
      
      toast({
        title: 'Estimate Marked as Sold',
        description: `${estimate.customer_address} has been marked as sold (Retail).`,
        variant: 'default'
      });

      // Refresh the estimates list
      await fetchEstimates();
    } catch (error) {
      console.error('🚨 [Manager] Error marking estimate as sold:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ 
        variant: 'destructive', 
        title: 'Failed to Mark as Sold', 
        description: `Could not mark estimate as sold: ${errorMessage}` 
      });
    }
  };

  const handleDeleteEstimate = async (estimateId: string) => {
    try {
      console.log('🗑️ [Manager] Starting delete for estimate:', estimateId);
      
      if (!estimateId) {
        throw new Error('Estimate ID is required');
      }
      
      // Import deleteEstimate function from API
      const { deleteEstimate } = await import('@/api/estimates');
      const { data, error } = await deleteEstimate(estimateId, 'Deleted by territory manager');
      
      if (error) {
        console.error('🚨 [Manager] Delete API error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Delete operation did not complete successfully');
      }

      console.log('✅ [Manager] Delete API successful');
      
      toast({
        title: 'Estimate Deleted',
        description: 'The estimate has been successfully removed.',
        variant: 'default'
      });

      // Refresh the estimates list
      console.log('🔄 [Manager] Refreshing estimates list after delete...');
      await fetchEstimates();
      console.log('✅ [Manager] Estimates list refresh completed');
    } catch (error) {
      console.error('🚨 [Manager] Error deleting estimate:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ 
        variant: 'destructive', 
        title: 'Failed to Delete Estimate', 
        description: `Could not delete estimate: ${errorMessage}` 
      });
    }
  };

  const handleGeneratePdf = async (estimate: ExtendedEstimate) => {
    try {
      console.log('📄 [Manager] Starting PDF generation for estimate:', estimate.id);
      
      if (!estimate.id) {
        throw new Error('Estimate ID is required');
      }
      
      // Show loading state
      toast({
        title: 'Generating PDF',
        description: `Creating PDF for ${estimate.customer_address}...`,
        variant: 'default'
      });
      
      // Import generateEstimatePdf function from API
      const { generateEstimatePdf } = await import('@/api/estimates');
      
      const { data, error } = await generateEstimatePdf(estimate.id);
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        // Open the PDF in a new tab
        window.open(data.url, '_blank');
        
        console.log('✅ [Manager] PDF generated successfully');
        
        toast({
          title: 'PDF Generated Successfully',
          description: `PDF for ${estimate.customer_address} has been opened in a new tab.`,
          variant: 'default'
        });
      } else {
        throw new Error('No PDF URL returned from the server');
      }
    } catch (error) {
      console.error('🚨 [Manager] Error generating PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ 
        variant: 'destructive', 
        title: 'PDF Generation Failed', 
        description: `Could not generate PDF: ${errorMessage}` 
      });
    }
  };

  const handleViewDetails = (estimate: ExtendedEstimate) => {
    // Navigate to estimate view page using route parameter (not query parameter)
    navigate(`/estimates/${estimate.id}`);
  };

  const handleEditEstimate = (estimate: ExtendedEstimate) => {
    // Navigate to estimate edit page using route parameter (not query parameter) 
    navigate(`/estimates/${estimate.id}`);
  };

  // KPI calculations for manager view
  const draftEstimates = estimates.filter(e => e.status === 'draft' || e.status === 'pending');
  const activeEstimates = estimates.filter(e => e.status === 'approved');
  const rejectedEstimates = estimates.filter(e => e.status === 'rejected');
  const soldEstimates = estimates.filter(e => e.status === 'Sold');
  const totalValue = estimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
  const soldValue = soldEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);

  const currency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const EstimateCard = ({ estimate }: { estimate: ExtendedEstimate }) => {
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
      <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${theme.border}`}>
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
            <Badge 
              variant="outline"
              className={`text-xs ${theme.badgeColors} ml-2`}
            >
              {estimate.status?.charAt(0).toUpperCase() + estimate.status?.slice(1)}
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
                <p className="text-muted-foreground">Area</p>
                <p className="font-medium">
                  {estimate.measurements?.totalArea ? `${estimate.measurements.totalArea} sq ft` : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="pt-1 border-t">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className={`text-lg font-bold ${theme.accentColor}`}>
                {currency(estimate.total_price || 0)}
              </p>
            </div>
          </div>
        </CardContent>
        
        {/* Manager Actions - Available for all estimates */}
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleViewDetails(estimate)}
              className="text-xs"
            >
              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleEditEstimate(estimate)}
              className="text-xs"
            >
              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Button 
              size="sm" 
              onClick={() => handleMarkAsSold(estimate)}
              className="bg-blue-600 hover:bg-blue-700 text-xs"
            >
              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Sold
            </Button>
            
            <Button 
              size="sm" 
              onClick={() => handleGeneratePdf(estimate)}
              className="bg-green-600 hover:bg-green-700 text-xs"
            >
              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleDeleteEstimate(estimate.id!)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          </div>
        </CardContent>
        

        
        {estimate.status === 'rejected' && estimate.rejection_reason && (
          <CardContent className="p-3 pt-0">
            <div className="p-2 bg-red-50 rounded border-l-4 border-red-200">
              <p className="text-xs text-red-700">
                <strong>Rejection reason:</strong> {estimate.rejection_reason}
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (authLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Loading Dashboard</h2>
            <p className="text-muted-foreground">
              Setting up your territory management dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile?.territory_id && profile?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">No Territory Assigned</h2>
            <p className="text-muted-foreground">
              You need to be assigned to a territory to access the manager dashboard.
              Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Territory Header with New Estimate Button */}
      {territory && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {territory.name} Territory
              </CardTitle>
              <Button 
                onClick={handleCreateEstimate}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Estimate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p>{territory.address}</p>
              </div>
              {territory.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{territory.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard 
          title="Total Estimates" 
          value={estimates.length} 
          icon={<ClipboardCheck className="h-4 w-4"/>}
        />
        <MetricCard 
          title="Draft/Pending" 
          value={draftEstimates.length} 
          icon={<Clock className="h-4 w-4 text-amber-500"/>}
        />
        <MetricCard 
          title="Active" 
          value={activeEstimates.length} 
          icon={<CheckCircle2 className="h-4 w-4 text-green-500"/>}
        />
        <MetricCard 
          title="Total Value" 
          value={currency(totalValue)} 
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <MetricCard 
          title="Team Members" 
          value={teamMembers.length} 
          icon={<Users className="h-4 w-4"/>}
        />
      </div>

      {/* Create Estimate Quick Action Card */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800">Create New Estimate</h3>
              <p className="text-sm text-green-600">
                Territory Managers can create estimates with material pricing restrictions and 30% minimum profit margin
              </p>
            </div>
            <Button 
              onClick={handleCreateEstimate}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start New Estimate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estimates Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Estimates ({estimates.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeEstimates.length})</TabsTrigger>
          <TabsTrigger value="sold">Sold ({soldEstimates.length})</TabsTrigger>
          <TabsTrigger value="team">Team ({teamMembers.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {loading ? (
            <p>Loading estimates...</p>
          ) : estimates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No estimates found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {estimates.map(estimate => (
                <EstimateCard key={estimate.id} estimate={estimate} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="active" className="mt-6">
          <div className="mb-4">
            <p className="text-lg font-semibold text-green-600">
              Active Value: {currency(activeEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0))}
            </p>
          </div>
          {activeEstimates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No active estimates yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeEstimates.map(estimate => (
                <EstimateCard key={estimate.id} estimate={estimate} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="sold" className="mt-6">
          <div className="mb-4">
            <p className="text-lg font-semibold text-blue-600">
              Sold Value: {currency(soldValue)}
            </p>
          </div>
          {soldEstimates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No sold estimates yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {soldEstimates.map(estimate => (
                <EstimateCard key={estimate.id} estimate={estimate} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="team" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map(member => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{member.full_name || 'No name set'}</h3>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <Badge variant="outline" className="mt-2">
                    {member.role}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagerDashboard; 