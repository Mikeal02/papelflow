import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Smartphone, Monitor, Tablet, Globe2, MapPin, Clock, ShieldAlert,
  LogOut, Trash2, RefreshCw, CheckCircle2, Loader2, KeyRound, LogIn,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LoginEvent {
  id: string;
  event_type: 'sign_in' | 'sign_out' | 'token_refresh' | 'password_change' | 'failed_attempt';
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  session_id: string | null;
  is_suspicious: boolean;
  created_at: string;
}

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const eventMeta: Record<LoginEvent['event_type'], { label: string; Icon: any; tone: string }> = {
  sign_in:         { label: 'Signed in',        Icon: LogIn,       tone: 'text-income bg-income/10' },
  sign_out:        { label: 'Signed out',       Icon: LogOut,      tone: 'text-muted-foreground bg-muted/40' },
  token_refresh:   { label: 'Session refreshed',Icon: RefreshCw,   tone: 'text-primary bg-primary/10' },
  password_change: { label: 'Password changed', Icon: KeyRound,    tone: 'text-warning bg-warning/10' },
  failed_attempt:  { label: 'Failed attempt',   Icon: ShieldAlert, tone: 'text-destructive bg-destructive/10' },
};

function DeviceIcon({ device, className }: { device: string | null; className?: string }) {
  const D = device === 'Mobile' ? Smartphone : device === 'Tablet' ? Tablet : Monitor;
  return <D className={className} />;
}

export function LoginActivityModal({ open, onOpenChange }: Props) {
  const { session } = useAuth();
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);

  const currentSessionTag = session?.access_token?.slice(-16) ?? null;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('login_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      toast({ title: 'Failed to load activity', description: error.message, variant: 'destructive' });
    } else {
      setEvents((data as LoginEvent[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  useEffect(() => {
    if (!open || !session?.user?.id) return;
    const channel = supabase
      .channel(`login_events_${session.user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'login_events', filter: `user_id=eq.${session.user.id}` },
        (payload) => setEvents((prev) => [payload.new as LoginEvent, ...prev].slice(0, 50)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, session?.user?.id]);

  const stats = useMemo(() => {
    const signIns = events.filter((e) => e.event_type === 'sign_in');
    const uniqueCountries = new Set(signIns.map((e) => e.country).filter(Boolean)).size;
    const suspicious = events.filter((e) => e.is_suspicious).length;
    return { total: events.length, signIns: signIns.length, uniqueCountries, suspicious };
  }, [events]);

  const handleRevokeOthers = async () => {
    setRevoking(true);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setRevoking(false);
    if (error) {
      toast({ title: 'Could not revoke sessions', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Other sessions revoked', description: 'All other devices have been signed out.' });
      load();
    }
  };

  const handleClearHistory = async () => {
    const { error } = await supabase
      .from('login_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast({ title: 'Failed to clear', description: error.message, variant: 'destructive' });
    } else {
      setEvents([]);
      toast({ title: 'Login history cleared' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-income/25 to-income/10">
              <Activity className="h-4.5 w-4.5 text-income" />
            </div>
            Login activity
          </DialogTitle>
          <DialogDescription>
            Review recent sign-ins, sessions, and security events on your account.
          </DialogDescription>
        </DialogHeader>

        {/* Stats strip */}
        <div className="px-6 grid grid-cols-4 gap-2">
          {[
            { label: 'Events', value: stats.total },
            { label: 'Sign-ins', value: stats.signIns },
            { label: 'Countries', value: stats.uniqueCountries },
            { label: 'Flagged', value: stats.suspicious, tone: stats.suspicious ? 'text-destructive' : '' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <div className={cn('text-lg font-semibold tabular-nums', s.tone)}>{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="px-6 pt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={revoking}>
                {revoking ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 mr-1.5" />}
                Sign out other sessions
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every other device signed in to your account will be signed out immediately. Your current session stays active.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevokeOthers}>Sign out others</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-muted-foreground ml-auto">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear history
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear login history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes all recorded login events for your account. New events will still be captured.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory}>Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator className="mt-4" />

        <ScrollArea className="h-[420px] px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading activity…
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              No login activity recorded yet. Events will appear here on your next sign-in.
            </div>
          ) : (
            <ol className="relative border-l border-border/60 ml-2 space-y-3">
              <AnimatePresence initial={false}>
                {events.map((e, i) => {
                  const meta = eventMeta[e.event_type];
                  const isCurrent = !!currentSessionTag && e.session_id === currentSessionTag && e.event_type === 'sign_in';
                  const location = [e.city, e.region, e.country].filter(Boolean).join(', ') || 'Unknown location';
                  return (
                    <motion.li
                      key={e.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.015, 0.15) }}
                      className="ml-4"
                    >
                      <span className={cn('absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background', meta.tone)}>
                        <meta.Icon className="h-2.5 w-2.5" />
                      </span>
                      <div className={cn(
                        'rounded-xl border p-3.5 transition-colors',
                        isCurrent ? 'border-income/40 bg-income/5' :
                        e.is_suspicious ? 'border-destructive/40 bg-destructive/5' :
                        'border-border/60 hover:bg-muted/30'
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{meta.label}</span>
                              {isCurrent && (
                                <Badge className="bg-income/15 text-income border-income/30 gap-1 text-[10px]">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> This device
                                </Badge>
                              )}
                              {e.is_suspicious && !isCurrent && (
                                <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40 gap-1">
                                  <ShieldAlert className="h-2.5 w-2.5" /> New location
                                </Badge>
                              )}
                            </div>

                            <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><DeviceIcon device={e.device} className="h-3 w-3" /> {e.browser ?? '—'} · {e.os ?? '—'}</span>
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {location}</span>
                              {e.ip_address && <span className="flex items-center gap-1"><Globe2 className="h-3 w-3" /> {e.ip_address}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-medium tabular-nums">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</div>
                            <div className="text-[10px] text-muted-foreground tabular-nums flex items-center justify-end gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" />{format(new Date(e.created_at), 'MMM d, HH:mm')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
