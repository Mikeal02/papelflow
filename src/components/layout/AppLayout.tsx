import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onAddTransaction={() => setIsAddModalOpen(true)} />
      <main className="pl-64">
        <div className="min-h-screen p-6">{children}</div>
      </main>
      <AddTransactionModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
    </div>
  );
}
