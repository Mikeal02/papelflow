import { motion } from 'framer-motion';
import {
  User, Shield, Download, Trash2, Moon, Globe, Calendar, ChevronRight, Loader2, LogOut,
  Database, Clock, Activity, HardDrive, FileJson, FileSpreadsheet, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo } from 'react';
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
import { format, differenceInDays } from 'date-fns';

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

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (profile) setFullName(profile.full_name || ''); }, [profile]);

  const dataStats = useMemo(() => {
    const accountAge = user?.created_at ? differenceInDays(new Date(), new Date(user.created_at)) : 0;
    const totalRecords = transactions.length + accounts.length + budgets.length + categories.length + goals.length + subscriptions.length;
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const oldestTx = transactions.length > 0 ? transactions[transactions.length - 1]?.date : null;
    return { accountAge, totalRecords, totalExpenses, totalIncome, oldestTx };
  }, [user, transactions, accounts, budgets, categories, goals, subscriptions]);

  const handleSaveProfile = async () => { await updateProfile.mutateAsync({ full_name: fullName }); };
  const handleCurrencyChange = async (newCurrency: string) => { await updateProfile.mutateAsync({ preferred_currency: newCurrency }); };
  const handleSignOut = async () => { await signOut(); navigate('/auth'); };
  const handleDarkModeToggle = (checked: boolean) => { setTheme(checked ? 'dark' : 'light'); };
  const isDark = mounted ? (resolvedTheme === 'dark') : true;

  const handleExportData = (exportFormat: 'json' | 'csv') => {
    const exportData = { exportedAt: new Date().toISOString(), profile, accounts, transactions, budgets, categories, goals, subscriptions };

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finflow-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Date', 'Type', 'Amount', 'Payee', 'Notes'];
      const rows = transactions.map(t => [t.date, t.type, t.amount, t.payee || '', t.notes || '']);
      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast({ title: 'Data exported', description: `Your data has been downloaded as ${exportFormat.toUpperCase()}` });
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
      toast({ title: 'Account deleted', description: 'Your account and all data have been deleted' });
      navigate('/auth');
    } catch (error: any) {
      toast({ title: 'Failed to delete account', description: error.message, variant: 'destructive' });
    } finally { setIsDeleting(false); }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative"><div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" /><Loader2 className="h-12 w-12 animate-spin text-primary relative" /></div>
          <p className="text-muted-foreground animate-pulse">Loading settings...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your account, preferences, and data</p>
        </motion.div>

        {/* Account Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10"><Activity className="h-5 w-5 text-primary" /></div>
            <div><h3 className="font-semibold">Account Overview</h3><p className="text-xs text-muted-foreground">Your data at a glance</p></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Account Age', value: `${dataStats.accountAge}d`, icon: Clock },
              { label: 'Total Records', value: String(dataStats.totalRecords), icon: Database },
              { label: 'Transactions', value: String(transactions.length), icon: BarChart3 },
              { label: 'Accounts', value: String(accounts.length), icon: HardDrive },
            ].map((stat, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/30 text-center">
                <stat.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10"><User className="h-5 w-5 text-primary" /></div>
            <div><h3 className="font-semibold">Profile</h3><p className="text-xs text-muted-foreground">Your personal information</p></div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email" className="text-sm font-medium">Email</Label><Input id="email" type="email" value={user?.email || ''} disabled className="bg-muted/30" /></div>
            <div className="space-y-2"><Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label><Input id="fullName" value={fullName || profile?.full_name || ''} onChange={(e) => setFullName(e.target.value)} className="bg-muted/30" /></div>
            {user?.created_at && <p className="text-xs text-muted-foreground">Member since {format(new Date(user.created_at), 'MMMM d, yyyy')}</p>}
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="btn-premium">{updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}</Button>
          </div>
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10"><Globe className="h-5 w-5 text-accent" /></div>
            <div><h3 className="font-semibold">Preferences</h3><p className="text-xs text-muted-foreground">Customize your experience</p></div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50"><Moon className="h-4 w-4 text-muted-foreground" /></div><div><p className="font-medium text-sm">Dark mode</p><p className="text-xs text-muted-foreground">Use dark theme</p></div></div>
              <Switch checked={isDark} onCheckedChange={handleDarkModeToggle} />
            </div>
            <Separator className="bg-border/50" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Currency</Label>
                <Select value={profile?.preferred_currency || 'USD'} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['USD ($)', 'EUR (€)', 'GBP (£)', 'JPY (¥)', 'CNY (¥)', 'INR (₹)', 'CAD ($)', 'AUD ($)', 'CHF (Fr)', 'KRW (₩)', 'SGD ($)', 'BRL (R$)', 'MXN ($)', 'AED (د.إ)', 'SAR (﷼)'].map(c => {
                      const code = c.split(' ')[0];
                      return <SelectItem key={code} value={code}>{c}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fiscal month start</Label>
                <Select defaultValue="1"><SelectTrigger className="bg-muted/30"><Calendar className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1st of month</SelectItem><SelectItem value="15">15th of month</SelectItem><SelectItem value="last">Last day of month</SelectItem></SelectContent></Select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}><NotificationSettings /></motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-income/20 to-income/10"><Shield className="h-5 w-5 text-income" /></div>
            <div><h3 className="font-semibold">Security</h3><p className="text-xs text-muted-foreground">Protect your account</p></div>
          </div>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-between h-12 hover:bg-muted/50" onClick={() => setShowPasswordModal(true)}>Change password<ChevronRight className="h-4 w-4 text-muted-foreground" /></Button>
            <Button variant="outline" className="w-full justify-between h-12 hover:bg-muted/50">Two-factor authentication<Badge variant="outline" className="text-[10px]">Coming soon</Badge></Button>
          </div>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10"><Download className="h-5 w-5 text-warning" /></div>
            <div><h3 className="font-semibold">Data & Privacy</h3><p className="text-xs text-muted-foreground">Export or delete your data</p></div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-12 hover:bg-muted/50 gap-2" onClick={() => handleExportData('json')}>
                <FileJson className="h-4 w-4" /><span className="text-sm">Export JSON</span>
              </Button>
              <Button variant="outline" className="h-12 hover:bg-muted/50 gap-2" onClick={() => handleExportData('csv')}>
                <FileSpreadsheet className="h-4 w-4" /><span className="text-sm">Export CSV</span>
              </Button>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="w-full justify-between h-12 hover:bg-muted/50">
              <span className="flex items-center gap-2"><LogOut className="h-4 w-4" />Sign out</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-12 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5">
                  <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" />Delete account</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone. This will permanently delete your account and remove all your data.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>{isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Account'}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </div>
      <ChangePasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
    </AppLayout>
  );
};

export default Settings;
