import { memo, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { Plus, Slash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataPipelineIndicator } from "@/components/data/DataPipelineIndicator";

const ROUTE_META: Record<string, { title: string; sub?: string }> = {
  "/": { title: "Dashboard", sub: "Portfolio Overview" },
  "/analytics": { title: "Analytics", sub: "Intelligence" },
  "/reports": { title: "Reports", sub: "Statements" },
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
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-[13px]"
      >
        <Link
          to="/"
          className="shrink-0 text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          Finflow
        </Link>
        <Slash
          aria-hidden
          className="h-3 w-3 shrink-0 -rotate-12 text-border"
          strokeWidth={1.5}
        />
        <span className="truncate font-medium tracking-[-0.01em] text-foreground">
          {meta.title}
        </span>
        {meta.sub && (
          <>
            <Slash
              aria-hidden
              className="hidden h-3 w-3 shrink-0 -rotate-12 text-border sm:block"
              strokeWidth={1.5}
            />
            <span className="hidden truncate text-muted-foreground/70 sm:block">
              {meta.sub}
            </span>
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-2.5">
        <DataPipelineIndicator />
        <span aria-hidden className="h-5 w-px bg-border/60" />
        <Button
          size="sm"
          onClick={onAddTransaction}
          className="h-8 gap-1.5 rounded-[9px] px-3 text-[12.5px] font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          New Transaction
        </Button>
      </div>
    </header>
  );
});
