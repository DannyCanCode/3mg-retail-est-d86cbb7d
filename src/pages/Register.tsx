import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Building2, Shield, Mail, Lock, CheckCircle, Leaf } from 'lucide-react';

const brandGreen = "#0F9D58";

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@3mgroofing.com')) {
      toast({
        title: 'Invalid Email',
        description: 'You must use a valid @3mgroofing.com email address.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'manager', // Default role for self-registration
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Registration Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Registration Submitted', description: 'Please check your email to confirm your account.' });
      navigate('/check-email');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ 
        background: `linear-gradient(135deg, ${brandGreen} 0%, #22c55e 25%, #ffffff 60%)` 
      }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle roof-like shapes */}
        <div 
          className="absolute top-20 left-10 w-32 h-32 opacity-10 transform rotate-45"
          style={{ 
            background: `linear-gradient(45deg, ${brandGreen}, transparent)`,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
          }}
        />
        <div 
          className="absolute bottom-32 right-16 w-24 h-24 opacity-15 transform -rotate-12"
          style={{ 
            background: `linear-gradient(45deg, ${brandGreen}, transparent)`,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
          }}
        />
        <div 
          className="absolute top-1/2 right-8 w-16 h-16 opacity-20 transform rotate-90"
          style={{ 
            background: `linear-gradient(45deg, ${brandGreen}, transparent)`,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
          }}
        />
        
        {/* Floating elements */}
        <div className="absolute top-1/4 left-1/4 animate-pulse-soft">
          <Leaf className="w-6 h-6 text-green-200 opacity-30" />
        </div>
        <div className="absolute bottom-1/3 left-1/5 animate-pulse-soft" style={{ animationDelay: '1s' }}>
          <Building2 className="w-5 h-5 text-green-200 opacity-25" />
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 backdrop-blur-sm bg-white/95 relative z-10 overflow-hidden">
        {/* Header accent bar */}
        <div 
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${brandGreen}, #22c55e)` }}
        />
        
        <CardHeader className="text-center space-y-4 pt-8 pb-6">
          {/* Logo/Brand Section */}
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div 
              className="p-3 rounded-xl shadow-lg"
              style={{ backgroundColor: brandGreen }}
            >
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold" style={{ color: brandGreen }}>
                3MG Roofing
              </h1>
              <p className="text-sm text-gray-600 font-medium">& Solar</p>
            </div>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Join Our Team
            </CardTitle>
            <CardDescription className="text-gray-600 leading-relaxed">
              Create your professional account to access the Estimator platform and start building better estimates.
            </CardDescription>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center space-x-6 pt-2">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Shield className="h-3 w-3" />
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <CheckCircle className="h-3 w-3" />
              <span>Professional</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-6">
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Mail className="h-4 w-4" style={{ color: brandGreen }} />
                <span>Work Email Address</span>
              </label>
              <Input
                type="email"
                placeholder="your-name@3mgroofing.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 pl-4 text-base border-2 border-gray-200 focus:border-green-400 transition-colors"
              />
              <p className="text-xs text-gray-500 flex items-center space-x-1">
                <span>Must use your @3mgroofing.com email address</span>
              </p>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Lock className="h-4 w-4" style={{ color: brandGreen }} />
                <span>Password</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-4 pr-12 text-base border-2 border-gray-200 focus:border-green-400 transition-colors"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Choose a strong password with at least 8 characters
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] text-white"
              disabled={loading}
              style={{ 
                backgroundColor: brandGreen,
                backgroundImage: `linear-gradient(135deg, ${brandGreen} 0%, #22c55e 100%)`
              }}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Create Account</span>
                  <Building2 className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-800">
                  What happens next?
                </p>
                <p className="text-xs text-green-700 leading-relaxed">
                  After registration, you'll receive a confirmation email. Once verified, you'll complete your professional profile and gain access to the Estimator platform.
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-8 pb-8 pt-2">
          <div className="w-full text-center space-y-4">
            <div className="h-px bg-gray-200 w-full" />
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-semibold hover:underline transition-colors"
                style={{ color: brandGreen }}
              >
                Sign in here
              </Link>
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              By creating an account, you agree to our terms of service and privacy policy. 
              This platform is exclusively for 3MG Roofing & Solar team members.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register; 