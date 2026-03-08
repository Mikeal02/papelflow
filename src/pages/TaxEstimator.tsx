import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator, TrendingUp, TrendingDown, Receipt, Plus, Trash2,
  ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle2, DollarSign,
  Calendar, PieChart, BarChart3, FileText, Shield
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
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, AreaChart, Area, PieChart as RechartsPie, Pie,
  RadialBarChart, RadialBar, Legend
} from 'recharts';
import { startOfYear, endOfYear, format, startOfQuarter, endOfQuarter, addQuarters, subYears } from 'date-fns';

// 2026 US Tax Brackets (Single)
const TAX_BRACKETS_SINGLE = [
  { min: 0, max: 11925, rate: 0.10, label: '10%' },
  { min: 11925, max: 48475, rate: 0.12, label: '12%' },
  { min: 48475, max: 103350, rate: 0.22, label: '22%' },
  { min: 103350, max: 197300, rate: 0.24, label: '24%' },
  { min: 197300, max: 250525, rate: 0.32, label: '32%' },
  { min: 250525, max: 626350, rate: 0.35, label: '35%' },
  { min: 626350, max: Infinity, rate: 0.37, label: '37%' },
];

const TAX_BRACKETS_MARRIED = [
  { min: 0, max: 23850, rate: 0.10, label: '10%' },
  { min: 23850, max: 96950, rate: 0.12, label: '12%' },
  { min: 96950, max: 206700, rate: 0.22, label: '22%' },
  { min: 206700, max: 394600, rate: 0.24, label: '24%' },
  { min: 394600, max: 501050, rate: 0.32, label: '32%' },
  { min: 501050, max: 751600, rate: 0.35, label: '35%' },
  { min: 751600, max: Infinity, rate: 0.37, label: '37%' },
];

const STANDARD_DEDUCTION = { single: 15700, married: 31400 };
const QUARTERLY_DATES = ['Apr 15', 'Jun 15', 'Sep 15', 'Jan 15'];

interface Deduction {
  id: string;
  name: string;
  amount: number;
  category: string;
}

const DEFAULT_DEDUCTIONS: Deduction[] = [
  { id: '1', name: 'Mortgage Interest', amount: 0, category: 'Housing' },
  { id: '2', name: 'State & Local Taxes (SALT)', amount: 0, category: 'Taxes' },
  { id: '3', name: 'Charitable Donations', amount: 0, category: 'Charity' },
  { id: '4', name: 'Medical Expenses', amount: 0, category: 'Medical' },
  { id: '5', name: 'Student Loan Interest', amount: 0, category: 'Education' },
  { id: '6', name: 'Home Office', amount: 0, category: 'Business' },
];

function calculateTax(taxableIncome: number, brackets: typeof TAX_BRACKETS_SINGLE) {
  let tax = 0;
  let remaining = taxableIncome;
  const breakdown: { bracket: string; taxed: number; tax: number; rate: number }[] = [];

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.max - bracket.min);
    const bracketTax = taxable * bracket.rate;
    tax += bracketTax;
    remaining -= taxable;
    breakdown.push({
      bracket: bracket.max === Infinity ? `$${bracket.min.toLocaleString()}+` : `$${bracket.min.toLocaleString()} - $${bracket.max.toLocaleString()}`,
      taxed: taxable,
      tax: bracketTax,
      rate: bracket.rate,
    });
  }

  return { total: tax, breakdown };
}

