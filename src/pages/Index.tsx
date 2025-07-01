import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { RecentEstimates } from "@/components/dashboard/RecentEstimates";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MainContent } from '@/components/dashboard/MainContent';

const Index: React.FC = () => {
  return (
    <MainContent />
  );
};

export default Index;
