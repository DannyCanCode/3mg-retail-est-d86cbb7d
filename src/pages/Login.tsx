/* @ts-nocheck */
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const brandGreen = "#0F9D58";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('[Login] Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      console.log('[Login] Auth response:', { data: !!data, error: error?.message });
      
      if (error) {
        console.error('[Login] Authentication error:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          toast({
            title: "Account Not Confirmed",
            description: "Please check your email and click the confirmation link before logging in.",
            variant: "destructive"
          });
        } else if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid Credentials",
            description: "The email or password you entered is incorrect. Please try again.",
            variant: "destructive"
          });
        } else if (error.message.includes('Too many requests')) {
          toast({
            title: "Too Many Attempts",
            description: "Too many login attempts. Please wait a moment before trying again.",
            variant: "destructive"
          });
        } else if (error.message.includes('Network')) {
          toast({
            title: "Network Error",
            description: "Please check your internet connection and try again.",
            variant: "destructive"
          });
        } else {
          // Generic error handling
          toast({ 
            title: "Login Failed", 
            description: error.message || "An unexpected error occurred during login.",
            variant: "destructive" 
          });
        }
      } else {
        console.log('[Login] Login successful, navigating to dashboard...');
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error('[Login] Unexpected error during login:', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
            Sign in to Estimator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        {/* <CardFooter className="flex justify-center">
          <p className="text-sm">
            Don't have an account? <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
        </CardFooter> */}
      </Card>
    </div>
  );
} 