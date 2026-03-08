import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, TrendingUp, Shield, BarChart3, Wallet, Sparkles, PieChart, Target, Globe, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

const stats = [
  { value: '50K+', label: 'Active Users' },
  { value: '$2.4B', label: 'Tracked' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★', label: 'Rating' },
];

const features = [
  { icon: BarChart3, title: 'Smart Analytics', description: 'AI-powered insights and spending forecasts' },
  { icon: Shield, title: 'Bank-Level Security', description: '256-bit encryption & SOC 2 compliance' },
  { icon: Wallet, title: 'Multi-Account', description: 'Track bank, credit, investment & crypto' },
  { icon: PieChart, title: 'Budget Engine', description: 'Automated budgets with smart alerts' },
  { icon: Target, title: 'Goal Tracking', description: 'Savings goals with milestone tracking' },
  { icon: Globe, title: 'Multi-Currency', description: 'Support for 150+ global currencies' },
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
      {/* Global ambient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] bg-primary/[0.03] rounded-full blur-[120px] animate-float" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-accent/[0.03] rounded-full blur-[100px]" style={{ animationDelay: '3s', animationDuration: '20s' }} />
      </div>

      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden lg:flex lg:w-[55%] xl:w-1/2 relative p-8 xl:p-12 flex-col justify-between overflow-hidden aurora-bg"
      >
        <div className="absolute inset-0 subtle-grid opacity-30" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 mb-2"
          >
            <motion.div
              whileHover={{ rotate: [0, -5, 5, 0], scale: 1.05 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg"
              style={{ boxShadow: '0 8px 30px hsl(var(--primary) / 0.3)' }}
            >
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <div>
              <span className="text-2xl font-bold tracking-tight">Finflow</span>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Enterprise Finance Platform</p>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-4">
            <h1 className="text-3xl xl:text-5xl font-bold leading-tight tracking-tight">
              The most powerful way to
              <br />
              <span className="gradient-text">manage your finances</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
              Enterprise-grade financial management with AI-powered insights, real-time analytics, and institutional-quality tools — all in one platform.
            </p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-4 gap-3"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 + index * 0.08, type: 'spring', stiffness: 200 }}
                whileHover={{ y: -3, scale: 1.03 }}
                className="text-center p-3 rounded-xl frosted-glass"
              >
                <p className="text-lg font-bold text-primary">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.07 }}
                whileHover={{ x: 6, scale: 1.02 }}
                className="flex items-start gap-3 p-3 rounded-xl frosted-glass group cursor-default"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/25 group-hover:to-primary/10 transition-colors">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs">{feature.title}</h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="relative z-10 flex items-center justify-between text-xs text-muted-foreground"
        >
          <span>© 2026 Finflow. All rights reserved.</span>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>SOC 2 Type II Certified</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Panel - Form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex-1 flex items-center justify-center p-6 md:p-8 relative"
      >
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <motion.div
              whileHover={{ rotate: [0, -5, 5, 0] }}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg"
            >
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <span className="text-2xl font-bold">Finflow</span>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <AnimatePresence mode="wait">
              <motion.h2
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-2xl font-bold"
              >
                {isLogin ? 'Welcome back' : 'Create your account'}
              </motion.h2>
            </AnimatePresence>
            <p className="text-muted-foreground text-sm">{isLogin ? 'Sign in to access your financial dashboard' : 'Start your journey to financial freedom'}</p>
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

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button type="submit" className="w-full h-12 font-semibold gap-2 btn-premium text-base" disabled={loading}>
                {loading ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {['Free 14-day trial', 'No credit card required', 'Cancel anytime'].map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-income shrink-0" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center gap-2 pt-4 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>256-bit encrypted • SOC 2 certified</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
