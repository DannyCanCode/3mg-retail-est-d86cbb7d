import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // First check if the table exists
    const { data: tableExists, error: checkError } = await supabaseClient
      .from('pricing_lists')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!checkError) {
      // Table already exists
      return new Response(JSON.stringify({ success: true, message: "Table already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If we get here, the table doesn't exist, so let's create it using raw SQL
    // We'll use the REST API directly since we don't have pg_query function
    const apiUrl = `${Deno.env.get("SUPABASE_URL")}/rest/v1/`;
    const apiKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const response = await fetch(`${apiUrl}sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS public.pricing_lists (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            materials JSONB NOT NULL,
            labor JSONB NOT NULL,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error creating table:", errorData);
      return new Response(JSON.stringify({ error: errorData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Table created successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 