import { motion } from 'framer-motion';
import {
  User, Shield, Download, Trash2, Moon, Globe, Calendar, ChevronRight, Loader2, LogOut,
  Database, Clock, Activity, HardDrive, FileJson, FileSpreadsheet, BarChart3, Mail, Send,
  Camera, Zap, Crown, Fingerprint, Eye, Lock, Sparkles, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { ExportDataModal } from '@/components/settings/ExportDataModal';
import { supabase } from '@/integrations/supabase/client';
import { useTransactions } from '@/hooks/useTransactions';
import { triggerWeeklySummary } from '@/lib/email-service';
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingSummary, setIsSendingSummary] = useState(false);
  const [weeklyEmailEnabled, setWeeklyEmailEnabled] = useState(true);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (profile) setFullName(profile.full_name || ''); }, [profile]);

  const dataStats = useMemo(() => {
    const accountAge = user?.created_at ? differenceInDays(new Date(), new Date(user.created_at)) : 0;
    const totalRecords = transactions.length + accounts.length + budgets.length + categories.length + goals.length + subscriptions.length;
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;
    return { accountAge, totalRecords, totalExpenses, totalIncome, savingsRate };
  }, [user, transactions, accounts, budgets, categories, goals, subscriptions]);

  const handleSaveProfile = async () => { await updateProfile.mutateAsync({ full_name: fullName }); };
  const handleCurrencyChange = async (newCurrency: string) => { await updateProfile.mutateAsync({ preferred_currency: newCurrency }); };
  const handleSignOut = async () => { await signOut(); navigate('/auth'); };
  const handleDarkModeToggle = (checked: boolean) => { setTheme(checked ? 'dark' : 'light'); };
  const isDark = mounted ? (resolvedTheme === 'dark') : true;

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative"><div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" /><Loader2 className="h-12 w-12 animate-spin text-primary relative" /></div>
        <p className="text-muted-foreground animate-pulse">Loading settings...</p>
      </div>
    );
  }

  const initials = (profile?.full_name || user?.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const memberDays = dataStats.accountAge;
  const memberLabel = memberDays < 30 ? 'New Member' : memberDays < 180 ? 'Active Member' : memberDays < 365 ? 'Power User' : 'Veteran';

  return (
    <>
      <div className="max-w-3xl space-y-6">
        {/* ── Hero Profile Card ── */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card">
            {/* Layered background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.03]" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-primary/[0.06] via-transparent to-transparent rounded-full -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-income/[0.04] via-transparent to-transparent rounded-full translate-y-1/3 -translate-x-1/4" />
            
            <div className="relative p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Avatar with activity ring */}
                <div className="relative group">
                  <div className="absolute -inset-1.5 rounded-[22px] bg-gradient-to-br from-primary via-accent to-income opacity-20 group-hover:opacity-40 transition-opacity blur-sm" />
                  <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-xl shadow-primary/15">
                    <span className="text-2xl font-black text-primary-foreground tracking-tight">{initials}</span>
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-lg bg-income flex items-center justify-center ring-[3px] ring-card shadow-lg">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                  {/* Camera overlay on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center cursor-pointer">
                    <Camera className="h-5 w-5 text-primary-foreground opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">{profile?.full_name || 'Your Account'}</h1>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold tracking-wider gap-1">
                      <Crown className="h-2.5 w-2.5" />PRO
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {user?.created_at && (
                      <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                        <Shield className="h-3 w-3" />
                        {format(new Date(user.created_at), 'MMM yyyy')}
                      </p>
                    )}
                    <Badge variant="outline" className="text-[10px] font-medium border-border/40">
                      <Sparkles className="h-2.5 w-2.5 mr-1" />{memberLabel}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6">
                {[
                  { label: 'Days Active', value: String(dataStats.accountAge), icon: Clock, color: 'text-primary', bg: 'bg-primary/8' },
                  { label: 'Records', value: dataStats.totalRecords.toLocaleString(), icon: Database, color: 'text-accent', bg: 'bg-accent/8' },
                  { label: 'Transactions', value: String(transactions.length), icon: BarChart3, color: 'text-income', bg: 'bg-income/8' },
                  { label: 'Savings Rate', value: `${dataStats.savingsRate}%`, icon: TrendingUp, color: dataStats.savingsRate >= 20 ? 'text-income' : 'text-warning', bg: dataStats.savingsRate >= 20 ? 'bg-income/8' : 'bg-warning/8' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="group p-3 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/40 hover:border-border/30 transition-all"
                  >
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center mb-2', stat.bg)}>
                      <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
                    </div>
                    <p className="text-lg font-bold tabular-nums leading-none tracking-tight">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Profile Edit ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10"><User className="h-5 w-5 text-primary" /></div>
            <div><h3 className="font-semibold">Profile</h3><p className="text-xs text-muted-foreground">Your personal information</p></div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email" className="text-sm font-medium">Email</Label><Input id="email" type="email" value={user?.email || ''} disabled className="bg-muted/30" /></div>
            <div className="space-y-2"><Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label><Input id="fullName" value={fullName || profile?.full_name || ''} onChange={(e) => setFullName(e.target.value)} className="bg-muted/30" /></div>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="btn-premium">{updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}</Button>
          </div>
        </motion.div>

        {/* ── Preferences ── */}
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

        {/* ── Notifications ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}><NotificationSettings /></motion.div>

        {/* ── Email Reports ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
            <div><h3 className="font-semibold">Email Reports</h3><p className="text-xs text-muted-foreground">Automated weekly financial summaries with AI insights</p></div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-sm">Weekly Summary</p><p className="text-xs text-muted-foreground">Get AI-powered spending insights every Monday</p></div>
              <Switch checked={weeklyEmailEnabled} onCheckedChange={setWeeklyEmailEnabled} />
            </div>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Delivers to: <span className="text-foreground font-medium">{user?.email}</span></p></div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isSendingSummary}
                onClick={async () => {
                  setIsSendingSummary(true);
                  try {
                    await triggerWeeklySummary();
                    toast({ title: '📊 Summary sent!', description: 'Check your inbox for the weekly report.' });
                  } catch {
                    toast({ title: 'Could not send summary', description: 'Email delivery may not be configured yet.', variant: 'destructive' });
                  } finally { setIsSendingSummary(false); }
                }}
              >
                {isSendingSummary ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send Now
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── Security ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-income/20 to-income/10"><Shield className="h-5 w-5 text-income" /></div>
            <div><h3 className="font-semibold">Security</h3><p className="text-xs text-muted-foreground">Protect your account</p></div>
          </div>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-between h-12 hover:bg-muted/50 group" onClick={() => setShowPasswordModal(true)}>
              <span className="flex items-center gap-2.5"><Lock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />Change password</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-12 hover:bg-muted/50 group">
              <span className="flex items-center gap-2.5"><Fingerprint className="h-4 w-4 text-muted-foreground" />Two-factor authentication</span>
              <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
            </Button>
            <Button variant="outline" className="w-full justify-between h-12 hover:bg-muted/50 group">
              <span className="flex items-center gap-2.5"><Eye className="h-4 w-4 text-muted-foreground" />Login activity</span>
              <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
            </Button>
          </div>
        </motion.div>

        {/* ── Data & Privacy ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10"><Download className="h-5 w-5 text-warning" /></div>
            <div><h3 className="font-semibold">Data & Privacy</h3><p className="text-xs text-muted-foreground">Export or delete your data</p></div>
          </div>
          <div className="space-y-2">
            {/* Export button — opens the premium modal */}
            <Button
              variant="outline"
              className="w-full justify-between h-12 hover:bg-muted/50 group"
              onClick={() => setShowExportModal(true)}
            >
              <span className="flex items-center gap-2.5">
                <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                Export your data
              </span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] tabular-nums">{dataStats.totalRecords} records</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Button>

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
                  <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </div>

      <ChangePasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
      <ExportDataModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        data={{ profile, accounts, transactions, budgets, categories, goals, subscriptions }}
      />
    </>
  );
};

export default Settings;
