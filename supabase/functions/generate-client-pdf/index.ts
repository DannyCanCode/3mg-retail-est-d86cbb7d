// supabase/functions/generate-client-pdf/index.ts

// @ts-ignore deno types
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore deno types
import * as Sentry from "https://deno.land/x/sentry_deno@0.7.0/mod.ts";

console.log("Simplified generate-client-pdf function started. V2");

Sentry.init({
  // @ts-ignore deno global
  dsn: Deno.env.get("SENTRY_DSN") || "",
  tracesSampleRate: 0.2,
  // @ts-ignore deno global
  environment: Deno.env.get("SENTRY_ENV") || "development",
});

serve(async (req) => {
  // 1. Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { estimateData } = await req.json();

    if (!estimateData) {
      throw new Error("No estimate data provided.");
    }

    // Create a client-safe version of the estimate materials
    const clientSafeMaterials = {};
    if (estimateData.materials) {
      for (const key in estimateData.materials) {
        const material = estimateData.materials[key];
        clientSafeMaterials[key] = {
          id: material.id,
          name: material.name,
          category: material.category,
          unit: material.unit,
          // Explicitly OMIT price, approxPerSquare, and any other cost-related fields
        };
      }
    }

    // Create the final client-safe estimate object
    const clientSafeEstimate = {
      customer_name: estimateData.customer_name,
      customer_address: estimateData.customer_address,
      total_price: estimateData.total_price, // The final price is safe to show
      materials: clientSafeMaterials,
      quantities: estimateData.quantities,
      // Add other top-level fields that are safe to show
    };

    return new Response(
      JSON.stringify(clientSafeEstimate),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    Sentry.captureException(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 