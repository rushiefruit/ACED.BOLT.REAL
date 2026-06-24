import { useState, useMemo } from 'react';
import {
  Plus, Trash2, CheckCircle2, Circle, BookOpen, CalendarDays,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useEvents } from '../../hooks/useEvents';
import { useSubjects } from '../../hooks/useSubjects';
import { useApp } from '../../contexts/AppContext';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import type { TaskType, TaskPriority, EventType } from '../../types';

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function Planner() {
  const { tasks, completeTask, addTask, deleteTask } = useTasks();
  const { events, addEvent, deleteEvent } = useEvents();
  const { subjects, addSubject } = useSubjects();
  const { triggerXP } = useApp();

  const [tab, setTab] = useState<'tasks' | 'calendar' | 'events'>('tasks');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [calDate, setCalDate] = useState(new Date());

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', type: 'homework' as TaskType,
    due_date: '', priority: 'medium' as TaskPriority,
    estimated_minutes: 30, subject_id: '', xp_reward: 10,
  });

  // Event form
  const [eventForm, setEventForm] = useState({
    title: '', type: 'activity' as EventType,
    start_time: '', end_time: '', location: '', color: EVENT_COLORS[0],
  });

  // Subject form
  const [subjectForm, setSubjectForm] = useState({ name: '', color: '#3b82f6', teacher: '' });

  const [saving, setSaving] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      return true;
    });
  }, [tasks, filterStatus, filterType]);

  const handleCompleteTask = async (id: string) => {
    const xp = await completeTask(id);
    if (xp > 0) triggerXP(xp);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const xpMap: Record<TaskType, number> = { exam: 50, homework: 15, study: 20, project: 40, reading: 10 };
    await addTask({
      ...taskForm,
      subject_id: taskForm.subject_id || null,
      xp_reward: xpMap[taskForm.type],
      status: 'pending',
    });
    setShowTaskModal(false);
    setTaskForm({ title: '', description: '', type: 'homework', due_date: '', priority: 'medium', estimated_minutes: 30, subject_id: '', xp_reward: 10 });
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

  // Calendar helpers
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const today = new Date();

  const getTasksForDay = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    return tasks.filter(t => isSameDay(new Date(t.due_date), d));
  };

  const getEventsForDay = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    return events.filter(e => isSameDay(new Date(e.start_time), d));
  };

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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
              onClick={() => tab === 'tasks' ? setShowTaskModal(true) : setShowEventModal(true)}
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
          {/* Filters */}
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
                <button onClick={() => setShowTaskModal(true)} className="btn-primary flex items-center gap-2">
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
                const today = new Date();
                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
                const isOverdue = diffDays < 0 && !isCompleted;

                return (
                  <div
                    key={task.id}
                    className={`glass-card p-4 flex items-start gap-3 transition-all ${isCompleted ? 'opacity-60' : ''}`}
                  >
                    <button
                      onClick={() => !isCompleted && handleCompleteTask(task.id)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isCompleted
                          ? 'border-brand-500 bg-brand-500/20'
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
                        {task.subject && (
                          <span className="text-xs text-surface-500">{task.subject.name}</span>
                        )}
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
                      <span className="text-xs text-brand-500">+{task.xp_reward} XP</span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-surface-600 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
        <div className="glass-card p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))} className="btn-ghost p-2">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-display font-semibold text-surface-100">
              {MONTH_NAMES[calMonth]} {calYear}
            </h3>
            <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))} className="btn-ghost p-2">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-surface-500 py-1">{d}</div>
            ))}
          </div>
          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayTasks = getTasksForDay(day);
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(new Date(calYear, calMonth, day), today);
              const hasPending = dayTasks.some(t => t.status !== 'completed');
              const hasOverdue = dayTasks.some(t => t.status !== 'completed' && new Date(t.due_date) < today);

              return (
                <div
                  key={day}
                  className={`aspect-square p-1 rounded-lg flex flex-col items-center justify-start transition-all cursor-default border ${
                    isToday
                      ? 'bg-brand-500/20 border-brand-500/40'
                      : 'border-transparent hover:border-surface-700 hover:bg-surface-800/50'
                  }`}
                >
                  <span className={`text-xs font-medium mb-0.5 ${isToday ? 'text-brand-300' : 'text-surface-300'}`}>
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {hasOverdue && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Overdue task" />}
                    {hasPending && !hasOverdue && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Pending task" />}
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.color }} title={e.title} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-surface-800">
            {[
              { color: 'bg-rose-500', label: 'Overdue' },
              { color: 'bg-amber-400', label: 'Pending task' },
              { color: 'bg-blue-500', label: 'Event' },
              { color: 'bg-brand-500', label: 'Today' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-xs text-surface-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events tab */}
      {tab === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowEventModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Event
            </button>
          </div>
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
      <Modal open={showTaskModal} onClose={() => setShowTaskModal(false)} title="Add New Task">
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Task Title *</label>
            <input
              value={taskForm.title}
              onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Math homework ch. 5"
              className="input-field"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Type</label>
              <select
                value={taskForm.type}
                onChange={e => setTaskForm(p => ({ ...p, type: e.target.value as TaskType }))}
                className="select-field"
              >
                {Object.entries(TASK_TYPE_META).map(([v, m]) => (
                  <option key={v} value={v}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Priority</label>
              <select
                value={taskForm.priority}
                onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}
                className="select-field"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Due Date *</label>
              <input
                type="datetime-local"
                value={taskForm.due_date}
                onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Est. Minutes</label>
              <input
                type="number"
                value={taskForm.estimated_minutes}
                onChange={e => setTaskForm(p => ({ ...p, estimated_minutes: Number(e.target.value) }))}
                min={5}
                max={480}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Subject</label>
            <select
              value={taskForm.subject_id}
              onChange={e => setTaskForm(p => ({ ...p, subject_id: e.target.value }))}
              className="select-field"
            >
              <option value="">No subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Notes (optional)</label>
            <textarea
              value={taskForm.description}
              onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Any additional details..."
              rows={2}
              className="input-field resize-none"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      </Modal>

      {/* Add Event Modal */}
      <Modal open={showEventModal} onClose={() => setShowEventModal(false)} title="Add Event">
        <form onSubmit={handleAddEvent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Event Title *</label>
            <input
              value={eventForm.title}
              onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Soccer practice"
              className="input-field"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Type</label>
              <select
                value={eventForm.type}
                onChange={e => setEventForm(p => ({ ...p, type: e.target.value as EventType }))}
                className="select-field"
              >
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
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEventForm(p => ({ ...p, color: c }))}
                    className={`w-6 h-6 rounded-full transition-all ${eventForm.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-900' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Start *</label>
              <input
                type="datetime-local"
                value={eventForm.start_time}
                onChange={e => setEventForm(p => ({ ...p, start_time: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">End *</label>
              <input
                type="datetime-local"
                value={eventForm.end_time}
                onChange={e => setEventForm(p => ({ ...p, end_time: e.target.value }))}
                className="input-field"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Location (optional)</label>
            <input
              value={eventForm.location}
              onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Gym, Room 204"
              className="input-field"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Adding...' : 'Add Event'}
          </button>
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
            <input
              value={subjectForm.name}
              onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Subject name (e.g. Biology)"
              className="input-field"
              required
            />
            <input
              value={subjectForm.teacher}
              onChange={e => setSubjectForm(p => ({ ...p, teacher: e.target.value }))}
              placeholder="Teacher name (optional)"
              className="input-field"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-400">Color:</span>
              {EVENT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSubjectForm(p => ({ ...p, color: c }))}
                  className={`w-6 h-6 rounded-full transition-all ${subjectForm.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-900' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Adding...' : 'Add Subject'}
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
