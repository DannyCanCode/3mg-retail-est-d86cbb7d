import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, Clock, CheckCircle, XCircle, DollarSign, Calendar } from 'lucide-react';

interface SubtradeEstimate {
  id: string;
  customer_name: string;
  customer_address: string;
  created_at: string;
  subtrade_requirements: string[];
  subtrade_status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  subtrade_pricing: Record<string, number>;
  subtrade_notes: string;
  total_price: number;
  territory_name: string;
  created_by_name: string;
}

const SUBTRADE_TYPES = [
  'HVAC',
  'Electrical', 
  'Plumbing',
  'Gutters',
  'Siding',
  'Windows',
  'Insulation',
  'Drywall',
  'Painting',
  'Flooring',
  'Other'
];

const Subtrades: React.FC = () => {
  const { user } = useAuth();
  const [estimates, setEstimates] = useState<SubtradeEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEstimate, setSelectedEstimate] = useState<SubtradeEstimate | null>(null);
  const [subtradePricing, setSubtradePricing] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchSubtradeEstimates();
  }, []);

  const fetchSubtradeEstimates = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for now - replace with actual API call
      const mockData: SubtradeEstimate[] = [
        {
          id: '1',
          customer_name: 'John Smith',
          customer_address: '123 Main St, Winter Park, FL',
          created_at: new Date().toISOString(),
          subtrade_requirements: ['HVAC', 'Electrical'],
          subtrade_status: 'pending',
          subtrade_pricing: {},
          subtrade_notes: '',
          total_price: 15000,
          territory_name: 'Winter Park',
          created_by_name: 'Mike Johnson'
        },
        {
          id: '2',
          customer_name: 'Sarah Wilson',
          customer_address: '456 Oak Ave, Orlando, FL',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          subtrade_requirements: ['Gutters', 'Siding'],
          subtrade_status: 'in_progress',
          subtrade_pricing: { 'Gutters': 2500, 'Siding': 8000 },
          subtrade_notes: 'Customer prefers seamless gutters',
          total_price: 22000,
          territory_name: 'Orlando',
          created_by_name: 'Lisa Davis'
        }
      ];
      
      setEstimates(mockData);
    } catch (error) {
      console.error('Error fetching subtrade estimates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubtrade = async (estimateId: string, status: string) => {
    try {
      // Update subtrade status and pricing
      const updatedEstimates = estimates.map(est => 
        est.id === estimateId 
          ? { 
              ...est, 
              subtrade_status: status as any,
              subtrade_pricing: subtradePricing,
              subtrade_notes: notes
            }
          : est
      );
      
      setEstimates(updatedEstimates);
      setSelectedEstimate(null);
      setSubtradePricing({});
      setNotes('');
      
      // Here you would make the actual API call to update the database
      console.log(`Updated estimate ${estimateId} with status: ${status}`);
      
    } catch (error) {
      console.error('Error updating subtrade:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress': return <Wrench className="h-4 w-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      pending: { variant: "secondary" },
      assigned: { variant: "outline", className: "text-blue-600 border-blue-600" },
      in_progress: { variant: "default", className: "bg-yellow-500" },
      completed: { variant: "default", className: "bg-green-500" }
    };
    
    const config = variants[status] || { variant: "outline" };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const filteredEstimates = estimates.filter(est => 
    filterStatus === 'all' || est.subtrade_status === filterStatus
  );

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

      <div className="relative z-10 container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Subtrades Management</h1>
          <p className="text-gray-400">
            Manage estimates requiring subtrade work and pricing
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Estimates Requiring Subtrade Work ({filteredEstimates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading subtrade estimates...</div>
          ) : filteredEstimates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No estimates requiring subtrade work found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Subtrades Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEstimates.map((estimate) => (
                  <TableRow key={estimate.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{estimate.customer_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {estimate.customer_address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{estimate.territory_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {estimate.subtrade_requirements.map((subtrade) => (
                          <Badge key={subtrade} variant="outline" className="text-xs">
                            {subtrade}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(estimate.subtrade_status)}</TableCell>
                    <TableCell>{estimate.created_by_name}</TableCell>
                    <TableCell>
                      {new Date(estimate.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${estimate.total_price.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedEstimate(estimate);
                              setSubtradePricing(estimate.subtrade_pricing);
                              setNotes(estimate.subtrade_notes);
                            }}
                          >
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>
                              Subtrade Management - {selectedEstimate?.customer_name}
                            </DialogTitle>
                          </DialogHeader>
                          
                          {selectedEstimate && (
                            <Tabs defaultValue="pricing" className="w-full">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="pricing" className="space-y-4">
                                <div className="grid gap-4">
                                  <h3 className="text-lg font-semibold">Subtrade Pricing</h3>
                                  {selectedEstimate.subtrade_requirements.map((subtrade) => (
                                    <div key={subtrade} className="grid grid-cols-2 gap-4 items-center">
                                      <Label>{subtrade}</Label>
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <Input
                                          type="number"
                                          placeholder="Enter price"
                                          value={subtradePricing[subtrade] || ''}
                                          onChange={(e) => setSubtradePricing(prev => ({
                                            ...prev,
                                            [subtrade]: parseFloat(e.target.value) || 0
                                          }))}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                      id="notes"
                                      placeholder="Add notes about subtrade work..."
                                      value={notes}
                                      onChange={(e) => setNotes(e.target.value)}
                                    />
                                  </div>
                                  
                                  <div className="flex gap-2 pt-4">
                                    <Button 
                                      onClick={() => handleUpdateSubtrade(selectedEstimate.id, 'in_progress')}
                                      className="flex-1"
                                    >
                                      Mark In Progress
                                    </Button>
                                    <Button 
                                      onClick={() => handleUpdateSubtrade(selectedEstimate.id, 'completed')}
                                      variant="default"
                                      className="bg-green-600 hover:bg-green-700 flex-1"
                                    >
                                      Mark Completed
                                    </Button>
                                    <Button 
                                      onClick={() => handleUpdateSubtrade(selectedEstimate.id, 'rejected')}
                                      variant="destructive"
                                      className="flex-1"
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="details">
                                <div className="space-y-4">
                                  <h3 className="text-lg font-semibold">Estimate Details</h3>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium">Customer</Label>
                                      <p>{selectedEstimate.customer_name}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Address</Label>
                                      <p>{selectedEstimate.customer_address}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Territory</Label>
                                      <p>{selectedEstimate.territory_name}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Created By</Label>
                                      <p>{selectedEstimate.created_by_name}</p>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="history">
                                <div className="space-y-4">
                                  <h3 className="text-lg font-semibold">Activity History</h3>
                                  <div className="text-center py-8 text-muted-foreground">
                                    Activity tracking will be implemented in the next phase.
                                  </div>
                                </div>
                              </TabsContent>
                            </Tabs>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Subtrades; 