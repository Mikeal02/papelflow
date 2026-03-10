import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AnimatedLayout } from "@/components/layout/AnimatedLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import Budgets from "./pages/Budgets";
import Reports from "./pages/Reports";
import Subscriptions from "./pages/Subscriptions";
import Goals from "./pages/Goals";
import NetWorth from "./pages/NetWorth";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Categories from "./pages/Categories";
import DebtTracker from "./pages/DebtTracker";
import TaxEstimator from "./pages/TaxEstimator";
import Investments from "./pages/Investments";
import RecurringPayments from "./pages/RecurringPayments";
import Challenges from "./pages/Challenges";
import Analytics from "./pages/Analytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route element={<ProtectedRoute><AnimatedLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Index />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/net-worth" element={<NetWorth />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/debt" element={<DebtTracker />} />
                  <Route path="/recurring" element={<RecurringPayments />} />
                  <Route path="/tax" element={<TaxEstimator />} />
                  <Route path="/investments" element={<Investments />} />
                  <Route path="/challenges" element={<Challenges />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
