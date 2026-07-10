import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Trash2, CheckCircle2, Circle, BookOpen, CalendarDays, X,
  ChevronLeft, ChevronRight, Filter, Edit3, RefreshCw, CheckCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';
import { useEvents } from '../../hooks/useEvents';
import { useSubjects } from '../../hooks/useSubjects';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import type { Task, TaskType, TaskPriority, EventType } from '../../types';

const TASK_TYPE_META: Record<TaskType, { label: string; color: string; bg: string }> = {
  exam:     { label: 'Exam',     color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20' },
  homework: { label: 'Homework', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  study:    { label: 'Study',    color: 'text-brand-400',  bg: 'bg-brand-500/10 border-brand-500/20' },
  project:  { label: 'Project',  color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  reading:  { label: 'Reading',  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  high:   { label: 'High',   color: 'text-rose-400' },
  medium: { label: 'Medium', color: 'text-amber-400' },
  low:    { label: 'Low',    color: 'text-brand-400' },
};

const EVENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#f43f5e', '#06b6d4', '#ec4899'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtHour(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

type CalView = 'day' | 'week' | 'month';

export default function Planner() {
  const { user } = useAuth();
  const { tasks, toggleTaskComplete, addTask, updateTask, deleteTask } = useTasks();
  const { events, addEvent, deleteEvent } = useEvents();
  const { subjects, addSubject } = useSubjects();
  const [gcalStatus, setGcalStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [gcalMessage, setGcalMessage] = useState('');

  const [tab, setTab] = useState<'tasks' | 'calendar' | 'events'>('tasks');
  const [calView, setCalView] = useState<CalView>('month');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [taskForm, setTaskForm] = useState({
    title: '', description: '', type: 'homework' as TaskType,
    due_date: '', priority: 'medium' as TaskPriority,
    estimated_minutes: 30, subject_id: '',
  });

  const [eventForm, setEventForm] = useState({
    title: '', type: 'activity' as EventType,
    start_time: '', end_time: '', location: '', color: EVENT_COLORS[0],
  });

  const [subjectForm, setSubjectForm] = useState({ name: '', color: '#3b82f6', teacher: '' });
  const [saving, setSaving] = useState(false);

  // Handle Google Calendar OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get('gcal');
    const msg = params.get('gcal_msg');
    if (gcal === 'success') {
      setGcalStatus('success');
      setGcalMessage(msg ?? 'Google Calendar synced!');
      setTab('calendar');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setGcalStatus('idle'), 6000);
    } else if (gcal === 'error') {
      setGcalStatus('error');
      setGcalMessage(msg ?? 'Connection failed');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setGcalStatus('idle'), 6000);
    }
  }, []);

  const handleConnectGoogleCalendar = async () => {
    if (!user) return;
    setGcalStatus('connecting');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setGcalStatus('error');
      setGcalMessage(String(err));
      setTimeout(() => setGcalStatus('idle'), 6000);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      return true;
    });
  }, [tasks, filterStatus, filterType]);

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    await toggleTaskComplete(id, isCompleted);
  };

  const openAddTaskModal = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', type: 'homework', due_date: '', priority: 'medium', estimated_minutes: 30, subject_id: '' });
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description ?? '',
      type: task.type,
      due_date: task.due_date.slice(0, 16),
      priority: task.priority,
      estimated_minutes: task.estimated_minutes,
      subject_id: task.subject_id ?? '',
    });
    setShowTaskModal(true);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editingTask) {
      await updateTask(editingTask.id, { ...taskForm, subject_id: taskForm.subject_id || null });
    } else {
      await addTask({ ...taskForm, subject_id: taskForm.subject_id || null, status: 'pending' });
    }
    setShowTaskModal(false);
    setEditingTask(null);
    setTaskForm({ title: '', description: '', type: 'homework', due_date: '', priority: 'medium', estimated_minutes: 30, subject_id: '' });
    setSaving(false);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await addEvent({ ...eventForm, is_recurring: false });
    setShowEventModal(false);
    setEventForm({ title: '', type: 'activity', start_time: '', end_time: '', location: '', color: EVENT_COLORS[0] });
    setSaving(false);
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await addSubject({ name: subjectForm.name, color: subjectForm.color, teacher: subjectForm.teacher || null });
    setShowSubjectModal(false);
    setSubjectForm({ name: '', color: '#3b82f6', teacher: '' });
    setSaving(false);
  };

  // --- Calendar nav ---
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const today = new Date();
  const weekStart = startOfWeek(calDate);

  const navigatePrev = () => {
    if (calView === 'month') setCalDate(new Date(calYear, calMonth - 1, 1));
    else if (calView === 'week') setCalDate(addDays(calDate, -7));
    else setCalDate(addDays(calDate, -1));
  };

  const navigateNext = () => {
    if (calView === 'month') setCalDate(new Date(calYear, calMonth + 1, 1));
    else if (calView === 'week') setCalDate(addDays(calDate, 7));
    else setCalDate(addDays(calDate, 1));
  };

  const navigateToday = () => setCalDate(new Date());

  const calTitle = () => {
    if (calView === 'month') return `${MONTH_NAMES[calMonth]} ${calYear}`;
    if (calView === 'week') {
      const end = addDays(weekStart, 6);
      if (weekStart.getMonth() === end.getMonth())
        return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${end.getDate()}, ${weekStart.getFullYear()}`;
      return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${weekStart.getFullYear()}`;
    }
    return calDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getItemsForDay = (date: Date) => {
    const dayTasks = tasks.filter(t => isSameDay(new Date(t.due_date), date));
    const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), date));
    return { dayTasks, dayEvents };
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex bg-surface-900 border border-surface-800 rounded-xl p-1 gap-0.5">
          {(['tasks', 'calendar', 'events'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-all duration-200 ${
                tab === t ? 'bg-brand-500 text-white shadow-brand' : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              {t === 'tasks' ? 'Tasks' : t === 'calendar' ? 'Calendar' : 'Events'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab !== 'calendar' && (
            <button
              onClick={() => tab === 'tasks' ? openAddTaskModal() : setShowEventModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add {tab === 'tasks' ? 'Task' : 'Event'}
            </button>
          )}
          {tab === 'tasks' && (
            <button onClick={() => setShowSubjectModal(true)} className="btn-secondary text-sm flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Subjects</span>
            </button>
          )}
        </div>
      </div>

      {/* Tasks tab */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-surface-500" />
            <div className="flex gap-1 flex-wrap">
              {(['all', 'pending', 'completed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === s
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface-800 text-surface-400 hover:text-surface-200 border border-transparent'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap ml-1">
              {(['all', 'exam', 'homework', 'study', 'project', 'reading'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    filterType === t
                      ? 'bg-surface-700 text-surface-100 border border-surface-600'
                      : 'bg-surface-900 text-surface-500 hover:text-surface-300 border border-surface-800'
                  }`}
                >
                  {t === 'all' ? 'All Types' : TASK_TYPE_META[t as TaskType].label}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No tasks found"
              description="Add your first task to get started organizing your academic life."
              action={
                <button onClick={() => openAddTaskModal()} className="btn-primary flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => {
                const meta = TASK_TYPE_META[task.type];
                const pri = PRIORITY_META[task.priority];
                const isCompleted = task.status === 'completed';
                const dueDate = new Date(task.due_date);
                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
                const isOverdue = diffDays < 0 && !isCompleted;

                return (
                  <div
                    key={task.id}
                    className={`glass-card p-4 flex items-start gap-3 transition-all cursor-pointer hover:border-surface-600 ${isCompleted ? 'opacity-60' : ''}`}
                    onClick={() => openEditTaskModal(task)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id, isCompleted); }}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isCompleted
                          ? 'border-brand-500 bg-brand-500/20 hover:border-surface-600 hover:bg-surface-800'
                          : 'border-surface-600 hover:border-brand-500 hover:bg-brand-500/10'
                      }`}
                    >
                      {isCompleted
                        ? <CheckCircle2 className="w-4 h-4 text-brand-400" />
                        : <Circle className="w-3 h-3 text-surface-600" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isCompleted ? 'line-through text-surface-500' : 'text-surface-100'}`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-surface-500 mt-0.5 line-clamp-1">{task.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`badge border ${meta.bg} ${meta.color}`}>{meta.label}</span>
                        <span className={`text-xs font-medium ${pri.color}`}>{pri.label}</span>
                        {task.subject && <span className="text-xs text-surface-500">{task.subject.name}</span>}
                        <span className="text-xs text-surface-500">{task.estimated_minutes}m</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-semibold ${
                        isOverdue ? 'text-rose-400' :
                        diffDays === 0 ? 'text-amber-400' :
                        diffDays === 1 ? 'text-amber-300' :
                        'text-surface-400'
                      }`}>
                        {isCompleted ? 'Done' :
                         isOverdue ? 'Overdue' :
                         diffDays === 0 ? 'Today' :
                         diffDays === 1 ? 'Tomorrow' :
                         `${diffDays}d left`}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-surface-600 hover:text-rose-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openEditTaskModal(task); }} className="text-surface-600 hover:text-brand-400 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Calendar tab */}
      {tab === 'calendar' && (
        <div className="glass-card overflow-hidden">
          {/* Calendar toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
            <div className="flex items-center gap-2">
              <button onClick={navigatePrev} className="btn-ghost p-2">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={navigateNext} className="btn-ghost p-2">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={navigateToday} className="btn-ghost text-xs px-3 py-1.5 ml-1">
                Today
              </button>
              <h3 className="font-display font-semibold text-surface-100 ml-2 text-sm sm:text-base">
                {calTitle()}
              </h3>
            </div>
            {/* Google Calendar connect */}
            <div className="flex items-center gap-2">
              {gcalStatus === 'success' && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {gcalMessage}
                </div>
              )}
              {gcalStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                  {gcalMessage}
                </div>
              )}
              <button
                onClick={handleConnectGoogleCalendar}
                disabled={gcalStatus === 'connecting'}
                className="btn-secondary flex items-center gap-2 text-xs px-3 py-1.5 disabled:opacity-60"
              >
                {gcalStatus === 'connecting' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {gcalStatus === 'connecting' ? 'Connecting...' : 'Sync Google Calendar'}
              </button>
            </div>

            {/* View switcher */}
            <div className="flex bg-surface-900 border border-surface-700 rounded-lg p-0.5 gap-0.5">
              {(['day', 'week', 'month'] as CalView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setCalView(v)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all duration-200 ${
                    calView === v
                      ? 'bg-surface-700 text-surface-100'
                      : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Month view */}
          {calView === 'month' && (
            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {DAY_ABBR.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-surface-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[84px]" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(calYear, calMonth, day);
                  const { dayTasks, dayEvents } = getItemsForDay(date);
                  const isToday = isSameDay(date, today);
                  const isSelected = selectedDay ? isSameDay(date, selectedDay) : false;
                  const items = [
                    ...dayEvents.map(e => ({ id: e.id, label: e.title, color: e.color, done: false })),
                    ...dayTasks.map(t => ({
                      id: t.id, label: t.title,
                      color: t.status === 'completed' ? '#475569' : t.type === 'exam' ? '#f43f5e' : '#f59e0b',
                      done: t.status === 'completed',
                    })),
                  ];
                  const shown = items.slice(0, 2);
                  const overflow = items.length - shown.length;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : date)}
                      className={`min-h-[84px] p-1.5 rounded-lg flex flex-col items-stretch justify-start transition-all border text-left ${
                        isSelected
                          ? 'bg-brand-500/25 border-brand-500 ring-1 ring-brand-500/40'
                          : isToday
                            ? 'bg-brand-500/15 border-brand-500/40 hover:bg-brand-500/25'
                            : 'border-transparent hover:border-surface-700 hover:bg-surface-800/60'
                      }`}
                    >
                      <span className={`text-xs font-medium mb-1 self-end ${isSelected ? 'text-brand-200' : isToday ? 'text-brand-300' : 'text-surface-300'}`}>
                        {day}
                      </span>
                      <div className="space-y-1 overflow-hidden">
                        {shown.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight truncate bg-surface-900/60"
                            title={item.label}
                          >
                            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className={`truncate ${item.done ? 'line-through text-surface-600' : 'text-surface-200'}`}>{item.label}</span>
                          </div>
                        ))}
                        {overflow > 0 && <div className="text-[10px] text-surface-500 px-1">+{overflow} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-surface-800">
                {[
                  { color: 'bg-rose-500', label: 'Exam' },
                  { color: 'bg-amber-400', label: 'Task' },
                  { color: 'bg-slate-500', label: 'Completed' },
                  { color: 'bg-blue-500', label: 'Event' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-surface-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week view */}
          {calView === 'week' && (
            <WeekView
              weekStart={weekStart}
              tasks={tasks}
              events={events}
              today={today}
              onDayClick={(date) => setSelectedDay(isSameDay(date, selectedDay ?? new Date(0)) ? null : date)}
              selectedDay={selectedDay}
            />
          )}

          {/* Day view */}
          {calView === 'day' && (
            <DayView
              date={calDate}
              tasks={tasks}
              events={events}
              today={today}
            />
          )}
        </div>
      )}

      {/* Day detail panel (month + week views) */}
      {tab === 'calendar' && selectedDay !== null && calView !== 'day' && (
        <DayDetailPanel
          date={selectedDay}
          tasks={tasks.filter(t => isSameDay(new Date(t.due_date), selectedDay))}
          events={events.filter(e => isSameDay(new Date(e.start_time), selectedDay))}
          subjects={subjects}
          onClose={() => setSelectedDay(null)}
          onAddTask={(payload) => { addTask(payload); }}
          onAddEvent={(payload) => { addEvent(payload); }}
          onToggleTask={(id, isCompleted) => toggleTaskComplete(id, isCompleted)}
          onDeleteTask={(id) => deleteTask(id)}
          onDeleteEvent={(id) => deleteEvent(id)}
        />
      )}

      {/* Events tab */}
      {tab === 'events' && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No events yet"
              description="Add classes, sports, clubs, and activities to your calendar."
              action={
                <button onClick={() => setShowEventModal(true)} className="btn-primary flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Event
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {events.map(event => (
                <div key={event.id} className="glass-card p-4 flex items-center gap-3">
                  <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-surface-100 text-sm">{event.title}</div>
                    <div className="text-xs text-surface-500 mt-0.5">
                      {new Date(event.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {event.location && <div className="text-xs text-surface-500">{event.location}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="badge bg-surface-800 text-surface-400 border border-surface-700 capitalize">{event.type}</span>
                    <button onClick={() => deleteEvent(event.id)} className="text-surface-600 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal open={showTaskModal} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} title={editingTask ? 'Edit Task' : 'Add New Task'}>
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Task Title *</label>
            <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Math homework ch. 5" className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Type</label>
              <select value={taskForm.type} onChange={e => setTaskForm(p => ({ ...p, type: e.target.value as TaskType }))} className="select-field">
                {Object.entries(TASK_TYPE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Priority</label>
              <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value as TaskPriority }))} className="select-field">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Due Date *</label>
              <input type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Est. Minutes</label>
              <input type="number" value={taskForm.estimated_minutes} onChange={e => setTaskForm(p => ({ ...p, estimated_minutes: Number(e.target.value) }))} min={5} max={480} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Subject</label>
            <select value={taskForm.subject_id} onChange={e => setTaskForm(p => ({ ...p, subject_id: e.target.value }))} className="select-field">
              <option value="">No subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Notes (optional)</label>
            <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} placeholder="Any additional details..." rows={2} className="input-field resize-none" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
          </button>
        </form>
      </Modal>

      {/* Add Event Modal */}
      <Modal open={showEventModal} onClose={() => setShowEventModal(false)} title="Add Event">
        <form onSubmit={handleAddEvent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Event Title *</label>
            <input value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Soccer practice" className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Type</label>
              <select value={eventForm.type} onChange={e => setEventForm(p => ({ ...p, type: e.target.value as EventType }))} className="select-field">
                <option value="class">Class</option>
                <option value="activity">Activity</option>
                <option value="sport">Sport</option>
                <option value="club">Club</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Color</label>
              <div className="flex items-center gap-2 mt-1">
                {EVENT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setEventForm(p => ({ ...p, color: c }))}
                    className={`w-6 h-6 rounded-full transition-all ${eventForm.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-900' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Start *</label>
              <input type="datetime-local" value={eventForm.start_time} onChange={e => setEventForm(p => ({ ...p, start_time: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">End *</label>
              <input type="datetime-local" value={eventForm.end_time} onChange={e => setEventForm(p => ({ ...p, end_time: e.target.value }))} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Location (optional)</label>
            <input value={eventForm.location} onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Gym, Room 204" className="input-field" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Adding...' : 'Add Event'}</button>
        </form>
      </Modal>

      {/* Subject Modal */}
      <Modal open={showSubjectModal} onClose={() => setShowSubjectModal(false)} title="Manage Subjects">
        <div className="space-y-4">
          <div className="space-y-2">
            {subjects.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-4">No subjects yet. Add one below.</p>
            ) : (
              subjects.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-800 border border-surface-700">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 text-sm text-surface-200">{s.name}</span>
                  {s.teacher && <span className="text-xs text-surface-500">{s.teacher}</span>}
                </div>
              ))
            )}
          </div>
          <hr className="border-surface-800" />
          <form onSubmit={handleAddSubject} className="space-y-3">
            <h4 className="text-sm font-semibold text-surface-300">Add Subject</h4>
            <input value={subjectForm.name} onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))} placeholder="Subject name (e.g. Biology)" className="input-field" required />
            <input value={subjectForm.teacher} onChange={e => setSubjectForm(p => ({ ...p, teacher: e.target.value }))} placeholder="Teacher name (optional)" className="input-field" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-400">Color:</span>
              {EVENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setSubjectForm(p => ({ ...p, color: c }))}
                  className={`w-6 h-6 rounded-full transition-all ${subjectForm.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-900' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Adding...' : 'Add Subject'}</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

interface WeekViewProps {
  weekStart: Date;
  tasks: Task[];
  events: any[];
  today: Date;
  onDayClick: (date: Date) => void;
  selectedDay: Date | null;
}

function WeekView({ weekStart, tasks, events, today, onDayClick, selectedDay }: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const HOUR_HEIGHT = 56;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
    }
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  return (
    <div className="flex flex-col">
      {/* Day header row */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-surface-800">
        <div className="border-r border-surface-800" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`py-3 flex flex-col items-center gap-0.5 border-r border-surface-800 last:border-r-0 transition-colors ${
                isSelected ? 'bg-brand-500/15' : 'hover:bg-surface-800/50'
              }`}
            >
              <span className="text-[10px] font-medium text-surface-500 uppercase tracking-wide">{DAY_ABBR[day.getDay()]}</span>
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                isToday ? 'bg-brand-500 text-white' : isSelected ? 'text-brand-300' : 'text-surface-200'
              }`}>
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '520px' }}>
        <div className="relative grid grid-cols-[56px_repeat(7,1fr)]">
          {/* Hour labels */}
          <div className="col-start-1">
            {HOURS.map(h => (
              <div key={h} className="border-r border-surface-800 pr-2 flex items-start justify-end" style={{ height: HOUR_HEIGHT }}>
                <span className="text-[10px] text-surface-600 -translate-y-2">{h === 0 ? '' : fmtHour(h)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day));
            const dayTasks = tasks.filter(t => isSameDay(new Date(t.due_date), day));
            const isToday = isSameDay(day, today);

            return (
              <div key={di} className="relative border-r border-surface-800 last:border-r-0">
                {/* Hour rows */}
                {HOURS.map(h => (
                  <div key={h} className={`border-b border-surface-800/60 ${h % 2 === 0 ? '' : 'bg-surface-900/20'}`} style={{ height: HOUR_HEIGHT }} />
                ))}

                {/* Today line */}
                {isToday && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-rose-500 -ml-1 flex-shrink-0" />
                      <div className="flex-1 h-px bg-rose-500" />
                    </div>
                  </div>
                )}

                {/* Events */}
                {dayEvents.map(ev => {
                  const start = new Date(ev.start_time);
                  const end = new Date(ev.end_time);
                  const startMin = start.getHours() * 60 + start.getMinutes();
                  const dur = Math.max(30, (end.getTime() - start.getTime()) / 60000);
                  const top = (startMin / 60) * HOUR_HEIGHT;
                  const height = (dur / 60) * HOUR_HEIGHT - 2;
                  return (
                    <div
                      key={ev.id}
                      className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 z-10 overflow-hidden cursor-default"
                      style={{ top, height, backgroundColor: ev.color + '33', borderLeft: `3px solid ${ev.color}` }}
                      title={ev.title}
                    >
                      <p className="text-[10px] font-medium leading-tight truncate" style={{ color: ev.color }}>{ev.title}</p>
                      {height > 28 && (
                        <p className="text-[9px] leading-tight truncate text-surface-400">
                          {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Tasks (due time as a pill) */}
                {dayTasks.map(t => {
                  const due = new Date(t.due_date);
                  const dueMin = due.getHours() * 60 + due.getMinutes();
                  const top = (dueMin / 60) * HOUR_HEIGHT;
                  const color = t.status === 'completed' ? '#475569' : t.type === 'exam' ? '#f43f5e' : '#f59e0b';
                  return (
                    <div
                      key={t.id}
                      className="absolute left-0.5 right-0.5 z-10 px-1 py-0.5 rounded text-[10px] font-medium truncate cursor-default"
                      style={{ top: top - 10, height: 20, backgroundColor: color + '22', borderLeft: `3px solid ${color}`, color }}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

interface DayViewProps {
  date: Date;
  tasks: Task[];
  events: any[];
  today: Date;
}

function DayView({ date, tasks, events, today }: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const HOUR_HEIGHT = 64;
  const isToday = isSameDay(date, today);
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
    }
  }, [date]);

  const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), date));
  const dayTasks = tasks.filter(t => isSameDay(new Date(t.due_date), date));

  return (
    <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '560px' }}>
      <div className="relative grid grid-cols-[64px_1fr]">
        {/* Hour labels */}
        <div>
          {HOURS.map(h => (
            <div key={h} className="border-r border-b border-surface-800 pr-2 flex items-start justify-end" style={{ height: HOUR_HEIGHT }}>
              <span className="text-[10px] text-surface-600 -translate-y-2">{h === 0 ? '' : fmtHour(h)}</span>
            </div>
          ))}
        </div>

        {/* Main column */}
        <div className="relative">
          {HOURS.map(h => (
            <div key={h} className={`border-b border-surface-800/60 ${h % 2 === 0 ? '' : 'bg-surface-900/20'}`} style={{ height: HOUR_HEIGHT }} />
          ))}

          {/* Today line */}
          {isToday && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}>
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 flex-shrink-0" />
                <div className="flex-1 h-px bg-rose-500" />
              </div>
            </div>
          )}

          {/* Events */}
          {dayEvents.map(ev => {
            const start = new Date(ev.start_time);
            const end = new Date(ev.end_time);
            const startMin = start.getHours() * 60 + start.getMinutes();
            const dur = Math.max(30, (end.getTime() - start.getTime()) / 60000);
            const top = (startMin / 60) * HOUR_HEIGHT;
            const height = (dur / 60) * HOUR_HEIGHT - 2;
            return (
              <div
                key={ev.id}
                className="absolute left-1 right-1 rounded-lg px-2 py-1 z-10 overflow-hidden cursor-default"
                style={{ top, height, backgroundColor: ev.color + '33', borderLeft: `4px solid ${ev.color}` }}
              >
                <p className="text-xs font-semibold leading-tight truncate" style={{ color: ev.color }}>{ev.title}</p>
                {height > 36 && (
                  <p className="text-[11px] text-surface-400 mt-0.5">
                    {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}
                {ev.location && height > 52 && <p className="text-[10px] text-surface-500">{ev.location}</p>}
              </div>
            );
          })}

          {/* Tasks */}
          {dayTasks.map(t => {
            const due = new Date(t.due_date);
            const dueMin = due.getHours() * 60 + due.getMinutes();
            const top = (dueMin / 60) * HOUR_HEIGHT;
            const color = t.status === 'completed' ? '#475569' : t.type === 'exam' ? '#f43f5e' : '#f59e0b';
            return (
              <div
                key={t.id}
                className="absolute left-1 right-1 z-10 px-2 py-1 rounded-lg text-xs font-medium cursor-default"
                style={{ top: top - 16, height: 28, backgroundColor: color + '22', borderLeft: `4px solid ${color}`, color }}
                title={t.title}
              >
                <span className="truncate block">{t.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

interface DayDetailPanelProps {
  date: Date;
  tasks: Task[];
  events: any[];
  subjects: any[];
  onClose: () => void;
  onAddTask: (payload: any) => void;
  onAddEvent: (payload: any) => void;
  onToggleTask: (id: string, isCompleted: boolean) => void;
  onDeleteTask: (id: string) => void;
  onDeleteEvent: (id: string) => void;
}

function DayDetailPanel({
  date, tasks, events, subjects,
  onClose, onAddTask, onAddEvent, onToggleTask, onDeleteTask, onDeleteEvent,
}: DayDetailPanelProps) {
  const [adding, setAdding] = useState<'task' | 'event' | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('09:00');
  const [eventEnd, setEventEnd] = useState('10:00');

  const dateStr = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const isToday = isSameDay(date, new Date());
  const isoDate = date.toISOString().split('T')[0];

  const submitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onAddTask({
      title: taskTitle.trim(), type: 'homework', priority: 'medium',
      due_date: `${isoDate}T23:59`, estimated_minutes: 30,
      status: 'pending', subject_id: null, description: null,
    });
    setTaskTitle('');
    setAdding(null);
  };

  const submitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    onAddEvent({
      title: eventTitle.trim(), type: 'activity',
      start_time: `${isoDate}T${eventStart}`, end_time: `${isoDate}T${eventEnd}`,
      location: null, color: EVENT_COLORS[0], is_recurring: false,
    });
    setEventTitle('');
    setAdding(null);
  };

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-surface-100 flex items-center gap-2">
            {dateStr}
            {isToday && <span className="badge bg-brand-500/15 text-brand-400 border border-brand-500/20 text-xs">Today</span>}
          </h3>
          <p className="text-xs text-surface-500 mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAdding('task')} className="btn-ghost flex items-center gap-1 text-xs px-2.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Task
          </button>
          <button onClick={() => setAdding('event')} className="btn-ghost flex items-center gap-1 text-xs px-2.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Event
          </button>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {adding === 'task' && (
        <form onSubmit={submitTask} className="mb-3 p-3 rounded-xl bg-surface-800/60 border border-surface-700 animate-slide-up">
          <div className="flex gap-2">
            <input autoFocus value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title..." className="input-field flex-1 text-sm" />
            <button type="submit" className="btn-primary px-4 text-sm">Add</button>
            <button type="button" onClick={() => setAdding(null)} className="btn-ghost px-3 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {adding === 'event' && (
        <form onSubmit={submitEvent} className="mb-3 p-3 rounded-xl bg-surface-800/60 border border-surface-700 animate-slide-up space-y-2">
          <input autoFocus value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Event title..." className="input-field text-sm" />
          <div className="flex gap-2 items-center">
            <input type="time" value={eventStart} onChange={e => setEventStart(e.target.value)} className="input-field text-sm" />
            <span className="text-surface-500 text-xs">to</span>
            <input type="time" value={eventEnd} onChange={e => setEventEnd(e.target.value)} className="input-field text-sm" />
            <button type="submit" className="btn-primary px-4 text-sm">Add</button>
            <button type="button" onClick={() => setAdding(null)} className="btn-ghost px-3 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {events.length > 0 && (
        <div className="space-y-2 mb-3">
          {events.map(e => (
            <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-800/40 border border-surface-700/50 group">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: e.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-surface-100 truncate">{e.title}</div>
                <div className="text-xs text-surface-500">
                  {new Date(e.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  {e.location && ` · ${e.location}`}
                </div>
              </div>
              <button onClick={() => onDeleteEvent(e.id)} className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-rose-400 transition-all p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map(t => {
            const done = t.status === 'completed';
            const meta = TASK_TYPE_META[t.type];
            return (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-800/40 border border-surface-700/50 group">
                <button onClick={() => onToggleTask(t.id, done)} className="flex-shrink-0">
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-brand-400 hover:text-surface-400 transition-colors" />
                    : <Circle className="w-5 h-5 text-surface-600 hover:text-brand-400 transition-colors" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${done ? 'line-through text-surface-600' : 'text-surface-100'}`}>{t.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    {t.subject && <span className="text-xs text-surface-500">{t.subject.name}</span>}
                  </div>
                </div>
                <button onClick={() => onDeleteTask(t.id)} className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-rose-400 transition-all p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : events.length === 0 && !adding ? (
        <div className="text-center py-6">
          <CalendarDays className="w-10 h-10 text-surface-700 mx-auto mb-2" />
          <p className="text-sm text-surface-500">Nothing scheduled. Add a task or event to get started.</p>
        </div>
      ) : null}
    </div>
  );
}
