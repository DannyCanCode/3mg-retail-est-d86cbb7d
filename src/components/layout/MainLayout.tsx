
import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className={cn("flex-1 overflow-auto", className)}>
        <div className="container py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
