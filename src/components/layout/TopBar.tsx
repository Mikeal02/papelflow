import { memo, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataPipelineIndicator } from "@/components/data/DataPipelineIndicator";

const ROUTE_META: Record<string, { title: string; sub?: string }> = {
  "/": { title: "Dashboard", sub: "Portfolio Overview" },
  "/analytics": { title: "Analytics", sub: "Intelligence" },
  "/reports": { title: "Reports", sub: "Statements" },
  "/profile": { title: "Financial Profile", sub: "Full picture" },
  "/transactions": { title: "Transactions", sub: "Ledger" },
  "/accounts": { title: "Accounts", sub: "Balances" },
  "/budgets": { title: "Budgets", sub: "Allocation" },
  "/categories": { title: "Categories", sub: "Taxonomy" },
  "/goals": { title: "Goals", sub: "Targets" },
  "/net-worth": { title: "Net Worth", sub: "Trajectory" },
  "/subscriptions": { title: "Subscriptions", sub: "Recurring spend" },
  "/recurring": { title: "Recurring", sub: "Automation" },
  "/debt": { title: "Debt Tracker", sub: "Payoff plan" },
  "/tax": { title: "Tax Estimator", sub: "Projections" },
  "/investments": { title: "Investments", sub: "Portfolio" },
  "/challenges": { title: "Challenges", sub: "Progress" },
  "/calendar": { title: "Calendar", sub: "Temporal console" },
  "/settings": { title: "Settings", sub: "Preferences" },
};

interface TopBarProps {
  onAddTransaction: () => void;
}

export const TopBar = memo(function TopBar({ onAddTransaction }: TopBarProps) {
  const { pathname } = useLocation();
  const meta = useMemo(
    () => ROUTE_META[pathname] ?? { title: "Finflow" },
    [pathname],
  );

  return (
    <header className="topbar">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/"
          aria-label="Finflow dashboard"
          className="topbar-mark hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-[10px] font-semibold text-primary sm:flex"
        >
          F
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {meta.title}
          </p>
          {meta.sub && (
            <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
              {meta.sub}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <DataPipelineIndicator />
        <span aria-hidden className="h-5 w-px bg-border/60" />
        <Button
          size="sm"
          onClick={onAddTransaction}
          className="h-8 gap-1.5 rounded-md px-3 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          New Transaction
        </Button>
      </div>
    </header>
  );
});
