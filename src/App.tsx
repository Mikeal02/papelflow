import { lazy, Suspense } from 'react';
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
import { RouteLoadingFallback } from "@/components/ui/elite-skeleton";
import Auth from "./pages/Auth";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Reports = lazy(() => import("./pages/Reports"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Goals = lazy(() => import("./pages/Goals"));
const NetWorth = lazy(() => import("./pages/NetWorth"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Categories = lazy(() => import("./pages/Categories"));
const DebtTracker = lazy(() => import("./pages/DebtTracker"));
const TaxEstimator = lazy(() => import("./pages/TaxEstimator"));
const Investments = lazy(() => import("./pages/Investments"));
const RecurringPayments = lazy(() => import("./pages/RecurringPayments"));
const Challenges = lazy(() => import("./pages/Challenges"));
const Analytics = lazy(() => import("./pages/Analytics"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min stale time
      gcTime: 1000 * 60 * 10, // 10 min cache
      refetchOnWindowFocus: false,
    },
  },
});

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
                  <Route path="/" element={<Suspense fallback={<RouteLoadingFallback />}><Index /></Suspense>} />
                  <Route path="/transactions" element={<Suspense fallback={<RouteLoadingFallback />}><Transactions /></Suspense>} />
                  <Route path="/accounts" element={<Suspense fallback={<RouteLoadingFallback />}><Accounts /></Suspense>} />
                  <Route path="/budgets" element={<Suspense fallback={<RouteLoadingFallback />}><Budgets /></Suspense>} />
                  <Route path="/reports" element={<Suspense fallback={<RouteLoadingFallback />}><Reports /></Suspense>} />
                  <Route path="/subscriptions" element={<Suspense fallback={<RouteLoadingFallback />}><Subscriptions /></Suspense>} />
                  <Route path="/goals" element={<Suspense fallback={<RouteLoadingFallback />}><Goals /></Suspense>} />
                  <Route path="/net-worth" element={<Suspense fallback={<RouteLoadingFallback />}><NetWorth /></Suspense>} />
                  <Route path="/categories" element={<Suspense fallback={<RouteLoadingFallback />}><Categories /></Suspense>} />
                  <Route path="/debt" element={<Suspense fallback={<RouteLoadingFallback />}><DebtTracker /></Suspense>} />
                  <Route path="/recurring" element={<Suspense fallback={<RouteLoadingFallback />}><RecurringPayments /></Suspense>} />
                  <Route path="/tax" element={<Suspense fallback={<RouteLoadingFallback />}><TaxEstimator /></Suspense>} />
                  <Route path="/investments" element={<Suspense fallback={<RouteLoadingFallback />}><Investments /></Suspense>} />
                  <Route path="/challenges" element={<Suspense fallback={<RouteLoadingFallback />}><Challenges /></Suspense>} />
                  <Route path="/analytics" element={<Suspense fallback={<RouteLoadingFallback />}><Analytics /></Suspense>} />
                  <Route path="/settings" element={<Suspense fallback={<RouteLoadingFallback />}><Settings /></Suspense>} />
                </Route>
                <Route path="*" element={<Suspense fallback={<RouteLoadingFallback />}><NotFound /></Suspense>} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