export default function TaxEstimator() {
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();
  const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('single');
  const [deductions, setDeductions] = useState<Deduction[]>(DEFAULT_DEDUCTIONS);
  const [additionalIncome, setAdditionalIncome] = useState(0);
  const [withheld, setWithheld] = useState(0);
  const [useItemized, setUseItemized] = useState(false);

  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const annualData = useMemo(() => {
    const yearTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= yearStart && d <= yearEnd;
    });

    const income = yearTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = yearTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    // Quarterly breakdown
    const quarters = [0, 1, 2, 3].map(q => {
      const qStart = startOfQuarter(addQuarters(yearStart, q));
      const qEnd = endOfQuarter(addQuarters(yearStart, q));
      const qTx = yearTransactions.filter(t => {
        const d = new Date(t.date);
        return d >= qStart && d <= qEnd;
      });
      const qIncome = qTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const qExpenses = qTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return {
        quarter: `Q${q + 1}`,
        label: `${format(qStart, 'MMM')} - ${format(qEnd, 'MMM')}`,
        income: qIncome,
        expenses: qExpenses,
        dueDate: QUARTERLY_DATES[q],
      };
    });

    // Project annual from current pace
    const dayOfYear = Math.max(1, Math.floor((now.getTime() - yearStart.getTime()) / 86400000));
    const projectedIncome = (income / dayOfYear) * 365;

    return { income, expenses, quarters, projectedIncome, dayOfYear };
  }, [transactions, yearStart, yearEnd]);

  const totalGrossIncome = annualData.income + additionalIncome;
  const projectedGross = annualData.projectedIncome + additionalIncome;
  const itemizedTotal = deductions.reduce((s, d) => s + d.amount, 0);
  const standardDed = STANDARD_DEDUCTION[filingStatus];
  const effectiveDeduction = useItemized ? itemizedTotal : standardDed;
  const brackets = filingStatus === 'single' ? TAX_BRACKETS_SINGLE : TAX_BRACKETS_MARRIED;

  const currentTax = useMemo(() => {
    const taxable = Math.max(0, totalGrossIncome - effectiveDeduction);
    return calculateTax(taxable, brackets);
  }, [totalGrossIncome, effectiveDeduction, brackets]);

  const projectedTax = useMemo(() => {
    const taxable = Math.max(0, projectedGross - effectiveDeduction);
    return calculateTax(taxable, brackets);
  }, [projectedGross, effectiveDeduction, brackets]);

  const effectiveRate = projectedGross > 0 ? (projectedTax.total / projectedGross) * 100 : 0;
  const marginalRate = projectedTax.breakdown.length > 0 ? projectedTax.breakdown[projectedTax.breakdown.length - 1].rate * 100 : 0;
  const quarterlyPayment = Math.max(0, (projectedTax.total - withheld) / 4);
  const owedOrRefund = currentTax.total - withheld;

  const bracketChartData = projectedTax.breakdown.map(b => ({
    name: b.bracket,
    income: b.taxed,
    tax: b.tax,
    rate: `${(b.rate * 100).toFixed(0)}%`,
  }));

  const quarterlyChartData = annualData.quarters.map(q => ({
    name: q.quarter,
    income: q.income,
    estimatedTax: q.income * (effectiveRate / 100),
    payment: quarterlyPayment,
  }));

  const deductionPieData = deductions.filter(d => d.amount > 0).map(d => ({
    name: d.name,
    value: d.amount,
  }));

  const taxBreakdownPie = [
    { name: 'Federal Tax', value: projectedTax.total, fill: 'hsl(var(--expense))' },
    { name: 'Deductions', value: effectiveDeduction, fill: 'hsl(var(--income))' },
    { name: 'Take Home', value: Math.max(0, projectedGross - projectedTax.total - effectiveDeduction), fill: 'hsl(var(--primary))' },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--income))', 'hsl(var(--warning))', 'hsl(var(--expense))', 'hsl(var(--transfer))'];

  const addDeduction = () => {
    setDeductions([...deductions, { id: Date.now().toString(), name: '', amount: 0, category: 'Other' }]);
  };

  const removeDeduction = (id: string) => {
    setDeductions(deductions.filter(d => d.id !== id));
  };

  const updateDeduction = (id: string, field: keyof Deduction, value: string | number) => {
    setDeductions(deductions.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                <Calculator className="h-7 w-7 text-primary" />
                Tax Estimator
              </h1>
              <p className="text-muted-foreground mt-1">Estimate your federal tax liability with quarterly projections</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filingStatus} onValueChange={(v: 'single' | 'married') => setFilingStatus(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married Filing Jointly</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Tax Year {now.getFullYear()}
              </Badge>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Gross Income (YTD)', value: formatCurrency(totalGrossIncome), icon: TrendingUp, color: 'text-income' },
              { label: 'Projected Annual', value: formatCurrency(projectedGross), icon: BarChart3, color: 'text-primary' },
              { label: 'Est. Federal Tax', value: formatCurrency(projectedTax.total), icon: Receipt, color: 'text-expense' },
              { label: 'Effective Rate', value: `${effectiveRate.toFixed(1)}%`, icon: PieChart, color: 'text-warning' },
              { label: owedOrRefund >= 0 ? 'Estimated Owed' : 'Estimated Refund', value: formatCurrency(Math.abs(owedOrRefund)), icon: owedOrRefund >= 0 ? AlertTriangle : CheckCircle2, color: owedOrRefund >= 0 ? 'text-expense' : 'text-income' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <kpi.icon className={cn('h-4 w-4', kpi.color)} />
                      <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
                    </div>
                    <p className="text-lg lg:text-xl font-bold text-foreground">{kpi.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="brackets">Tax Brackets</TabsTrigger>
              <TabsTrigger value="deductions">Deductions</TabsTrigger>
              <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Income Breakdown Pie */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Income Allocation</CardTitle>
                    <CardDescription>How your projected income breaks down</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie data={taxBreakdownPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="none">
                            {taxBreakdownPie.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tax Computation Summary</CardTitle>
                    <CardDescription>Projected annual tax calculation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Gross Income', value: formatCurrency(projectedGross), bold: false },
                      { label: useItemized ? 'Itemized Deductions' : 'Standard Deduction', value: `(${formatCurrency(effectiveDeduction)})`, bold: false },
                      { label: 'Taxable Income', value: formatCurrency(Math.max(0, projectedGross - effectiveDeduction)), bold: true },
                      { label: 'Federal Income Tax', value: formatCurrency(projectedTax.total), bold: true },
                      { label: 'Marginal Rate', value: `${marginalRate.toFixed(0)}%`, bold: false },
                      { label: 'Effective Rate', value: `${effectiveRate.toFixed(1)}%`, bold: false },
                      { label: 'Tax Withheld (YTD)', value: `(${formatCurrency(withheld)})`, bold: false },
                      { label: owedOrRefund >= 0 ? 'Balance Due' : 'Refund Expected', value: formatCurrency(Math.abs(owedOrRefund)), bold: true },
                    ].map((row, i) => (
                      <div key={i} className={cn('flex justify-between items-center py-1.5', row.bold && 'border-t border-border pt-2')}>
                        <span className={cn('text-sm', row.bold ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{row.label}</span>
                        <span className={cn('text-sm font-mono', row.bold ? 'font-bold text-foreground' : 'text-foreground')}>{row.value}</span>
                      </div>
                    ))}

                    <div className="mt-4 space-y-2">
                      <Label className="text-xs text-muted-foreground">Additional Income (Side jobs, etc.)</Label>
                      <Input type="number" value={additionalIncome || ''} onChange={e => setAdditionalIncome(Number(e.target.value))} placeholder="0.00" />
                      <Label className="text-xs text-muted-foreground">Tax Withheld YTD</Label>
                      <Input type="number" value={withheld || ''} onChange={e => setWithheld(Number(e.target.value))} placeholder="0.00" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* BRACKETS TAB */}
            <TabsContent value="brackets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Federal Tax Bracket Visualization</CardTitle>
                  <CardDescription>See how your income is taxed across progressive brackets ({filingStatus === 'single' ? 'Single' : 'Married Filing Jointly'})</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bracketChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis type="category" dataKey="rate" width={50} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="income" name="Income in Bracket" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} opacity={0.3} />
                        <Bar dataKey="tax" name="Tax Owed" fill="hsl(var(--expense))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bracket Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bracket Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-muted-foreground font-medium">Bracket</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Rate</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Income Taxed</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Tax</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectedTax.breakdown.map((b, i) => {
                          const cumulative = projectedTax.breakdown.slice(0, i + 1).reduce((s, x) => s + x.tax, 0);
                          return (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2.5 text-foreground">{b.bracket}</td>
                              <td className="py-2.5 text-right">
                                <Badge variant="secondary" className="text-xs font-mono">{(b.rate * 100).toFixed(0)}%</Badge>
                              </td>
                              <td className="py-2.5 text-right font-mono text-foreground">{formatCurrency(b.taxed)}</td>
                              <td className="py-2.5 text-right font-mono text-expense">{formatCurrency(b.tax)}</td>
                              <td className="py-2.5 text-right font-mono text-muted-foreground">{formatCurrency(cumulative)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border font-bold">
                          <td className="py-2.5 text-foreground" colSpan={2}>Total</td>
                          <td className="py-2.5 text-right font-mono text-foreground">{formatCurrency(Math.max(0, projectedGross - effectiveDeduction))}</td>
                          <td className="py-2.5 text-right font-mono text-expense">{formatCurrency(projectedTax.total)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* DEDUCTIONS TAB */}
            <TabsContent value="deductions" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Deduction Tracker</CardTitle>
                          <CardDescription>Track itemized deductions vs standard deduction</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant={useItemized ? 'default' : 'outline'} size="sm" onClick={() => setUseItemized(true)}>Itemized</Button>
                          <Button variant={!useItemized ? 'default' : 'outline'} size="sm" onClick={() => setUseItemized(false)}>Standard</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Comparison bar */}
                      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Standard: {formatCurrency(standardDed)}</span>
                          <span className="text-muted-foreground">Itemized: {formatCurrency(itemizedTotal)}</span>
                        </div>
                        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-primary/40 rounded-full" style={{ width: `${Math.min(100, (standardDed / Math.max(standardDed, itemizedTotal)) * 100)}%` }} />
                          <div className="absolute inset-y-0 left-0 bg-accent rounded-full" style={{ width: `${Math.min(100, (itemizedTotal / Math.max(standardDed, itemizedTotal)) * 100)}%`, opacity: 0.6 }} />
                        </div>
                        {itemizedTotal > standardDed ? (
                          <p className="text-xs text-income flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Itemizing saves you {formatCurrency(itemizedTotal - standardDed)}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Standard deduction is better by {formatCurrency(standardDed - itemizedTotal)}</p>
                        )}
                      </div>

                      {/* Deduction items */}
                      <div className="space-y-2">
                        {deductions.map(d => (
                          <div key={d.id} className="flex items-center gap-2">
                            <Input value={d.name} onChange={e => updateDeduction(d.id, 'name', e.target.value)} placeholder="Deduction name" className="flex-1" />
                            <Input type="number" value={d.amount || ''} onChange={e => updateDeduction(d.id, 'amount', Number(e.target.value))} placeholder="0.00" className="w-32" />
                            <Select value={d.category} onValueChange={v => updateDeduction(d.id, 'category', v)}>
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {['Housing', 'Taxes', 'Charity', 'Medical', 'Education', 'Business', 'Other'].map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => removeDeduction(d.id)} className="text-muted-foreground hover:text-expense">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={addDeduction} className="w-full">
                        <Plus className="h-4 w-4 mr-1" /> Add Deduction
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Deduction pie */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deductionPieData.length > 0 ? (
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie>
                            <Pie data={deductionPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} stroke="none">
                              {deductionPieData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                            <Legend />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                        Add deduction amounts to see breakdown
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* QUARTERLY TAB */}
            <TabsContent value="quarterly" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quarterly Estimated Tax Payments</CardTitle>
                  <CardDescription>Track income and estimated payments by quarter</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quarterlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="income" name="Quarterly Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.7} />
                        <Bar dataKey="estimatedTax" name="Estimated Tax" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quarterly cards */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {annualData.quarters.map((q, i) => {
                  const isPast = i < Math.floor((now.getMonth()) / 3);
                  const isCurrent = i === Math.floor((now.getMonth()) / 3);
                  return (
                    <motion.div key={q.quarter} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                      <Card className={cn('border-border/50', isCurrent && 'ring-1 ring-primary/30')}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-foreground">{q.quarter}</span>
                            {isPast && <Badge variant="secondary" className="text-[10px]">Paid</Badge>}
                            {isCurrent && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Current</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{q.label}</p>
                          <p className="text-xs text-muted-foreground">Due: {q.dueDate}</p>
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Income</span>
                              <span className="font-mono text-foreground">{formatCurrency(q.income)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Est. Payment</span>
                              <span className="font-mono text-expense">{formatCurrency(quarterlyPayment)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Safe harbor notice */}
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <Shield className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Safe Harbor Rule</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      To avoid underpayment penalties, pay at least 90% of your current year tax liability or 100% of your prior year tax (110% if AGI &gt; $150,000) through withholding and estimated payments.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
