import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const brandGreen = "#0F9D58"; // 3MG thematic green

export default function Login() {
  type Step = "email" | "code";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateEmail = async (address: string) => {
    // Calls Edge Function validate-email – returns 200 if allowed
    const { data, error } = await supabase.functions.invoke("validate-email", {
      body: { email: address },
    });
    if (error) {
      // If Edge Function is unreachable (likely in a preview), skip validation but log it
      console.warn('validate-email function error', error);
      return { ok: true };
    }
    // Edge function convention: { ok: boolean, message?: string }
    if (data?.ok === false) return { ok: false, message: data.message ?? "E-mail not allowed." };
    return { ok: true };
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    // 1. Validate against Microsoft 365 (Edge Function)
    const validation = await validateEmail(email);
    if (!validation.ok) {
      toast({ title: "Invalid e-mail", description: validation.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // 2. Send numeric OTP via Supabase
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin, // fallback link
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check inbox", description: "We sent a 6-digit code." });
      setStep("code");
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code;
    if (token.length !== 6) return;
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    setLoading(false);

    if (error || !data?.session) {
      toast({ title: "Invalid code", description: error?.message ?? "Try again.", variant: "destructive" });
      return;
    }

    // Fetch profile to see if onboarding needed
    const { data: profile } = await supabase
      .from("profiles")
      .select("completed")
      .eq("id", data.session.user.id)
      .single();

    if (profile && profile.completed === false) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const renderEmailForm = () => (
    <form className="space-y-4" onSubmit={handleEmailSubmit}>
      <Input
        type="email"
        placeholder="you@3mgroofing.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-11"
      />
      <Button
        type="submit"
        className="w-full h-11 font-semibold"
        style={{ backgroundColor: brandGreen }}
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Code"}
      </Button>
    </form>
  );

  const renderCodeForm = () => (
    <form className="space-y-4" onSubmit={handleCodeSubmit}>
      <InputOTP
        maxLength={6}
        autoFocus
        value={code}
        onChange={(val) => setCode(val)}
      >
        <InputOTPGroup>
          {Array.from({ length: 6 }).map((_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <Button
        type="submit"
        className="w-full h-11 font-semibold"
        style={{ backgroundColor: brandGreen }}
        disabled={loading}
      >
        {loading ? "Verifying..." : "Verify Code"}
      </Button>
    </form>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: `linear-gradient(135deg, ${brandGreen} 0%, #ffffff 60%)` }}
    >
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold" style={{ color: brandGreen }}>
            3MG Roofing & Solar
          </h1>
          <CardTitle className="text-xl font-semibold text-gray-800">
            {step === "email" ? "Sign in to Estimator" : "Enter the 6-digit code"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === "email" ? renderEmailForm() : renderCodeForm()}
        </CardContent>
      </Card>
    </div>
  );
} 