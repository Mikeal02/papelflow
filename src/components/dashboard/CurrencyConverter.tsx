import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, RefreshCw, TrendingUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExchangeRates, convertCurrency } from '@/hooks/useExchangeRates';
import { useCurrency } from '@/contexts/CurrencyContext';

const popularCurrencies = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW', 'SGD', 'AED', 'SAR',
];

export function CurrencyConverter() {
  const { currency: baseCurrency } = useCurrency();
  const { data: ratesData, isLoading, refetch, isFetching } = useExchangeRates(baseCurrency);

  const [amount, setAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState(baseCurrency);
  const [toCurrency, setToCurrency] = useState(baseCurrency === 'EUR' ? 'USD' : 'EUR');

  const converted = useMemo(() => {
    if (!ratesData?.rates || !amount) return null;
    return convertCurrency(parseFloat(amount) || 0, fromCurrency, toCurrency, ratesData.rates, ratesData.base);
  }, [amount, fromCurrency, toCurrency, ratesData]);

  const rate = useMemo(() => {
    if (!ratesData?.rates) return null;
    return convertCurrency(1, fromCurrency, toCurrency, ratesData.rates, ratesData.base);
  }, [fromCurrency, toCurrency, ratesData]);

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Currency Converter</h3>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <span className="text-xs text-muted-foreground">From</span>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-10 font-semibold"
              />
            </div>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger className="w-24 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {popularCurrencies.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center">
            <button onClick={swap} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
              <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground rotate-90" />
            </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <span className="text-xs text-muted-foreground">To</span>
              <div className="h-10 px-3 flex items-center rounded-lg border border-input bg-muted/30 font-semibold text-sm tabular-nums truncate overflow-hidden">
                {converted !== null ? converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </div>
            </div>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger className="w-24 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {popularCurrencies.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rate !== null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <TrendingUp className="h-3 w-3" />
              <span>1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}</span>
              <span className="text-[10px]">• Live rate</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
