import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Download,
  Trash2,
  Moon,
  Globe,
  Calendar,
  ChevronRight,
  Loader2,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Update local state when profile loads
  useState(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCurrency(profile.preferred_currency || 'USD');
    }
  });

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync({
      full_name: fullName,
      preferred_currency: currency,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold gradient-text">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Profile</h3>
              <p className="text-sm text-muted-foreground">
                Your personal information
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ''} disabled className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                value={fullName || profile?.full_name || ''} 
                onChange={(e) => setFullName(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <Button 
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
              className="bg-gradient-sunset hover:opacity-90 text-primary-foreground"
            >
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10">
              <Globe className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <h3 className="font-semibold">Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Customize your experience
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Dark mode</p>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator className="bg-border/50" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency || profile?.preferred_currency || 'USD'} onValueChange={setCurrency}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fiscal month start</Label>
                <Select defaultValue="1">
                  <SelectTrigger className="bg-muted/30">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st of month</SelectItem>
                    <SelectItem value="15">15th of month</SelectItem>
                    <SelectItem value="last">Last day of month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10">
              <Bell className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Control what alerts you receive
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Budget alerts', desc: 'When you reach 80% of budget' },
              { label: 'Bill reminders', desc: 'Before subscriptions are due' },
              { label: 'Weekly summary', desc: 'Your spending overview' },
              { label: 'Unusual spending', desc: 'Large or suspicious transactions' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-income/10">
              <Shield className="h-5 w-5 text-income" />
            </div>
            <div>
              <h3 className="font-semibold">Security</h3>
              <p className="text-sm text-muted-foreground">
                Protect your account
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between h-12">
              Change password
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-12">
              Two-factor authentication
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Data Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10">
              <Download className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <h3 className="font-semibold">Data & Privacy</h3>
              <p className="text-sm text-muted-foreground">
                Export or delete your data
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between h-12">
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export all data
              </span>
              <span className="text-sm text-muted-foreground">JSON, CSV</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full justify-between h-12"
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between h-12 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete account
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Settings;
