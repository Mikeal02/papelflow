import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccounts } from '@/hooks/useAccounts';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Check localStorage for onboarding completion
    if (user) {
      const key = `onboarding_complete_${user.id}`;
      if (localStorage.getItem(key) === 'true') {
        setOnboardingDismissed(true);
      }
    }
  }, [user]);

  if (loading || accountsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show onboarding for new users (no accounts and not dismissed)
  const isNewUser = !onboardingDismissed && accounts && accounts.length === 0;
  if (isNewUser) {
    return (
      <OnboardingWizard
        onComplete={() => {
          localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
          setOnboardingDismissed(true);
        }}
      />
    );
  }

  return <>{children}</>;
}
