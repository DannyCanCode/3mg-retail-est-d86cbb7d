import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const CheckEmailPage: React.FC = () => {
  const location = useLocation();
  const email = location.state?.email || 'your email address';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-lg text-center p-8">
        <CardHeader>
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Please Confirm Your Email</CardTitle>
          <CardDescription className="text-base text-gray-600 pt-2">
            We've sent a confirmation link to <strong className="text-gray-800">{email}</strong>.
            <br />
            You must click the link in that email to activate your account before you can sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4" role="alert">
            <p className="font-bold">Can't find the email?</p>
            <p>Please check your spam or junk folder. The email will be from Supabase.</p>
          </div>
          <Button asChild variant="link" className="mt-6">
            <Link to="/login">Back to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckEmailPage; 