import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('estimates');

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

      <div className="relative z-10 space-y-8 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">
              {isAdmin ? 'Admin Dashboard - 3MG Retail Roofing Estimator' : 'Welcome back to 3MG Retail Roofing Estimator'}
            </p>
          </div>
          <Button asChild className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25">
            <Link to="/estimates" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>New Estimate</span>
            </Link>
          </Button>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800/70 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-green-700/30">
            <TabsTrigger value="estimates" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">Estimate Management</TabsTrigger>
            <TabsTrigger value="analytics" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">PostHog Analytics</TabsTrigger>
            <TabsTrigger value="system" className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:text-white transition-all duration-300">System Tools</TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="estimates" className="space-y-6">
            <AdminEstimateManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <PostHogAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <DataCleanup />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}; 