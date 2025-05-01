import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  FileText,
  Database,
  DollarSign,
  Settings,
  Menu,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Estimates", href: "/estimates", icon: FileText },
  { name: "Pricing", href: "/pricing", icon: DollarSign },
  { name: "Accounting", href: "/accounting-report", icon: FileSpreadsheet },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  // For desktop view
  const desktopSidebar = (
    <div
      className={cn(
        "hidden md:flex h-screen flex-col bg-sidebar text-sidebar-foreground p-4 transition-all duration-300",
        expanded ? "w-64" : "w-20"
      )}
    >
      <div className="flex items-center justify-between mb-8">
        {expanded && (
          <div className="text-xl font-semibold tracking-tight text-sidebar-foreground animate-fade-in">
            3MG Estimator
          </div>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="ml-auto bg-sidebar-accent text-sidebar-accent-foreground rounded-full h-8 w-8"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <nav className="space-y-2 flex-1">
        {navigationItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center py-3 px-4 rounded-lg text-sm transition-colors",
              location.pathname === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="h-5 w-5 mr-3" />
            {expanded && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4 text-xs text-sidebar-foreground/60">
        {expanded && <div>© 2023 3MG Estimator</div>}
      </div>
    </div>
  );

  // For mobile view
  const mobileMenuButton = (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleMobileSidebar}
      className="md:hidden fixed top-4 left-4 z-50 bg-background border-border"
    >
      {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );

  const mobileSidebar = mobileOpen && (
    <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-64 h-full bg-sidebar p-4 animate-slide-in-left">
        <div className="flex items-center justify-between mb-8">
          <div className="text-xl font-semibold tracking-tight text-sidebar-foreground">
            3MG Estimator
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMobileSidebar}
            className="bg-sidebar-accent text-sidebar-accent-foreground rounded-full h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center py-3 px-4 rounded-lg text-sm transition-colors",
                location.pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="h-5 w-5 mr-3" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 text-xs text-sidebar-foreground/60 absolute bottom-4 left-4">
          <div>© 2023 3MG Estimator</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {desktopSidebar}
      {mobileMenuButton}
      {mobileSidebar}
    </>
  );
}
