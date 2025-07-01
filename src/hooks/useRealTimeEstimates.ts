import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Estimate } from '@/api/estimatesFacade';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UseRealTimeEstimatesReturn {
  estimates: Estimate[];
  isLoading: boolean;
  error: string | null;
  refreshEstimates: () => Promise<void>;
}

export const useRealTimeEstimates = (): UseRealTimeEstimatesReturn => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);

  const fetchEstimates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simplified query without the problematic JOIN
      let query = supabase
        .from('estimates' as any)
        .select('*')
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (profile?.role === 'rep') {
        // Sales reps only see their own estimates
        query = query.eq('created_by', profile.id);
      } else if (profile?.role === 'manager' && profile?.territory_id) {
        // Territory managers see estimates from their territory
        query = query.eq('territory_id', profile.territory_id);
      }
      // Admins see all estimates (no additional filter)

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      console.log('[useRealTimeEstimates] Fetched estimates:', data?.length || 0);
      setEstimates(data || []);
    } catch (err: any) {
      console.error('Error fetching estimates:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to load estimates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!profile?.id) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create new subscription
    const channel = supabase
      .channel('estimates_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'estimates',
          // Apply role-based filtering at subscription level
          ...(profile.role === 'rep' && {
            filter: `created_by=eq.${profile.id}`
          }),
          ...(profile.role === 'manager' && profile.territory_id && {
            filter: `territory_id=eq.${profile.territory_id}`
          })
        },
        (payload) => {
          console.log('Real-time estimate update:', payload);
          
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Show notification for new estimates
          if (eventType === 'INSERT' && newRecord) {
            // Don't show notification for user's own estimates
            if (newRecord.created_by !== profile.id) {
              toast({
                title: '🆕 New Estimate',
                description: `Estimate #${newRecord.id?.substring(0, 8)} was created`,
              });
            }
          }
          
          // Show notification for status updates
          if (eventType === 'UPDATE' && newRecord && oldRecord) {
            if (newRecord.status !== oldRecord.status) {
              const statusColors = {
                approved: '✅',
                rejected: '❌', 
                pending: '⏳',
                sold: '💰'
              };
              
              const icon = statusColors[newRecord.status as keyof typeof statusColors] || '📝';
              
              toast({
                title: `${icon} Status Updated`,
                description: `Estimate #${newRecord.id?.substring(0, 8)} is now ${newRecord.status}`,
              });
            }
          }

          // Update local state based on event type
          setEstimates(current => {
            switch (eventType) {
              case 'INSERT':
                // Check if estimate should be visible to this user
                const shouldShowNew = 
                  profile.role === 'admin' ||
                  (profile.role === 'manager' && newRecord.territory_id === profile.territory_id) ||
                  (profile.role === 'rep' && newRecord.created_by === profile.id);
                
                if (shouldShowNew) {
                  return [newRecord as Estimate, ...current];
                }
                return current;

              case 'UPDATE':
                return current.map(estimate => 
                  estimate.id === newRecord.id 
                    ? { ...estimate, ...newRecord } as Estimate
                    : estimate
                );

              case 'DELETE':
                return current.filter(estimate => estimate.id !== oldRecord.id);

              default:
                return current;
            }
          });
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time estimates subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
          setError('Real-time updates disconnected');
        }
      });

    subscriptionRef.current = channel;
  };

  const refreshEstimates = async () => {
    await fetchEstimates();
  };

  useEffect(() => {
    if (profile?.id) {
      fetchEstimates();
      setupRealtimeSubscription();
    }

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [profile?.id, profile?.role, profile?.territory_id]);

  return {
    estimates,
    isLoading,
    error,
    refreshEstimates,
  };
}; 