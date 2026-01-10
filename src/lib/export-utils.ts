import { format } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  payee?: string | null;
  notes?: string | null;
  category?: { name: string } | null;
  account?: { name: string } | null;
  tags?: string[] | null;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  formatCurrency: (amount: number) => string
): void {
  const headers = [
    'Date',
    'Type',
    'Payee',
    'Category',
    'Account',
    'Amount',
    'Notes',
    'Tags',
  ];

  const rows = transactions.map((tx) => [
    format(new Date(tx.date), 'yyyy-MM-dd'),
    tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
    tx.payee || '',
    (tx.category as any)?.name || '',
    (tx.account as any)?.name || '',
    tx.type === 'expense' ? `-${tx.amount}` : tx.amount.toString(),
    tx.notes || '',
    tx.tags?.join(', ') || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  downloadCSV(csvContent, `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

export function exportReportToCSV(
  monthlyData: { month: string; income: number; expenses: number }[],
  categorySpending: { name: string; value: number }[],
  topMerchants: { name: string; amount: number; category: string }[]
): void {
  let csvContent = '';

  // Monthly Summary
  csvContent += 'MONTHLY SUMMARY\n';
  csvContent += 'Month,Income,Expenses,Net\n';
  monthlyData.forEach((m) => {
    csvContent += `${m.month},${m.income},${m.expenses},${m.income - m.expenses}\n`;
  });

  csvContent += '\n';

  // Category Breakdown
  csvContent += 'SPENDING BY CATEGORY\n';
  csvContent += 'Category,Amount\n';
  categorySpending.forEach((c) => {
    csvContent += `"${c.name}",${c.value}\n`;
  });

  csvContent += '\n';

  // Top Merchants
  csvContent += 'TOP MERCHANTS\n';
  csvContent += 'Merchant,Category,Amount\n';
  topMerchants.forEach((m) => {
    csvContent += `"${m.name}","${m.category}",${m.amount}\n`;
  });

  downloadCSV(csvContent, `financial_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
