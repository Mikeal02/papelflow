import { useEffect, useCallback, useRef } from 'react';
import { useSubscriptions } from './useSubscriptions';
import { usePushNotifications } from './usePushNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { parseISO, differenceInDays, format, isToday, addDays } from 'date-fns';

const REMINDER_KEY = 'bill_reminders_shown';

interface ReminderShown {
  subscriptionId: string;
  date: string;
  type: 'today' | 'upcoming';
}

export const useBillReminders = () => {
  const { data: subscriptions = [] } = useSubscriptions();
  const { sendBillReminder, isSupported } = usePushNotifications();
  const { formatCurrency } = useCurrency();
  const hasChecked = useRef(false);

  const getShownReminders = useCallback((): ReminderShown[] => {
    try {
      const stored = localStorage.getItem(REMINDER_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const markReminderShown = useCallback((subscriptionId: string, date: string, type: 'today' | 'upcoming') => {
    const shown = getShownReminders();
    shown.push({ subscriptionId, date, type });
    
    // Keep only reminders from last 7 days
    const weekAgo = addDays(new Date(), -7);
    const filtered = shown.filter(r => parseISO(r.date) > weekAgo);
    localStorage.setItem(REMINDER_KEY, JSON.stringify(filtered));
  }, [getShownReminders]);

  const wasReminderShown = useCallback((subscriptionId: string, date: string, type: 'today' | 'upcoming'): boolean => {
    const shown = getShownReminders();
    return shown.some(r => 
      r.subscriptionId === subscriptionId && 
      r.date === date && 
      r.type === type
    );
  }, [getShownReminders]);

  const checkBillReminders = useCallback(() => {
    const activeSubscriptions = subscriptions.filter(s => s.is_active);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const dueTodayBills: string[] = [];
    const upcomingBills: { name: string; dueIn: number; amount: number }[] = [];

    for (const subscription of activeSubscriptions) {
      const dueDate = parseISO(subscription.next_due);
      const daysUntilDue = differenceInDays(dueDate, today);

      // Bill is due today
      if (isToday(dueDate)) {
        if (!wasReminderShown(subscription.id, todayStr, 'today')) {
          dueTodayBills.push(subscription.name);
          markReminderShown(subscription.id, todayStr, 'today');
        }
      }
      // Bill is due within 3 days
      else if (daysUntilDue > 0 && daysUntilDue <= 3) {
        if (!wasReminderShown(subscription.id, todayStr, 'upcoming')) {
          upcomingBills.push({
            name: subscription.name,
            dueIn: daysUntilDue,
            amount: Number(subscription.amount),
          });
          markReminderShown(subscription.id, todayStr, 'upcoming');
        }
      }
    }

    // Show toast for bills due today
    if (dueTodayBills.length > 0) {
      toast.warning(`Bills due today: ${dueTodayBills.join(', ')}`, {
        duration: 8000,
      });

      // Send push notification
      if (isSupported) {
        sendBillReminder(dueTodayBills.join(', '), 0, `${dueTodayBills.length} bill(s)`);
      }
    }

    // Show toast for upcoming bills
    if (upcomingBills.length > 0) {
      const totalUpcoming = upcomingBills.reduce((sum, b) => sum + b.amount, 0);
      const billDetails = upcomingBills
        .map(b => `${b.name} in ${b.dueIn} day${b.dueIn > 1 ? 's' : ''}`)
        .join(', ');
      
      toast.info(
        `${upcomingBills.length} bill${upcomingBills.length > 1 ? 's' : ''} due soon (${formatCurrency(totalUpcoming)} total). ${billDetails}`,
        {
          duration: 6000,
        }
      );
    }
  }, [subscriptions, formatCurrency, wasReminderShown, markReminderShown, sendBillReminder, isSupported]);

  // Check reminders on mount (once per session)
  useEffect(() => {
    if (subscriptions.length > 0 && !hasChecked.current) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        checkBillReminders();
        hasChecked.current = true;
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [subscriptions.length, checkBillReminders]);

  return {
    checkBillReminders,
    upcomingBillsCount: subscriptions.filter(s => {
      if (!s.is_active) return false;
      const dueDate = parseISO(s.next_due);
      const daysUntilDue = differenceInDays(dueDate, new Date());
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    }).length,
  };
};
