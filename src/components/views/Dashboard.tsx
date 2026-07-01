import { useMemo } from 'react';
import {
  CheckCircle2, Clock, Flame, BookOpen, CalendarDays,
  Trophy, TrendingUp, ArrowRight, Circle, Brain,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useTasks } from '../../hooks/useTasks';
import { useEvents } from '../../hooks/useEvents';

const TASK_TYPE_COLORS: Record<string, string> = {
  exam:     'text-rose-400',
  homework: 'text-blue-400',
  study:    'text-brand-400',
  project:  'text-purple-400',
  reading:  'text-amber-400',
};

const TASK_TYPE_BG: Record<string, string> = {
  exam:     'bg-rose-500/10 border-rose-500/20',
  homework: 'bg-blue-500/10 border-blue-500/20',
  study:    'bg-brand-500/10 border-brand-500/20',
  project:  'bg-purple-500/10 border-purple-500/20',
  reading:  'bg-amber-500/10 border-amber-500/20',
};

export default function Dashboard() {
  const { profile } = useAuth();
  const { setActiveView } = useApp();
  const { tasks, toggleTaskComplete } = useTasks();
  const { events } = useEvents();

  const today = new Date();
  const todayStr = today.toDateString();

  const stats = useMemo(() => {
    const pending = tasks.filter(t => t.status !== 'completed');
    const completed = tasks.filter(t => t.status === 'completed');
    const overdue = pending.filter(t => new Date(t.due_date) < today);
    const dueSoon = pending.filter(t => {
      const days = Math.ceil((new Date(t.due_date).getTime() - today.getTime()) / 86400000);
      return days >= 0 && days <= 3;
    });
    return { pending: pending.length, completed: completed.length, overdue: overdue.length, dueSoon: dueSoon.length };
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayEvents = useMemo(() =>
    events.filter(e => new Date(e.start_time).toDateString() === todayStr)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  , [events, todayStr]);

  const upcomingTasks = useMemo(() =>
    tasks
      .filter(t => t.status !== 'completed')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5)
  , [tasks]);

  const handleComplete = async (taskId: string) => {
    await toggleTaskComplete(taskId, false);
  };

  const formatDue = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) return { label: 'Overdue', color: 'text-rose-400' };
    if (diffDays === 0) return { label: 'Today', color: 'text-amber-400' };
    if (diffDays === 1) return { label: 'Tomorrow', color: 'text-amber-300' };
    return { label: `${diffDays}d`, color: 'text-surface-400' };
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Welcome card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 border border-brand-500/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white translate-x-1/3 -translate-y-1/2" />
          <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full bg-white translate-y-1/2" />
        </div>
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-brand-200 text-sm font-medium mb-1">Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</div>
              <div className="text-white text-2xl font-display font-bold">{stats.completed} tasks completed</div>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5">
              <Flame className="w-4 h-4 text-amber-300" />
              <span className="text-white font-bold text-sm">{profile?.streak_count ?? 0} day streak</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-brand-200 text-xs">{stats.pending} tasks remaining</span>
              <span className="text-white text-xs font-semibold">{stats.overdue} overdue</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${stats.completed + stats.pending > 0 ? Math.round((stats.completed / (stats.completed + stats.pending)) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Due Soon', value: stats.dueSoon, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Overdue', value: stats.overdue, icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Today Events', value: todayEvents.length, icon: CalendarDays, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card p-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-2xl font-display font-bold ${color} mb-0.5`}>{value}</div>
            <div className="text-xs text-surface-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Upcoming tasks */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-400" />
              <h3 className="font-display font-semibold text-surface-100">Upcoming Tasks</h3>
            </div>
            <button onClick={() => setActiveView('planner')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-brand-400 mx-auto mb-2" />
              <p className="text-surface-400 text-sm">All caught up! Great work.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map(task => {
                const due = formatDue(task.due_date);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/30 hover:border-surface-600 transition-all group"
                  >
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="w-5 h-5 rounded-full border-2 border-surface-600 group-hover:border-brand-500 flex items-center justify-center flex-shrink-0 transition-all hover:bg-brand-500/20"
                    >
                      <Circle className="w-3 h-3 text-surface-600 group-hover:text-brand-400" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-surface-200 truncate">{task.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.subject && (
                          <span className="text-xs text-surface-500">{task.subject.name}</span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-md border ${TASK_TYPE_BG[task.type]} ${TASK_TYPE_COLORS[task.type]}`}>
                          {task.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs font-semibold ${due.color}`}>{due.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's schedule */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-400" />
              <h3 className="font-display font-semibold text-surface-100">Today's Schedule</h3>
            </div>
            <button onClick={() => setActiveView('planner')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              Add event <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {todayEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="w-10 h-10 text-surface-600 mx-auto mb-2" />
              <p className="text-surface-400 text-sm">No events scheduled today.</p>
              <button onClick={() => setActiveView('planner')} className="text-xs text-brand-400 mt-1 hover:text-brand-300 transition-colors">
                Add one now
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/30"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-200 truncate">{event.title}</div>
                    {event.location && (
                      <div className="text-xs text-surface-500 truncate">{event.location}</div>
                    )}
                  </div>
                  <div className="text-xs text-surface-400 flex-shrink-0">
                    {formatTime(event.start_time)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-surface-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Study Plan', icon: Brain, color: 'text-brand-400', bg: 'bg-brand-500/10 hover:bg-brand-500/20 border-brand-500/20', view: 'advisor' as const },
            { label: 'Add Task', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20', view: 'planner' as const },
            { label: 'Leaderboard', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20', view: 'leaderboard' as const },
          ].map(({ label, icon: Icon, color, bg, view }) => (
            <button
              key={label}
              onClick={() => setActiveView(view)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${bg} active:scale-95`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className={`text-xs font-medium ${color}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
