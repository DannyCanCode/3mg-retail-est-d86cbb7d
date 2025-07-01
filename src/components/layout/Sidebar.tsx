import React, { useState, useEffect } from "react";
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
  Users as UsersIcon,
  BarChart3,
  Package,
  Wrench,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserMenu } from '@/components/layout/UserMenu';
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/components/RoleGuard";

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, user } = useAuth();
  const { isAdmin, isManager, isSalesRep, canAccess } = useRoleAccess();
  
  // Get role-appropriate navigation items with production restrictions
  const getNavigationItems = () => {
    const userRole = profile?.role;

    // Production-ready role restrictions
    switch (userRole) {
      case 'admin':
        return [
          { name: "Admin Dashboard", href: "/", icon: Home },
          { name: "Estimates", href: "/estimates", icon: FileText },
          { name: "Pricing", href: "/pricing", icon: DollarSign },
          { name: "Subtrades", href: "/subtrades", icon: Wrench },
          { name: "Accounting", href: "/accounting-report", icon: FileSpreadsheet },
          { name: "Users", href: "/users", icon: UsersIcon },
          { name: "Territories", href: "/territories", icon: Database },
          // Development mode - allow admin to see other role views
          { name: "Manager View", href: "/manager", icon: BarChart3 },
          { name: "Sales Rep View", href: "/sales", icon: Package },
        ];
      
      case 'manager':
        return [
          { name: "Manager Dashboard", href: "/manager", icon: Home },
          { name: "Estimates", href: "/estimates", icon: FileText },
          { name: "Pricing", href: "/pricing", icon: DollarSign },
          { name: "Subtrades", href: "/subtrades", icon: Wrench },
          { name: "Accounting", href: "/accounting-report", icon: FileSpreadsheet },
        ];
      
      case 'rep':
        return [
          { name: "Sales Dashboard", href: "/sales", icon: Home },
          { name: "My Estimates", href: "/estimates", icon: FileText },
        ];
      
      case 'subtrade_manager':
        return [
          { name: "Subtrades", href: "/subtrades", icon: Wrench },
        ];
      
      default:
        return [
          { name: "Dashboard", href: "/", icon: Home },
        ];
    }
  };

  const navigationItems = getNavigationItems();

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  // Get role-appropriate sidebar title
  const getSidebarTitle = () => {
    const userRole = profile?.role;
    switch (userRole) {
      case 'admin': return '3MG Admin';
      case 'manager': return '3MG Manager';
      case 'rep': return '3MG Sales';
      default: return '3MG Estimator';
    }
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
            {getSidebarTitle()}
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

      <div className="mt-auto flex flex-col items-center gap-4">
        <UserMenu />
        {expanded && (
          <div className="text-xs text-sidebar-foreground/60">© 2025 3MG Roofing</div>
        )}
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
            {getSidebarTitle()}
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

        <div className="mt-auto pt-4 space-y-4 absolute bottom-4 left-4">
          <UserMenu />
          <div className="text-xs text-sidebar-foreground/60">© 2025 3MG Roofing</div>
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
