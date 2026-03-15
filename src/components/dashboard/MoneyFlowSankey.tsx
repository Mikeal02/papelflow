import { useMemo, memo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

interface FlowNode {
  id: string;
  label: string;
  value: number;
  color: string;
  type: 'income' | 'expense';
}

interface FlowLink {
  source: string;
  target: string;
  value: number;
}

export const MoneyFlowSankey = memo(function MoneyFlowSankey() {
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();

  const { incomeNodes, expenseNodes, links, totalIncome, totalExpenses } = useMemo(() => {
    const now = new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    const monthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= mStart && d <= mEnd && t.type !== 'transfer';
    });

    const incomeByCat: Record<string, { name: string; amount: number; color: string }> = {};
    const expenseByCat: Record<string, { name: string; amount: number; color: string }> = {};

    monthTx.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id);
      const catName = cat?.name || (t.type === 'income' ? 'Other Income' : 'Uncategorized');
      const catColor = cat?.color || (t.type === 'income' ? '#10B981' : '#6366F1');
      const key = t.category_id || `uncategorized-${t.type}`;

      if (t.type === 'income') {
        if (!incomeByCat[key]) incomeByCat[key] = { name: catName, amount: 0, color: catColor };
        incomeByCat[key].amount += Number(t.amount);
      } else {
        if (!expenseByCat[key]) expenseByCat[key] = { name: catName, amount: 0, color: catColor };
        expenseByCat[key].amount += Number(t.amount);
      }
    });

    const incomeNodes: FlowNode[] = Object.entries(incomeByCat)
      .map(([id, v]) => ({ id: `in-${id}`, label: v.name, value: v.amount, color: v.color, type: 'income' as const }))
      .sort((a, b) => b.value - a.value).slice(0, 6);

    const expenseNodes: FlowNode[] = Object.entries(expenseByCat)
      .map(([id, v]) => ({ id: `ex-${id}`, label: v.name, value: v.amount, color: v.color, type: 'expense' as const }))
      .sort((a, b) => b.value - a.value).slice(0, 8);

    const totalIncome = incomeNodes.reduce((s, n) => s + n.value, 0);
    const totalExpenses = expenseNodes.reduce((s, n) => s + n.value, 0);

    const links: FlowLink[] = [];
    incomeNodes.forEach(iNode => {
      const incomePct = totalIncome > 0 ? iNode.value / totalIncome : 0;
      expenseNodes.forEach(eNode => {
        const flowValue = eNode.value * incomePct;
        if (flowValue > 0) links.push({ source: iNode.id, target: eNode.id, value: flowValue });
      });
    });

    return { incomeNodes, expenseNodes, links, totalIncome, totalExpenses };
  }, [transactions, categories]);

  if (incomeNodes.length === 0 && expenseNodes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Money Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Add transactions to see your money flow
          </div>
        </CardContent>
      </Card>
    );
  }

  const svgWidth = 600;
  const svgHeight = Math.max(300, Math.max(incomeNodes.length, expenseNodes.length) * 50 + 40);
  const nodeWidth = 14;
  const leftX = 40;
  const rightX = svgWidth - 40 - nodeWidth;
  const centerX = svgWidth / 2;

  const getNodePositions = (nodes: FlowNode[], x: number) => {
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const padding = 8;
    const usableHeight = svgHeight - 40;
    let currentY = 20;
    return nodes.map(node => {
      const height = Math.max(16, (node.value / totalValue) * usableHeight - padding);
      const pos = { x, y: currentY, width: nodeWidth, height, node };
      currentY += height + padding;
      return pos;
    });
  };

  const leftPositions = getNodePositions(incomeNodes, leftX);
  const rightPositions = getNodePositions(expenseNodes, rightX);

  const generatePath = (sourcePos: typeof leftPositions[0], targetPos: typeof rightPositions[0], sourceOffset: number, targetOffset: number, thickness: number) => {
    const x1 = sourcePos.x + sourcePos.width;
    const y1 = sourcePos.y + sourceOffset;
    const x2 = targetPos.x;
    const y2 = targetPos.y + targetOffset;
    const cx1 = x1 + (x2 - x1) * 0.4;
    const cx2 = x1 + (x2 - x1) * 0.6;
    return `M ${x1},${y1} C ${cx1},${y1} ${cx2},${y2} ${x2},${y2} L ${x2},${y2 + thickness} C ${cx2},${y2 + thickness} ${cx1},${y1 + thickness} ${x1},${y1 + thickness} Z`;
  };

  const sourceOffsets: Record<string, number> = {};
  const targetOffsets: Record<string, number> = {};

  const linkPaths = links.map((link) => {
    const sourcePos = leftPositions.find(p => p.node.id === link.source)!;
    const targetPos = rightPositions.find(p => p.node.id === link.target)!;
    if (!sourcePos || !targetPos) return null;

    const sourcePct = totalIncome > 0 ? link.value / sourcePos.node.value : 0;
    const targetPct = totalExpenses > 0 ? link.value / targetPos.node.value : 0;
    const sourceThickness = sourcePos.height * sourcePct;
    const targetThickness = targetPos.height * targetPct;

    if (!sourceOffsets[link.source]) sourceOffsets[link.source] = 0;
    if (!targetOffsets[link.target]) targetOffsets[link.target] = 0;

    const sOffset = sourceOffsets[link.source];
    const tOffset = targetOffsets[link.target];
    sourceOffsets[link.source] += sourceThickness;
    targetOffsets[link.target] += targetThickness;

    return { path: generatePath(sourcePos, targetPos, sOffset, tOffset, Math.max(sourceThickness, targetThickness)), color: sourcePos.node.color, link };
  }).filter(Boolean);

  const savings = totalIncome - totalExpenses;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Money Flow
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-income">
              <TrendingUp className="h-3 w-3" />
              {formatCurrency(totalIncome)}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="flex items-center gap-1 text-expense">
              <TrendingDown className="h-3 w-3" />
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>
        {savings > 0 && (
          <div className="text-xs text-income font-medium">
            💰 {formatCurrency(savings)} saved this month
          </div>
        )}
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[400px]" style={{ maxHeight: '400px' }}>
            <defs>
              {leftPositions.map(pos => (
                <linearGradient key={`grad-${pos.node.id}`} id={`flow-grad-${pos.node.id}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor={pos.node.color} stopOpacity="0.6" />
                  <stop offset="50%" stopColor={pos.node.color} stopOpacity="0.15" />
                  <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.2" />
                </linearGradient>
              ))}
            </defs>

            {linkPaths.map((item, i) => item && (
              <path key={i} d={item.path} fill={`url(#flow-grad-${item.link.source})`} className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
            ))}

            {leftPositions.map((pos) => (
              <g key={pos.node.id}>
                <rect x={pos.x} y={pos.y} width={pos.width} height={pos.height} rx={4} fill={pos.node.color} />
                <text x={pos.x - 6} y={pos.y + pos.height / 2} textAnchor="end" dominantBaseline="middle" className="text-[10px] font-medium" fill="hsl(var(--foreground))">{pos.node.label}</text>
                <text x={pos.x - 6} y={pos.y + pos.height / 2 + 13} textAnchor="end" dominantBaseline="middle" className="text-[9px]" fill="hsl(var(--muted-foreground))">{formatCurrency(pos.node.value)}</text>
              </g>
            ))}

            {rightPositions.map((pos) => (
              <g key={pos.node.id}>
                <rect x={pos.x} y={pos.y} width={pos.width} height={pos.height} rx={4} fill={pos.node.color} />
                <text x={pos.x + pos.width + 6} y={pos.y + pos.height / 2} textAnchor="start" dominantBaseline="middle" className="text-[10px] font-medium" fill="hsl(var(--foreground))">{pos.node.label}</text>
                <text x={pos.x + pos.width + 6} y={pos.y + pos.height / 2 + 13} textAnchor="start" dominantBaseline="middle" className="text-[9px]" fill="hsl(var(--muted-foreground))">{formatCurrency(pos.node.value)}</text>
              </g>
            ))}

            <text x={centerX} y={12} textAnchor="middle" className="text-[10px] font-semibold uppercase tracking-wider" fill="hsl(var(--muted-foreground))">Monthly Flow</text>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
});
