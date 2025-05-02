// supabase/functions/generate-client-pdf/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

console.log("Simplified generate-client-pdf function started. V2");

serve(async (req) => {
  // 1. Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*' // Allow all for testing, restrict in prod
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log("--- Checking Secrets --- (Simplified Function)");
  let errorMsg: string | null = null;

  // 2. Attempt to read secrets using the original RESERVED names
  const supabaseUrl = Deno.env.get('SUPABASE_URL'); // Reverted to original name
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Reverted to original name

  console.log(`Found SUPABASE_URL: ${!!supabaseUrl}`);
  console.log(`Found SUPABASE_SERVICE_ROLE_KEY: ${!!serviceRoleKey}`);

  if (!supabaseUrl || !serviceRoleKey) {
    errorMsg = "Missing Supabase reserved environment variables/secrets.";
    if (!supabaseUrl) console.error("ERROR: SUPABASE_URL was not found!");
    if (!serviceRoleKey) console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY was not found!");
  }

  // 3. Prepare response
  let responseBody = {};
  let status = 200;

  if (errorMsg) {
    responseBody = { error: errorMsg };
    status = 500;
  } else {
    // If secrets were found, return them (partially masked for safety in logs)
    responseBody = {
      message: "Reserved Secrets found!",
      urlFound: !!supabaseUrl,
      keyFound: !!serviceRoleKey,
      // Avoid logging full secrets, just confirm presence
      // url: supabaseUrl,
      // serviceKeyPart: serviceRoleKey?.substring(0, 10) + '...'
    };
  }

  console.log(`Responding with status ${status}`, responseBody);

  return new Response(
      JSON.stringify(responseBody), 
      { status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } 
  )
}) 