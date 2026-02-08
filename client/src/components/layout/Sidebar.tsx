import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <img src="/logo-icon.svg" alt="Innovative Group" className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight text-sidebar-foreground">
              Innovative
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-primary">
              Group
            </span>
          </div>
        </div>

        {/* Navigation — all items come from GET /api/modules */}
        <nav className="flex-1 overflow-auto p-3">
          <ul className="space-y-1">
            {modules.map((mod) => {
              const Icon = getIcon(mod.icon);
              const isActive = mod.basePath === "/"
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

        {/* Footer spacer */}
        <div className="border-t border-sidebar-border p-3" />
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
