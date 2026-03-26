import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NovaFloatingWidget } from "@/features/nova/components/NovaFloatingWidget";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-[#faf7f2]">
          {children}
        </main>
      </div>
      <NovaFloatingWidget />
    </div>
  );
}
