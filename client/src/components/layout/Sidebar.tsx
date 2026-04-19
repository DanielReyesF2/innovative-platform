import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

interface ModuleNavItem {
  name: string;
  displayName: string;
  icon: string;
  basePath: string;
  navOrder: number;
}

function getIcon(iconName: string): LucideIcon {
  const icon = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
  return icon || LayoutDashboard;
}

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  // Fetch available modules from the server
  const { data: modules = [] } = useQuery<ModuleNavItem[]>({
    queryKey: ["/api/modules"],
    staleTime: 10 * 60 * 1000, // 10 minutes — modules don't change often
  });

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar transition-transform lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo / brand */}
        <div className="flex h-24 items-center justify-center border-b border-sidebar-border px-3">
          <img src="/IGMexico-Blanco.png" alt="Innovative Group" className="h-20 w-auto" />
        </div>

        {/* Navigation — all items come from GET /api/modules */}
        <nav className="flex-1 overflow-auto p-3">
          <ul className="space-y-1">
            {modules.map((mod) => {
              const Icon = getIcon(mod.icon);
              const isActive = mod.basePath === "/comercial"
                ? location === "/" || location.startsWith("/comercial")
                : mod.basePath === "/"
                  ? location === "/"
                  : location.startsWith(mod.basePath);
              return (
                <NavItem
                  key={mod.name}
                  href={mod.basePath}
                  icon={Icon}
                  label={mod.displayName}
                  active={isActive}
                />
              );
            })}
          </ul>
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-sidebar-border p-3">
          {user && (
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-semibold text-sidebar-primary-foreground flex-shrink-0">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.name || "Usuario"}
                </div>
                <div className="text-[10px] text-sidebar-foreground/60 truncate">
                  {user.email}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 rounded-md text-sm font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    </li>
  );
}
