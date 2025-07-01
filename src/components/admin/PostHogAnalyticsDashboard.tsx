import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Activity, 
  Zap, 
  MousePointer, 
  Clock,
  DollarSign,
  PieChart,
  LineChart,
  Settings,
  HelpCircle,
  Info
} from 'lucide-react';
import { 
  trackFunnelStep, 
  trackPerformanceMetric, 
  trackUserBehavior, 
  identifyUserCohort,
  isFeatureEnabled 
} from '@/lib/posthog';
import { postHogAPI } from '@/lib/posthog-api';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Utility functions for user-friendly metric names and explanations
const getEventDisplayName = (eventName: string): string => {
  const eventMap: Record<string, string> = {
    '$autocapture': 'Page Interactions',
    'funnel_step': 'Workflow Steps',
    '$dead_click': 'Dead Clicks',
    'performance_metric': 'Performance Tracking',
    'user_behavior': 'User Actions',
    'user_login': 'User Logins',
    '$set': 'Profile Updates',
    '$web_vitals': 'Web Performance',
    '$pageleave': 'Page Exits',
    'posthog_initialized': 'Analytics Started',
    'estimate_created': 'Estimate Created',
    'pdf_uploaded': 'PDF Uploaded',
    'materials_selected': 'Materials Selected',
    'estimate_approved': 'Estimate Approved',
    'estimate_sold': 'Estimate Sold'
  };
  
  return eventMap[eventName.toLowerCase()] || eventName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getEventExplanation = (eventName: string): string => {
  const explanationMap: Record<string, string> = {
    '$autocapture': 'Automatic tracking of user clicks, form submissions, and page interactions without custom code',
    'funnel_step': 'Users progressing through specific workflow steps in your application',
    '$dead_click': 'Clicks that don\'t trigger any action - potential UX issues or broken interactions',
    'performance_metric': 'Custom performance measurements like page load times and API response speeds',
    'user_behavior': 'Tracked user actions and behaviors throughout the application',
    'user_login': 'Successful user authentication events when users log into the system',
    '$set': 'User profile property updates and data modifications',
    '$web_vitals': 'Core web vitals like page load speed, visual stability, and interactivity metrics',
    '$pageleave': 'When users navigate away from or close pages in your application',
    'posthog_initialized': 'Analytics system startup events when PostHog tracking begins',
    'estimate_created': 'New roofing estimates created by users',
    'pdf_uploaded': 'EagleView PDF files uploaded for processing',
    'materials_selected': 'Users choosing materials and packages for estimates',
    'estimate_approved': 'Estimates approved for customer presentation',
    'estimate_sold': 'Successfully closed estimates that converted to sales'
  };
  
  return explanationMap[eventName.toLowerCase()] || 'User interaction tracked by the analytics system';
};

const formatPerformanceValue = (value: number, unit: string = 's'): string => {
  // Handle invalid/extreme values
  if (isNaN(value) || value < 0 || value > 3600) {
    return 'N/A';
  }
  
  if (unit === 's') {
    if (value < 1) {
      return `${Math.round(value * 1000)}ms`;
    }
    return `${value.toFixed(2)}s`;
  }
  
  if (unit === '%') {
    return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
  }
  
  return `${value.toFixed(2)}${unit}`;
};

const getPerformanceBarWidth = (value: number, maxValue: number = 10): number => {
  // Handle invalid values
  if (isNaN(value) || value < 0) return 0;
  if (value > maxValue) return 100;
  
  return Math.min(100, (value / maxValue) * 100);
};

interface AnalyticsData {
  totalEvents: number;
  activeUsers: number;
  conversionRate: number;
  avgSessionDuration: number;
  topEvents: { name: string; count: number; percentage: number }[];
  funnelData: { step: string; users: number; conversionRate: number }[];
  cohortMetrics: Record<string, { count: number; retentionRate: number; avgEstimates: number }>;
  performanceMetrics: {
    avgPageLoadTime: number;
    avgApiResponseTime: number;
    errorRate: number;
    pdfProcessingTime: number;
  };
  isUsingMockData?: boolean;
  apiError?: string;
  featureFlags?: any[];
  cohorts?: any[];
  scopeHelp?: string;
  dataSource?: string;
  isPartialData?: boolean;
}

export const PostHogAnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalEvents: 0,
    activeUsers: 0,
    conversionRate: 0,
    avgSessionDuration: 0,
    topEvents: [],
    funnelData: [],
    cohortMetrics: {},
    performanceMetrics: {
      avgPageLoadTime: 0,
      avgApiResponseTime: 0,
      errorRate: 0,
      pdfProcessingTime: 0
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    initializeAnalytics();
    fetchAnalyticsData();
  }, []);

  const initializeAnalytics = () => {
    // Track that admin viewed analytics dashboard
    trackFunnelStep('analytics_dashboard_viewed', {
      timestamp: new Date().toISOString(),
      user_type: 'admin'
    });

    // Track performance metric for dashboard load time
    const startTime = performance.now();
    setTimeout(() => {
      const loadTime = performance.now() - startTime;
      trackPerformanceMetric('dashboard_load_time', loadTime, {
        dashboard_type: 'analytics',
        user_role: 'admin'
      });
    }, 100);
  };

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Fetching real PostHog analytics data...');
      
      // Fetch real data from PostHog API
      const realData = await postHogAPI.getRealAnalyticsData();
      
      // Check if we got an error (fallback to enhanced mock data)
      if (realData.error) {
        console.warn('⚠️ PostHog API connection issue:', realData.error);
        
        // Enhanced mock data with real-time tracking
        const enhancedMockData = {
          totalEvents: 1247 + Math.floor(Math.random() * 50), // Add some variance
          activeUsers: 23 + Math.floor(Math.random() * 10),
          conversionRate: 68.5 + (Math.random() - 0.5) * 5,
          avgSessionDuration: 342 + Math.floor(Math.random() * 60),
          topEvents: [
            { name: 'estimate_created', count: 456, percentage: 36.6 },
            { name: 'pdf_uploaded', count: 298, percentage: 23.9 },
            { name: 'user_login', count: 187, percentage: 15.0 },
            { name: 'estimate_approved', count: 142, percentage: 11.4 },
            { name: 'estimate_sold', count: 89, percentage: 7.1 }
          ],
          funnelData: [
            { step: 'PDF Upload', users: 298, conversionRate: 100 },
            { step: 'Measurements', users: 276, conversionRate: 92.6 },
            { step: 'Materials Selection', users: 248, conversionRate: 83.2 },
            { step: 'Pricing', users: 234, conversionRate: 78.5 },
            { step: 'Estimate Created', users: 218, conversionRate: 73.2 },
            { step: 'Estimate Approved', users: 142, conversionRate: 47.7 },
            { step: 'Estimate Sold', users: 89, conversionRate: 29.9 }
          ],
          cohortMetrics: {
            adminUsers: { count: 4, retentionRate: 100, avgEstimates: 12.5 },
            managers: { count: 8, retentionRate: 87.5, avgEstimates: 8.3 },
            salesReps: { count: 11, retentionRate: 72.7, avgEstimates: 6.1 }
          },
          performanceMetrics: {
            avgPageLoadTime: 1.2 + (Math.random() - 0.5) * 0.4,
            avgApiResponseTime: 0.3 + (Math.random() - 0.5) * 0.1,
            errorRate: 0.8 + (Math.random() - 0.5) * 0.3,
            pdfProcessingTime: 4.2 + (Math.random() - 0.5) * 1.0
          },
          isUsingMockData: true,
          apiError: realData.error,
          scopeHelp: realData.scopeHelp
        };
        
        setAnalyticsData(enhancedMockData);
        
        const isPermissionError = realData.error?.includes('insight:read');
        toast({
          title: isPermissionError ? '⚠️ API Permissions Issue' : '⚠️ Using Mock Analytics Data',
          description: isPermissionError 
            ? 'PostHog API key needs insight:read scope. Check console for help.' 
            : 'PostHog API connection failed. Configure API keys for real data.',
          variant: 'destructive'
        });
      } else {
        console.log('✅ Successfully loaded real PostHog data!');
        
        const processedData = { 
          ...realData, 
          isUsingMockData: false,
          isPartialData: realData.dataSource === 'posthog_events_api'
        };
        
        setAnalyticsData(processedData);
        
        const isPartial = realData.dataSource === 'posthog_events_api';
        toast({
          title: isPartial ? '🎉 Partial Real Data Loaded' : '🎉 Full Real Analytics Data Loaded',
          description: isPartial 
            ? `Loaded ${realData.totalEvents} events. Add insight:read scope for full analytics.`
            : `Loaded ${realData.totalEvents} events from PostHog API`,
        });
      }
      
      // Track successful analytics load
      trackUserBehavior('analytics_data_loaded', {
        data_points: realData.totalEvents || 0,
        load_success: !realData.error,
        data_source: realData.error ? 'mock' : (realData.dataSource || 'posthog_api')
      });

    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      
      // Fallback to basic mock data
      const fallbackData = {
        totalEvents: 0,
        activeUsers: 0,
        conversionRate: 0,
        avgSessionDuration: 0,
        topEvents: [],
        funnelData: [],
        cohortMetrics: {},
        performanceMetrics: {
          avgPageLoadTime: 0,
          avgApiResponseTime: 0,
          errorRate: 0,
          pdfProcessingTime: 0
        },
        isUsingMockData: true,
        apiError: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setAnalyticsData(fallbackData);
      
      toast({
        title: 'Analytics Error',
        description: 'Failed to load analytics data. Check console for details.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeatureFlagTest = () => {
    // Example of A/B testing with feature flags
    const isNewUIEnabled = isFeatureEnabled('new_estimate_ui');
    
    trackUserBehavior('feature_flag_check', {
      feature_name: 'new_estimate_ui',
      is_enabled: isNewUIEnabled,
      user_role: 'admin'
    });

    toast({
      title: 'Feature Flag Test',
      description: `New UI feature is ${isNewUIEnabled ? 'enabled' : 'disabled'} for you`,
    });
  };

  const handleCohortAnalysis = () => {
    // Example of cohort identification
    identifyUserCohort('admin-001', {
      role: 'admin',
      territory: 'corporate',
      signupDate: '2024-01-01',
      estimatesCreated: 25,
      conversionRate: 85.2
    });

    trackUserBehavior('cohort_analysis_viewed', {
      analysis_type: 'user_segmentation',
      timestamp: new Date().toISOString()
    });

    toast({
      title: 'Cohort Analysis',
      description: 'User cohort data has been updated in PostHog',
    });
  };

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    color = 'blue' 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    trend?: number;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className={`flex items-center mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">
                  {trend >= 0 ? '+' : ''}{trend}% from last week
                </span>
              </div>
            )}
          </div>
          <Icon className={`h-8 w-8 text-${color}-500`} />
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Analytics</h2>
          <p className="text-muted-foreground">Fetching PostHog data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">PostHog Analytics Dashboard</h2>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-muted-foreground">
              Real-time insights and user behavior analytics
            </p>
            <TooltipProvider>
              {analyticsData.isUsingMockData ? (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                      📊 Mock Data
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Using sample data for demonstration. Configure PostHog API keys for real analytics.</p>
                  </TooltipContent>
                </Tooltip>
              ) : analyticsData.isPartialData ? (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      🔗 Partial Real Data
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p><strong>Limited Analytics Access</strong></p>
                    <p>Currently showing events data only. For full analytics including insights, funnels, and cohorts:</p>
                    <p>1. Go to PostHog Settings → Personal API Keys</p>
                    <p>2. Edit your API key</p>
                    <p>3. Add "insight:read" scope</p>
                    <p>4. Save and refresh this dashboard</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      🔗 Full Real Data
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Connected to PostHog with full analytics access including insights and advanced features.</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {analyticsData.scopeHelp && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                      ⚠️ Scope Missing
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{analyticsData.scopeHelp}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleFeatureFlagTest} variant="outline">
            <Target className="h-4 w-4 mr-2" />
            Test A/B Feature
          </Button>
          <Button onClick={handleCohortAnalysis} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Update Cohorts
          </Button>
          <Button onClick={fetchAnalyticsData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Events"
          value={analyticsData.totalEvents.toLocaleString()}
          subtitle="All tracked interactions"
          icon={Activity}
          trend={12.3}
          color="blue"
        />
        <MetricCard
          title="Active Users"
          value={analyticsData.activeUsers}
          subtitle="Last 30 days"
          icon={Users}
          trend={8.7}
          color="green"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${analyticsData.conversionRate}%`}
          subtitle="PDF → Sold estimates"
          icon={Target}
          trend={-2.1}
          color="orange"
        />
        <MetricCard
          title="Avg Session"
          value={`${Math.floor(analyticsData.avgSessionDuration / 60)}m ${analyticsData.avgSessionDuration % 60}s`}
          subtitle="User engagement time"
          icon={Clock}
          trend={5.4}
          color="purple"
        />
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Top Events</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="cohorts">User Cohorts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Events (Last 30 Days)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Most frequent user interactions and system events. Higher percentages indicate more common user behaviors.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topEvents.length > 0 ? analyticsData.topEvents.map((event, index) => (
                  <TooltipProvider key={event.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-help">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{index + 1}</Badge>
                            <div>
                              <p className="font-medium">{getEventDisplayName(event.name)}</p>
                              <p className="text-sm text-muted-foreground">{event.count.toLocaleString()} events</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{event.percentage}%</p>
                            <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, event.percentage)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p><strong>{getEventDisplayName(event.name)}</strong></p>
                        <p className="text-sm">{getEventExplanation(event.name)}</p>
                        <p className="text-xs mt-1 text-muted-foreground">
                          {event.percentage}% of all tracked events ({event.count.toLocaleString()} occurrences)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No event data available</p>
                    <p className="text-sm">Events will appear here as users interact with the application</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estimate Creation Funnel
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p><strong>Customer Journey Analytics</strong></p>
                      <p>Shows how users progress through the estimate creation process. Each step shows how many users continue vs. drop off.</p>
                      <p className="text-xs mt-1">Higher conversion rates indicate a smooth user experience at that step.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.funnelData.map((step, index) => (
                  <div key={step.step} className="relative">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{step.step}</p>
                          <p className="text-sm text-blue-600">{step.users} users</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-700">{step.conversionRate}%</p>
                        <p className="text-xs text-blue-600">conversion rate</p>
                      </div>
                    </div>
                    {index < analyticsData.funnelData.length - 1 && (
                      <div className="absolute left-6 top-full w-0.5 h-3 bg-blue-300"></div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Cohort Analysis
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p><strong>User Group Performance</strong></p>
                      <p>Compare behavior and engagement across different user roles and segments.</p>
                      <p className="text-xs mt-1">• <strong>Retention:</strong> % of users who remain active</p>
                      <p className="text-xs">• <strong>Avg Estimates:</strong> Estimates created per user</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(analyticsData.cohortMetrics).map(([role, metrics]) => (
                  <div key={role} className="p-4 border rounded-lg">
                    <h3 className="font-semibold capitalize text-lg mb-3">
                      {role.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Users</span>
                        <span className="font-medium">{metrics.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Retention</span>
                        <span className="font-medium text-green-600">{metrics.retentionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Estimates</span>
                        <span className="font-medium">{metrics.avgEstimates}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance Metrics
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p><strong>System Performance Health</strong></p>
                      <p>Key metrics for application speed and reliability:</p>
                      <p className="text-xs mt-1">• <strong>Page Load:</strong> How fast pages load for users</p>
                      <p className="text-xs">• <strong>API Response:</strong> Backend processing speed</p>
                      <p className="text-xs">• <strong>Error Rate:</strong> % of requests that fail</p>
                      <p className="text-xs">• <strong>PDF Processing:</strong> Time to parse uploaded files</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-800">Page Load Time</span>
                            <span className="text-lg font-bold text-green-700">
                              {formatPerformanceValue(analyticsData.performanceMetrics.avgPageLoadTime)}
                            </span>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${getPerformanceBarWidth(analyticsData.performanceMetrics.avgPageLoadTime, 5)}%` }}
                            />
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            {analyticsData.performanceMetrics.avgPageLoadTime <= 2 ? 'Excellent' : 
                             analyticsData.performanceMetrics.avgPageLoadTime <= 3 ? 'Good' : 
                             analyticsData.performanceMetrics.avgPageLoadTime <= 5 ? 'Fair' : 'Needs Improvement'}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Average time for pages to fully load. Target: under 3 seconds</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-800">API Response Time</span>
                            <span className="text-lg font-bold text-blue-700">
                              {formatPerformanceValue(analyticsData.performanceMetrics.avgApiResponseTime)}
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${getPerformanceBarWidth(analyticsData.performanceMetrics.avgApiResponseTime, 2)}%` }}
                            />
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            {analyticsData.performanceMetrics.avgApiResponseTime <= 0.5 ? 'Excellent' : 
                             analyticsData.performanceMetrics.avgApiResponseTime <= 1 ? 'Good' : 
                             analyticsData.performanceMetrics.avgApiResponseTime <= 2 ? 'Fair' : 'Needs Improvement'}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Average server response time for API calls. Target: under 500ms</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="space-y-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-red-800">Error Rate</span>
                            <span className="text-lg font-bold text-red-700">
                              {formatPerformanceValue(analyticsData.performanceMetrics.errorRate, '%')}
                            </span>
                          </div>
                          <div className="w-full bg-red-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${getPerformanceBarWidth(analyticsData.performanceMetrics.errorRate, 10)}%` }}
                            />
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            {analyticsData.performanceMetrics.errorRate <= 1 ? 'Excellent' : 
                             analyticsData.performanceMetrics.errorRate <= 3 ? 'Good' : 
                             analyticsData.performanceMetrics.errorRate <= 5 ? 'Fair' : 'Needs Attention'}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of requests that result in errors. Target: under 1%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-orange-800">PDF Processing</span>
                            <span className="text-lg font-bold text-orange-700">
                              {formatPerformanceValue(analyticsData.performanceMetrics.pdfProcessingTime)}
                            </span>
                          </div>
                          <div className="w-full bg-orange-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${getPerformanceBarWidth(analyticsData.performanceMetrics.pdfProcessingTime, 10)}%` }}
                            />
                          </div>
                          <p className="text-xs text-orange-600 mt-1">
                            {analyticsData.performanceMetrics.pdfProcessingTime <= 3 ? 'Excellent' : 
                             analyticsData.performanceMetrics.pdfProcessingTime <= 5 ? 'Good' : 
                             analyticsData.performanceMetrics.pdfProcessingTime <= 8 ? 'Fair' : 'Needs Improvement'}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Time to process and extract data from uploaded PDF files. Target: under 5 seconds</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
      </div>
    </TooltipProvider>
  );
}; 