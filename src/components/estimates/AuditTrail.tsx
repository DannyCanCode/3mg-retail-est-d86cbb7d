import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Edit, CheckCircle, XCircle, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AuditEntry {
  id: string;
  estimate_id: string;
  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  changed_by: string;
  changed_at: string;
  user_email?: string;
  user_name?: string;
}

interface AuditTrailProps {
  estimateId: string;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ estimateId }) => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (estimateId) {
      fetchAuditTrail();
    }
  }, [estimateId]);

  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estimate_audit_log')
        .select(`
          *,
          profiles!estimate_audit_log_changed_by_fkey (
            email,
            full_name
          )
        `)
        .eq('estimate_id', estimateId)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      const entriesWithUserInfo = data.map(entry => ({
        ...entry,
        user_email: entry.profiles?.email,
        user_name: entry.profiles?.full_name || entry.profiles?.email
      }));

      setAuditEntries(entriesWithUserInfo);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'updated': return <Edit className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'status_changed': return <Clock className="h-4 w-4 text-purple-500" />;
      default: return <Edit className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created': return 'bg-blue-100 text-blue-800';
      case 'updated': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'status_changed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value: string | null) => {
    if (!value) return 'N/A';
    
    // Format currency values
    if (!isNaN(Number(value)) && Number(value) > 100) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(Number(value));
    }
    
    return value;
  };

  const formatFieldName = (fieldName: string) => {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4 text-muted-foreground">Loading audit trail...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Audit Trail
          <Badge variant="outline">{auditEntries.length} entries</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auditEntries.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">
            No audit entries found for this estimate.
          </p>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {auditEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 border rounded-md bg-muted/30"
                >
                  <div className="mt-1">
                    {getActionIcon(entry.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getActionColor(entry.action)}>
                        {entry.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.changed_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {entry.user_name || entry.user_email || 'Unknown User'}
                      </span>
                    </div>
                    
                    {entry.field_changed && (
                      <div className="text-sm">
                        <span className="font-medium">
                          {formatFieldName(entry.field_changed)}
                        </span>
                        {entry.old_value && entry.new_value && (
                          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-red-600">From:</span>{' '}
                              <span className="font-mono bg-red-50 px-1 rounded">
                                {formatValue(entry.old_value)}
                              </span>
                            </div>
                            <div>
                              <span className="text-green-600">To:</span>{' '}
                              <span className="font-mono bg-green-50 px-1 rounded">
                                {formatValue(entry.new_value)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}; 