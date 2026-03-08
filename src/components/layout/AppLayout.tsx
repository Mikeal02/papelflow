import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal';
import { FloatingActionMenu } from '@/components/ui/floating-action-menu';
import { CommandPalette } from '@/components/CommandPalette';
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
      
      {/* Animated ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/[0.02] rounded-full blur-[100px] animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/[0.02] rounded-full blur-[80px] animate-[float_15s_ease-in-out_infinite_reverse]" />
      </div>
      
      {/* Animated particles background */}
      <div className="fixed inset-0 particles pointer-events-none opacity-30" />
      
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
