import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Shield, BarChart3, Wallet, PieChart, Target, Globe, CheckCircle2, Eye, EyeOff, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { ParticleField, MeshGradient } from '@/components/ui/particle-field';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

const stats = [
  { value: '50K+', label: 'Active Users', icon: Crown },
  { value: '$2.4B', label: 'Tracked', icon: Sparkles },
  { value: '99.9%', label: 'Uptime', icon: Zap },
  { value: '4.9★', label: 'Rating', icon: Target },
];

const features = [
  { icon: BarChart3, title: 'Smart Analytics', description: 'AI-powered insights and spending forecasts', gradient: 'from-primary to-accent' },
  { icon: Shield, title: 'Bank-Level Security', description: '256-bit encryption & SOC 2 compliance', gradient: 'from-income to-chart-3' },
  { icon: Wallet, title: 'Multi-Account', description: 'Track bank, credit, investment & crypto', gradient: 'from-chart-4 to-warning' },
  { icon: PieChart, title: 'Budget Engine', description: 'Automated budgets with smart alerts', gradient: 'from-chart-6 to-primary' },
  { icon: Target, title: 'Goal Tracking', description: 'Savings goals with milestone tracking', gradient: 'from-accent to-income' },
  { icon: Globe, title: 'Multi-Currency', description: 'Support for 150+ global currencies', gradient: 'from-primary to-chart-6' },
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) {
        toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to initiate Google sign-in.', variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = isLogin ? { email, password } : { email, password, fullName };
      const result = authSchema.safeParse(validationData);
      
      if (!result.success) {
        toast({ title: 'Validation Error', description: result.error.errors[0].message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Login Failed', description: error.message === 'Invalid login credentials' ? 'Invalid email or password.' : error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({ title: 'Sign Up Failed', description: error.message.includes('already registered') ? 'This email is already registered.' : error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Account created!', description: 'Please check your email to verify your account.' });
        }
      }
    } catch (err) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Left Panel - Clean Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-[52%] xl:w-1/2 relative p-10 xl:p-14 flex-col justify-between overflow-hidden bg-muted/30"
      >
        {/* Subtle gradient accent */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/8 via-transparent to-transparent rounded-full -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-accent/6 via-transparent to-transparent rounded-full translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <div className="h-11 w-11 rounded-xl overflow-hidden">
              <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Finflow</span>
          </motion.div>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-semibold leading-[1.1] tracking-tight text-foreground">
              Financial clarity,
              <br />
              <span className="text-primary">simplified.</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              The modern way to track spending, set budgets, and build wealth — with AI-powered insights that actually help.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + index * 0.05 }}
              >
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            {features.slice(0, 4).map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.06 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/30"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-xs">{feature.title}</h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10 flex items-center gap-4 text-xs text-muted-foreground"
        >
          <span>© 2026 Finflow</span>
          <span>·</span>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            <span>SOC 2 Type II</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Panel - Form */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex-1 flex items-center justify-center p-6 md:p-8 relative"
      >
        <div className="w-full max-w-[400px] space-y-6">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl overflow-hidden">
              <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" />
            </div>
            <span className="text-2xl font-semibold">Finflow</span>
          </div>

          <div className="text-center lg:text-left space-y-1">
            <AnimatePresence mode="wait">
              <motion.h2
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-2xl font-semibold tracking-tight"
              >
                {isLogin ? 'Welcome back' : 'Create your account'}
              </motion.h2>
            </AnimatePresence>
            <p className="text-muted-foreground text-sm">{isLogin ? 'Sign in to your account' : 'Start your journey to financial clarity'}</p>
          </div>

          {/* Mode toggle with animated indicator */}
          <div className="relative flex bg-muted/50 rounded-xl p-1 gap-1">
            <motion.div
              className="absolute top-1 bottom-1 rounded-lg bg-background shadow-sm"
              animate={{ left: isLogin ? '4px' : '50%', width: 'calc(50% - 6px)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => setIsLogin(true)}
              className={`relative z-10 flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${
                isLogin ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`relative z-10 flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${
                !isLogin ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium gap-3 hover-gradient-border"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="fullName"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                  <div className={cn('relative rounded-lg transition-shadow duration-300', focusedField === 'name' && 'shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]')}>
                    <User className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors', focusedField === 'name' ? 'text-primary' : 'text-muted-foreground')} />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      className="pl-10 h-11"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className={cn('relative rounded-lg transition-shadow duration-300', focusedField === 'email' && 'shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]')}>
                <Mail className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors', focusedField === 'email' ? 'text-primary' : 'text-muted-foreground')} />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className={cn('relative rounded-lg transition-shadow duration-300', focusedField === 'password' && 'shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]')}>
                <Lock className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors', focusedField === 'password' ? 'text-primary' : 'text-muted-foreground')} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="pl-10 pr-10 h-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!isLogin && (
                <div className="flex gap-1 mt-1.5">
                  {[1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className={cn(
                        'h-1.5 flex-1 rounded-full origin-left',
                        password.length >= i * 3
                          ? password.length >= 12 ? 'bg-income' : password.length >= 8 ? 'bg-warning' : 'bg-expense'
                          : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11 font-medium gap-2 text-sm" disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2.5 overflow-hidden"
              >
                {['Free 14-day trial', 'No credit card required', 'Cancel anytime'].map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-2.5 text-xs text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-income shrink-0" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-muted-foreground/60">
            <Shield className="h-3 w-3" />
            <span>256-bit encrypted · SOC 2 certified</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
