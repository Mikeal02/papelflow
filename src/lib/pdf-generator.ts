import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface PDFReportData {
  title: string;
  subtitle?: string;
  generatedDate: string;
  currencySymbol: string;
}

interface MonthlyRow {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
}

interface CategoryRow {
  name: string;
  value: number;
}

interface MerchantRow {
  name: string;
  amount: number;
  category: string;
  count: number;
}

interface HoldingRow {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  gain: number;
  returnPct: number;
}

const COLORS = {
  primary: [33, 100, 235] as [number, number, number],
  accent: [16, 185, 129] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  income: [16, 185, 129] as [number, number, number],
  expense: [239, 68, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightBg: [248, 250, 252] as [number, number, number],
};

function addHeader(doc: jsPDF, data: PDFReportData, yOffset: number = 20): number {
  // Brand header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 35, 'F');

  // Logo text
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Finflow', 15, 15);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('FINANCIAL PLATFORM', 15, 21);

  // Report title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, 15, 30);

  // Generated date (right aligned)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${data.generatedDate}`, 195, 15, { align: 'right' });
  doc.text(`Currency: ${data.currencySymbol}`, 195, 20, { align: 'right' });

  // Reset text color
  doc.setTextColor(...COLORS.dark);

  if (data.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(data.subtitle, 15, 44);
    doc.setTextColor(...COLORS.dark);
    return 52;
  }

  return 44;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(title, 15, y);

  // Accent underline
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, y + 2, 60, y + 2);

  return y + 8;
}

function addKPIRow(doc: jsPDF, items: { label: string; value: string; color?: [number, number, number] }[], y: number): number {
  const boxWidth = (180 / items.length);

  items.forEach((item, i) => {
    const x = 15 + i * boxWidth;

    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(x, y, boxWidth - 4, 18, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label, x + 4, y + 7);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(item.color || COLORS.dark));
    doc.text(item.value, x + 4, y + 14);
    doc.setFont('helvetica', 'normal');
  });

  return y + 24;
}

