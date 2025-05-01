import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Home, FileText, Database, BarChart2, Settings, Calculator, FileSpreadsheet } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, current: true },
  { name: 'Estimates', href: '/estimates', icon: FileText, current: false },
  { name: 'Measurements', href: '/measurements', icon: Database, current: false },
  { name: 'Pricing', href: '/pricing', icon: BarChart2, current: false },
  { name: 'Accounting', href: '/accounting-report', icon: FileSpreadsheet, current: false },
  { name: 'Settings', href: '/settings', icon: Settings, current: false },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function MainLayout({ children, className }: MainLayoutProps) {
  const location = useLocation();

  const currentNavigation = navigation.map(item => ({
    ...item,
    current: item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href),
  }));

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
