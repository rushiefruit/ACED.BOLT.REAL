import { useEffect } from 'react';
import {
  Bell, CheckCheck, Trash2, AlertCircle, Clock, BookOpen,
  Lightbulb, Trophy, Zap, Sparkles,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useTasks } from '../../hooks/useTasks';
import { useApp } from '../../contexts/AppContext';
import { generateSmartNotifications } from '../../lib/aiAdvisor';

const TYPE_META = {
  reminder:    { icon: Clock,       bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400'   },
  achievement: { icon: Trophy,      bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400'  },
  alert:       { icon: AlertCircle, bg: 'bg-rose-500/10',   border: 'border-rose-500/20',   text: 'text-rose-400'   },
  advice:      { icon: Lightbulb,   bg: 'bg-brand-500/10',  border: 'border-brand-500/20',  text: 'text-brand-400'  },
};

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const { notifications, unreadCount, loading, markRead, markAllRead, addNotification, deleteNotification, fetchNotifications } = useNotifications();
  const { tasks } = useTasks();
  const { setNotifCount } = useApp();

  useEffect(() => {
    setNotifCount(unreadCount);
  }, [unreadCount, setNotifCount]);

  const handleGenerate = async () => {
    const smartNotifs = generateSmartNotifications(tasks);
    for (const n of smartNotifs) {
      await addNotification({
        title: n.title,
        message: n.message,
        type: n.type,
        icon: n.icon,
        action_url: null,
      });
    }
    if (smartNotifs.length === 0) {
      await addNotification({
        title: 'All Clear!',
        message: 'No urgent tasks detected. Keep up the great work!',
        type: 'achievement',
        icon: 'check-circle',
        action_url: null,
      });
    }
    await fetchNotifications();
  };

  const unread = notifications.filter(n => !n.is_read);
  const read = notifications.filter(n => n.is_read);

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white mb-1">Smart Notifications</h2>
          <p className="text-surface-400 text-sm">Stay on top of deadlines and achievements with AI-powered alerts.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-ghost flex items-center gap-1.5 text-sm">
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
          <button onClick={handleGenerate} className="btn-primary flex items-center gap-1.5 text-sm">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Generate Alerts</span>
            <span className="sm:hidden">Scan</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Unread', value: unreadCount, icon: Bell, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Total', value: notifications.length, icon: Zap, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Alerts', value: notifications.filter(n => n.type === 'alert').length, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-xl font-display font-bold ${color}`}>{value}</div>
            <div className="text-xs text-surface-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bell className="w-12 h-12 text-surface-700 mx-auto mb-3" />
          <h3 className="font-display font-semibold text-surface-300 mb-1">No notifications yet</h3>
          <p className="text-surface-500 text-sm mb-4">Click "Generate Alerts" to get AI-powered reminders based on your tasks.</p>
          <button onClick={handleGenerate} className="btn-primary flex items-center gap-2 mx-auto">
            <Sparkles className="w-4 h-4" /> Generate Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {unread.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Unread</span>
                <span className="bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unread.length}
                </span>
              </div>
              {unread.map(notif => {
                const meta = TYPE_META[notif.type] ?? TYPE_META.reminder;
                const Icon = meta.icon;
                return (
                  <div
                    key={notif.id}
                    className={`glass-card p-4 flex items-start gap-3 border ${meta.border} cursor-pointer hover:opacity-90 transition-opacity`}
                    onClick={() => markRead(notif.id)}
                  >
                    <div className={`w-9 h-9 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${meta.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-surface-100 text-sm">{notif.title}</div>
                          {notif.message && (
                            <div className="text-xs text-surface-400 mt-0.5 leading-relaxed">{notif.message}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-surface-500">{timeAgo(notif.created_at)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); deleteNotification(notif.id); }}
                            className="text-surface-600 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1" />
                  </div>
                );
              })}
            </div>
          )}

          {read.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Read</span>
              {read.slice(0, 15).map(notif => {
                const meta = TYPE_META[notif.type] ?? TYPE_META.reminder;
                const Icon = meta.icon;
                return (
                  <div
                    key={notif.id}
                    className="glass-card p-4 flex items-start gap-3 opacity-60 hover:opacity-80 transition-opacity"
                  >
                    <div className={`w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-surface-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-surface-300 text-sm">{notif.title}</div>
                          {notif.message && (
                            <div className="text-xs text-surface-500 mt-0.5">{notif.message}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-surface-600">{timeAgo(notif.created_at)}</span>
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="text-surface-700 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Info card */}
      <div className="glass-card p-4 border border-surface-700/50">
        <div className="flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-surface-400 leading-relaxed">
            <span className="text-brand-400 font-medium">Pro tip:</span> Click "Generate Alerts" anytime to scan your tasks and get instant AI-powered reminders about overdue work, upcoming deadlines, and exam prep.
          </div>
        </div>
      </div>
    </div>
  );
}
