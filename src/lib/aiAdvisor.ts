import type { Task, CalendarEvent, StudyPlanData, StudySession } from '../types';

const STUDY_TECHNIQUES = [
  'Pomodoro (25 min focus, 5 min break)',
  'Active Recall & Self-Testing',
  'Spaced Repetition',
  'Mind Mapping',
  'Cornell Note-Taking',
  'Feynman Technique',
  'Practice Problems',
  'Concept Summaries',
];

const TIME_SLOTS = [
  '7:00 AM – 8:00 AM',
  '9:00 AM – 10:00 AM',
  '11:00 AM – 12:00 PM',
  '2:00 PM – 3:00 PM',
  '4:00 PM – 5:00 PM',
  '6:00 PM – 7:00 PM',
  '7:30 PM – 8:30 PM',
  '8:00 PM – 9:00 PM',
];

function getDaysUntilDue(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  return Math.max(0, Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function getTechnique(taskType: string): string {
  const map: Record<string, string> = {
    exam:     STUDY_TECHNIQUES[2],
    homework: STUDY_TECHNIQUES[6],
    study:    STUDY_TECHNIQUES[0],
    project:  STUDY_TECHNIQUES[3],
    reading:  STUDY_TECHNIQUES[7],
  };
  return map[taskType] ?? STUDY_TECHNIQUES[0];
}

function getPriorityScore(task: Task): number {
  const days = getDaysUntilDue(task.due_date);
  const priorityWeight = { high: 3, medium: 2, low: 1 }[task.priority] ?? 1;
  const typeWeight = { exam: 4, project: 3, homework: 2, study: 2, reading: 1 }[task.type] ?? 1;
  const urgency = days === 0 ? 10 : days === 1 ? 8 : days <= 3 ? 5 : days <= 7 ? 3 : 1;
  return urgency * priorityWeight * typeWeight;
}

function getAvailableTimeSlots(events: CalendarEvent[], date: Date): string[] {
  const dateStr = date.toDateString();
  const busySlots = events
    .filter(e => new Date(e.start_time).toDateString() === dateStr)
    .map(e => new Date(e.start_time).getHours());

  return TIME_SLOTS.filter((slot) => {
    const hour = parseInt(slot.split(':')[0]);
    return !busySlots.some(busy => Math.abs(busy - hour) <= 1);
  });
}

export function generateStudyPlan(tasks: Task[], events: CalendarEvent[]): StudyPlanData {
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  if (pendingTasks.length === 0) {
    return {
      summary: 'Great job! You have no pending tasks right now. Use this time to review past material or get ahead on upcoming work.',
      sessions: [],
      tips: [
        'Review your notes from this week to reinforce learning',
        'Preview upcoming topics to prime your memory',
        'Take a well-deserved break — rest is part of learning',
      ],
      estimated_total_minutes: 0,
    };
  }

  const sortedTasks = [...pendingTasks].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  const topTasks = sortedTasks.slice(0, 5);
  const today = new Date();

  const sessions: StudySession[] = topTasks.map((task, idx) => {
    const availableSlots = getAvailableTimeSlots(events, today);
    const slot = availableSlots[idx % availableSlots.length] ?? TIME_SLOTS[idx % TIME_SLOTS.length];
    const days = getDaysUntilDue(task.due_date);
    const duration = days === 0 ? task.estimated_minutes
      : days === 1 ? Math.min(task.estimated_minutes, 60)
      : Math.min(task.estimated_minutes, 45);

    return {
      subject: task.subject?.name ?? 'General',
      task: task.title,
      duration_minutes: duration,
      suggested_time: slot,
      technique: getTechnique(task.type),
    };
  });

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const urgentCount = topTasks.filter(t => getDaysUntilDue(t.due_date) <= 2).length;
  const examCount = topTasks.filter(t => t.type === 'exam').length;

  let summary = `Your personalized plan covers ${sessions.length} study session${sessions.length > 1 ? 's' : ''} totaling ${Math.round(totalMinutes / 60 * 10) / 10} hours. `;
  if (urgentCount > 0) summary += `You have ${urgentCount} urgent item${urgentCount > 1 ? 's' : ''} due soon — prioritize these first. `;
  if (examCount > 0) summary += `${examCount} exam${examCount > 1 ? 's' : ''} detected — use spaced repetition for best results.`;
  else summary += 'Stay consistent and take short breaks between sessions.';

  const tips: string[] = [];
  if (examCount > 0) tips.push('Start exam prep at least 5 days early — cramming reduces retention by 40%');
  if (urgentCount > 0) tips.push('Tackle your most urgent tasks during your peak energy window (usually morning)');
  if (sessions.length >= 3) tips.push('Use the Pomodoro technique to stay focused — 25 min on, 5 min break');
  tips.push('Silence notifications during study sessions for deeper focus');
  tips.push('Sleep 7-9 hours — it consolidates long-term memory');
  if (tips.length > 3) tips.splice(3);

  return { summary, sessions, tips, estimated_total_minutes: totalMinutes };
}

export function generateSmartNotifications(tasks: Task[]): Array<{
  title: string;
  message: string;
  type: 'reminder' | 'achievement' | 'alert' | 'advice';
  icon: string;
}> {
  const notifs: Array<{ title: string; message: string; type: 'reminder' | 'achievement' | 'alert' | 'advice'; icon: string }> = [];
  const pending = tasks.filter(t => t.status !== 'completed');

  const overdue = pending.filter(t => new Date(t.due_date) < new Date());
  for (const t of overdue.slice(0, 2)) {
    notifs.push({
      title: 'Task Overdue',
      message: `"${t.title}" was due ${new Date(t.due_date).toLocaleDateString()} — complete it now!`,
      type: 'alert',
      icon: 'alert-circle',
    });
  }

  const dueTomorrow = pending.filter(t => getDaysUntilDue(t.due_date) === 1);
  for (const t of dueTomorrow.slice(0, 2)) {
    notifs.push({
      title: 'Due Tomorrow',
      message: `Don't forget: "${t.title}" is due tomorrow. Schedule time today!`,
      type: 'reminder',
      icon: 'clock',
    });
  }

  const exams = pending.filter(t => t.type === 'exam' && getDaysUntilDue(t.due_date) <= 5);
  for (const e of exams.slice(0, 1)) {
    notifs.push({
      title: 'Exam Approaching',
      message: `Your ${e.subject?.name ?? ''} exam is in ${getDaysUntilDue(e.due_date)} days. Start reviewing now!`,
      type: 'advice',
      icon: 'book-open',
    });
  }

  return notifs;
}
