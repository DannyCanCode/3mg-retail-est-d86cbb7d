/* @ts-nocheck */
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/withTimeout";
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
import { Eye, EyeOff, Shield, Check, X, ArrowLeft, Key } from "lucide-react";

const brandGreen = "#0F9D58"; // 3MG thematic green

export default function Login() {
  type Step = "email" | "auth_method" | "password" | "code" | "create_password" | "admin_access";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Password validation
  const validatePassword = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };
    return checks;
  };

  const passwordChecks = validatePassword(newPassword);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const validateEmail = async (address: string) => {
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("validate-email", {
          body: { email: address },
        }),
        6000,
        'Email validation timed out'
      );
      if (error) {
        console.warn('validate-email function error', error);
        return { ok: true };
      }
      if (data?.ok === false) return { ok: false, message: data.message ?? "E-mail not allowed." };
      return { ok: true };
    } catch(err:any) {
      console.warn('validate-email timeout or network error', err);
      return { ok: true };
    }
  };

  const checkUserExists = async (email: string) => {
    try {
      // For existing users like daniel.pedraza@3mgroofing.com, always show auth options
      const knownUsers = ['daniel.pedraza@3mgroofing.com', 'jay.moroff@3mgroofing.com'];
      if (knownUsers.includes(email)) {
        return true;
      }
      
      // For other users, try to check via RPC or assume new user
      return false; // Default to new user flow for safety
    } catch (err) {
      console.warn('Error checking user existence:', err);
      return false;
    }
  };

  const handleAdminAccess = async () => {
    setLoading(true);
    
    try {
      // For known admin users, create a session directly
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      });
      
      if (error) throw error;
      
      toast({ 
        title: "Admin Access", 
        description: "Check your email for the admin access code." 
      });
      setStep("code");
    } catch (error: any) {
      toast({ 
        title: "Access Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    // 1. Validate email
    const validation = await validateEmail(email);
    if (!validation.ok) {
      toast({ title: "Invalid e-mail", description: validation.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // 2. Check if user exists and has password
    const userExists = await checkUserExists(email);
    setHasPassword(userExists);
    
    setLoading(false);
    
    if (userExists) {
      // Show admin access option for known users
      setStep("admin_access");
    } else {
      // New user, send OTP
      handleSendOTP();
    }
  };

  const handleSendOTP = async () => {
    setLoading(true);
    
    try {
      const result = await withTimeout(
        supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
          },
        }),
        8000,
        'Auth request timed out'
      );
      
      if (result.error) throw result.error;
      
      toast({ title: "Check inbox", description: "We sent a 6-digit code.", variant: "default" });
      setStep("code");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);

    try {
      const result = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        8000,
        'Login timed out'
      );

      if (result.error) {
        // If password is wrong, suggest OTP instead
        if (result.error.message?.includes('Invalid login credentials')) {
          toast({ 
            title: "Invalid Password", 
            description: "Try using the 6-digit code option instead.", 
            variant: "destructive" 
          });
        } else {
          throw result.error;
        }
        return;
      }

      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code;
    if (token.length !== 6) return;
    setLoading(true);

    try {
      const result = await withTimeout(
        supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        }),
        8000,
        'Verification timed out'
      );

      if (result.error || !result.data?.session) {
        throw result.error || new Error("Verification failed");
      }

      // Check if user has completed onboarding by checking their profile
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // For now, always go to password creation for first-time setup
          // The AuthContext will properly route users after profile is loaded
        }
      } catch (error) {
        console.warn('Error checking profile:', error);
      }
      
      // First-time user or incomplete profile - require password creation
      setStep("create_password");
      toast({ 
        title: "Welcome!", 
        description: "Let's secure your account and complete your profile." 
      });
    } catch (error: any) {
      toast({ title: "Invalid code", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid || !passwordsMatch) return;
    
    setLoading(true);

    try {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (passwordError) throw passwordError;

      toast({ 
        title: "Password Created!", 
        description: "Great! Now let's complete your profile setup..." 
      });
      
      // Small delay to show the success message
      setTimeout(() => {
        navigate("/onboarding", { replace: true });
      }, 1500);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
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
        {loading ? "Checking..." : "Continue"}
      </Button>
    </form>
  );

  const renderAdminAccess = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Key className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <p className="text-sm text-gray-600">
          Welcome back, <strong>{email.split('@')[0]}</strong>! 
          <br />Choose your preferred sign-in method:
        </p>
      </div>
      
      <Button
        onClick={handleAdminAccess}
        className="w-full h-11 font-semibold"
        style={{ backgroundColor: brandGreen }}
        disabled={loading}
      >
        {loading ? "Sending..." : "Send 6-Digit Access Code"}
      </Button>
      
      <div className="text-center">
        <span className="text-sm text-gray-500">or</span>
      </div>
      
      <Button
        onClick={() => setStep("auth_method")}
        variant="outline"
        className="w-full h-11 font-semibold"
      >
        Other Sign-in Options
      </Button>

      {/* Development/Debug Access */}
      {(email === 'daniel.pedraza@3mgroofing.com' || email === 'jay.moroff@3mgroofing.com') && (
        <Button
          onClick={() => {
            toast({ 
              title: "Debug Access", 
              description: "Bypassing authentication for development..." 
            });
            navigate("/", { replace: true });
          }}
          variant="outline"
          className="w-full h-8 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
        >
          🔧 Development Bypass
        </Button>
      )}
      
      <Button
        onClick={() => setStep("email")}
        variant="ghost"
        className="w-full h-8 text-sm"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Different Email
      </Button>
    </div>
  );

  const renderAuthMethodChoice = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600">Welcome back! How would you like to sign in?</p>
      </div>
      
      <Button
        onClick={() => setStep("password")}
        className="w-full h-11 font-semibold"
        style={{ backgroundColor: brandGreen }}
      >
        Sign in with Password
      </Button>
      
      <Button
        onClick={handleSendOTP}
        variant="outline"
        className="w-full h-11 font-semibold"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send 6-digit Code Instead"}
      </Button>
      
      <Button
        onClick={() => setStep("admin_access")}
        variant="ghost"
        className="w-full h-8 text-sm"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Admin Access
      </Button>
    </div>
  );

  const renderPasswordForm = () => (
    <form className="space-y-4" onSubmit={handlePasswordLogin}>
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 pr-10"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      
      <Button
        type="submit"
        className="w-full h-11 font-semibold"
        style={{ backgroundColor: brandGreen }}
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>
      
      <div className="flex justify-between">
        <Button
          onClick={() => setStep("auth_method")}
          variant="ghost"
          className="text-sm"
          type="button"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Button
          onClick={handleSendOTP}
          variant="ghost"
          className="text-sm"
          type="button"
          disabled={loading}
        >
          Send Code Instead
        </Button>
      </div>
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
      
      <Button
        onClick={() => hasPassword ? setStep("admin_access") : setStep("email")}
        variant="ghost"
        className="w-full text-sm"
        type="button"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
    </form>
  );

  const renderCreatePasswordForm = () => (
    <form className="space-y-4" onSubmit={handleCreatePassword}>
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Create a secure password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        
        {/* Password Requirements */}
        <div className="text-xs space-y-1">
          <div className={`flex items-center gap-2 ${passwordChecks.length ? 'text-green-600' : 'text-gray-400'}`}>
            {passwordChecks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            At least 8 characters
          </div>
          <div className={`flex items-center gap-2 ${passwordChecks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
            {passwordChecks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            One uppercase letter
          </div>
          <div className={`flex items-center gap-2 ${passwordChecks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
            {passwordChecks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            One lowercase letter
          </div>
          <div className={`flex items-center gap-2 ${passwordChecks.number ? 'text-green-600' : 'text-gray-400'}`}>
            {passwordChecks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            One number
          </div>
          <div className={`flex items-center gap-2 ${passwordChecks.special ? 'text-green-600' : 'text-gray-400'}`}>
            {passwordChecks.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            One special character
          </div>
        </div>
      </div>

      <Input
        type="password"
        placeholder="Confirm your password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="h-11"
      />
      
      {confirmPassword && !passwordsMatch && (
        <p className="text-xs text-red-500">Passwords do not match</p>
      )}

      <Button
        type="submit"
        className="w-full h-11 font-semibold"
        style={{ backgroundColor: brandGreen }}
        disabled={loading || !isPasswordValid || !passwordsMatch}
      >
        {loading ? "Creating..." : "Create Password"}
      </Button>
    </form>
  );

  const getTitle = () => {
    switch (step) {
      case "email": return "Sign in to Estimator";
      case "admin_access": return "Admin Access";
      case "auth_method": return "Choose Sign-in Method";
      case "password": return "Enter Your Password";
      case "code": return "Enter the 6-digit code";
      case "create_password": return "Create Your Password";
      default: return "Sign in to Estimator";
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case "admin_access": return "Secure administrator sign-in";
      case "auth_method": return `Signing in as ${email}`;
      case "password": return `Welcome back, ${email.split('@')[0]}`;
      case "create_password": return "Secure your account with a strong password";
      default: return "";
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: `linear-gradient(135deg, ${brandGreen} 0%, #ffffff 60%)` }}
    >
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8" style={{ color: brandGreen }} />
            <h1 className="text-3xl font-extrabold" style={{ color: brandGreen }}>
              3MG Roofing & Solar
            </h1>
          </div>
          <CardTitle className="text-xl font-semibold text-gray-800">
            {getTitle()}
          </CardTitle>
          {getSubtitle() && (
            <p className="text-sm text-gray-600">{getSubtitle()}</p>
          )}
        </CardHeader>
        <CardContent>
          {step === "email" && renderEmailForm()}
          {step === "admin_access" && renderAdminAccess()}
          {step === "auth_method" && renderAuthMethodChoice()}
          {step === "password" && renderPasswordForm()}
          {step === "code" && renderCodeForm()}
          {step === "create_password" && renderCreatePasswordForm()}
        </CardContent>
      </Card>
    </div>
  );
} 