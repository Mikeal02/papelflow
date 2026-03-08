import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, BarChart3, PieChart as PieIcon, Plus, Trash2,
  DollarSign, Percent, Calendar, ArrowUpRight, ArrowDownRight, Briefcase,
  LineChart as LineIcon, Layers, Coins, RefreshCw, Info, Target, FileText
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { generatePortfolioStatementPDF } from '@/lib/pdf-generator';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line,
  ComposedChart, ReferenceLine
} from 'recharts';
import { format, subMonths, subDays } from 'date-fns';

// Asset classes with colors
const ASSET_CLASSES = [
  { key: 'stocks', label: 'Stocks', color: 'hsl(var(--primary))' },
  { key: 'bonds', label: 'Bonds', color: 'hsl(var(--accent))' },
  { key: 'realEstate', label: 'Real Estate', color: 'hsl(var(--warning))' },
  { key: 'crypto', label: 'Crypto', color: 'hsl(215, 85%, 55%)' },
  { key: 'commodities', label: 'Commodities', color: 'hsl(var(--income))' },
  { key: 'cash', label: 'Cash & Equivalents', color: 'hsl(var(--muted-foreground))' },
];

interface Holding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  assetClass: string;
  dividendYield: number;
  sector: string;
}

interface Dividend {
  date: string;
  ticker: string;
  amount: number;
  type: 'qualified' | 'ordinary';
}

// Demo holdings
const DEMO_HOLDINGS: Holding[] = [
  { id: '1', ticker: 'VTI', name: 'Vanguard Total Stock Market', shares: 45, avgCost: 215.30, currentPrice: 248.50, assetClass: 'stocks', dividendYield: 1.32, sector: 'Broad Market' },
  { id: '2', ticker: 'VXUS', name: 'Vanguard Total International', shares: 30, avgCost: 55.80, currentPrice: 59.20, assetClass: 'stocks', dividendYield: 3.15, sector: 'International' },
  { id: '3', ticker: 'BND', name: 'Vanguard Total Bond Market', shares: 60, avgCost: 72.10, currentPrice: 70.85, assetClass: 'bonds', dividendYield: 3.58, sector: 'Fixed Income' },
  { id: '4', ticker: 'VNQ', name: 'Vanguard Real Estate', shares: 20, avgCost: 82.50, currentPrice: 88.30, assetClass: 'realEstate', dividendYield: 3.92, sector: 'Real Estate' },
  { id: '5', ticker: 'BTC', name: 'Bitcoin', shares: 0.15, avgCost: 42000, currentPrice: 67500, assetClass: 'crypto', dividendYield: 0, sector: 'Digital Assets' },
  { id: '6', ticker: 'GLD', name: 'SPDR Gold Trust', shares: 15, avgCost: 178.40, currentPrice: 195.70, assetClass: 'commodities', dividendYield: 0, sector: 'Commodities' },
  { id: '7', ticker: 'HYSA', name: 'High-Yield Savings', shares: 1, avgCost: 15000, currentPrice: 15000, assetClass: 'cash', dividendYield: 4.50, sector: 'Cash' },
  { id: '8', ticker: 'AAPL', name: 'Apple Inc.', shares: 25, avgCost: 145.00, currentPrice: 198.50, assetClass: 'stocks', dividendYield: 0.52, sector: 'Technology' },
  { id: '9', ticker: 'MSFT', name: 'Microsoft Corp.', shares: 15, avgCost: 280.00, currentPrice: 415.20, assetClass: 'stocks', dividendYield: 0.72, sector: 'Technology' },
  { id: '10', ticker: 'SCHD', name: 'Schwab US Dividend Equity', shares: 40, avgCost: 72.50, currentPrice: 79.30, assetClass: 'stocks', dividendYield: 3.45, sector: 'Dividend' },
];