function fmt(amount: number, symbol: string): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${symbol}${formatted}`;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text('Finflow Financial Platform • Confidential', 105, 294, { align: 'center' });
    doc.setDrawColor(230, 230, 235);
    doc.setLineWidth(0.3);
    doc.line(15, 286, 195, 286);
  }
}

// ==========================================
// FINANCIAL REPORT PDF
// ==========================================
export function generateFinancialReportPDF(
  monthlyData: MonthlyRow[],
  categorySpending: CategoryRow[],
  incomeByCategory: CategoryRow[],
  topMerchants: MerchantRow[],
  stats: { totalIncome: number; totalExpenses: number; savingsRate: number; avgIncome: number; avgExpenses: number },
  currencySymbol: string
): void {
  const doc = new jsPDF();
  const now = format(new Date(), 'MMM d, yyyy h:mm a');

  let y = addHeader(doc, {
    title: 'Financial Report',
    subtitle: `Period: ${monthlyData[0]?.month || 'N/A'} — ${monthlyData[monthlyData.length - 1]?.month || 'N/A'}`,
    generatedDate: now,
    currencySymbol,
  });

  // KPIs
  y = addKPIRow(doc, [
    { label: 'Total Income', value: fmt(stats.totalIncome, currencySymbol), color: COLORS.income },
    { label: 'Total Expenses', value: fmt(stats.totalExpenses, currencySymbol), color: COLORS.expense },
    { label: 'Net Savings', value: fmt(stats.totalIncome - stats.totalExpenses, currencySymbol), color: stats.totalIncome >= stats.totalExpenses ? COLORS.income : COLORS.expense },
    { label: 'Savings Rate', value: `${stats.savingsRate.toFixed(1)}%`, color: COLORS.primary },
  ], y);

  // Monthly Summary Table
  y = addSectionTitle(doc, 'Monthly Summary', y + 4);

  autoTable(doc, {
    startY: y,
    head: [['Month', 'Income', 'Expenses', 'Net Cash Flow', 'Savings Rate']],
    body: monthlyData.map(m => [
      m.month,
      fmt(m.income, currencySymbol),
      fmt(m.expenses, currencySymbol),
      fmt(m.net, currencySymbol),
      `${m.savingsRate.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Expense Categories
  if (categorySpending.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Spending by Category', y);

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount', '% of Total']],
      body: categorySpending.map(c => {
        const total = categorySpending.reduce((s, x) => s + x.value, 0);
        return [c.name, fmt(c.value, currencySymbol), `${((c.value / total) * 100).toFixed(1)}%`];
      }),
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Income Sources
  if (incomeByCategory.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Income Sources', y);

    autoTable(doc, {
      startY: y,
      head: [['Source', 'Amount', '% of Total']],
      body: incomeByCategory.map(c => {
        const total = incomeByCategory.reduce((s, x) => s + x.value, 0);
        return [c.name, fmt(c.value, currencySymbol), `${((c.value / total) * 100).toFixed(1)}%`];
      }),
      theme: 'striped',
      headStyles: { fillColor: COLORS.income, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Top Merchants
  if (topMerchants.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Top Merchants', y);

    autoTable(doc, {
      startY: y,
      head: [['Merchant', 'Category', 'Transactions', 'Total Spent']],
      body: topMerchants.map(m => [m.name, m.category, m.count.toString(), fmt(m.amount, currencySymbol)]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' } },
      margin: { left: 15, right: 15 },
    });
  }

  addFooter(doc);
  doc.save(`Finflow_Financial_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ==========================================
// TAX DOCUMENT PDF
// ==========================================
export function generateTaxDocumentPDF(
  annualIncome: number,
  projectedTax: number,
  effectiveRate: number,
  marginalRate: number,
  deductions: { name: string; amount: number; category: string }[],
  brackets: { bracket: string; taxed: number; tax: number; rate: number }[],
  quarterlyPayment: number,
  filingStatus: string,
  currencySymbol: string,
  withheld: number
): void {
  const doc = new jsPDF();
  const now = format(new Date(), 'MMM d, yyyy h:mm a');
  const year = new Date().getFullYear();

  let y = addHeader(doc, {
    title: `Tax Estimate — ${year}`,
    subtitle: `Filing Status: ${filingStatus === 'single' ? 'Single' : 'Married Filing Jointly'}`,
    generatedDate: now,
    currencySymbol,
  });

  // KPIs
  y = addKPIRow(doc, [
    { label: 'Gross Income', value: fmt(annualIncome, currencySymbol) },
    { label: 'Est. Federal Tax', value: fmt(projectedTax, currencySymbol), color: COLORS.expense },
    { label: 'Effective Rate', value: `${effectiveRate.toFixed(1)}%`, color: COLORS.primary },
    { label: 'Quarterly Payment', value: fmt(quarterlyPayment, currencySymbol) },
  ], y);

  // Tax Computation
  y = addSectionTitle(doc, 'Tax Computation', y + 4);

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const taxableIncome = Math.max(0, annualIncome - totalDeductions);
  const balanceDue = projectedTax - withheld;

  const computationRows = [
    ['Gross Income (Projected)', fmt(annualIncome, currencySymbol)],
    ['Total Deductions', `(${fmt(totalDeductions, currencySymbol)})`],
    ['Taxable Income', fmt(taxableIncome, currencySymbol)],
    ['Federal Income Tax', fmt(projectedTax, currencySymbol)],
    ['Tax Withheld (YTD)', `(${fmt(withheld, currencySymbol)})`],
    [balanceDue >= 0 ? 'Balance Due' : 'Refund Expected', fmt(Math.abs(balanceDue), currencySymbol)],
  ];

  autoTable(doc, {
    startY: y,
    body: computationRows,
    theme: 'plain',
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 120 }, 1: { halign: 'right' } },
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      if (data.row.index === computationRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
      }
      if (data.row.index === 2 || data.row.index === 5) {
        data.cell.styles.fillColor = [240, 245, 255];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Bracket Breakdown
  if (brackets.length > 0) {
    y = addSectionTitle(doc, 'Tax Bracket Breakdown', y);

    autoTable(doc, {
      startY: y,
      head: [['Bracket', 'Rate', 'Income Taxed', 'Tax Owed']],
      body: brackets.map(b => [b.bracket, `${(b.rate * 100).toFixed(0)}%`, fmt(b.taxed, currencySymbol), fmt(b.tax, currencySymbol)]),
      foot: [['Total', '', fmt(taxableIncome, currencySymbol), fmt(projectedTax, currencySymbol)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, fontSize: 8, fontStyle: 'bold' },
      footStyles: { fillColor: [220, 230, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Deductions
  if (deductions.filter(d => d.amount > 0).length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Itemized Deductions', y);

    autoTable(doc, {
      startY: y,
      head: [['Deduction', 'Category', 'Amount']],
      body: deductions.filter(d => d.amount > 0).map(d => [d.name, d.category, fmt(d.amount, currencySymbol)]),
      foot: [['Total', '', fmt(totalDeductions, currencySymbol)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.income, fontSize: 8, fontStyle: 'bold' },
      footStyles: { fillColor: [220, 245, 235], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 15, right: 15 },
    });
  }

  // Disclaimer
  y = (doc as any).lastAutoTable?.finalY + 15 || y + 15;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text('DISCLAIMER: This document is for estimation purposes only and does not constitute tax advice.', 15, y);
  doc.text('Please consult a qualified tax professional for official tax preparation and filing.', 15, y + 4);

  addFooter(doc);
  doc.save(`Finflow_Tax_Estimate_${year}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ==========================================
// PORTFOLIO STATEMENT PDF
// ==========================================
export function generatePortfolioStatementPDF(
  holdings: HoldingRow[],
  totalValue: number,
  totalCost: number,
  totalGain: number,
  totalReturn: number,
  annualDividends: number,
  portfolioYield: number,
  allocation: { name: string; value: number; percentage: number }[],
  currencySymbol: string
): void {
  const doc = new jsPDF('landscape');
  const now = format(new Date(), 'MMM d, yyyy h:mm a');

  // Landscape header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 297, 30, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Finflow', 15, 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('FINANCIAL PLATFORM', 15, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Investment Portfolio Statement', 15, 26);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${now}`, 282, 13, { align: 'right' });
  doc.setTextColor(...COLORS.dark);

  let y = 38;

  // KPIs (landscape has more width)
  const kpis = [
    { label: 'Portfolio Value', value: fmt(totalValue, currencySymbol) },
    { label: 'Total Cost', value: fmt(totalCost, currencySymbol) },
    { label: 'Total Gain/Loss', value: fmt(totalGain, currencySymbol), color: totalGain >= 0 ? COLORS.income : COLORS.expense },
    { label: 'Total Return', value: `${totalReturn.toFixed(1)}%`, color: totalReturn >= 0 ? COLORS.income : COLORS.expense },
    { label: 'Annual Dividends', value: fmt(annualDividends, currencySymbol), color: COLORS.accent },
    { label: 'Portfolio Yield', value: `${portfolioYield.toFixed(2)}%` },
  ];

  const kpiWidth = 267 / kpis.length;
  kpis.forEach((kpi, i) => {
    const x = 15 + i * kpiWidth;
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(x, y, kpiWidth - 3, 16, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.muted);
    doc.text(kpi.label, x + 3, y + 6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(kpi.color || COLORS.dark));
    doc.text(kpi.value, x + 3, y + 13);
    doc.setFont('helvetica', 'normal');
  });
  doc.setTextColor(...COLORS.dark);

  y += 22;

  // Holdings table
  y = y + 2;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Holdings', 15, y);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, y + 2, 55, y + 2);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Ticker', 'Name', 'Shares', 'Avg Cost', 'Price', 'Market Value', 'Gain/Loss', 'Return %', 'Yield %']],
    body: holdings.map(h => [
      h.ticker,
      h.name,
      h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 }),
      fmt(h.avgCost, currencySymbol),
      fmt(h.currentPrice, currencySymbol),
      fmt(h.marketValue, currencySymbol),
      fmt(h.gain, currencySymbol),
      `${h.returnPct >= 0 ? '+' : ''}${h.returnPct.toFixed(1)}%`,
      h.returnPct > 0 ? `${(h.gain / h.marketValue * 100).toFixed(2)}%` : '—',
    ]),
    foot: [['', 'Total', '', '', '', fmt(totalValue, currencySymbol), fmt(totalGain, currencySymbol), `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`, `${portfolioYield.toFixed(2)}%`]],
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, fontSize: 7, fontStyle: 'bold' },
    footStyles: { fillColor: [220, 230, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' },
      5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = holdings[data.row.index]?.gain;
        if (val !== undefined) {
          data.cell.styles.textColor = val >= 0 ? COLORS.income : COLORS.expense;
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Asset Allocation
  if (allocation.length > 0 && y < 160) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Allocation', 15, y);
    doc.line(15, y + 2, 55, y + 2);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Asset Class', 'Value', 'Allocation %']],
      body: allocation.map(a => [a.name, fmt(a.value, currencySymbol), `${a.percentage.toFixed(1)}%`]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.accent, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: 15, right: 150 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Page ${i} of ${pageCount}`, 148, 205, { align: 'center' });
    doc.text('Finflow Financial Platform • Confidential • For Personal Use Only', 148, 209, { align: 'center' });
    doc.setDrawColor(230, 230, 235);
    doc.setLineWidth(0.3);
    doc.line(15, 201, 282, 201);
  }

  doc.save(`Finflow_Portfolio_Statement_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
