import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database, RefreshCw } from 'lucide-react';

interface DataStats {
  estimates: number;
  measurements: number;
}

export const DataCleanup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DataStats | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Only show to admins
  if (profile?.role !== 'admin') {
    return null;
  }

  const refreshDataCounts = async () => {
    setIsLoading(true);
    try {
      const [estimatesResult, measurementsResult] = await Promise.all([
        supabase.from('estimates').select('id'),
        supabase.from('measurements').select('id')
      ]);

      const counts = {
        estimates: estimatesResult.data?.length || 0,
        measurements: measurementsResult.data?.length || 0
      };
      
      setStats(counts);
      
      toast({
        title: 'Data Counts Refreshed',
        description: `Found ${counts.estimates} estimates and ${counts.measurements} measurements`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Failed to get data counts:', error);
      toast({
        title: 'Error Getting Data Counts',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
          <Database className="h-4 w-4" />
          Admin: Database Info
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {stats ? (
              <div className="text-sm text-muted-foreground">
                <p>📊 <strong>{stats.estimates}</strong> estimates</p>
                <p>📏 <strong>{stats.measurements}</strong> measurements</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click refresh to check database counts
              </p>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshDataCounts}
            disabled={isLoading}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
        
        <div className="mt-3 p-2 bg-blue-100 rounded-md">
          <p className="text-xs text-blue-700">
            💡 <strong>Note:</strong> For bulk deletions, use the individual estimate management pages or contact database admin.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}; 