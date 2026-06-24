import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ActiveView = 'dashboard' | 'planner' | 'advisor' | 'leaderboard' | 'notifications' | 'profile';

interface AppContextValue {
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  notifCount: number;
  setNotifCount: (n: number) => void;
  xpAnimation: { show: boolean; amount: number };
  triggerXP: (amount: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [xpAnimation, setXpAnimation] = useState({ show: false, amount: 0 });

  const triggerXP = useCallback((amount: number) => {
    setXpAnimation({ show: true, amount });
    setTimeout(() => setXpAnimation({ show: false, amount: 0 }), 2200);
  }, []);

  return (
    <AppContext.Provider value={{
      activeView, setActiveView,
      sidebarOpen, setSidebarOpen,
      notifCount, setNotifCount,
      xpAnimation, triggerXP,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
