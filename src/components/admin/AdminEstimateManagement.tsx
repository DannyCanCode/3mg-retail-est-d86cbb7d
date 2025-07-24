import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Eye, 
  Edit,
  FileDown, 
  Clock, 
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  getEstimates, 
  updateEstimateStatus, 
  deleteEstimate, 
  Estimate, 
  EstimateStatus,
  trackAdminAction
} from '@/api/estimates';
import { supabase } from '@/integrations/supabase/client';
import { trackAdminEstimateAction, trackFunnelStep } from '@/lib/posthog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ExtendedEstimate extends Estimate {
  rejection_reason?: string;
  territory_name?: string; // Added for territory-based color coding
}

export const AdminEstimateManagement: React.FC = () => {
  const [estimates, setEstimates] = useState<ExtendedEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<ExtendedEstimate | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    fetchEstimates();
    trackFunnelStep('admin_dashboard_viewed');
  }, []);

  const fetchEstimates = async () => {
    console.log('🔄 [Admin] fetchEstimates called');
    setLoading(true);
    try {
      // 🏢 ENHANCED: Fetch estimates (territory functionality to be added later)
      const { data, error } = await getEstimates();
      
      if (error) throw error;
      
      // 🎨 TODO: Add territory color coding once database schema is updated
      // For now, we'll use creator name as a proxy for territory assignment
      const parsedEstimates = (data || []).map(estimate => ({
        ...estimate,
        // 🎨 TEMPORARY: Map creator names to territories for color coding
        territory_name: estimate.creator_name?.toLowerCase().includes('josh') ? 'Southwest Florida' :
                       estimate.creator_name?.toLowerCase().includes('jacob') ? 'North Central Florida' :
                       estimate.creator_name?.toLowerCase().includes('chase') || estimate.creator_name?.toLowerCase().includes('adam') ? 'Central Florida' :
                       estimate.creator_name?.toLowerCase().includes('pearl') ? 'South Florida' :
                       estimate.creator_name?.toLowerCase().includes('nick') && estimate.creator_name?.toLowerCase().includes('nells') ? 'Southeast Florida' :
                       estimate.creator_name?.toLowerCase().includes('harrison') ? 'Northeast Florida' :
                       'Unknown Territory'
      }));
      
      console.log('📊 [Admin] Fetched estimates data:', parsedEstimates.length, 'estimates');
      console.log('📊 [Admin] Status breakdown:', {
        pending: parsedEstimates.filter(e => e.status === 'pending').length,
        approved: parsedEstimates.filter(e => e.status === 'approved').length,
        rejected: parsedEstimates.filter(e => e.status === 'rejected').length,
        sold: parsedEstimates.filter(e => e.status === 'Sold').length
      });
      
      console.log('🎨 [Admin] Territory breakdown:', {
        territoryCount: parsedEstimates.reduce((acc, e) => {
          const territory = e.territory_name || 'Unknown';
          acc[territory] = (acc[territory] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
      setEstimates(parsedEstimates as ExtendedEstimate[]);
    } catch (error) {
      console.error('🚨 [Admin] Error fetching estimates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load estimates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedEstimate?.id) {
      console.error('No selected estimate or estimate ID');
      return;
    }
    
          console.log('🎯 [Admin] Starting acceptance for estimate:', selectedEstimate.id);
      console.log('🎯 [Admin] Current estimate status:', selectedEstimate.status);
      
      setIsActionLoading(true);
      try {
        console.log('🎯 [Admin] Calling updateEstimateStatus with approved status...');
        const { data, error } = await updateEstimateStatus(selectedEstimate.id, 'approved', approvalNotes);
        
        if (error) {
          console.error('🚨 [Admin] API Error during acceptance:', error);
          throw error;
        }
  
        console.log('✅ [Admin] API call successful, returned data:', data);
  
        // Track admin action
        trackAdminEstimateAction('approve', {
          estimateId: selectedEstimate.id,
          creatorRole: selectedEstimate.creator_role,
          estimateValue: selectedEstimate.total_price,
          territory: selectedEstimate.creator_name || 'unknown'
        });
  
        // Close dialog and reset state first
        setIsApproveDialogOpen(false);
        setApprovalNotes('');
        setSelectedEstimate(null);
  
        // Show success message
        toast({
          title: 'Estimate Accepted ✅',
          description: `Estimate for ${selectedEstimate.customer_address} has been accepted and moved to the Accepted tab.`
        });
  
        console.log('🔄 [Admin] Refreshing estimates list after approval...');
        // Refresh the estimates list
        await fetchEstimates();
        console.log('✅ [Admin] Estimates list refreshed after approval');
      
          } catch (error) {
        console.error('🚨 [Admin] Error accepting estimate:', error);
        toast({
          title: 'Error',
          description: `Failed to accept estimate: ${error.message || 'Unknown error'}`,
          variant: 'destructive'
        });
      } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEstimate?.id || !rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive'
      });
      return;
    }

    console.log('🎯 [Admin] Starting rejection for estimate:', selectedEstimate.id);
    console.log('🎯 [Admin] Rejection reason:', rejectionReason);

    setIsActionLoading(true);
    try {
      console.log('🎯 [Admin] Calling updateEstimateStatus with rejected status...');
      const { data, error } = await updateEstimateStatus(selectedEstimate.id, 'rejected', rejectionReason);
      if (error) {
        console.error('🚨 [Admin] API Error during rejection:', error);
        throw error;
      }

      console.log('✅ [Admin] Rejection API call successful, returned data:', data);

      // Track admin action
      trackAdminEstimateAction('reject', {
        estimateId: selectedEstimate.id,
        creatorRole: selectedEstimate.creator_role,
        estimateValue: selectedEstimate.total_price,
        territory: selectedEstimate.creator_name || 'unknown',
        reason: rejectionReason
      });

      // Close dialog and reset state first
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedEstimate(null);

      toast({
        title: 'Estimate Rejected ❌',
        description: `Estimate for ${selectedEstimate.customer_address} has been rejected and moved to the Rejected tab.`
      });

      console.log('🔄 [Admin] Refreshing estimates list after rejection...');
      await fetchEstimates();
      console.log('✅ [Admin] Estimates list refreshed after rejection');
      
    } catch (error) {
      console.error('🚨 [Admin] Error rejecting estimate:', error);
      toast({
        title: 'Error',
        description: `Failed to reject estimate: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (estimateToDelete?: ExtendedEstimate) => {
    const estimate = estimateToDelete || selectedEstimate;
    if (!estimate?.id) return;

    console.log('🗑️ [Admin] Starting delete for estimate:', estimate.id);
    setIsActionLoading(true);
    try {
      console.log('🗑️ [Admin] Calling deleteEstimate API...');
      const { error } = await deleteEstimate(estimate.id);
      if (error) {
        console.error('🚨 [Admin] Delete API error:', error);
        throw error;
      }

      console.log('✅ [Admin] Delete API successful');

      // Track admin action
      trackAdminEstimateAction('delete', {
        estimateId: estimate.id,
        creatorRole: estimate.creator_role,
        estimateValue: estimate.total_price,
        territory: estimate.creator_name || 'unknown'
      });

      toast({
        title: 'Estimate Deleted',
        description: `Estimate for ${estimate.customer_address} has been moved to deleted items and can be restored if needed.`
      });

      setSelectedEstimate(null);
      
      console.log('🔄 [Admin] Refreshing estimates list...');
      await fetchEstimates(); // 🔧 FIX: Await the refresh to ensure UI updates
      console.log('✅ [Admin] Estimates list refreshed');
    } catch (error) {
      console.error('🚨 [Admin] Error deleting estimate:', error);
      toast({
        title: 'Error',
        description: `Failed to delete estimate: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewEstimate = (estimate: ExtendedEstimate) => {
    trackFunnelStep('admin_estimate_view', { estimate_id: estimate.id });
    navigate(`/estimates/${estimate.id}`);
  };

  const handleEditEstimate = (estimate: ExtendedEstimate) => {
    trackFunnelStep('admin_estimate_edit', { 
      estimate_id: estimate.id,
      creator_role: estimate.creator_role 
    });
    
    // Navigate to edit mode with admin override and original creator info
    navigate(`/estimates/${estimate.id}?adminEdit=true&originalCreator=${estimate.creator_name}&originalCreatorRole=${estimate.creator_role}`);
  };

  // Filter estimates based on search and filters
  const filteredEstimates = estimates.filter(estimate => {
    const matchesSearch = !searchTerm || 
      estimate.customer_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Calculate metrics
  const pendingEstimates = estimates.filter(e => e.status === 'pending');
  const approvedEstimates = estimates.filter(e => e.status === 'approved');
  const rejectedEstimates = estimates.filter(e => e.status === 'rejected');
  const soldEstimates = estimates.filter(e => e.status === 'Sold');
  const totalValue = estimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
  const approvedValue = approvedEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-300';
      case 'approved': return 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-300';
      case 'rejected': return 'bg-gradient-to-r from-rose-500 to-pink-600 text-white border-rose-300 shadow-lg';
      case 'Sold': return 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white border-blue-300';
      default: return 'bg-gradient-to-r from-gray-400 to-slate-500 text-white border-gray-300';
    }
  };

  // 🎨 TERRITORY-BASED COLOR SYSTEM
  // Maps territories to their unique color schemes
  const getTerritoryTheme = (territoryName?: string, role?: string) => {
    // 🔒 Admin cards remain blue regardless of territory
    if (role === 'admin') {
      return {
        border: 'border-blue-200 hover:border-blue-300',
        headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100',
        titleColor: 'text-blue-800',
        accentColor: 'text-blue-600',
        badgeColors: 'border-blue-200 text-blue-700 bg-blue-50',
        territoryLabel: 'Admin'
      };
    }

    // 🏢 Territory-based colors for managers and reps
    switch (territoryName?.toLowerCase()) {
      case 'southwest florida':
      case 'tampa': // Keep for backward compatibility
        return {
          border: 'border-emerald-200 hover:border-emerald-300',
          headerBg: 'bg-gradient-to-r from-emerald-50 to-emerald-100',
          titleColor: 'text-emerald-800',
          accentColor: 'text-emerald-600',
          badgeColors: 'border-emerald-200 text-emerald-700 bg-emerald-50',
          territoryLabel: territoryName === 'tampa' ? 'Tampa' : 'Southwest Florida'
        };
      case 'north central florida':
        return {
          border: 'border-cyan-200 hover:border-cyan-300',
          headerBg: 'bg-gradient-to-r from-cyan-50 to-cyan-100',
          titleColor: 'text-cyan-800',
          accentColor: 'text-cyan-600',
          badgeColors: 'border-cyan-200 text-cyan-700 bg-cyan-50',
          territoryLabel: 'North Central Florida'
        };
      case 'central florida':
        return {
          border: 'border-purple-200 hover:border-purple-300',
          headerBg: 'bg-gradient-to-r from-purple-50 to-purple-100',
          titleColor: 'text-purple-800',
          accentColor: 'text-purple-600',
          badgeColors: 'border-purple-200 text-purple-700 bg-purple-50',
          territoryLabel: 'Central Florida'
        };
      case 'south florida':
        return {
          border: 'border-pink-200 hover:border-pink-300',
          headerBg: 'bg-gradient-to-r from-pink-50 to-pink-100',
          titleColor: 'text-pink-800',
          accentColor: 'text-pink-600',
          badgeColors: 'border-pink-200 text-pink-700 bg-pink-50',
          territoryLabel: 'South Florida'
        };
      case 'southeast florida':
        return {
          border: 'border-amber-200 hover:border-amber-300',
          headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100',
          titleColor: 'text-amber-800',
          accentColor: 'text-amber-600',
          badgeColors: 'border-amber-200 text-amber-700 bg-amber-50',
          territoryLabel: 'Southeast Florida'
        };
      case 'northeast florida':
        return {
          border: 'border-indigo-200 hover:border-indigo-300',
          headerBg: 'bg-gradient-to-r from-indigo-50 to-indigo-100',
          titleColor: 'text-indigo-800',
          accentColor: 'text-indigo-600',
          badgeColors: 'border-indigo-200 text-indigo-700 bg-indigo-50',
          territoryLabel: 'Northeast Florida'
        };
      case 'east missouri':
        return {
          border: 'border-red-200 hover:border-red-300',
          headerBg: 'bg-gradient-to-r from-red-50 to-red-100',
          titleColor: 'text-red-800',
          accentColor: 'text-red-600',
          badgeColors: 'border-red-200 text-red-700 bg-red-50',
          territoryLabel: 'East Missouri'
        };
      case 'west missouri':
        return {
          border: 'border-blue-200 hover:border-blue-300',
          headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100',
          titleColor: 'text-blue-800',
          accentColor: 'text-blue-600',
          badgeColors: 'border-blue-200 text-blue-700 bg-blue-50',
          territoryLabel: 'West Missouri'
        };
      default:
        // Fallback for unknown territories or reps without territory
        return {
          border: 'border-gray-200 hover:border-gray-300',
          headerBg: 'bg-gradient-to-r from-gray-50 to-gray-100',
          titleColor: 'text-gray-800',
          accentColor: 'text-gray-600',
          badgeColors: 'border-gray-200 text-gray-700 bg-gray-50',
          territoryLabel: 'Unknown'
        };
    }
  };

  const currency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const MetricCard = ({ title, value, subtitle, icon: Icon, gradient, trend }: any) => (
    <div className="relative group">
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gray-800/70 backdrop-blur-md border border-green-700/30 shadow-xl shadow-black/20 transform transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/20">
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />
        
        {/* Icon with glow effect */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{value}</div>
          </div>
        </div>
        
        {/* Text content */}
        <div className="relative z-10">
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center mt-2 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </div>
        
        {/* Hover shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </div>
    </div>
  );

  const EstimateCard = ({ estimate }: { estimate: ExtendedEstimate }) => {
    const creatorName = estimate.creator_name || estimate.customer_name || 'Unknown';
    const territoryName = estimate.territory_name || 'Unknown Territory';
    const theme = getTerritoryTheme(territoryName.toLowerCase());

    return (
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg bg-gray-800/70 backdrop-blur-md border-green-700/30 shadow-xl shadow-black/20 hover:shadow-green-500/20 relative">
        <CardHeader className="p-3 sm:p-4 relative bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-b border-green-700/30">
          <div className="flex justify-between items-start relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm truncate text-white leading-tight">
                {estimate.customer_address}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mt-0.5">
                <span className="text-xs font-medium text-green-400 truncate">
                  {creatorName}
                </span>
                <span className="text-xs text-gray-400 truncate">
                  ({estimate.creator_role === 'admin' ? 'Admin' : 
                    estimate.creator_role === 'manager' ? 'Manager' : 'Rep'})
                </span>
                {/* Territory indicator */}
                {territoryName !== 'Unknown Territory' && (
                  <Badge className="text-xs bg-green-600/20 text-green-300 border-green-500/50">
                    {territoryName}
                  </Badge>
                )}
              </div>
            </div>
            <Badge className={`text-xs ${getStatusColor(estimate.status)} shadow-sm flex-shrink-0`}>
              {estimate.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 bg-gray-800/50 p-3 sm:p-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-400 mb-0.5">Date</p>
                <p className="font-medium text-xs text-gray-200">
                  {new Date(estimate.created_at || '').toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Total</p>
                <p className="text-sm sm:text-base font-bold text-green-400">
                  {currency(estimate.total_price || 0)}
                </p>
              </div>
            </div>

            {/* Button layout */}
            <div className="space-y-2 pt-1">
              {/* Top row: View and Edit */}
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewEstimate(estimate)}
                  className="text-xs h-7 bg-gray-700/50 border-gray-600 text-gray-200 hover:bg-gray-600/50 hover:text-white transition-colors"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditEstimate(estimate)}
                  className="text-xs h-7 bg-gray-700/50 border-gray-600 text-gray-200 hover:bg-gray-600/50 hover:text-white transition-colors"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>

              {/* Bottom row: Pending actions or Delete */}
              <div className="flex gap-1.5">
                {estimate.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedEstimate(estimate);
                        setIsApproveDialogOpen(true);
                      }}
                      className="flex-1 text-xs h-7 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-sm"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedEstimate(estimate);
                        setIsRejectDialogOpen(true);
                      }}
                      className="flex-1 text-xs h-7 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="sm:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Estimate
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-base">
                            Are you sure you want to permanently delete this estimate for{' '}
                            <strong className="text-gray-900">{estimate.customer_address}</strong>?{' '}
                            <span className="text-rose-600 font-medium">This action cannot be undone.</span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md"
                            onClick={() => handleDelete(estimate)}
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <div className="flex justify-end w-full">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 transition-colors"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="sm:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Estimate
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-base">
                            Are you sure you want to permanently delete this estimate for{' '}
                            <strong className="text-gray-900">{estimate.customer_address}</strong>?{' '}
                            <span className="text-rose-600 font-medium">This action cannot be undone.</span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md"
                            onClick={() => handleDelete(estimate)}
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>

            {estimate.status === 'rejected' && estimate.rejection_reason && (
              <div className="p-2 bg-gradient-to-r from-rose-50 to-pink-50 rounded border-l-2 border-rose-400 mt-2">
                <p className="text-xs text-rose-800">
                  <strong>Rejected:</strong> {estimate.rejection_reason}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Loading Estimates</h2>
            <p className="text-muted-foreground">Setting up admin estimate management...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section with Glass Morphism */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
          Admin Estimate Management
        </h2>
        <p className="text-gray-400 text-lg">
          Comprehensive dashboard for managing all estimates across territories with role-based insights and advanced analytics
        </p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="Total Estimates"
          value={estimates.length}
          subtitle="All time"
          icon={Users}
          gradient="from-blue-500 to-indigo-600"
          trend={12.3}
        />
        <MetricCard
          title="Pending Review"
          value={pendingEstimates.length}
          subtitle="Needs attention"
          icon={Clock}
          gradient="from-amber-500 to-orange-600"
          trend={-5.2}
        />
        <MetricCard
          title="Accepted"
          value={approvedEstimates.length}
          subtitle="Ready for sale"
          icon={CheckCircle2}
          gradient="from-green-500 to-emerald-600"
          trend={18.7}
        />
        <MetricCard
          title="Sold"
          value={soldEstimates.length}
          subtitle="Completed"
          icon={TrendingUp}
          gradient="from-purple-500 to-indigo-600"
          trend={8.4}
        />
        <MetricCard
          title="Total Value"
          value={currency(totalValue)}
          subtitle="Portfolio value"
          icon={DollarSign}
          gradient="from-emerald-500 to-teal-600"
          trend={15.2}
        />
      </div>

      {/* Search and Management Section */}
      <Card className="bg-gray-800/70 backdrop-blur-md border-green-700/30 shadow-xl shadow-black/20">
        <CardHeader className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-b border-green-700/30 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl text-white">Estimate Management Console</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 bg-gray-800/50">
          <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by address, creator, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20 h-10"
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800/70 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-green-700/30">
              <TabsTrigger value="pending" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">
                Pending ({pendingEstimates.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">
                Accepted ({approvedEstimates.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">
                Rejected ({rejectedEstimates.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">
                All ({estimates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 sm:mt-6">
              <div className="space-y-4">
                <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-lg border border-amber-700/30">
                  <p className="text-base sm:text-lg font-semibold text-amber-400">
                    🔍 {pendingEstimates.length} Estimates Need Review
                  </p>
                  <p className="text-xs sm:text-sm text-amber-300">Review and approve estimates to move them forward</p>
                </div>
              </div>
              {pendingEstimates.length === 0 ? (
                <Card className="border-dashed border-2 border-amber-700/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20">
                  <CardContent className="p-8 sm:p-12 text-center">
                    <Clock className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-amber-400" />
                    <h3 className="text-lg sm:text-xl font-semibold text-amber-300 mb-2">No Pending Estimates</h3>
                    <p className="text-sm sm:text-base text-amber-300/80">Great job! All estimates have been reviewed.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {pendingEstimates.map(estimate => (
                    <EstimateCard key={estimate.id} estimate={estimate} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-4 sm:mt-6">
              <div className="space-y-4">
                <div className="p-3 sm:p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg border border-green-700/30">
                  <p className="text-base sm:text-lg font-semibold text-green-400">
                    💰 Accepted Value: {currency(approvedValue)}
                  </p>
                  <p className="text-xs sm:text-sm text-green-300">Ready for client presentation and sale</p>
                </div>
              </div>
              {approvedEstimates.length === 0 ? (
                <Card className="border-dashed border-2 border-green-700/30 bg-gradient-to-br from-green-900/20 to-emerald-900/20">
                  <CardContent className="p-8 sm:p-12 text-center">
                    <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-green-400" />
                    <h3 className="text-lg sm:text-xl font-semibold text-green-300 mb-2">No Accepted Estimates</h3>
                    <p className="text-sm sm:text-base text-green-300/80">Accepted estimates will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {approvedEstimates.map(estimate => (
                    <EstimateCard key={estimate.id} estimate={estimate} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="mt-4 sm:mt-6">
              {rejectedEstimates.length === 0 ? (
                <Card className="border-dashed border-2 border-rose-700/30 bg-gradient-to-br from-rose-900/20 to-pink-900/20">
                  <CardContent className="p-8 sm:p-12 text-center">
                    <XCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-rose-400" />
                    <h3 className="text-lg sm:text-xl font-semibold text-rose-300 mb-2">No Rejected Estimates</h3>
                    <p className="text-sm sm:text-base text-rose-300/80">Excellent! No estimates have been rejected.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {rejectedEstimates.map(estimate => (
                    <EstimateCard key={estimate.id} estimate={estimate} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-4 sm:mt-6">
              {filteredEstimates.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-slate-100">
                  <CardContent className="p-8 sm:p-12 text-center">
                    <Search className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No Matching Estimates</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">Try adjusting your search criteria</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {filteredEstimates.map(estimate => (
                    <EstimateCard key={estimate.id} estimate={estimate} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Accept Estimate
            </DialogTitle>
            <DialogDescription>
              Accepting this estimate will finalize it and allow PDF generation. 
              Add any notes before accepting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add any notes or comments about the approval..."
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={isActionLoading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {isActionLoading ? 'Accepting...' : 'Accept Estimate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              Reject Estimate
            </DialogTitle>
            <DialogDescription>
              Please provide a detailed reason for rejecting this estimate. 
              This will be saved and visible to the creator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection (required)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="resize-none border-rose-200 focus:border-rose-400 focus:ring-rose-300"
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject} 
              disabled={isActionLoading || !rejectionReason.trim()}
              className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md transform hover:scale-105 transition-all duration-200"
            >
              {isActionLoading ? 'Rejecting...' : 'Reject Estimate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; // Force deployment Mon Jul  7 14:00:14 EDT 2025
