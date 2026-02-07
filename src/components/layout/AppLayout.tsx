import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Navigation */}
      <MobileNav onAddTransaction={() => setIsAddModalOpen(true)} />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar onAddTransaction={() => setIsAddModalOpen(true)} />
      </div>
      
      {/* Main Content */}
      <main className={`
        ${isMobile ? 'pt-14' : 'pl-64'}
        transition-all duration-200
      `}>
        <div className="min-h-screen p-4 md:p-6 lg:p-8">{children}</div>
      </main>
      
      <AddTransactionModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
    </div>
  );
}
