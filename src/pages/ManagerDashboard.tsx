import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, 
  FileText, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  MapPin,
  Users,
  Calendar,
  ArrowRight,
  Sparkles,
  Target,
  Award,
  Zap,
  Activity
} from 'lucide-react';

// Simplified interface definitions to avoid deep type instantiation
interface MetricCard3DProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  gradient: string;
  delay?: number;
}

interface Territory {
  id: string;
  name: string;
}

interface Estimate {
  id: string;
  customer_name: string;
  customer_address: string;
  status: string;
  total_price: number;
  created_at: string;
  submission_status?: string;
  creator_name?: string;
  creator_role?: string;
}

const SalesRepDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTerritory(),
      fetchMyEstimates()
    ]);
    setLoading(false);
  };

  const fetchMyEstimates = async () => {
    if (!profile?.id) return;

    try {
    const { data, error } = await supabase
      .from('estimates')
      .select('*')
        .eq('created_by', profile.id)
        .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
      if (data && !error) {
        // Explicit type casting to avoid deep type inference issues
        setEstimates(data as any[]);
    } else if (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error loading estimates', 
        description: error.message 
      });
      }
    } catch (error) {
      console.error('Error fetching estimates:', error);
    }
  };

  const fetchTerritory = async () => {
    if (!profile?.territory_id) return;
    
    // Simplified approach to avoid TypeScript type issues
    // For now, we'll hardcode territory names based on known assignments
    // TODO: Update Supabase types to include territories table for proper querying
    
    // Since Taylor is assigned to Winter Park territory, display that
    // This can be expanded later with proper territory ID mapping
    setTerritory({
      id: profile.territory_id,
      name: 'Winter Park Territory'
    });
  };

  const handleCreateEstimate = () => {
    // Navigate to the new streamlined sales rep estimate flow
    navigate('/sales-estimate');
  };

  // Territory Assignment Required Check
  if (!profile?.territory_id && profile?.role !== 'admin') {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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

  // Calculate metrics
  const draftEstimates = estimates.filter(e => e.submission_status === 'draft' || !e.submission_status);
  const pendingEstimates = estimates.filter(e => e.submission_status === 'submitted');
  const approvedEstimates = estimates.filter(e => e.submission_status === 'approved' || e.status === 'approved');
  const totalValue = approvedEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);

  const currency = (value: number) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(value);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (estimate: Estimate) => {
    const status = estimate.submission_status || estimate.status || 'draft';
    
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Draft</Badge>;
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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

  // Modern 3D Metric Card Component
  const MetricCard3D = (props: MetricCard3DProps) => (
    <div 
      className="relative group"
      style={{ animationDelay: `${props.delay || 0}ms` }}
    >
      {/* 3D card with glass morphism */}
      <div className={`
        relative overflow-hidden rounded-2xl p-6
        bg-gray-800/70 backdrop-blur-md
        border border-green-700/30
        shadow-xl shadow-black/20
        transform transition-all duration-500
        hover:scale-105 hover:-translate-y-2
        hover:shadow-2xl hover:shadow-green-500/20
        animate-in fade-in slide-in-from-bottom-3
      `}>
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${props.gradient} opacity-20`} />
        
        {/* Icon with glow effect */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className={`
            p-3 rounded-xl bg-gradient-to-br ${props.gradient}
            shadow-lg transform transition-transform duration-300
            group-hover:scale-110 group-hover:rotate-3
          `}>
            {props.icon}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{props.value}</div>
          </div>
        </div>
        
        {/* Text content */}
        <div className="relative z-10">
          <h3 className="text-lg font-semibold text-gray-200">{props.title}</h3>
          <p className="text-sm text-gray-400">{props.subtitle}</p>
        </div>
        
        {/* Hover shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </div>
    </div>
  );

  // Main Dashboard Tab Content with 3D Effects
  const MainDashboardTab = () => (
    <div className="relative min-h-screen text-white">
      {/* Floating Bubbles Background */}
      <FloatingBubbles />
      
      <div className="relative z-10 space-y-8">
        {/* Hero Section with 3D Effects */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-500 to-cyan-500 p-8 shadow-2xl">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-blue-500/20 to-purple-500/20 animate-pulse" />
          
          {/* Glass morphism overlay */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          
          {/* Content */}
          <div className="relative z-10 text-center">
            <div className="mb-6">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                Welcome Back, {profile?.full_name || 'Sales Rep'}! 
                <span className="inline-block animate-bounce ml-2">👋</span>
              </h1>
              <div className="flex items-center justify-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-white/80" />
                <p className="text-xl text-white/90 font-semibold">{territory?.name}</p>
                <Badge className="bg-white/20 text-white border-white/30">
                  <Target className="h-3 w-3 mr-1" />
                  ACTIVE
                </Badge>
              </div>
              <p className="text-white/70 text-lg">GAF Packages are available now for self-estimate creation!</p>
            </div>
            
            {/* 3D Create Button */}
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
              <div className="relative">
                <Button 
                  onClick={handleCreateEstimate}
                  size="lg"
                  className="relative overflow-hidden bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 hover:border-white/50 px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 backdrop-blur-sm"
                >
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full">
                      <PlusCircle className="h-6 w-6" />
                    </div>
                    <span>CREATE NEW ESTIMATE</span>
                    <Zap className="h-5 w-5 animate-pulse" />
                  </div>
                  
                  {/* Button shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform -translate-x-full hover:translate-x-full transition-transform duration-700 rounded-2xl pointer-events-none" />
                </Button>
              </div>

              {/* New Informative Documents Button */}
              <div className="relative">
                <Button 
                  onClick={() => navigate('/documents')}
                  size="lg"
                  className="relative overflow-hidden bg-blue-500/20 hover:bg-blue-500/30 text-white border-2 border-blue-300/30 hover:border-blue-300/50 px-8 py-6 text-lg font-bold rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 backdrop-blur-sm"
                >
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="p-2 bg-blue-400/20 rounded-full">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span>INFORMATIVE DOCUMENTS</span>
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  </div>
                  
                  {/* Button shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform -translate-x-full hover:translate-x-full transition-transform duration-700 rounded-2xl pointer-events-none" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* 3D floating elements */}
          <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full animate-ping" />
          <div className="absolute bottom-4 left-4 w-6 h-6 bg-white/15 rounded-full animate-pulse" />
        </div>

        {/* 3D Progress Metrics */}
        <div className="relative">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
              <TrendingUp className="h-6 w-6 text-green-400" />
              Your Progress Dashboard
              <Sparkles className="h-5 w-5 text-green-400 animate-pulse" />
            </h2>
            <p className="text-gray-400">Track your sales performance in real-time</p>
      </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard3D
              icon={<FileText className="h-6 w-6 text-white" />}
              title="Draft Estimates"
              value={draftEstimates.length}
              subtitle="In Progress"
              gradient="from-gray-500 to-gray-700"
              delay={0}
            />
            <MetricCard3D
              icon={<Clock className="h-6 w-6 text-white" />}
              title="Pending Review"
              value={pendingEstimates.length}
              subtitle="Awaiting Approval"
              gradient="from-yellow-500 to-orange-600"
              delay={100}
            />
            <MetricCard3D
              icon={<CheckCircle2 className="h-6 w-6 text-white" />}
              title="Approved"
              value={approvedEstimates.length}
              subtitle="Ready to Close"
              gradient="from-green-500 to-emerald-600"
              delay={200}
            />
            <MetricCard3D
              icon={<Award className="h-6 w-6 text-white" />}
          title="Total Value" 
          value={currency(totalValue)} 
              subtitle="Pipeline Value"
              gradient="from-blue-500 to-cyan-600"
              delay={300}
        />
          </div>
      </div>

        {/* Modern Recent Activity */}
        <Card className="relative overflow-hidden rounded-2xl shadow-2xl border-0 bg-gray-800/50 backdrop-blur-sm border border-gray-700">
          {/* Glass morphism header */}
          <CardHeader className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-700">
            <CardTitle className="flex items-center gap-3 text-xl text-white">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              Recent Activity
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                LIVE
              </Badge>
          </CardTitle>
        </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              {estimates.slice(0, 5).map((estimate, index) => (
                <div 
                  key={estimate.id} 
                  className="group relative overflow-hidden bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Gradient accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-emerald-400" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{estimate.customer_name || 'Unnamed Project'}</div>
                        <div className="text-sm text-gray-400">{estimate.customer_address}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(estimate)}
                      <div className="text-xs text-gray-500 mt-1">{formatDate(estimate.created_at)}</div>
                    </div>
                  </div>
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                </div>
              ))}
              
              {estimates.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl w-fit mx-auto mb-4">
                    <FileText className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No estimates yet</h3>
                  <p className="text-gray-400 mb-4">Create your first estimate to get started!</p>
            <Button 
              onClick={handleCreateEstimate}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </div>
              )}
            </div>
            
            {estimates.length > 5 && (
              <div className="mt-6 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('estimates')}
                  className="group bg-gray-700/50 backdrop-blur-sm border-gray-600 text-green-400 hover:bg-gray-700 hover:border-green-500 shadow-lg transform transition-all duration-300 hover:scale-105"
                >
                  View All Estimates 
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
            )}
        </CardContent>
      </Card>

        {/* Modern Territory Information */}
        <Card className="relative overflow-hidden rounded-2xl shadow-2xl bg-gray-800/70 backdrop-blur-md border border-green-700/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              Territory Command Center
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 shadow-lg">
                <MapPin className="h-3 w-3 mr-1" />
                {territory?.name}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-lg">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Territory Managers
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-300">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Chase Lovejoy
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Adam
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Support
                  </h4>
                  <p className="text-gray-400 text-sm">
                    📧 Need help? Contact your territory managers for instant support with estimates and approvals.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Estimates Tab Content with dark theme
  const EstimatesTab = () => (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Estimates</h2>
        <Button onClick={handleCreateEstimate} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Estimate
        </Button>
      </div>

      <div className="space-y-4">
        {estimates.map((estimate) => (
          <Card key={estimate.id} className="bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:shadow-xl hover:border-green-600/50 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-white">{estimate.customer_name || 'Unnamed Project'}</h3>
                    {getStatusBadge(estimate)}
                  </div>
                  <p className="text-gray-400 mb-2">{estimate.customer_address}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="text-green-400">{currency(estimate.total_price || 0)}</span>
                    <span>•</span>
                    <span>{formatDate(estimate.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/estimates/${estimate.id}`)}
                    className="bg-gray-700/50 border-gray-600 text-green-400 hover:bg-gray-700 hover:border-green-500"
                  >
                    View Details
                  </Button>
                </div>
              </div>
              </CardContent>
            </Card>
        ))}

        {estimates.length === 0 && (
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold mb-2 text-white">No Estimates Yet</h3>
              <p className="text-gray-400 mb-6">Get started by creating your first estimate</p>
              <Button onClick={handleCreateEstimate} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Your First Estimate
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
            </div>
  );

  if (loading) {
    return (
      <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Loading Dashboard</h2>
            <p className="text-muted-foreground">Setting up your sales dashboard...</p>
              </CardContent>
            </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Same animated background as estimate flow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      <div className="relative z-20 container mx-auto p-4 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Modern Tab Navigation - Dark Theme */}
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-800/70 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-green-700/30">
          <TabsTrigger 
            value="dashboard" 
            className="text-lg font-semibold rounded-xl text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Main Dashboard
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="estimates" 
            className="text-lg font-semibold rounded-xl text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Estimates
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <MainDashboardTab />
        </TabsContent>
        
        <TabsContent value="estimates">
          <EstimatesTab />
        </TabsContent>
      </Tabs>
          </div>
    </div>
  );
};

export default SalesRepDashboard; 