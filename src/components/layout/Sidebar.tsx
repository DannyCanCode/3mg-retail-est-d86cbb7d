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
  Library,
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
          { name: "Documents Library", href: "/documents", icon: Library },
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

  // Use dark theme with green accents for all users
  const isDarkTheme = true; // Always use dark theme
  const sidebarBg = 'bg-gray-800';
  const sidebarBorder = 'border-green-600/50';
  const sidebarText = 'text-gray-100';
  const sidebarShadow = 'shadow-2xl shadow-green-500/20';

  // For desktop view
  const desktopSidebar = (
    <div
      className={cn(
        `hidden md:flex h-screen flex-col ${sidebarBg} border-r-2 ${sidebarBorder} ${sidebarText} p-4 transition-all duration-300 ${sidebarShadow}`,
        expanded ? "w-64" : "w-20"
      )}
    >
      <div className="flex items-center justify-between mb-8">
        {expanded && (
          <div className={cn(
            "text-xl font-semibold tracking-tight animate-fade-in",
            isDarkTheme ? "text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" : "text-gray-900"
          )}>
            {getSidebarTitle()}
          </div>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="ml-auto bg-green-800/50 hover:bg-green-700/60 text-green-300 border-green-600 rounded-full h-8 w-8 transition-all hover:shadow-[0_0_15px_rgba(74,222,128,0.3)]"
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
              "flex items-center py-3 px-4 rounded-lg text-sm transition-all duration-200 font-medium",
              location.pathname === item.href
                ? "bg-gradient-to-r from-green-600/40 to-emerald-600/40 text-green-200 border border-green-500/50 shadow-lg shadow-green-500/20 backdrop-blur-sm"
                : "text-gray-300 hover:text-green-200 hover:bg-green-800/30 hover:border-green-600/30 border border-transparent"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 mr-3 transition-colors",
              location.pathname === item.href ? "text-green-300 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "text-gray-400"
            )} />
            {expanded && <span className="drop-shadow-sm">{item.name}</span>}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4 border-t border-green-700/30 pt-4">
        <UserMenu />
        {expanded && (
          <div className="text-xs text-gray-400">© 2025 3MG Roofing</div>
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
      className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 border-green-600 hover:bg-green-800/80 text-green-300 shadow-lg shadow-green-500/20"
    >
      {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );

  const mobileSidebar = mobileOpen && (
    <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={cn(
        "w-64 h-full p-4 animate-slide-in-left border-r-2",
        isDarkTheme 
          ? "bg-gray-800 border-green-600/50 shadow-2xl shadow-green-500/20" 
          : "bg-white border-gray-200 shadow-lg"
      )}>
        <div className="flex items-center justify-between mb-8">
          <div className={cn(
            "text-xl font-semibold tracking-tight",
            isDarkTheme ? "text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" : "text-gray-900"
          )}>
            {getSidebarTitle()}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMobileSidebar}
            className="bg-green-800/50 hover:bg-green-700/60 text-green-300 border-green-600 rounded-full h-8 w-8 hover:shadow-[0_0_15px_rgba(74,222,128,0.3)]"
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
                "flex items-center py-3 px-4 rounded-lg text-sm transition-all duration-200 font-medium",
                location.pathname === item.href
                  ? isDarkTheme 
                    ? "bg-gradient-to-r from-green-600/40 to-emerald-600/40 text-green-200 border border-green-500/50 shadow-lg shadow-green-500/20 backdrop-blur-sm"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                  : isDarkTheme
                    ? "text-gray-300 hover:text-green-200 hover:bg-green-800/30 hover:border-green-600/30 border border-transparent"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
              )}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className={cn(
                "h-5 w-5 mr-3 transition-colors",
                location.pathname === item.href 
                  ? isDarkTheme 
                    ? "text-green-300 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" 
                    : "text-blue-600"
                  : isDarkTheme 
                    ? "text-gray-400" 
                    : "text-gray-500"
              )} />
              <span className="drop-shadow-sm">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className={cn(
          "mt-auto pt-4 space-y-4 absolute bottom-4 left-4 border-t w-56",
          isDarkTheme ? "border-green-700/30" : "border-gray-200"
        )}>
          <UserMenu />
          <div className={cn("text-xs", isDarkTheme ? "text-gray-400" : "text-gray-500")}>© 2025 3MG Roofing</div>
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
