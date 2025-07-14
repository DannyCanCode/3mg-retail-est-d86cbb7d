import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function UserMenu() {
  const { user, logout } = useAuth();

  const initials = (user?.email ?? "").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-green-800/50 hover:bg-green-700/60 text-green-300 border-green-600 h-9 w-9 transition-all hover:shadow-[0_0_15px_rgba(74,222,128,0.3)] font-semibold"
        >
          <span className="text-sm font-bold drop-shadow-sm">{initials}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 bg-gray-800 border-green-600/50 text-gray-100 shadow-xl shadow-green-500/10">
        <div className="text-sm mb-2 text-gray-300">Signed in as</div>
        <div className="text-sm font-medium truncate mb-4 text-green-300">{user?.email}</div>
        <Button 
          variant="destructive" 
          className="w-full bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/50 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
          onClick={handleLogout}
        >
          Log out
        </Button>
      </PopoverContent>
    </Popover>
  );
} 