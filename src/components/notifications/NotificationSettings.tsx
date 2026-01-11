import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

export function NotificationSettings() {
  const { isSupported, permission, isSubscribed, requestPermission, showNotification } = usePushNotifications();

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  const handleTestNotification = () => {
    showNotification('Test Notification', {
      body: 'This is a test notification from PapelFlow',
    });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about important financial events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'granted' 
                ? 'Notifications are enabled'
                : permission === 'denied'
                ? 'Notifications are blocked. Please enable in browser settings.'
                : 'Allow browser notifications'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-3 w-3 rounded-full',
                isSubscribed ? 'bg-income' : 'bg-muted'
              )}
            />
            {permission !== 'granted' ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEnableNotifications}
                disabled={permission === 'denied'}
              >
                <BellRing className="h-4 w-4 mr-2" />
                Enable
              </Button>
            ) : (
              <Switch checked={isSubscribed} disabled />
            )}
          </div>
        </div>

        {isSubscribed && (
          <>
            <div className="h-px bg-border" />
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Notification Types</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Budget Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    When spending exceeds 80% or 100% of budget
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bill Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Upcoming bill payment reminders
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Goal Progress</Label>
                  <p className="text-xs text-muted-foreground">
                    Updates on savings goal milestones
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="h-px bg-border" />

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestNotification}
              className="w-full"
            >
              Send Test Notification
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
