import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Shield,
  Activity,
  Users,
  FileText,
  TrendingUp,
  Sparkles,
  Database,
  BarChart3,
  Settings,
  Zap,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Target,
  MapPin
} from 'lucide-react';
import { AdminEstimateManagement } from '@/components/admin/AdminEstimateManagement';
import { PostHogAnalyticsDashboard } from '@/components/admin/PostHogAnalyticsDashboard';
import { DataCleanup } from '@/components/admin/DataCleanup';

// Simplified interface definitions
interface MetricCard3DProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  gradient: string;
  delay?: number;
}

export const MainContent: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Admin metrics
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalEstimates, setTotalEstimates] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingEstimates, setPendingEstimates] = useState(0);
  const [territories, setTerritories] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      setTotalUsers(userCount || 0);

      // Fetch estimates data
      const { data: estimatesData, count: estimateCount } = await supabase
        .from('estimates')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);
      
      setTotalEstimates(estimateCount || 0);
      
      if (estimatesData) {
        // Calculate total revenue from approved estimates
        const revenue = estimatesData
          .filter((e: any) => e.status === 'approved' || e.submission_status === 'approved')
          .reduce((sum, e) => sum + (e.total_price || 0), 0);
        setTotalRevenue(revenue);
        
        // Count pending estimates
        const pending = estimatesData.filter((e: any) => e.submission_status === 'submitted').length;
        setPendingEstimates(pending);
        
        // Get recent activity (last 10 estimates)
        const recent = estimatesData
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
        setRecentActivity(recent);
      }

      // Fetch territories
      const { data: territoriesData } = await supabase
        .from('territories')
        .select('*')
        .order('name');
      setTerritories(territoriesData || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error loading dashboard data' 
      });
    } finally {
      setLoading(false);
    }
  };

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

  // 3D Floating Bubbles Background Component - GREEN THEME
  const FloatingBubbles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-10 left-10 w-20 h-20 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full animate-pulse" 
           style={{ animationDelay: '0s', animationDuration: '3s' }} />
      <div className="absolute top-32 right-20 w-16 h-16 bg-gradient-to-br from-blue-400/15 to-green-400/15 rounded-full animate-bounce" 
           style={{ animationDelay: '1s', animationDuration: '4s' }} />
      <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-br from-green-500/25 to-emerald-400/25 rounded-full animate-ping" 
           style={{ animationDelay: '2s', animationDuration: '5s' }} />
      <div className="absolute top-1/2 right-10 w-14 h-14 bg-gradient-to-br from-cyan-400/20 to-green-400/20 rounded-full animate-pulse" 
           style={{ animationDelay: '0.5s', animationDuration: '3.5s' }} />
      <div className="absolute bottom-32 right-1/3 w-18 h-18 bg-gradient-to-br from-emerald-400/15 to-green-500/15 rounded-full animate-bounce" 
           style={{ animationDelay: '1.5s', animationDuration: '4.5s' }} />
    </div>
  );

  // Modern 3D Metric Card Component - GREEN BORDERS
  const MetricCard3D = (props: MetricCard3DProps) => (
    <div 
      className="relative group"
      style={{ animationDelay: `${props.delay || 0}ms` }}
    >
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
        <div className={`absolute inset-0 bg-gradient-to-br ${props.gradient} opacity-20`} />
        
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
        
        <div className="relative z-10">
          <h3 className="text-lg font-semibold text-gray-200">{props.title}</h3>
          <p className="text-sm text-gray-400">{props.subtitle}</p>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </div>
    </div>
  );

  // Main Dashboard Tab
  const MainDashboardTab = () => (
    <div className="relative min-h-screen text-white">
      <FloatingBubbles />
      
      <div className="relative z-10 space-y-8">
        {/* Hero Section - GREEN THEME */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-500 to-cyan-500 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-blue-500/20 to-emerald-500/20 animate-pulse" />
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          
          <div className="relative z-10 text-center">
            <div className="mb-6">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                Welcome Back, {profile?.full_name || 'Administrator'}! 
                <span className="inline-block animate-bounce ml-2">🛡️</span>
              </h1>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-white/80" />
                <p className="text-xl text-white/90 font-semibold">System Administrator</p>
                <Badge className="bg-white/20 text-white border-white/30">
                  <Activity className="h-3 w-3 mr-1" />
                  FULL ACCESS
                </Badge>
              </div>
              <p className="text-white/70 text-lg">Complete control over the 3MG Retail Estimator system</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
              <Button 
                onClick={() => navigate('/estimates')}
                size="lg"
                className="relative overflow-hidden bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 hover:border-white/50 px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 backdrop-blur-sm"
              >
                <div className="relative z-10 flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span>CREATE NEW ESTIMATE</span>
                  <Zap className="h-5 w-5 animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform -translate-x-full hover:translate-x-full transition-transform duration-700 rounded-2xl pointer-events-none" />
              </Button>
            </div>
          </div>
          
          <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full animate-ping" />
          <div className="absolute bottom-4 left-4 w-6 h-6 bg-white/15 rounded-full animate-pulse" />
        </div>

        {/* System Metrics */}
        <div className="relative">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
              <TrendingUp className="h-6 w-6 text-green-400" />
              System Overview
              <Sparkles className="h-5 w-5 text-green-400 animate-pulse" />
            </h2>
            <p className="text-gray-400">Real-time system performance and metrics</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <MetricCard3D
              icon={<Users className="h-6 w-6 text-white" />}
              title="Total Users"
              value={totalUsers}
              subtitle="Active Accounts"
              gradient="from-purple-500 to-purple-700"
              delay={0}
            />
            <MetricCard3D
              icon={<FileText className="h-6 w-6 text-white" />}
              title="Total Estimates"
              value={totalEstimates}
              subtitle="All Time"
              gradient="from-blue-500 to-indigo-600"
              delay={100}
            />
            <MetricCard3D
              icon={<Clock className="h-6 w-6 text-white" />}
              title="Pending Review"
              value={pendingEstimates}
              subtitle="Need Attention"
              gradient="from-yellow-500 to-orange-600"
              delay={200}
            />
            <MetricCard3D
              icon={<DollarSign className="h-6 w-6 text-white" />}
              title="Total Revenue"
              value={currency(totalRevenue)}
              subtitle="Approved Estimates"
              gradient="from-green-500 to-emerald-600"
              delay={300}
            />
            <MetricCard3D
              icon={<Award className="h-6 w-6 text-white" />}
              title="Territories"
              value={territories.length}
              subtitle="Active Regions"
              gradient="from-pink-500 to-rose-600"
              delay={400}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="relative overflow-hidden rounded-2xl shadow-2xl border-0 bg-gray-800/50 backdrop-blur-sm border border-gray-700">
          <CardHeader className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-700">
            <CardTitle className="flex items-center gap-3 text-xl text-white">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              System Activity
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                LIVE
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="group relative overflow-hidden bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-emerald-400" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{activity.customer_name || 'Unnamed Project'}</div>
                        <div className="text-sm text-gray-300">{activity.customer_address}</div>
                        <div className="text-xs text-gray-400 mt-1">Territory: {activity.territory_id || 'Unassigned'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        activity.status === 'approved' ? 'bg-green-600/20 text-green-400 border-green-600/50' :
                        activity.submission_status === 'submitted' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50' :
                        'bg-gray-700/50 text-gray-300 border-gray-600'
                      }>
                        {activity.submission_status || activity.status || 'draft'}
                      </Badge>
                      <div className="text-xs text-gray-300 mt-1">{formatDate(activity.created_at)}</div>
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                </div>
              ))}
              
              {recentActivity.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl w-fit mx-auto mb-4">
                    <Activity className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No recent activity</h3>
                  <p className="text-gray-400">System activity will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden rounded-2xl shadow-2xl bg-gray-800/70 backdrop-blur-md border border-green-700/30 hover:shadow-green-500/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">Manage users, roles, and permissions</p>
              <Button 
                onClick={() => navigate('/users')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                Manage Users
              </Button>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-2xl shadow-2xl bg-gray-800/70 backdrop-blur-md border border-green-700/30 hover:shadow-green-500/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <Database className="h-5 w-5 text-white" />
                </div>
                Territory Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">Configure territories and assignments</p>
              <Button 
                onClick={() => navigate('/territories')}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                Manage Territories
              </Button>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-2xl shadow-2xl bg-gray-800/70 backdrop-blur-md border border-green-700/30 hover:shadow-green-500/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">Configure pricing and system settings</p>
              <Button 
                onClick={() => navigate('/pricing')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Pricing Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    // Non-admin users should have been redirected, but just in case
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need admin privileges to access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Same animated background as other dashboards */}
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
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-gray-800/70 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-green-700/30">
            <TabsTrigger 
              value="dashboard" 
              className="text-lg font-semibold rounded-xl text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Dashboard
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
            <TabsTrigger 
              value="analytics" 
              className="text-lg font-semibold rounded-xl text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="system" 
              className="text-lg font-semibold rounded-xl text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System
              </div>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <MainDashboardTab />
          </TabsContent>
          
          <TabsContent value="estimates">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
              <AdminEstimateManagement />
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
              <PostHogAnalyticsDashboard />
            </div>
          </TabsContent>
          
          <TabsContent value="system">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
              <DataCleanup />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}; 