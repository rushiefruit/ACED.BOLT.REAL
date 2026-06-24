import { Menu, Bell } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  planner: 'Daily Planner',
  advisor: 'AI Advisor',
  leaderboard: 'Leaderboard',
  notifications: 'Notifications',
  profile: 'Profile',
};

export default function TopBar() {
  const { activeView, setSidebarOpen, notifCount, setActiveView } = useApp();
  const { profile } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-surface-950/80 backdrop-blur-sm border-b border-surface-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="btn-ghost p-2 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-surface-100 leading-none">{VIEW_TITLES[activeView]}</h1>
          {activeView === 'dashboard' && (
            <p className="text-xs text-surface-500 mt-0.5">{greeting}, {profile?.full_name?.split(' ')[0] ?? 'Student'}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile logo */}
        <div className="flex items-center mr-1 lg:hidden">
          <img src="/Screenshot_2026-06-22_111038.png" alt="Aced" className="h-8 w-auto object-contain" />
        </div>

        <button
          onClick={() => setActiveView('notifications')}
          className="relative btn-ghost p-2"
        >
          <Bell className="w-5 h-5" />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse-slow" />
          )}
        </button>
      </div>
    </header>
  );
}
