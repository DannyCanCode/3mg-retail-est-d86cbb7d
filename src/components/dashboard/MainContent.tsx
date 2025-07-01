import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DashboardOverview } from './DashboardOverview';
import { RecentEstimates } from './RecentEstimates';
import { DataCleanup } from '@/components/admin/DataCleanup';
import { AdminEstimateManagement } from '@/components/admin/AdminEstimateManagement';
import { PostHogAnalyticsDashboard } from '@/components/admin/PostHogAnalyticsDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const MainContent: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Admin Dashboard - 3MG Retail Roofing Estimator' : 'Welcome back to 3MG Retail Roofing Estimator'}
          </p>
        </div>
        <Button asChild>
          <Link to="/estimates" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>New Estimate</span>
          </Link>
        </Button>
      </div>

      {isAdmin ? (
        <>
          {/* Admin-specific dashboard with comprehensive management */}
          <Tabs defaultValue="estimates" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="estimates">Estimate Management</TabsTrigger>
              <TabsTrigger value="analytics">PostHog Analytics</TabsTrigger>
              <TabsTrigger value="system">System Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="estimates" className="mt-6">
              <AdminEstimateManagement />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <PostHogAnalyticsDashboard />
            </TabsContent>

            <TabsContent value="system" className="mt-6">
              <DataCleanup />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <>
          {/* Standard dashboard for non-admin users */}
          <DashboardOverview />
          
          <div className="grid grid-cols-1">
            <div className="lg:col-span-1">
              <RecentEstimates />
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 