import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { eagleViewClient } from '@/lib/eagleview-api';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EagleViewOrderFormProps {
  onOrderComplete?: (orderId: string) => void;
  estimateId?: string;
}

export function EagleViewOrderForm({ onOrderComplete, estimateId }: EagleViewOrderFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'ordering' | 'success' | 'error'>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);
  
  // Form state
  const [address, setAddress] = useState({
    streetNumber: '',
    streetName: '',
    city: '',
    state: '',
    zipCode: ''
  });
  
  const [orderOptions, setOrderOptions] = useState({
    reportType: 'Premium',
    rushOrder: false,
    specialInstructions: ''
  });

  // US States for dropdown
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate address
    if (!address.streetNumber || !address.streetName || !address.city || !address.state || !address.zipCode) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all address fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setOrderStatus('ordering');

    try {
      // Create EagleView order
      const orderResponse = await eagleViewClient.createMeasurementOrder({
        address,
        reportType: orderOptions.reportType,
        rushOrder: orderOptions.rushOrder,
        specialInstructions: orderOptions.specialInstructions
      });

      setOrderId(orderResponse.orderId);

      // Save order to Supabase
      const { data: user } = await supabase.auth.getUser();
      
      const { error: dbError } = await supabase
        .from('eagleview_orders')
        .insert({
          order_id: orderResponse.orderId,
          estimate_id: estimateId,
          address: `${address.streetNumber} ${address.streetName}, ${address.city}, ${address.state} ${address.zipCode}`,
          status: orderResponse.status,
          estimated_completion: orderResponse.estimatedCompletionDate,
          price: orderResponse.price,
          rush_order: orderOptions.rushOrder,
          created_by: user?.user?.id,
          metadata: {
            reportType: orderOptions.reportType,
            specialInstructions: orderOptions.specialInstructions
          }
        });

      if (dbError) {
        console.error('Error saving order to database:', dbError);
        // Don't fail the whole operation if DB save fails
      }

      setOrderStatus('success');
      
      toast({
        title: 'Order Submitted Successfully!',
        description: `Order ID: ${orderResponse.orderId}. Estimated completion: ${new Date(orderResponse.estimatedCompletionDate).toLocaleDateString()}`,
      });

      if (onOrderComplete) {
        onOrderComplete(orderResponse.orderId);
      }

    } catch (error) {
      console.error('Error creating EagleView order:', error);
      setOrderStatus('error');
      
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Failed to create EagleView order',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Request EagleView Report
        </CardTitle>
        <CardDescription>
          Enter the property address to order a professional roof measurement report
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Property Address</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="streetNumber">Street Number</Label>
                <Input
                  id="streetNumber"
                  value={address.streetNumber}
                  onChange={(e) => setAddress({ ...address, streetNumber: e.target.value })}
                  placeholder="123"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="streetName">Street Name</Label>
                <Input
                  id="streetName"
                  value={address.streetName}
                  onChange={(e) => setAddress({ ...address, streetName: e.target.value })}
                  placeholder="Main Street"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="Tampa"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="state">State</Label>
                <Select
                  value={address.state}
                  onValueChange={(value) => setAddress({ ...address, state: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={address.zipCode}
                  onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                  placeholder="33601"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Order Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Order Options</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="reportType">Report Type</Label>
                <Select
                  value={orderOptions.reportType}
                  onValueChange={(value) => setOrderOptions({ ...orderOptions, reportType: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="reportType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Basic">Basic Report</SelectItem>
                    <SelectItem value="Premium">Premium Report (Recommended)</SelectItem>
                    <SelectItem value="Advanced">Advanced Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="rushOrder">Rush Order</Label>
                  <p className="text-sm text-muted-foreground">
                    Get your report faster (additional fees apply)
                  </p>
                </div>
                <Switch
                  id="rushOrder"
                  checked={orderOptions.rushOrder}
                  onCheckedChange={(checked) => setOrderOptions({ ...orderOptions, rushOrder: checked })}
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="specialInstructions"
                  value={orderOptions.specialInstructions}
                  onChange={(e) => setOrderOptions({ ...orderOptions, specialInstructions: e.target.value })}
                  placeholder="Any special notes for the measurement team..."
                  rows={3}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {orderStatus === 'success' && orderId && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Order submitted successfully! Order ID: <strong>{orderId}</strong>
                <br />
                You'll receive an email when the report is ready.
              </AlertDescription>
            </Alert>
          )}
          
          {orderStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to submit order. Please try again or contact support.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || orderStatus === 'success'}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Order...
              </>
            ) : orderStatus === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Order Submitted
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Order EagleView Report
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 