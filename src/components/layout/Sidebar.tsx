import { LayoutDashboard, CalendarDays, Brain, Trophy, Bell, User, LogOut, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useXP } from '../../hooks/useXP';

const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'planner',        label: 'Daily Planner', icon: CalendarDays },
  { id: 'advisor',        label: 'AI Advisor',   icon: Brain },
  { id: 'leaderboard',   label: 'Leaderboard',  icon: Trophy },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile',       label: 'Profile',       icon: User },
] as const;

export default function Sidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, notifCount } = useApp();
  const { profile, signOut } = useAuth();
  const { totalXP, getLevel, getLevelProgress, getLevelTitle } = useXP();

  const level = getLevel(totalXP);
  const progress = getLevelProgress(totalXP);

  const handleNav = (id: typeof NAV_ITEMS[number]['id']) => {
    setActiveView(id);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-white/10
        flex flex-col transition-transform duration-300 ease-out
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/Screenshot_2026-06-22_111038.png" alt="Aced" className="h-10 w-auto object-contain" />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-1.5 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User card */}
        <div className="p-4 mx-3 mt-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xl flex-shrink-0">
              {profile?.avatar_emoji ?? '🎓'}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-surface-100 text-sm truncate">{profile?.full_name ?? 'Student'}</div>
              <div className="text-xs text-surface-500">Level {level} · {getLevelTitle(level)}</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-surface-500">{totalXP} XP</span>
              <span className="text-xs text-brand-400">{progress}%</span>
            </div>
            <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-brand rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className={`nav-item w-full ${activeView === id ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {id === 'notifications' && notifCount > 0 && (
                <span className="bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <button onClick={signOut} className="nav-item nav-item-inactive w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
