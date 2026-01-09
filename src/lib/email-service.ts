import { supabase } from '@/integrations/supabase/client';

interface BudgetAlertData {
  budgetName: string;
  spent: number;
  limit: number;
  percentage: number;
  currency: string;
}

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  topCategories: Array<{ name: string; amount: number }>;
  period: string;
  currency: string;
}

export async function sendBudgetAlert(
  to: string,
  userName: string,
  data: BudgetAlertData
) {
  const { data: response, error } = await supabase.functions.invoke('send-email', {
    body: {
      type: 'budget_alert',
      to,
      userName,
      data,
    },
  });

  if (error) {
    console.error('Failed to send budget alert:', error);
    throw error;
  }

  return response;
}

export async function sendWeeklySummary(
  to: string,
  userName: string,
  data: SummaryData
) {
  const { data: response, error } = await supabase.functions.invoke('send-email', {
    body: {
      type: 'weekly_summary',
      to,
      userName,
      data,
    },
  });

  if (error) {
    console.error('Failed to send weekly summary:', error);
    throw error;
  }

  return response;
}

export async function sendMonthlySummary(
  to: string,
  userName: string,
  data: SummaryData
) {
  const { data: response, error } = await supabase.functions.invoke('send-email', {
    body: {
      type: 'monthly_summary',
      to,
      userName,
      data,
    },
  });

  if (error) {
    console.error('Failed to send monthly summary:', error);
    throw error;
  }

  return response;
}
