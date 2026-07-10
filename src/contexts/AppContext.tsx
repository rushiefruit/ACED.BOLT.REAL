import { createContext, useContext, useState, type ReactNode } from 'react';

type ActiveView = 'dashboard' | 'planner' | 'leaderboard' | 'notifications' | 'profile' | 'notes' | 'chat';

interface AppContextValue {
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  notifCount: number;
  setNotifCount: (n: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  return (
    <AppContext.Provider value={{
      activeView, setActiveView,
      sidebarOpen, setSidebarOpen,
      notifCount, setNotifCount,
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
