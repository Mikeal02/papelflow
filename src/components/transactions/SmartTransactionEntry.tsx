import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, Loader2, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface ParsedTransaction {
  amount: number;
  payee: string;
  category_id?: string;
  account_id?: string;
  type: 'expense' | 'income';
  date: string;
  confidence: number;
}

export const SmartTransactionEntry = ({ onClose }: { onClose: () => void }) => {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const createTransaction = useCreateTransaction();
  const { formatCurrency } = useCurrency();

  const parseNaturalLanguage = (text: string): ParsedTransaction | null => {
    if (!text.trim()) return null;

    // Extract amount
    const amountMatch = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
    if (!amount) return null;

    // Determine type
    const incomeKeywords = ['received', 'earned', 'got paid', 'salary', 'income', 'refund', 'deposited'];
    const isIncome = incomeKeywords.some(kw => text.toLowerCase().includes(kw));

    // Extract payee (words that aren't amount/keywords)
    const cleaned = text.replace(/\$?[\d,]+(?:\.\d{2})?/, '').trim();
    const stopWords = ['at', 'for', 'on', 'spent', 'paid', 'bought', 'from', 'received', 'earned', 'got', 'just', 'today', 'yesterday'];
    const payeeWords = cleaned.split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));
    const payee = payeeWords.join(' ') || 'Unknown';

    // Smart category matching
    const categoryKeywords: Record<string, string[]> = {
      'food': ['restaurant', 'food', 'lunch', 'dinner', 'breakfast', 'eat', 'meal', 'pizza', 'burger', 'sushi', 'cafe'],
      'coffee': ['starbucks', 'coffee', 'cafe', 'latte', 'espresso'],
      'groceries': ['grocery', 'groceries', 'supermarket', 'walmart', 'costco', 'aldi', 'trader'],
      'transport': ['uber', 'lyft', 'gas', 'fuel', 'taxi', 'bus', 'metro', 'parking', 'toll'],
      'entertainment': ['movie', 'netflix', 'spotify', 'game', 'concert', 'theater', 'fun'],
      'shopping': ['amazon', 'target', 'mall', 'clothes', 'shoes', 'buy', 'bought', 'purchase'],
      'utilities': ['electric', 'water', 'internet', 'phone', 'bill', 'utility'],
      'health': ['doctor', 'pharmacy', 'hospital', 'medicine', 'gym', 'health', 'dental'],
      'rent': ['rent', 'mortgage', 'housing', 'lease'],
    };

    let matchedCategory = categories[0];
    let confidence = 0.5;
    const lowerText = text.toLowerCase();

    for (const [keyword, terms] of Object.entries(categoryKeywords)) {
      if (terms.some(term => lowerText.includes(term))) {
        const cat = categories.find(c => c.name.toLowerCase().includes(keyword) || c.category_group?.toLowerCase().includes(keyword));
        if (cat) {
          matchedCategory = cat;
          confidence = 0.85;
          break;
        }
      }
    }

    // Date parsing
    let date = new Date().toISOString().split('T')[0];
    if (lowerText.includes('yesterday')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split('T')[0];
    }

    const defaultAccount = accounts[0];

    return {
      amount,
      payee: payee.charAt(0).toUpperCase() + payee.slice(1),
      category_id: matchedCategory?.id,
      account_id: defaultAccount?.id,
      type: isIncome ? 'income' : 'expense',
      date,
      confidence,
    };
  };

  const handleParse = () => {
    setIsParsing(true);
    // Simulate brief processing time for UX
    setTimeout(() => {
      const result = parseNaturalLanguage(input);
      setParsed(result);
      setIsParsing(false);
    }, 300);
  };

  const handleConfirm = async () => {
    if (!parsed || !parsed.account_id) return;
    await createTransaction.mutateAsync({
      amount: parsed.amount,
      payee: parsed.payee,
      category_id: parsed.category_id || null,
      account_id: parsed.account_id,
      type: parsed.type,
      date: parsed.date,
    });
    setParsed(null);
    setInput('');
    onClose();
  };

  const matchedCategory = categories.find(c => c.id === parsed?.category_id);
  const matchedAccount = accounts.find(a => a.id === parsed?.account_id);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="stat-card !p-4 glow-effect"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Quick Add</h3>
        </div>
        <button onClick={onClose} className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          placeholder='e.g. "Spent $50 at Starbucks" or "Earned $3000 salary"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleParse()}
          className="flex-1 text-sm"
        />
        <Button size="sm" onClick={handleParse} disabled={!input.trim() || isParsing}>
          {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
      </div>

      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="rounded-xl bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('text-lg font-bold', parsed.type === 'income' ? 'text-income' : 'text-expense')}>
                  {parsed.type === 'income' ? '+' : '-'}{formatCurrency(parsed.amount)}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {Math.round(parsed.confidence * 100)}% confidence
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">{parsed.payee}</Badge>
                {matchedCategory && (
                  <Badge className="text-[10px]" style={{ backgroundColor: `${matchedCategory.color}20`, color: matchedCategory.color || undefined }}>
                    {matchedCategory.name}
                  </Badge>
                )}
                {matchedAccount && <Badge variant="secondary" className="text-[10px]">{matchedAccount.name}</Badge>}
                <Badge variant="outline" className="text-[10px]">{parsed.date}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setParsed(null)}>
                Edit
              </Button>
              <Button size="sm" className="flex-1 btn-premium" onClick={handleConfirm} disabled={createTransaction.isPending}>
                {createTransaction.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Confirm</>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!parsed && (
        <p className="text-[10px] text-muted-foreground text-center">
          Type naturally — AI will parse amount, payee, and category
        </p>
      )}
    </motion.div>
  );
};
