/* @ts-nocheck */
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Building2 } from "lucide-react";

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
      if (import.meta.env.DEV) {
        console.log('[Login] Attempting login for:', email);
      }
      
      // CRITICAL FIX: Always clear any existing session first to handle multiple account logins
      if (import.meta.env.DEV) {
        console.log('[Login] Clearing any existing session before login...');
      }
      await supabase.auth.signOut();
      
      // Small delay to ensure session is fully cleared
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (import.meta.env.DEV) {
        console.log('[Login] Auth response:', { data: !!data, error: error?.message });
      }
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Login] Authentication error:', {
            message: error.message,
            status: error.status,
            name: error.name
          });
        }
        
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
        if (import.meta.env.DEV) {
          console.log('[Login] Login successful, navigating to dashboard...');
        }
        
        // Additional delay to ensure auth context picks up the new session
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate("/", { replace: true });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Login] Unexpected error during login:', error);
      }
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
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${brandGreen} 0%, #ffffff 65%)` }}
    >
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto">
            <Building2 className="h-16 w-16 mx-auto mb-4" style={{ color: brandGreen }} />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: brandGreen }}>
              3MG Roofing & Solar
            </h1>
            <CardTitle className="text-2xl font-semibold text-gray-800 mb-2">
              Sign in to Estimator
            </CardTitle>
            <p className="text-gray-600">Enter your credentials to access the platform</p>
          </div>
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
                placeholder="Requires @3mgroofing.com email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 border-2 focus:border-green-500"
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
                  className="h-12 border-2 focus:border-green-500 pr-12"
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
              className="w-full h-12 text-lg font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={loading}
              style={{ 
                backgroundColor: brandGreen,
                borderRadius: '8px'
              }}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          {/* Demo Credentials Helper */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg">
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
              <Building2 className="h-4 w-4 mr-2" style={{ color: brandGreen }} />
              Test Accounts:
            </h4>
            <div className="text-xs text-gray-700 space-y-2">
              <div className="mb-3">
                <div className="font-semibold text-purple-700 mb-1">Administrators:</div>
                <div className="flex justify-between">
                  <span>daniel.pedraza@3mgroofing.com</span>
                  <code className="bg-white px-1 rounded">Daniel2024!</code>
                </div>
                <div className="flex justify-between">
                  <span>connor@3mgroofing.com</span>
                  <code className="bg-white px-1 rounded">Connor2024!</code>
                </div>
                <div className="flex justify-between">
                  <span>jay.moroff@3mgroofing.com</span>
                  <code className="bg-white px-1 rounded">Jay2024!</code>
                </div>
                <div className="flex justify-between">
                  <span>jhagan@3mgroofing.com</span>
                  <code className="bg-white px-1 rounded">JHagan2024!</code>
                </div>
                <div className="flex justify-between">
                  <span>tyler.powell@3mgroofing.com</span>
                  <code className="bg-white px-1 rounded">Tyler2024!</code>
                </div>
              </div>
              <div>
                <div className="font-semibold text-blue-700 mb-1">Territory Managers:</div>
                <div className="flex justify-between">
                  <span>nickolas.nell@3mgroofing.com (Stuart)</span>
                  <code className="bg-white px-1 rounded">Nick2024!</code>
                </div>
                <div className="flex justify-between">
                  <span>harrison.cremata@3mgroofing.com (Jacksonville)</span>
                  <code className="bg-white px-1 rounded">Harrison2024!</code>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 