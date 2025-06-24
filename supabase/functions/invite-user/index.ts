// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY2")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface Payload {
  email: string;
  role: string; // 'rep' | 'manager' | 'admin'
  territory_id?: string;
  org_id?: string;
}

// Sentry removed for deployment simplicity

serve(async (req) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const payload: Payload = await req.json();
    const { email, role, territory_id, org_id } = payload;
    
    console.log(`[invite-user] Processing invitation for ${email} with role ${role}`);

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "email and role required" }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email domain
    if (!email.endsWith('@3mgroofing.com')) {
      return new Response(
        JSON.stringify({ error: "Email must be @3mgroofing.com domain" }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'rep', 'subtrade_manager'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Role must be one of: ${validRoles.join(', ')}` }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users.some(user => user.email === email);
    
    if (userExists) {
      return new Response(
        JSON.stringify({ error: "User with this email already exists" }), 
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 1. Create auth user (no password, email invitation)
    const { data: user, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
    });
    
    if (createErr) {
      console.error('[invite-user] Error creating user:', createErr);
      throw createErr;
    }

    console.log(`[invite-user] Created auth user: ${user.user?.id}`);

    // 2. Insert profile row with desired role/territory/org
    const { error: insertErr } = await supabase.from("profiles").insert({
      id: user.user?.id,
      email,
      role,
      is_admin: role === 'admin',
      territory_id: territory_id ?? null,
      org_id: org_id ?? null,
      completed_onboarding: false,
    });
    
    if (insertErr) {
      console.error('[invite-user] Error creating profile:', insertErr);
      throw insertErr;
    }

    console.log(`[invite-user] Created profile for ${email} with role ${role}`);

    // 3. Send magic link (numeric OTP) via normal flow
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email);
    
    if (inviteErr) {
      console.error('[invite-user] Error sending invitation:', inviteErr);
      throw inviteErr;
    }

    console.log(`[invite-user] Successfully sent invitation to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation sent to ${email}`,
        user_id: user.user?.id
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[invite-user] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to invite user" 
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 