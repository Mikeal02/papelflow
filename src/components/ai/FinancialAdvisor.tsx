import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Sparkles, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAccounts } from '@/hooks/useAccounts';
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useGoals } from '@/hooks/useGoals';
import { useBudgets } from '@/hooks/useBudgets';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const FinancialAdvisor = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: accounts = [] } = useAccounts();
  const { data: stats } = useMonthlyStats();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: goals = [] } = useGoals();
  const { data: budgets = [] } = useBudgets();
  const { formatCurrency } = useCurrency();

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const savingsRate = stats?.income ? Math.round(((stats.income - stats.expenses) / stats.income) * 100) : 0;

  const topCategories = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const cat = categories.find(c => c.id === t.category_id);
      if (cat) {
        acc[cat.name] = (acc[cat.name] || 0) + Number(t.amount);
      }
      return acc;
    }, {} as Record<string, number>);

  const sortedCategories = Object.entries(topCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name]) => name);

  // Calculate spending per budget category from transactions
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = transactions
    .filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth))
    .reduce((acc, t) => {
      if (t.category_id) {
        acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount);
      }
      return acc;
    }, {} as Record<string, number>);

  const overBudgetCount = budgets.filter(b => {
    const spent = monthlyExpenses[b.category_id] || 0;
    return spent > Number(b.amount);
  }).length;
  const budgetStatus = overBudgetCount > 0 
    ? `${overBudgetCount} budget(s) over limit` 
    : 'All budgets on track';

  const financialContext = {
    totalBalance: formatCurrency(totalBalance),
    monthlyIncome: formatCurrency(stats?.income || 0),
    monthlyExpenses: formatCurrency(stats?.expenses || 0),
    savingsRate,
    topCategories: sortedCategories,
    activeGoals: goals.length,
    budgetStatus,
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-advisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          financialContext,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}
      >
        <Bot className="h-5 w-5 md:h-6 md:w-6" />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] md:w-96 h-[70vh] md:h-[500px] max-h-[600px] bg-card border border-border rounded-xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Financial Advisor</h3>
                  <p className="text-xs text-muted-foreground">AI-powered insights</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask me anything about your finances!
                  </p>
                  <div className="space-y-2 w-full">
                    {[
                      'How can I save more money?',
                      'Analyze my spending habits',
                      'Tips to reach my goals faster',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="w-full text-left p-3 text-xs bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted rounded-bl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg rounded-bl-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your finances..."
                  className="flex-1 h-10"
                  disabled={isLoading}
                />
                <Button 
                  size="icon" 
                  onClick={sendMessage} 
                  disabled={!input.trim() || isLoading}
                  className="shrink-0 h-10 w-10"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
