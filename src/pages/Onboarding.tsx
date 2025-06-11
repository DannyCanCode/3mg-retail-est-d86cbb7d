import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Onboarding() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-semibold text-gray-800">
            Onboarding Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p>
            You successfully signed in! The onboarding form will be available in the next update.
          </p>
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
} 