import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PieChart,
  BarChart3,
  CalendarClock,
  Target,
  TrendingUp,
  Settings,
  Plus,
  LogOut,
  ChevronRight,
  Tag,
  CreditCard,
  Sparkles,
  Repeat,
  Briefcase,
  Sun,
  Moon,
  Trophy,
  Brain,
  Command,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { memo, useMemo, useCallback } from "react";
import { useThemeTransition } from "@/hooks/useThemeTransition";
import { Separator } from "@/components/ui/separator";
import { useRoutePreloader } from "@/hooks/useRoutePreloader";
import { ActionCenterTrigger } from "@/components/action-center/ActionCenterTrigger";

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: Brain, label: "Analytics", path: "/analytics", badge: "NEW" },
      { icon: BarChart3, label: "Reports", path: "/reports" },
      { icon: Target, label: "Financial Profile", path: "/profile" },
    ],
  },
  {
    label: "Money",
    items: [
      { icon: ArrowLeftRight, label: "Transactions", path: "/transactions" },
      { icon: Wallet, label: "Accounts", path: "/accounts" },
      { icon: PieChart, label: "Budgets", path: "/budgets" },
      { icon: Tag, label: "Categories", path: "/categories" },
    ],
  },
  {
    label: "Planning",
    items: [
      { icon: Target, label: "Goals", path: "/goals" },
      { icon: TrendingUp, label: "Net Worth", path: "/net-worth" },
      { icon: CalendarClock, label: "Subscriptions", path: "/subscriptions" },
      { icon: Repeat, label: "Recurring", path: "/recurring" },
    ],
  },
  {
    label: "Advanced",
    items: [
      { icon: CreditCard, label: "Debt Tracker", path: "/debt" },
      { icon: Sparkles, label: "Tax Estimator", path: "/tax" },
      { icon: Briefcase, label: "Investments", path: "/investments" },
      { icon: Trophy, label: "Challenges", path: "/challenges" },
    ],
  },
];

interface SidebarProps {
  onAddTransaction: () => void;
}

const NavItem = memo(function NavItem({
  item,
  isActive,
  onPrefetch,
}: {
  item: { icon: any; label: string; path: string; badge?: string };
  isActive: boolean;
  onPrefetch: (path: string) => void;
}) {
  return (
    <Link
      to={item.path}
      aria-current={isActive ? "page" : undefined}
      onMouseEnter={() => onPrefetch(item.path)}
      onFocus={() => onPrefetch(item.path)}
      className="block rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
    >
      <div
        className={cn(
          "group relative flex items-center gap-2.5 overflow-hidden rounded-[10px] py-[7px] pl-2.5 pr-3 text-[13px] font-medium transition-[color,background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-[2px] active:translate-x-0 active:scale-[0.99]",
          isActive
            ? "bg-gradient-to-r from-primary/[0.12] via-primary/[0.05] to-transparent text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/45",
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute right-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.45)]"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] transition-colors duration-150",
            isActive
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground/80 group-hover:bg-foreground/[0.05] group-hover:text-foreground",
          )}
        >
          <item.icon className="h-[15px] w-[15px]" />
        </span>
        <span className="flex-1 truncate tracking-[-0.01em]">{item.label}</span>
        {item.badge ? (
          <Badge
            variant="secondary"
            className="h-[17px] border-0 bg-primary/10 px-1.5 text-[9px] font-semibold tracking-[0.08em] text-primary"
          >
            {item.badge}
          </Badge>
        ) : (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground/40 opacity-0 transition-all duration-150",
              "group-hover:translate-x-0 group-hover:opacity-100",
              isActive && "hidden",
            )}
          />
        )}
      </div>
    </Link>
  );
});

export const Sidebar = memo(function Sidebar({
  onAddTransaction,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useThemeTransition();
  const { prefetchRoute } = useRoutePreloader();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const userInitial = useMemo(() => {
    return user?.email?.charAt(0).toUpperCase() || "?";
  }, [user?.email]);

  return (
    <aside className="fixed left-0 top-0 z-40 h-dvh w-64 overflow-hidden border-r border-border/50 bg-sidebar">
      {/* Ambient wash — keeps the rail from reading as a flat slab */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(120% 45% at 0% 0%, hsl(var(--primary) / 0.06), transparent 60%)",
        }}
      />
      <div className="relative flex h-full flex-col">
        {/* Brand */}
        <div className="flex h-[60px] shrink-0 items-center gap-3 px-5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[11px] shadow-[var(--shadow-xs)] ring-1 ring-border/60">
            <img
              src="/logo.png"
              alt="Finflow"
              className="h-full w-full object-contain"
              loading="eager"
            />
          </div>
          <div className="min-w-0 leading-none">
            <span className="text-[15px] font-semibold tracking-[-0.02em]">
              Finflow
            </span>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              Pro
            </p>
          </div>
        </div>

        <hr className="divider-soft mx-4" />

        {/* Quick Actions */}
        <div className="shrink-0 space-y-1.5 px-3 pb-1 pt-3">
          <Button
            onClick={onAddTransaction}
            className="h-9 w-full gap-2 rounded-[10px] text-[13px] font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            New Transaction
          </Button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true }),
                )
              }
              className="flex flex-1 items-center gap-2 rounded-[10px] border border-border/50 bg-background/40 px-2.5 py-[7px] text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
            >
              <Command className="h-3 w-3" />
              <span>Search</span>
              <kbd className="pointer-events-none ml-auto inline-flex h-[16px] select-none items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1 font-mono text-[9px] font-medium text-muted-foreground/70">
                ⌘K
              </kbd>
            </button>
            <ActionCenterTrigger />
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="sidebar-scrollbar scroll-fade-y flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 flex items-center gap-2 px-2.5">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
                  {group.label}
                </p>
                <span aria-hidden className="h-px flex-1 bg-border/40" />
              </div>
              <div className="space-y-[3px]">
                {group.items.map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={location.pathname === item.path}
                    onPrefetch={prefetchRoute}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/40 p-3 space-y-1">
          {/* Theme Toggle */}
          <button
            onClick={() => toggleTheme()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            {theme === "dark" ? (
              <Moon className="h-[15px] w-[15px]" />
            ) : (
              <Sun className="h-[15px] w-[15px]" />
            )}
            <span>{theme === "dark" ? "Dark" : "Light"} Mode</span>
            <div className="ml-auto relative h-5 w-9 rounded-full bg-muted border border-border/50 transition-colors">
              <motion.div
                className="absolute top-[3px] h-[14px] w-[14px] rounded-full bg-foreground/80 shadow-sm"
                animate={{ left: theme === "dark" ? "16px" : "3px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </div>
          </button>

          {/* User Card */}
          {user && (
            <div className="mx-1 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                  <span className="text-[11px] font-semibold text-primary-foreground">
                    {userInitial}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">
                    {user.email?.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 pt-0.5">
            <Link to="/settings" className="flex-1">
              <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                <Settings className="h-[15px] w-[15px]" />
                Settings
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-destructive/8 hover:text-destructive transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
});
