import { useState, memo } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal';
import { FloatingActionMenu } from '@/components/ui/floating-action-menu';
import { CommandPalette } from '@/components/CommandPalette';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = memo(function AppLayout({ children }: AppLayoutProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Command Palette */}
      <CommandPalette onAddTransaction={() => setIsAddModalOpen(true)} />
      
      {/* Mobile Navigation */}
      <MobileNav onAddTransaction={() => setIsAddModalOpen(true)} />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar onAddTransaction={() => setIsAddModalOpen(true)} />
      </div>
      
      {/* Main Content */}
      <main className={`
        ${isMobile ? 'pt-14 pb-24' : 'pl-64'}
        transition-all duration-300 ease-out relative
      `}>
        <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">{children}</div>
      </main>
      
      {/* Floating Action Menu - desktop only */}
      {!isMobile && (
        <FloatingActionMenu onAddTransaction={() => setIsAddModalOpen(true)} />
      )}
      
      <AddTransactionModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
    </div>
  );
});
