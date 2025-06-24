import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore deno types
import * as Sentry from "https://deno.land/x/sentry_deno@0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Sentry.init({
  // @ts-ignore deno global
  dsn: Deno.env.get("SENTRY_DSN") || "",
  tracesSampleRate: 0.2,
  // @ts-ignore deno global
  environment: Deno.env.get("SENTRY_ENV") || "development",
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, uploadDate, measurements } = await req.json();
    
    if (!measurements) {
      return new Response(
        JSON.stringify({ error: 'No measurement data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user information from the request
    // This assumes the user is authenticated when making the request
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError) {
        console.error('Error getting user:', userError);
      } else if (user) {
        userId = user.id;
      }
    }

    // Insert the measurement data into the measurements table
    const { data, error } = await supabase
      .from('measurements')
      .insert({
        file_name: fileName,
        upload_date: uploadDate,
        user_id: userId,
        total_area: measurements.totalArea,
        roof_pitch: measurements.roofPitch,
        ridge_length: measurements.ridgeLength,
        valley_length: measurements.valleyLength,
        hip_length: measurements.hipLength,
        eave_length: measurements.eaveLength,
        rake_length: measurements.rakeLength,
        step_flashing_length: measurements.stepFlashingLength,
        chimney_count: measurements.chimneyCount,
        skylight_count: measurements.skylightCount,
        vent_count: measurements.ventCount,
        raw_data: measurements
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Measurement saved successfully',
        measurement: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error saving measurement:', error);
    Sentry.captureException(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
