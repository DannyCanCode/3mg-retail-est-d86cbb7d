import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Loader2 } from 'lucide-react';

interface CleanupStats {
  estimates: number;
  measurements: number;
}

export const DataCleanup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Only show to admins
  if (profile?.role !== 'admin') {
    return null;
  }

  const getDataCounts = async (): Promise<CleanupStats> => {
    const [estimatesResult, measurementsResult] = await Promise.all([
      supabase.from('estimates').select('id'),
      supabase.from('measurements').select('id')
    ]);

    return {
      estimates: estimatesResult.data?.length || 0,
      measurements: measurementsResult.data?.length || 0
    };
  };

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      // Get current counts
      const beforeStats = await getDataCounts();
      
      // Delete all estimates
      const { error: estimatesError } = await supabase
        .from('estimates')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (estimatesError) {
        throw new Error(`Failed to delete estimates: ${estimatesError.message}`);
      }

      // Delete all measurements  
      const { error: measurementsError } = await supabase
        .from('measurements')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (measurementsError) {
        throw new Error(`Failed to delete measurements: ${measurementsError.message}`);
      }

      setStats(beforeStats);
      
      toast({
        title: 'Cleanup Complete! ✅',
        description: `Deleted ${beforeStats.estimates} estimates and ${beforeStats.measurements} measurements`,
        duration: 5000,
      });

      // Refresh the page after a short delay to show updated dashboard
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Cleanup failed:', error);
      toast({
        title: 'Cleanup Failed ❌',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Trash2 className="h-5 w-5" />
          Admin: Test Data Cleanup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Remove all test estimates and measurements to start fresh for testing with territory manager accounts.
          </p>
          
          {stats && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                ✅ Successfully deleted:
              </p>
              <ul className="text-sm text-green-600 mt-1">
                <li>• {stats.estimates} estimates</li>
                <li>• {stats.measurements} measurements</li>
              </ul>
              <p className="text-xs text-green-600 mt-2">
                Page will refresh in 2 seconds...
              </p>
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cleaning up...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clean Up All Test Data
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Test Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL estimates and measurements from the database. 
                  This action cannot be undone. 
                  <br /><br />
                  <strong>This should only be used for testing purposes.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleCleanup}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Delete All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}; 