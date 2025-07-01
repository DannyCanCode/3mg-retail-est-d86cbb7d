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
          className="rounded-full bg-sidebar-accent text-sidebar-accent-foreground h-9 w-9"
        >
          <span className="text-sm font-semibold">{initials}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="text-sm mb-2">Signed in as</div>
        <div className="text-sm font-medium truncate mb-4">{user?.email}</div>
        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          Log out
        </Button>
      </PopoverContent>
    </Popover>
  );
} 