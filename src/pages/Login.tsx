/* @ts-nocheck */
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Building2, ShieldCheck } from "lucide-react";

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
    <div className="min-h-screen w-full flex">
      {/* Left Side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white relative"
        style={{ background: `linear-gradient(135deg, ${brandGreen} 0%, #0E8A4F 100%)` }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-md text-center">
          <Building2 className="h-16 w-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">3MG Roofing & Solar</h1>
          <p className="text-xl font-light mb-8 opacity-90">
            Professional Roofing Estimation Platform
          </p>
          <div className="space-y-4 text-left">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-5 w-5" />
              <span>Secure Team Access</span>
            </div>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-5 w-5" />
              <span>Territory Management</span>
            </div>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-5 w-5" />
              <span>Real-time Estimation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg border-0 bg-white">
          <CardHeader className="text-center space-y-2 pb-6">
            {/* Mobile Branding - Only shown on mobile */}
            <div className="lg:hidden mb-4">
              <Building2 className="h-12 w-12 mx-auto mb-3" style={{ color: brandGreen }} />
              <h1 className="text-2xl font-bold" style={{ color: brandGreen }}>
                3MG Roofing & Solar
              </h1>
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-800">
              Sign in to Estimator
            </CardTitle>
            <p className="text-gray-600">Enter your credentials to access the platform</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="daniel.pedraza@3mgroofing.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium"
                disabled={loading}
                style={{ backgroundColor: brandGreen }}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            
            {/* Demo Credentials Helper */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Test Accounts:</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <div><strong>Admin:</strong> daniel.pedraza@3mgroofing.com (Daniel2024!)</div>
                <div><strong>Manager:</strong> nickolas.nell@3mgroofing.com (Nick2024!)</div>
                <div><strong>Admin:</strong> connor@3mgroofing.com (Connor2024!)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 