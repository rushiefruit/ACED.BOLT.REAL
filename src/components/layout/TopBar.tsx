import { Menu, Bell, Flame } from 'lucide-react';
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TopBar() {
  const { activeView, setSidebarOpen, notifCount, setActiveView } = useApp();
  const { profile } = useAuth();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayName = DAY_NAMES[now.getDay()];
  const monthName = MONTH_NAMES[now.getMonth()];
  const dateStr = `${dayName}, ${monthName} ${now.getDate()}`;

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

      <div className="flex items-center gap-3">
        {/* Current day */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/50">
          <span className="text-sm text-surface-300 font-medium">{dateStr}</span>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">{profile?.streak_count ?? 0}</span>
        </div>

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
