import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EagleViewWebhookPayload {
  orderId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reportUrl?: string;
  completedAt?: string;
  errorMessage?: string;
  reportData?: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook signature (if EagleView provides one)
    const signature = req.headers.get('x-eagleview-signature')
    // TODO: Implement signature verification when you get the webhook secret

    // Parse webhook payload
    const payload: EagleViewWebhookPayload = await req.json()
    console.log('Received EagleView webhook:', payload)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update order status in database
    const { data: order, error: fetchError } = await supabase
      .from('eagleview_orders')
      .select('*')
      .eq('order_id', payload.orderId)
      .single()

    if (fetchError) {
      console.error('Error fetching order:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update order with new status
    const updateData: any = {
      status: payload.status,
      updated_at: new Date().toISOString()
    }

    if (payload.status === 'completed') {
      updateData.actual_completion = payload.completedAt || new Date().toISOString()
      updateData.report_url = payload.reportUrl
      updateData.report_data = payload.reportData
      
      // If the order is associated with an estimate, update the estimate
      if (order.estimate_id) {
        // Parse the PDF and update measurements
        // This would trigger your existing PDF parsing logic
        const { error: updateError } = await supabase
          .from('estimates')
          .update({
            measurement_id: `eagleview-${payload.orderId}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.estimate_id)

        if (updateError) {
          console.error('Error updating estimate:', updateError)
        }
      }
    } else if (payload.status === 'failed') {
      updateData.metadata = {
        ...order.metadata,
        error: payload.errorMessage
      }
    }

    const { error: updateError } = await supabase
      .from('eagleview_orders')
      .update(updateData)
      .eq('order_id', payload.orderId)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update order' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send notification to user if completed
    if (payload.status === 'completed' && order.created_by) {
      // You could send an email notification here
      console.log(`Order ${payload.orderId} completed for user ${order.created_by}`)
    }

    return new Response(
      JSON.stringify({ success: true, orderId: payload.orderId }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 