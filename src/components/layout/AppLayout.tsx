import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal';
import { FloatingActionMenu } from '@/components/ui/floating-action-menu';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background/95 backdrop-blur-[2px]">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 subtle-grid pointer-events-none opacity-50" />
      
      {/* Animated particles background */}
      <div className="fixed inset-0 particles pointer-events-none opacity-30" />
      
      {/* Mobile Navigation */}
      <MobileNav onAddTransaction={() => setIsAddModalOpen(true)} />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar onAddTransaction={() => setIsAddModalOpen(true)} />
      </div>
      
      {/* Main Content */}
      <main className={`
        ${isMobile ? 'pt-14 pb-20' : 'pl-64'}
        transition-all duration-300 ease-out relative
      `}>
        <div className="min-h-screen p-4 md:p-6 lg:p-8">{children}</div>
      </main>
      
      {/* Floating Action Menu */}
      <FloatingActionMenu onAddTransaction={() => setIsAddModalOpen(true)} />
      
      <AddTransactionModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
    </div>
  );
}