// Generate performance history
function generatePerformanceHistory(months: number) {
  const data = [];
  let value = 45000;
  let invested = 40000;
  for (let i = months; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthlyReturn = (Math.random() - 0.35) * 0.06;
    value = value * (1 + monthlyReturn);
    invested += i > 0 ? 500 : 0;
    data.push({
      date: format(date, 'MMM yy'),
      portfolio: Math.round(value),
      invested: Math.round(invested),
      benchmark: Math.round(invested * (1 + (months - i) * 0.008)),
    });
  }
  return data;
}

// Generate dividend history
function generateDividendHistory(): Dividend[] {
  const divs: Dividend[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = format(subMonths(new Date(), i), 'yyyy-MM-dd');
    const amount = 80 + Math.random() * 60;
    divs.push({ date, ticker: 'Various', amount: Math.round(amount * 100) / 100, type: Math.random() > 0.3 ? 'qualified' : 'ordinary' });
  }
  return divs;
}

export default function Investments() {
  const { formatCurrency, currencySymbol } = useCurrency();
  const [holdings, setHoldings] = useState<Holding[]>(DEMO_HOLDINGS);
  const [timeRange, setTimeRange] = useState('1Y');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newHolding, setNewHolding] = useState<Partial<Holding>>({ assetClass: 'stocks', sector: 'Other' });

  const performanceData = useMemo(() => generatePerformanceHistory(timeRange === '6M' ? 6 : timeRange === '1Y' ? 12 : timeRange === '3Y' ? 36 : 60), [timeRange]);
  const dividendHistory = useMemo(() => generateDividendHistory(), []);

  const analytics = useMemo(() => {
    const totalValue = holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0);
    const totalCost = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0);
    const totalGain = totalValue - totalCost;
    const totalReturn = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    const annualDividends = holdings.reduce((s, h) => s + (h.shares * h.currentPrice * h.dividendYield / 100), 0);
    const portfolioYield = totalValue > 0 ? (annualDividends / totalValue) * 100 : 0;

    // Asset allocation
    const allocationMap: Record<string, number> = {};
    holdings.forEach(h => {
      const val = h.shares * h.currentPrice;
      allocationMap[h.assetClass] = (allocationMap[h.assetClass] || 0) + val;
    });
    const allocation = ASSET_CLASSES.map(ac => ({
      name: ac.label,
      value: allocationMap[ac.key] || 0,
      percentage: totalValue > 0 ? ((allocationMap[ac.key] || 0) / totalValue) * 100 : 0,
      color: ac.color,
    })).filter(a => a.value > 0);

    // Sector breakdown
    const sectorMap: Record<string, number> = {};
    holdings.forEach(h => {
      const val = h.shares * h.currentPrice;
      sectorMap[h.sector] = (sectorMap[h.sector] || 0) + val;
    });
    const sectors = Object.entries(sectorMap).map(([name, value]) => ({
      name, value, percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    // Top movers
    const holdingsWithGain = holdings.map(h => ({
      ...h,
      marketValue: h.shares * h.currentPrice,
      gain: (h.currentPrice - h.avgCost) * h.shares,
      returnPct: h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0,
    })).sort((a, b) => b.returnPct - a.returnPct);

    // Monthly dividends
    const monthlyDividends = dividendHistory.map(d => ({
      month: format(new Date(d.date), 'MMM'),
      amount: d.amount,
      type: d.type,
    }));

    const totalDividendsYTD = dividendHistory.reduce((s, d) => s + d.amount, 0);

    return { totalValue, totalCost, totalGain, totalReturn, annualDividends, portfolioYield, allocation, sectors, holdingsWithGain, monthlyDividends, totalDividendsYTD };
  }, [holdings, dividendHistory]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(215, 85%, 55%)', 'hsl(var(--income))', 'hsl(var(--muted-foreground))'];
  const SECTOR_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--income))', 'hsl(var(--expense))', 'hsl(215, 85%, 55%)', 'hsl(var(--muted-foreground))', 'hsl(280, 70%, 55%)'];

  const addHolding = () => {
    if (!newHolding.ticker || !newHolding.shares || !newHolding.avgCost || !newHolding.currentPrice) return;
    setHoldings([...holdings, {
      id: Date.now().toString(),
      ticker: newHolding.ticker || '',
      name: newHolding.name || newHolding.ticker || '',
      shares: newHolding.shares || 0,
      avgCost: newHolding.avgCost || 0,
      currentPrice: newHolding.currentPrice || 0,
      assetClass: newHolding.assetClass || 'stocks',
      dividendYield: newHolding.dividendYield || 0,
      sector: newHolding.sector || 'Other',
    }]);
    setNewHolding({ assetClass: 'stocks', sector: 'Other' });
    setShowAddDialog(false);
  };

  const removeHolding = (id: string) => setHoldings(holdings.filter(h => h.id !== id));

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                <Briefcase className="h-7 w-7 text-primary" />
                Investment Portfolio
              </h1>
              <p className="text-muted-foreground mt-1">Track asset allocation, performance, and dividends</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                generatePortfolioStatementPDF(
                  analytics.holdingsWithGain.map(h => ({
                    ticker: h.ticker, name: h.name, shares: h.shares,
                    avgCost: h.avgCost, currentPrice: h.currentPrice,
                    marketValue: h.marketValue, gain: h.gain, returnPct: h.returnPct,
                  })),
                  analytics.totalValue, analytics.totalCost, analytics.totalGain,
                  analytics.totalReturn, analytics.annualDividends, analytics.portfolioYield,
                  analytics.allocation, currencySymbol
                );
                toast({ title: 'Portfolio statement generated!' });
              }}>
                <FileText className="h-4 w-4 mr-1" /> Export PDF
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-1" /> Add Holding</Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Investment Holding</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Ticker</Label><Input value={newHolding.ticker || ''} onChange={e => setNewHolding({ ...newHolding, ticker: e.target.value.toUpperCase() })} placeholder="VTI" /></div>
                    <div><Label className="text-xs">Name</Label><Input value={newHolding.name || ''} onChange={e => setNewHolding({ ...newHolding, name: e.target.value })} placeholder="Vanguard Total Stock" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="text-xs">Shares</Label><Input type="number" value={newHolding.shares || ''} onChange={e => setNewHolding({ ...newHolding, shares: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Avg Cost</Label><Input type="number" value={newHolding.avgCost || ''} onChange={e => setNewHolding({ ...newHolding, avgCost: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Current Price</Label><Input type="number" value={newHolding.currentPrice || ''} onChange={e => setNewHolding({ ...newHolding, currentPrice: Number(e.target.value) })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Asset Class</Label>
                      <Select value={newHolding.assetClass} onValueChange={v => setNewHolding({ ...newHolding, assetClass: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASSET_CLASSES.map(ac => <SelectItem key={ac.key} value={ac.key}>{ac.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Dividend Yield %</Label><Input type="number" step="0.01" value={newHolding.dividendYield || ''} onChange={e => setNewHolding({ ...newHolding, dividendYield: Number(e.target.value) })} /></div>
                  </div>
                  <Button onClick={addHolding} className="w-full">Add Holding</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* KPIs */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
            {[
              { label: 'Portfolio Value', value: formatCurrency(analytics.totalValue), icon: DollarSign, color: 'text-primary' },
              { label: 'Total Cost', value: formatCurrency(analytics.totalCost), icon: Layers, color: 'text-muted-foreground' },
              { label: 'Total Gain/Loss', value: formatCurrency(analytics.totalGain), icon: analytics.totalGain >= 0 ? TrendingUp : TrendingDown, color: analytics.totalGain >= 0 ? 'text-income' : 'text-expense' },
              { label: 'Total Return', value: `${analytics.totalReturn.toFixed(1)}%`, icon: Percent, color: analytics.totalReturn >= 0 ? 'text-income' : 'text-expense' },
              { label: 'Annual Dividends', value: formatCurrency(analytics.annualDividends), icon: Coins, color: 'text-accent' },
              { label: 'Portfolio Yield', value: `${analytics.portfolioYield.toFixed(2)}%`, icon: Target, color: 'text-warning' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <kpi.icon className={cn('h-3.5 w-3.5', kpi.color)} />
                      <span className="text-[11px] text-muted-foreground truncate">{kpi.label}</span>
                    </div>
                    <p className="text-base lg:text-lg font-bold text-foreground">{kpi.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
              <TabsTrigger value="holdings">Holdings</TabsTrigger>
              <TabsTrigger value="dividends">Dividends</TabsTrigger>
            </TabsList>

            {/* PERFORMANCE TAB */}
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Portfolio Performance</CardTitle>
                      <CardDescription>Portfolio value vs cost basis over time</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      {['6M', '1Y', '3Y', '5Y'].map(r => (
                        <Button key={r} variant={timeRange === r ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2" onClick={() => setTimeRange(r)}>{r}</Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performanceData}>
                        <defs>
                          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="portfolio" name="Portfolio" stroke="hsl(var(--primary))" fill="url(#portfolioGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="invested" name="Cost Basis" stroke="hsl(var(--muted-foreground))" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="benchmark" name="Benchmark" stroke="hsl(var(--accent))" fill="none" strokeWidth={1.5} strokeDasharray="2 2" />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top movers */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-income">Top Gainers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analytics.holdingsWithGain.filter(h => h.returnPct > 0).slice(0, 5).map(h => (
                      <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <div>
                          <span className="font-semibold text-sm text-foreground">{h.ticker}</span>
                          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{h.name}</span>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-income text-xs font-mono">
                            <ArrowUpRight className="h-3 w-3 mr-0.5" />+{h.returnPct.toFixed(1)}%
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(h.gain)}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-expense">Underperformers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analytics.holdingsWithGain.filter(h => h.returnPct <= 0).slice(-5).reverse().map(h => (
                      <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <div>
                          <span className="font-semibold text-sm text-foreground">{h.ticker}</span>
                          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{h.name}</span>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-expense text-xs font-mono">
                            <ArrowDownRight className="h-3 w-3 mr-0.5" />{h.returnPct.toFixed(1)}%
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(h.gain)}</p>
                        </div>
                      </div>
                    ))}
                    {analytics.holdingsWithGain.filter(h => h.returnPct <= 0).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No underperformers 🎉</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ALLOCATION TAB */}
            <TabsContent value="allocation" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Asset Allocation</CardTitle>
                    <CardDescription>Portfolio distribution by asset class</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analytics.allocation} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} stroke="none">
                            {analytics.allocation.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                      {analytics.allocation.map(a => (
                        <div key={a.name} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: a.color }} />
                          <span className="text-sm text-foreground flex-1">{a.name}</span>
                          <span className="text-sm font-mono text-muted-foreground">{a.percentage.toFixed(1)}%</span>
                          <span className="text-sm font-mono text-foreground">{formatCurrency(a.value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sector Breakdown</CardTitle>
                    <CardDescription>Distribution by market sector</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.sectors} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis type="category" dataKey="name" width={100} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                          <Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]}>
                            {analytics.sectors.map((_, i) => (
                              <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-1.5">
                      {analytics.sectors.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-foreground">{s.name}</span>
                              <span className="text-muted-foreground">{s.percentage.toFixed(1)}%</span>
                            </div>
                            <Progress value={s.percentage} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* HOLDINGS TAB */}
            <TabsContent value="holdings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">All Holdings</CardTitle>
                  <CardDescription>{holdings.length} positions across {analytics.allocation.length} asset classes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Ticker', 'Name', 'Shares', 'Avg Cost', 'Price', 'Value', 'Gain/Loss', 'Return', 'Yield', ''].map(h => (
                            <th key={h} className="text-left py-2 text-muted-foreground font-medium text-xs whitespace-nowrap px-1">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.holdingsWithGain.map(h => (
                          <tr key={h.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-1">
                              <Badge variant="outline" className="font-mono text-xs">{h.ticker}</Badge>
                            </td>
                            <td className="py-2.5 px-1 text-foreground max-w-[150px] truncate">{h.name}</td>
                            <td className="py-2.5 px-1 font-mono text-foreground">{h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                            <td className="py-2.5 px-1 font-mono text-muted-foreground">{formatCurrency(h.avgCost)}</td>
                            <td className="py-2.5 px-1 font-mono text-foreground">{formatCurrency(h.currentPrice)}</td>
                            <td className="py-2.5 px-1 font-mono font-medium text-foreground">{formatCurrency(h.marketValue)}</td>
                            <td className={cn('py-2.5 px-1 font-mono', h.gain >= 0 ? 'text-income' : 'text-expense')}>
                              {h.gain >= 0 ? '+' : ''}{formatCurrency(h.gain)}
                            </td>
                            <td className="py-2.5 px-1">
                              <Badge variant="secondary" className={cn('text-xs font-mono', h.returnPct >= 0 ? 'text-income' : 'text-expense')}>
                                {h.returnPct >= 0 ? '+' : ''}{h.returnPct.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="py-2.5 px-1 font-mono text-muted-foreground">{h.dividendYield > 0 ? `${h.dividendYield.toFixed(2)}%` : '—'}</td>
                            <td className="py-2.5 px-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => removeHolding(h.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border font-bold">
                          <td className="py-2.5 px-1 text-foreground" colSpan={5}>Total</td>
                          <td className="py-2.5 px-1 font-mono text-foreground">{formatCurrency(analytics.totalValue)}</td>
                          <td className={cn('py-2.5 px-1 font-mono', analytics.totalGain >= 0 ? 'text-income' : 'text-expense')}>
                            {analytics.totalGain >= 0 ? '+' : ''}{formatCurrency(analytics.totalGain)}
                          </td>
                          <td className="py-2.5 px-1">
                            <Badge variant="secondary" className={cn('text-xs font-mono', analytics.totalReturn >= 0 ? 'text-income' : 'text-expense')}>
                              {analytics.totalReturn >= 0 ? '+' : ''}{analytics.totalReturn.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="py-2.5 px-1 font-mono text-accent">{analytics.portfolioYield.toFixed(2)}%</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* DIVIDENDS TAB */}
            <TabsContent value="dividends" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Monthly Dividend Income</CardTitle>
                      <CardDescription>Trailing 12-month dividend payments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.monthlyDividends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis tickFormatter={v => `$${v}`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                            <Bar dataKey="amount" name="Dividend" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Dividend Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { label: 'Annual Income (Est.)', value: formatCurrency(analytics.annualDividends) },
                        { label: 'Monthly Average', value: formatCurrency(analytics.annualDividends / 12) },
                        { label: 'YTD Received', value: formatCurrency(analytics.totalDividendsYTD) },
                        { label: 'Portfolio Yield', value: `${analytics.portfolioYield.toFixed(2)}%` },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between py-1.5 border-b border-border/30 last:border-0">
                          <span className="text-sm text-muted-foreground">{row.label}</span>
                          <span className="text-sm font-mono font-medium text-foreground">{row.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Yielders</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {holdings.filter(h => h.dividendYield > 0).sort((a, b) => b.dividendYield - a.dividendYield).slice(0, 5).map(h => (
                        <div key={h.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">{h.ticker}</Badge>
                            <span className="text-xs text-muted-foreground hidden sm:inline">{h.name}</span>
                          </div>
                          <span className="text-sm font-mono text-accent">{h.dividendYield.toFixed(2)}%</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
