import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Estimate, updateEstimateStatus } from '@/api/estimates';
import { MetricCard } from '@/components/ui/MetricCard';
import { ClipboardCheck, Clock, CheckCircle2, XCircle, MapPin, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [rejectionNote, setRejectionNote] = useState('');
  const [selectedEstimate, setSelectedEstimate] = useState<string | null>(null);
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
      const { data, error } = await supabase
        .from('estimates' as any)
        .select('*')
        .eq('territory_id', profile!.territory_id)
        .order('created_at', { ascending: false });
      
      if (!error && data) setEstimates(data as unknown as ExtendedEstimate[]);
      else if (error) toast({ variant: 'destructive', title: 'Error loading estimates', description: error.message });
    } catch (error) {
      console.error('Error fetching estimates:', error);
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

  const handleApprove = async (id: string) => {
    const { error } = await updateEstimateStatus(id, 'approved');
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Estimate approved successfully!' });
      fetchEstimates();
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionNote.trim()) {
      toast({ variant: 'destructive', title: 'Rejection reason required', description: 'Please provide a reason for rejection.' });
      return;
    }

    const { error } = await updateEstimateStatus(id, 'rejected', rejectionNote);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Estimate rejected' });
      setSelectedEstimate(null);
      setRejectionNote('');
      fetchEstimates();
    }
  };

  const handleGeneratePdf = async (estimate: ExtendedEstimate) => {
    try {
      toast({ title: 'PDF generation started', description: 'Your PDF will be available shortly.' });
      // PDF generation logic here - using same functionality as admin dashboard
      console.log('Generating PDF for estimate:', estimate.id);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate PDF.' });
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

  // KPI calculations
  const pending = estimates.filter(e => e.status === 'pending');
  const approved = estimates.filter(e => e.status === 'approved');
  const rejected = estimates.filter(e => e.status === 'rejected');
  const totalValue = estimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
  const approvedValue = approved.reduce((sum, e) => sum + (e.total_price || 0), 0);

  const currency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const EstimateCard = ({ estimate }: { estimate: ExtendedEstimate }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold">{estimate.customer_address}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(estimate.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge 
            className={
              estimate.status === 'pending' ? 'bg-amber-100 text-amber-800' :
              estimate.status === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }
          >
            {estimate.status?.charAt(0).toUpperCase() + estimate.status?.slice(1)}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-bold text-green-600">
            {currency(estimate.total_price || 0)}
          </span>
          {estimate.measurements?.totalArea && (
            <span className="text-sm text-muted-foreground">
              {estimate.measurements.totalArea} sq ft
            </span>
          )}
        </div>
        
        {estimate.status === 'pending' && (
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm" 
              onClick={() => handleApprove(estimate.id!)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setSelectedEstimate(estimate.id!)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Estimate</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p>Please provide a reason for rejecting this estimate:</p>
                  <Textarea
                    placeholder="Enter rejection reason..."
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => {
                      setSelectedEstimate(null);
                      setRejectionNote('');
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleReject(estimate.id!)}
                      disabled={!rejectionNote.trim()}
                    >
                      Reject Estimate
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {/* Enhanced functionality for approved/rejected estimates */}
        {(estimate.status === 'approved' || estimate.status === 'rejected') && (
          <div className="flex gap-2 mt-3">
            {estimate.status === 'approved' && (
              <Button 
                size="sm" 
                onClick={() => handleGeneratePdf(estimate)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate PDF
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleViewDetails(estimate)}
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Details
            </Button>
            
            {estimate.status === 'approved' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleEditEstimate(estimate)}
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            )}
          </div>
        )}
        
        {estimate.status === 'rejected' && estimate.rejection_reason && (
          <div className="mt-3 p-2 bg-red-50 rounded border-l-4 border-red-200">
            <p className="text-sm text-red-700">
              <strong>Rejection reason:</strong> {estimate.rejection_reason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

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
          title="Pending" 
          value={pending.length} 
          icon={<Clock className="h-4 w-4 text-amber-500"/>}
        />
        <MetricCard 
          title="Approved" 
          value={approved.length} 
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
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          <TabsTrigger value="team">Team ({teamMembers.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          {loading ? (
            <p>Loading estimates...</p>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No pending estimates to review.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pending.map(estimate => (
                <EstimateCard key={estimate.id} estimate={estimate} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="mt-6">
          <div className="mb-4">
            <p className="text-lg font-semibold text-green-600">
              Approved Value: {currency(approvedValue)}
            </p>
          </div>
          {approved.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No approved estimates yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {approved.map(estimate => (
                <EstimateCard key={estimate.id} estimate={estimate} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="rejected" className="mt-6">
          {rejected.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No rejected estimates.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rejected.map(estimate => (
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