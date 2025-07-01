import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailValidationRequest {
  email: string;
}

interface EmailValidationResponse {
  ok: boolean;
  message?: string;
}

const ALLOWED_DOMAINS = [
  "3mgroofing.com",
  // Add more domains as needed
];

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, message: "Method not allowed" }),
        { 
          status: 405,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const { email }: EmailValidationRequest = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ ok: false, message: "Email is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Extract domain from email
    const emailDomain = email.toLowerCase().split("@")[1];
    
    if (!emailDomain) {
      return new Response(
        JSON.stringify({ ok: false, message: "Invalid email format" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Check if domain is allowed
    const isAllowed = ALLOWED_DOMAINS.includes(emailDomain);

    const response: EmailValidationResponse = {
      ok: isAllowed,
      message: isAllowed 
        ? undefined 
        : `Email domain '${emailDomain}' is not authorized. Please use a 3MG Roofing email address.`
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );

  } catch (error) {
    console.error("Email validation error:", error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        message: "Internal server error during email validation" 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}); 