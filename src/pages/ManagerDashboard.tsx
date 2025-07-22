import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Estimate, updateEstimateStatus } from '@/api/estimates';
import { ClipboardCheck, Clock, CheckCircle2, MapPin, Users, Plus, TrendingUp } from 'lucide-react';
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
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [estimates, setEstimates] = useState<ExtendedEstimate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenEstimates, setHiddenEstimates] = useState<Set<string>>(new Set());

  // 3D Floating Bubbles Background Component
  const FloatingBubbles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-10 left-10 w-20 h-20 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full animate-pulse" 
           style={{ animationDelay: '0s', animationDuration: '3s' }} />
      <div className="absolute top-32 right-20 w-16 h-16 bg-gradient-to-br from-blue-400/15 to-purple-400/15 rounded-full animate-bounce" 
           style={{ animationDelay: '1s', animationDuration: '4s' }} />
      <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-br from-green-500/25 to-emerald-400/25 rounded-full animate-ping" 
           style={{ animationDelay: '2s', animationDuration: '5s' }} />
      <div className="absolute top-1/2 right-10 w-14 h-14 bg-gradient-to-br from-cyan-400/20 to-green-400/20 rounded-full animate-pulse" 
           style={{ animationDelay: '0.5s', animationDuration: '3.5s' }} />
      <div className="absolute bottom-32 right-1/3 w-18 h-18 bg-gradient-to-br from-emerald-400/15 to-green-500/15 rounded-full animate-bounce" 
           style={{ animationDelay: '1.5s', animationDuration: '4.5s' }} />
    </div>
  );

  // Helper functions for frontend-only delete (hiding estimates)
  const getHiddenEstimates = (): string[] => {
    try {
      const hidden = localStorage.getItem(`hidden_estimates_${profile?.id}`);
      return hidden ? JSON.parse(hidden) : [];
    } catch {
      return [];
    }
  };

  const hideEstimate = (estimateId: string) => {
    try {
      const hidden = getHiddenEstimates();
      if (!hidden.includes(estimateId)) {
        hidden.push(estimateId);
        localStorage.setItem(`hidden_estimates_${profile?.id}`, JSON.stringify(hidden));
      }
    } catch (error) {
      console.error('Error hiding estimate:', error);
    }
  };

  useEffect(() => {
      fetchData();
  }, [profile?.id]);

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
      console.log('🔄 [Manager] Fetching estimates for territory manager');
      
      // For territory managers, get all estimates (since territory filtering may not work yet)
      // Later this can be filtered by territory when the column exists properly
      const { data, error } = await supabase
        .from('estimates' as any)
        .select('*')
        .neq('status', 'deleted') // Filter out soft-deleted estimates
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('🚨 [Manager] Error fetching estimates:', error);
        toast({ variant: 'destructive', title: 'Error loading estimates', description: error.message });
        return;
      }
      
      if (data) {
        // Filter out any estimates that are hidden by this territory manager
        const hiddenEstimates = getHiddenEstimates();
        const typedData = data as any[]; // Type assertion for the data array
        const visibleEstimates = typedData.filter(estimate => estimate.id && !hiddenEstimates.includes(estimate.id));
        
        console.log('✅ [Manager] Successfully fetched estimates:', visibleEstimates.length, 'estimates (', typedData.length - visibleEstimates.length, 'hidden)');
        setEstimates(visibleEstimates as unknown as ExtendedEstimate[]);
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
      
      // Show loading state
      toast({
        title: 'Processing Sale',
        description: `Marking ${estimate.customer_address} as sold...`,
        variant: 'default'
      });
      
      // For now, default to 'Retail' job type. In the future, we can add a dialog to select job type
      const result = await markEstimateAsSold(estimate.id, 'Retail', '');
      
      console.log('✅ [Manager] Mark as sold successful:', result);
      
      // Update the local state immediately for better UX
      setEstimates(prevEstimates => 
        prevEstimates.map(est => 
          est.id === estimate.id 
            ? { ...est, status: 'Sold', is_sold: true, sold_at: new Date().toISOString() }
            : est
        )
      );
      
      toast({
        title: 'Estimate Marked as Sold! 🎉',
        description: `${estimate.customer_address} has been successfully marked as sold (Retail).`,
        variant: 'default'
      });

      // Refresh the estimates list from database to ensure consistency
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
      console.log('🗑️ [Manager] Starting frontend delete (hide) for estimate:', estimateId);
      
      if (!estimateId) {
        throw new Error('Estimate ID is required');
    }
      
      // For territory managers: only hide from frontend (don't actually delete from database)
      hideEstimate(estimateId);
      
      console.log('✅ [Manager] Estimate hidden from view');
      
      toast({
        title: 'Estimate Removed',
        description: 'The estimate has been removed from your view.',
        variant: 'default'
      });

      // Refresh the estimates list to reflect the hidden estimate
      console.log('🔄 [Manager] Refreshing estimates list after hide...');
      await fetchEstimates();
      console.log('✅ [Manager] Estimates list refresh completed');
    } catch (error) {
      console.error('🚨 [Manager] Error hiding estimate:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ 
        variant: 'destructive', 
        title: 'Failed to Remove Estimate', 
        description: `Could not remove estimate: ${errorMessage}` 
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
      case 'pending': return 'bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0';
      case 'approved': return 'bg-gradient-to-r from-green-400 to-emerald-400 text-white border-0';
      case 'rejected': return 'bg-gradient-to-r from-red-400 to-rose-400 text-white border-0';
      case 'Sold': return 'bg-gradient-to-r from-blue-400 to-indigo-400 text-white border-0';
      default: return 'bg-gradient-to-r from-gray-400 to-slate-400 text-white border-0';
    }
  };

  const EstimateCard = ({ estimate }: { estimate: ExtendedEstimate }) => {
    // Determine creator info and role-based styling
    const creatorName = estimate.creator_name || estimate.customer_name || 'Unknown Creator';
    const creatorRole = estimate.creator_role || 'rep'; // fallback to rep if no role
    const territoryName = (estimate as any).territory_name || territory?.name; // Get territory from estimate or current territory
    
    // 🎨 TERRITORY-BASED COLOR SYSTEM
    const getTerritoryTheme = (territoryName?: string, role?: string) => {
      // 🔒 Admin cards remain blue regardless of territory
      if (role === 'admin') {
        return {
          border: 'border-blue-700/30',
          headerBg: 'bg-gradient-to-r from-blue-900/20 to-blue-800/20',
          titleColor: 'text-blue-300',
          accentColor: 'text-blue-400',
          badgeColors: 'bg-blue-600/20 text-blue-300 border-blue-500/50',
          territoryLabel: 'Admin'
        };
      }

      // 🏢 Territory-based colors for managers and reps
      switch (territoryName?.toLowerCase()) {
        case 'tampa':
          return {
            border: 'border-emerald-700/30',
            headerBg: 'bg-gradient-to-r from-emerald-900/20 to-emerald-800/20',
            titleColor: 'text-emerald-300',
            accentColor: 'text-emerald-400',
            badgeColors: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50',
            territoryLabel: 'Tampa'
          };
        case 'ocala':
          return {
            border: 'border-cyan-700/30',
            headerBg: 'bg-gradient-to-r from-cyan-900/20 to-cyan-800/20',
            titleColor: 'text-cyan-300',
            accentColor: 'text-cyan-400',
            badgeColors: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/50',
            territoryLabel: 'Ocala'
          };
        case 'winter park':
          return {
            border: 'border-purple-700/30',
            headerBg: 'bg-gradient-to-r from-purple-900/20 to-purple-800/20',
            titleColor: 'text-purple-300',
            accentColor: 'text-purple-400',
            badgeColors: 'bg-purple-600/20 text-purple-300 border-purple-500/50',
            territoryLabel: 'Winter Park'
          };
        case 'miami':
          return {
            border: 'border-pink-700/30',
            headerBg: 'bg-gradient-to-r from-pink-900/20 to-pink-800/20',
            titleColor: 'text-pink-300',
            accentColor: 'text-pink-400',
            badgeColors: 'bg-pink-600/20 text-pink-300 border-pink-500/50',
            territoryLabel: 'Miami'
          };
        case 'stuart':
          return {
            border: 'border-amber-700/30',
            headerBg: 'bg-gradient-to-r from-amber-900/20 to-amber-800/20',
            titleColor: 'text-amber-300',
            accentColor: 'text-amber-400',
            badgeColors: 'bg-amber-600/20 text-amber-300 border-amber-500/50',
            territoryLabel: 'Stuart'
          };
        case 'jacksonville':
          return {
            border: 'border-indigo-700/30',
            headerBg: 'bg-gradient-to-r from-indigo-900/20 to-indigo-800/20',
            titleColor: 'text-indigo-300',
            accentColor: 'text-indigo-400',
            badgeColors: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50',
            territoryLabel: 'Jacksonville'
          };
        default:
          // Fallback for unknown territories
          return {
            border: 'border-gray-700/30',
            headerBg: 'bg-gradient-to-r from-gray-900/20 to-gray-800/20',
            titleColor: 'text-gray-300',
            accentColor: 'text-gray-400',
            badgeColors: 'bg-gray-600/20 text-gray-300 border-gray-500/50',
            territoryLabel: 'Unknown'
          };
      }
    };
    
    const theme = getTerritoryTheme(territoryName, creatorRole);
    
    return (
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-2xl bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-md border border-green-500/30 shadow-xl shadow-green-500/10 hover:shadow-green-400/30 hover:scale-[1.02] hover:border-green-400/50 group">
        {/* Animated gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-cyan-500 animate-pulse" />
        
        <CardHeader className="p-3 bg-gradient-to-r from-gray-800/90 to-gray-700/90 border-b border-green-500/20">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate text-white group-hover:text-green-300 transition-colors">
                {estimate.customer_address}
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="font-medium text-green-300">
                    {creatorName}
                  </span>
                </div>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">
                  {estimate.creator_role === 'admin' ? 'Admin' : 
                    estimate.creator_role === 'manager' ? 'Manager' : 'Rep'}
                </span>
                {territoryName !== 'Unknown Territory' && (
                  <>
                    <span className="text-gray-500">•</span>
                    <Badge className="text-[10px] bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-200 border-green-400/30 shadow-sm">
                      {territoryName}
                    </Badge>
                  </>
                )}
              </div>
            </div>
            <Badge className={`text-xs ${getStatusColor(estimate.status)} shadow-lg shadow-black/20 flex-shrink-0`}>
              {estimate.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 relative bg-gradient-to-br from-gray-800/40 via-green-900/20 to-emerald-900/20">
          {/* Twinkling stars effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-1 h-1 bg-green-400 rounded-full top-2 left-4 animate-twinkle opacity-50" />
            <div className="absolute w-1 h-1 bg-emerald-400 rounded-full top-4 right-6 animate-twinkle animation-delay-1000 opacity-50" />
            <div className="absolute w-1 h-1 bg-cyan-400 rounded-full bottom-3 left-8 animate-twinkle animation-delay-2000 opacity-50" />
          </div>
          
          <div className="relative z-10 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Date</p>
                  <p className="font-medium text-gray-100">{new Date(estimate.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Area</p>
                  <p className="font-medium text-gray-100">
                    {estimate.measurements?.totalArea ? `${estimate.measurements.totalArea} sq ft` : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Total</p>
                <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                  {currency(estimate.total_price || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        
        {/* Manager Actions - Available for all estimates */}
        <CardContent className="p-3 pt-0 relative bg-gradient-to-br from-gray-800/40 via-green-900/20 to-emerald-900/20">
          <div className="relative z-10 grid grid-cols-2 gap-2 mb-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleViewDetails(estimate)}
                className="text-xs h-8 bg-gray-900/30 border-gray-700/50 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-green-500/50 transition-all duration-200 group"
              >
                <svg className="h-3 w-3 mr-1 group-hover:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </Button>
              
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEditEstimate(estimate)}
                  className="text-xs h-8 bg-gray-900/30 border-gray-700/50 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-amber-500/50 transition-all duration-200 group"
                >
                  <svg className="h-3 w-3 mr-1 group-hover:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Button>
          </div>
          
          {/* Conditional action buttons based on status */}
          {estimate.status === 'Sold' ? (
            /* Sold estimate actions */
            <div className="space-y-2">
              <div className="relative p-2 bg-gradient-to-r from-green-600/30 via-emerald-600/30 to-cyan-600/30 rounded-lg border border-green-400/40 shadow-lg overflow-hidden">
                {/* Animated celebration effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-transparent to-green-400/10 animate-pulse" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-green-300 flex items-center gap-1">
                      <span>🎉</span>
                      SOLD!
                    </p>
                    <p className="text-[10px] text-green-200 mt-0.5">
                      {estimate.sold_at ? `${new Date(estimate.sold_at).toLocaleDateString()}` : 'Recently sold'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-green-200">Type:</p>
                    <p className="text-xs font-bold text-green-300">{estimate.job_type || 'Retail'}</p>
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleDeleteEstimate(estimate.id!)}
                className="w-full text-xs h-8 bg-gray-900/30 border-gray-700/50 text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 hover:border-gray-600 transition-all duration-200"
              >
                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                </svg>
                Remove from View
              </Button>
            </div>
          ) : (
            /* Non-sold estimate actions */
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                onClick={() => handleMarkAsSold(estimate)}
                className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs h-8 shadow-lg shadow-blue-500/25 transition-all duration-200 group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <svg className="h-3 w-3 mr-1 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="relative z-10">Mark Sold</span>
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleDeleteEstimate(estimate.id!)}
                className="text-xs h-8 bg-red-950/50 border-red-800/50 text-red-300 hover:bg-red-900/50 hover:text-red-200 hover:border-red-700/50 transition-all duration-200 group"
              >
                <svg className="h-3 w-3 mr-1 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </Button>
            </div>
          )}
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <Card className="bg-gray-800/70 backdrop-blur-md border-green-700/30 shadow-xl shadow-black/20">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2 text-white">Loading Dashboard</h2>
            <p className="text-gray-400">
              Setting up your territory management dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile?.territory_id && profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <Card className="bg-gray-800/70 backdrop-blur-md border-green-700/30 shadow-xl shadow-black/20">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-white">No Territory Assigned</h2>
            <p className="text-gray-400">
              You need to be assigned to a territory to access the manager dashboard.
              Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Animated background similar to sales dashboard */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/40 via-green-900/20 to-emerald-900/15" />
        
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[1000px] h-[1000px] bg-green-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-emerald-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-green-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
        </div>
        
        {/* Twinkling stars effect */}
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
        
        {/* Grid pattern */}
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

      {/* Floating Bubbles */}
      <FloatingBubbles />

      <div className="relative z-10 space-y-6 p-6">
      {/* Territory Header with New Estimate Button */}
      {territory && (
        <Card className="relative overflow-hidden bg-gray-800/70 backdrop-blur-md border-green-700/30 shadow-xl shadow-black/20">
          {/* Subtle animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 via-emerald-500/5 to-cyan-500/5 animate-pulse" />
          
          <CardHeader className="relative z-10 border-b border-green-700/30">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white text-xl">
                <div className="p-2 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-lg border border-green-500/30">
                  <MapPin className="h-5 w-5 text-green-400" />
                </div>
                {territory.name} Territory
                <Badge className="bg-green-600/20 text-green-300 border-green-500/50">
                  ACTIVE
                </Badge>
              </CardTitle>
              <Button 
                onClick={handleCreateEstimate}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Estimate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 bg-gray-800/50">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 font-medium">Address</p>
                <p className="text-gray-200">{territory.address}</p>
              </div>
              {territory.phone && (
                <div>
                  <p className="text-sm text-gray-400 font-medium">Phone</p>
                  <p className="text-gray-200">{territory.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gray-800/70 backdrop-blur-md border border-green-700/30 shadow-xl shadow-black/20 transform transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 opacity-20" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <ClipboardCheck className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{estimates.length}</div>
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-200">Total Estimates</h3>
              <p className="text-sm text-gray-400">All time</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </div>
        </div>

        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gray-800/70 backdrop-blur-md border border-green-700/30 shadow-xl shadow-black/20 transform transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 opacity-20" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{draftEstimates.length}</div>
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-200">Draft/Pending</h3>
              <p className="text-sm text-gray-400">In Progress</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </div>
        </div>

        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gray-800/70 backdrop-blur-md border border-green-700/30 shadow-xl shadow-black/20 transform transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20 opacity-20" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{activeEstimates.length}</div>
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-200">Active</h3>
              <p className="text-sm text-gray-400">Ready for sale</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </div>
        </div>

        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gray-800/70 backdrop-blur-md border border-green-700/30 shadow-xl shadow-black/20 transform transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 opacity-20" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{currency(totalValue)}</div>
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-200">Total Value</h3>
              <p className="text-sm text-gray-400">Portfolio value</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </div>
        </div>

        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gray-800/70 backdrop-blur-md border border-green-700/30 shadow-xl shadow-black/20 transform transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-600/20 opacity-20" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{teamMembers.length}</div>
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-200">Team Members</h3>
              <p className="text-sm text-gray-400">Your team</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </div>
        </div>
      </div>

      {/* Create Estimate Quick Action Card */}
      <Card className="relative overflow-hidden bg-gray-800/70 backdrop-blur-md border-green-700/30 shadow-xl shadow-black/20">
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 transform -translate-x-full animate-shine" />
        
        <CardContent className="relative z-10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-white mb-1">Create New Estimate</h3>
              <p className="text-sm text-gray-400">
                Territory Managers can create estimates with material pricing restrictions and 30% minimum profit margin
              </p>
            </div>
            <Button 
              onClick={handleCreateEstimate}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="font-medium">Start New Estimate</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estimates Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800/70 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-green-700/30">
          <TabsTrigger value="all" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">All Estimates ({estimates.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">Active ({activeEstimates.length})</TabsTrigger>
          <TabsTrigger value="sold" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">Sold ({soldEstimates.length})</TabsTrigger>
          <TabsTrigger value="team" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">Team ({teamMembers.length})</TabsTrigger>
        </TabsList>

        {/* Dark background container for tab content */}
        <div className="mt-6 bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-green-700/30 shadow-2xl">
          <TabsContent value="all" className="mt-0">
            <div className="mb-4">
              <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                All Estimates: {estimates.length}
              </p>
            </div>
            {estimates.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md border-green-500/50 shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="mb-4 p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                    <ClipboardCheck className="h-10 w-10 text-green-400" />
                  </div>
                  <p className="text-gray-300 text-lg">No estimates yet.</p>
                  <p className="text-gray-400 text-sm mt-2">Create your first estimate to get started!</p>
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
        
          <TabsContent value="active" className="mt-0">
            <div className="mb-4">
              <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                Active Value: {currency(activeEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0))}
              </p>
            </div>
            {activeEstimates.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md border-green-500/50 shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="mb-4 p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-400" />
                  </div>
                  <p className="text-gray-300 text-lg">No active estimates yet.</p>
                  <p className="text-gray-400 text-sm mt-2">Start creating estimates to see them here!</p>
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
          
          <TabsContent value="sold" className="mt-0">
            <div className="mb-4">
              <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Sold Value: {currency(soldValue)}
              </p>
            </div>
            {soldEstimates.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md border-blue-500/50 shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="mb-4 p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                    <TrendingUp className="h-10 w-10 text-blue-400" />
                  </div>
                  <p className="text-gray-300 text-lg">No sold estimates yet.</p>
                  <p className="text-gray-400 text-sm mt-2">Keep working on those leads!</p>
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

          <TabsContent value="team" className="mt-0">
            {teamMembers.length === 0 ? (
              <Card className="bg-gray-800/70 backdrop-blur-md border-green-700/30">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-400">No team members found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map(member => (
                  <Card key={member.id} className="bg-gray-800/70 backdrop-blur-md border-green-700/30 shadow-xl shadow-black/20">
                    <CardHeader className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-b border-green-700/30">
                      <CardTitle className="text-sm text-white">{member.full_name || 'Unnamed'}</CardTitle>
                      <p className="text-xs text-gray-400">{member.email}</p>
                    </CardHeader>
                    <CardContent className="p-4 bg-gray-800/50">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">Role</span>
                          <Badge className="text-xs bg-green-600/20 text-green-300 border-green-500/50">
                            {member.role === 'rep' ? 'Sales Rep' : member.role}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
      </div>
    </div>
  );
};

export default ManagerDashboard; 