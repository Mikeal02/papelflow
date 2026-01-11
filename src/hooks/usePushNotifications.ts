import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'default';
  isSubscribed: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
  });

  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'default',
      isSubscribed: isSupported && Notification.permission === 'granted',
    }));
  }, []);

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission,
        isSubscribed: permission === 'granted',
      }));

      if (permission === 'granted') {
        toast.success('Push notifications enabled!');
        // Show a test notification
        showNotification('Notifications Enabled', {
          body: 'You will now receive important financial alerts',
          icon: '/favicon.svg',
        });
        return true;
      } else if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable in browser settings.');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [state.isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!state.isSupported || Notification.permission !== 'granted') {
      // Fallback to toast notification
      toast(title, {
        description: options?.body,
      });
      return;
    }

    try {
      new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });
    } catch (error) {
      // Fallback to toast if native notification fails
      toast(title, {
        description: options?.body,
      });
    }
  }, [state.isSupported]);

  const sendBudgetAlert = useCallback((categoryName: string, percentage: number) => {
    const isOverBudget = percentage >= 100;
    const title = isOverBudget 
      ? `⚠️ Budget Exceeded: ${categoryName}`
      : `📊 Budget Alert: ${categoryName}`;
    const body = isOverBudget
      ? `You've exceeded your ${categoryName} budget by ${(percentage - 100).toFixed(0)}%`
      : `You've used ${percentage.toFixed(0)}% of your ${categoryName} budget`;

    showNotification(title, { body, tag: `budget-${categoryName}` });
  }, [showNotification]);

  const sendBillReminder = useCallback((billName: string, daysUntil: number, amount: string) => {
    let title: string;
    let body: string;

    if (daysUntil === 0) {
      title = `🔔 Bill Due Today: ${billName}`;
      body = `Your ${billName} payment of ${amount} is due today`;
    } else if (daysUntil === 1) {
      title = `⏰ Bill Due Tomorrow: ${billName}`;
      body = `Your ${billName} payment of ${amount} is due tomorrow`;
    } else {
      title = `📅 Upcoming Bill: ${billName}`;
      body = `Your ${billName} payment of ${amount} is due in ${daysUntil} days`;
    }

    showNotification(title, { body, tag: `bill-${billName}` });
  }, [showNotification]);

  const sendGoalProgress = useCallback((goalName: string, percentage: number) => {
    let title: string;
    let body: string;

    if (percentage >= 100) {
      title = `🎉 Goal Achieved: ${goalName}`;
      body = `Congratulations! You've reached your ${goalName} savings goal!`;
    } else if (percentage >= 75) {
      title = `🚀 Almost There: ${goalName}`;
      body = `You're ${percentage.toFixed(0)}% of the way to your ${goalName} goal!`;
    } else if (percentage >= 50) {
      title = `📈 Halfway There: ${goalName}`;
      body = `You've reached ${percentage.toFixed(0)}% of your ${goalName} goal!`;
    } else {
      return; // Don't notify for lower percentages
    }

    showNotification(title, { body, tag: `goal-${goalName}` });
  }, [showNotification]);

  return {
    ...state,
    requestPermission,
    showNotification,
    sendBudgetAlert,
    sendBillReminder,
    sendGoalProgress,
  };
}
