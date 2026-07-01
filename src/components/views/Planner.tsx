import { useState, useMemo } from 'react';
import {
  Plus, Trash2, CheckCircle2, Circle, BookOpen, CalendarDays, X,
  ChevronLeft, ChevronRight, Filter, Edit3,
} from 'lucide-react';
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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function Planner() {
  const { tasks, toggleTaskComplete, addTask, updateTask, deleteTask } = useTasks();
  const { events, addEvent, deleteEvent } = useEvents();
  const { subjects, addSubject } = useSubjects();

  const [tab, setTab] = useState<'tasks' | 'calendar' | 'events'>('tasks');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', type: 'homework' as TaskType,
    due_date: '', priority: 'medium' as TaskPriority,
    estimated_minutes: 30, subject_id: '',
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
      await updateTask(editingTask.id, {
        ...taskForm,
        subject_id: taskForm.subject_id || null,
      });
    } else {
      await addTask({
        ...taskForm,
        subject_id: taskForm.subject_id || null,
        status: 'pending',
      });
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
                const today = new Date();
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
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                        className="text-surface-600 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditTaskModal(task); }}
                        className="text-surface-600 hover:text-brand-400 transition-colors"
                      >
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
              <div key={`empty-${i}`} className="min-h-[84px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayTasks = getTasksForDay(day);
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(new Date(calYear, calMonth, day), today);
              const isSelected = selectedDay === day;
              const items = [
                ...dayEvents.map(e => ({ id: e.id, label: e.title, color: e.color, kind: 'event' as const, done: false })),
                ...dayTasks.map(t => ({
                  id: t.id,
                  label: t.title,
                  color: t.status === 'completed' ? '#475569' : t.type === 'exam' ? '#f43f5e' : '#f59e0b',
                  kind: 'task' as const,
                  done: t.status === 'completed',
                })),
              ];
              const shown = items.slice(0, 2);
              const overflow = items.length - shown.length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[84px] p-1.5 rounded-lg flex flex-col items-stretch justify-start transition-all cursor-pointer border text-left ${
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
                        <span className={`truncate ${item.done ? 'line-through text-surface-600' : 'text-surface-200'}`}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className="text-[10px] text-surface-500 px-1">+{overflow} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Legend */}
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

      {/* Selected day detail panel */}
      {tab === 'calendar' && selectedDay !== null && (
        <DayDetailPanel
          date={new Date(calYear, calMonth, selectedDay)}
          tasks={getTasksForDay(selectedDay)}
          events={getEventsForDay(selectedDay)}
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
      <Modal open={showTaskModal} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} title={editingTask ? 'Edit Task' : 'Add New Task'}>
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
            {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
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

interface DayDetailPanelProps {
  date: Date;
  tasks: Task[];
  events: CalendarEvent[];
  subjects: Subject[];
  onClose: () => void;
  onAddTask: (payload: Omit<Task, 'id' | 'user_id' | 'created_at' | 'completed_at' | 'subject'>) => void;
  onAddEvent: (payload: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>) => void;
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
      title: taskTitle.trim(),
      type: 'homework',
      priority: 'medium',
      due_date: `${isoDate}T23:59`,
      estimated_minutes: 30,
      status: 'pending',
      subject_id: null,
      description: null,
    });
    setTaskTitle('');
    setAdding(null);
  };

  const submitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    onAddEvent({
      title: eventTitle.trim(),
      type: 'activity',
      start_time: `${isoDate}T${eventStart}`,
      end_time: `${isoDate}T${eventEnd}`,
      location: null,
      color: EVENT_COLORS[0],
      is_recurring: false,
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

      {/* Quick add task */}
      {adding === 'task' && (
        <form onSubmit={submitTask} className="mb-3 p-3 rounded-xl bg-surface-800/60 border border-surface-700 animate-slide-up">
          <div className="flex gap-2">
            <input
              autoFocus
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="Task title..."
              className="input-field flex-1 text-sm"
            />
            <button type="submit" className="btn-primary px-4 text-sm">Add</button>
            <button type="button" onClick={() => setAdding(null)} className="btn-ghost px-3 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Quick add event */}
      {adding === 'event' && (
        <form onSubmit={submitEvent} className="mb-3 p-3 rounded-xl bg-surface-800/60 border border-surface-700 animate-slide-up space-y-2">
          <input
            autoFocus
            value={eventTitle}
            onChange={e => setEventTitle(e.target.value)}
            placeholder="Event title..."
            className="input-field text-sm"
          />
          <div className="flex gap-2 items-center">
            <input type="time" value={eventStart} onChange={e => setEventStart(e.target.value)} className="input-field text-sm" />
            <span className="text-surface-500 text-xs">to</span>
            <input type="time" value={eventEnd} onChange={e => setEventEnd(e.target.value)} className="input-field text-sm" />
            <button type="submit" className="btn-primary px-4 text-sm">Add</button>
            <button type="button" onClick={() => setAdding(null)} className="btn-ghost px-3 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Events list */}
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

      {/* Tasks list */}
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
