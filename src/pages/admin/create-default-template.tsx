import React, { useState } from "react";
import { createDefaultTemplate } from "@/utils/create-default-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useRouter } from "next/router";

export default function CreateDefaultTemplatePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
  }>({});
  const router = useRouter();

  const handleCreateTemplate = async () => {
    setIsLoading(true);
    setResult({});

    try {
      const { data, error } = await createDefaultTemplate();

      if (error) {
        setResult({
          success: false,
          message: `Error creating template: ${error.message}`
        });
        toast({
          title: "Error",
          description: `Failed to create template: ${error.message}`,
          variant: "destructive"
        });
      } else {
        setResult({
          success: true,
          message: `Template "${data?.name}" created successfully`
        });
        toast({
          title: "Success",
          description: "Default template created successfully!",
          variant: "default"
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setResult({
        success: false,
        message: `Exception: ${errorMessage}`
      });
      toast({
        title: "Error",
        description: `An exception occurred: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goToPricingTemplates = () => {
    router.push("/pricing");
  };

  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Default Template</CardTitle>
          <CardDescription>
            This will create a new default pricing template with updated materials and prices.
            If a default template already exists, it will be unmarked as default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              The template will include all the updated materials with their latest prices and coverage rules.
            </p>
            <p>
              Template Name: <strong>Standard GAF Package (Updated)</strong>
            </p>
            <p>
              Contains <strong>{56}</strong> materials across all categories.
            </p>

            {result.success === true && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                <div className="text-green-700">
                  <p className="font-medium">Success</p>
                  <p className="text-sm">{result.message}</p>
                  <p className="text-sm mt-2">
                    You can now view and edit the template on the{" "}
                    <button
                      className="text-green-800 underline font-medium"
                      onClick={goToPricingTemplates}
                    >
                      Pricing Templates
                    </button>{" "}
                    page.
                  </p>
                </div>
              </div>
            )}

            {result.success === false && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                <div className="text-red-700">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{result.message}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={goToPricingTemplates}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateTemplate}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Default Template"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 