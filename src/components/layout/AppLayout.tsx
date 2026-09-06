import { useState, memo } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { FloatingActionMenu } from "@/components/ui/floating-action-menu";
import { CommandPalette } from "@/components/CommandPalette";
import { ActionCenter } from "@/components/action-center/ActionCenter";
import { TopBar } from "./TopBar";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = memo(function AppLayout({ children }: AppLayoutProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="command-workspace min-h-dvh bg-background">
      {/* Command Palette */}
      <CommandPalette onAddTransaction={() => setIsAddModalOpen(true)} />

      {/* Mobile Navigation */}
      <MobileNav onAddTransaction={() => setIsAddModalOpen(true)} />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar onAddTransaction={() => setIsAddModalOpen(true)} />
      </div>

      {/* Main Content */}
      <main
        className={`
        ${isMobile ? "pt-14 pb-24" : "pl-64"}
        relative transition-all duration-300 ease-out
      `}
      >
        {!isMobile && (
          <TopBar onAddTransaction={() => setIsAddModalOpen(true)} />
        )}
        <div className="page-shell min-h-dvh px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-9">
          {children}
        </div>
      </main>

      {/* Floating Action Menu - desktop only */}
      {!isMobile && (
        <FloatingActionMenu onAddTransaction={() => setIsAddModalOpen(true)} />
      )}

      <AddTransactionModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />

      {/* Global Action Center */}
      <ActionCenter />
    </div>
  );
});
