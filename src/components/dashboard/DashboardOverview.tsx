
import React from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { FileText, DollarSign, CheckCircle, Clock } from "lucide-react";

export function DashboardOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-in-up" style={{ animationDelay: "0.1s" }}>
      <MetricCard
        title="Total Estimates"
        value="24"
        icon={<FileText className="h-5 w-5 text-accent" />}
        trend={{ value: 12, isPositive: true }}
      />
      <MetricCard
        title="Revenue (MTD)"
        value="$48,250"
        icon={<DollarSign className="h-5 w-5 text-accent" />}
        trend={{ value: 8, isPositive: true }}
      />
      <MetricCard
        title="Approved"
        value="18"
        icon={<CheckCircle className="h-5 w-5 text-[#10b981]" />}
        description="75% approval rate"
      />
      <MetricCard
        title="Pending"
        value="6"
        icon={<Clock className="h-5 w-5 text-[#f59e0b]" />}
        description="Awaiting customer review"
      />
    </div>
  );
}
