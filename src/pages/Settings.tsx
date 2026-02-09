import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Download,
  Trash2,
  Moon,
  Globe,
  Calendar,
  ChevronRight,
  Loader2,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { supabase } from '@/integrations/supabase/client';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useGoals } from '@/hooks/useGoals';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { data: goals = [] } = useGoals();
  const { data: subscriptions = [] } = useSubscriptions();
  
  const [fullName, setFullName] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync({
      full_name: fullName,
    });
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    await updateProfile.mutateAsync({
      preferred_currency: newCurrency,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };
  
  const isDark = mounted ? (resolvedTheme === 'dark') : true;

  const handleExportData = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: profile,
      accounts: accounts,
      transactions: transactions,
      budgets: budgets,
      categories: categories,
      goals: goals,
      subscriptions: subscriptions,
    };

    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finflow-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Data exported',
      description: 'Your data has been downloaded as a JSON file',
    });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    
    try {
      await supabase.from('transactions').delete().eq('user_id', user.id);
      await supabase.from('budgets').delete().eq('user_id', user.id);
      await supabase.from('subscriptions').delete().eq('user_id', user.id);
      await supabase.from('goals').delete().eq('user_id', user.id);
      await supabase.from('accounts').delete().eq('user_id', user.id);
      await supabase.from('categories').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);
      
      await signOut();
      
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been deleted',
      });
      
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: 'Failed to delete account',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading settings...</p>
        </div>
      </AppLayout>
    );
  }

  const sections = [
    {
      icon: User,
      title: 'Profile',
      description: 'Your personal information',
      color: 'primary',
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input id="email" type="email" value={user?.email || ''} disabled className="bg-muted/30" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
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
            className="btn-premium"
          >
            {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      ),
    },
    {
      icon: Globe,
      title: 'Preferences',
      description: 'Customize your experience',
      color: 'accent',
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50">
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Dark mode</p>
                <p className="text-xs text-muted-foreground">Use dark theme</p>
              </div>
            </div>
            <Switch checked={isDark} onCheckedChange={handleDarkModeToggle} />
          </div>

          <Separator className="bg-border/50" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Currency</Label>
              <Select value={profile?.preferred_currency || 'USD'} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="CNY">CNY (¥)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                  <SelectItem value="CHF">CHF (Fr)</SelectItem>
                  <SelectItem value="KRW">KRW (₩)</SelectItem>
                  <SelectItem value="SGD">SGD ($)</SelectItem>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="MXN">MXN ($)</SelectItem>
                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                  <SelectItem value="SAR">SAR (﷼)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fiscal month start</Label>
              <Select defaultValue="1">
                <SelectTrigger className="bg-muted/30">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
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
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your account and preferences</p>
        </motion.div>

        {/* Main Sections */}
        {sections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="stat-card"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br',
                `from-${section.color}/20 to-${section.color}/10`
              )}>
                <section.icon className={cn('h-5 w-5', `text-${section.color}`)} />
              </div>
              <div>
                <h3 className="font-semibold">{section.title}</h3>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
            </div>
            {section.content}
          </motion.div>
        ))}

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <NotificationSettings />
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-income/20 to-income/10">
              <Shield className="h-5 w-5 text-income" />
            </div>
            <div>
              <h3 className="font-semibold">Security</h3>
              <p className="text-xs text-muted-foreground">Protect your account</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-between h-12 hover:bg-muted/50" 
              onClick={() => setShowPasswordModal(true)}
            >
              Change password
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-12 hover:bg-muted/50">
              Two-factor authentication
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10">
              <Download className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold">Data & Privacy</h3>
              <p className="text-xs text-muted-foreground">Export or delete your data</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-between h-12 hover:bg-muted/50"
              onClick={handleExportData}
            >
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export all data
              </span>
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">JSON</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full justify-between h-12 hover:bg-muted/50"
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-12 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete account
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </div>
      
      <ChangePasswordModal 
        open={showPasswordModal} 
        onOpenChange={setShowPasswordModal} 
      />
    </AppLayout>
  );
};

export default Settings;
