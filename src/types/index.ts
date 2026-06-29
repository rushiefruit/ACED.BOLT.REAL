export interface Profile {
  id: string;
  full_name: string | null;
  school: string | null;
  grade_level: string | null;
  avatar_emoji: string;
  bio: string | null;
  streak_count: number;
  last_active_date: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color: string;
  teacher: string | null;
  created_at: string;
}

export type TaskType = 'homework' | 'exam' | 'study' | 'project' | 'reading';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  type: TaskType;
  due_date: string;
  priority: TaskPriority;
  estimated_minutes: number;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  subject?: Subject;
  notified_24h?: boolean;
  notified_1h?: boolean;
}

export type EventType = 'class' | 'activity' | 'sport' | 'club';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  type: EventType;
  start_time: string;
  end_time: string;
  location: string | null;
  color: string;
  is_recurring: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: 'reminder' | 'achievement' | 'alert' | 'advice';
  icon: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  title: string;
  plan_data: StudyPlanData;
  date_logged: string;
  created_at: string;
}

export interface StudyPlanData {
  summary: string;
  sessions: StudySession[];
  tips: string[];
  estimated_total_minutes: number;
}

export interface StudySession {
  subject: string;
  task: string;
  duration_minutes: number;
  suggested_time: string;
  technique: string;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_emoji: string;
  completed_tasks: number;
  streak_count: number;
  school: string | null;
  rank: number;
}
