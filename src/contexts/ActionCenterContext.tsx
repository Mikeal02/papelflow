import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface ActionCenterContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<ActionCenterContextValue | null>(null);

export function ActionCenterProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(o => !o), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return <Ctx.Provider value={{ open, setOpen, toggle }}>{children}</Ctx.Provider>;
}

export function useActionCenterUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActionCenterUI must be used within ActionCenterProvider');
  return v;
}
