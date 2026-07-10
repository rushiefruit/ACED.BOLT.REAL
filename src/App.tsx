import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import AuthPage from './components/auth/AuthPage';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './components/views/Dashboard';
import Planner from './components/views/Planner';
import Advisor from './components/views/Advisor';
import Leaderboard from './components/views/Leaderboard';
import Notifications from './components/views/Notifications';
import Profile from './components/views/Profile';
import NotesDigestor from './components/views/NotesDigestor';

function NotifSync() {
  const { unreadCount, fetchNotifications } = useNotifications();
  const { setNotifCount } = useApp();
  const { user } = useAuth();

  useEffect(() => { setNotifCount(unreadCount); }, [unreadCount, setNotifCount]);

  useEffect(() => {
    if (!user) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-reminders`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    })
      .then(() => fetchNotifications())
      .catch(() => {});
  }, [user, fetchNotifications]);

  return null;
}

function AppShell() {
  const { user, loading } = useAuth();
  const { activeView } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center animate-pulse-slow shadow-brand">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-surface-400 text-sm">Loading Aced...</div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen bg-surface-950 flex">
      <NotifSync />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {activeView === 'dashboard'     && <Dashboard />}
          {activeView === 'planner'       && <Planner />}
          {activeView === 'advisor'       && <Advisor />}
          {activeView === 'leaderboard'   && <Leaderboard />}
          {activeView === 'notifications' && <Notifications />}
          {activeView === 'notes'         && <NotesDigestor />}
          {activeView === 'profile'       && <Profile />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AuthProvider>
  );
}
