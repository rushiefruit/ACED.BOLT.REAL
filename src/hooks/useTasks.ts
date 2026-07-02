import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Task, TaskStatus } from '../types';

export function useTasks() {
  const { user, profile, refreshProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, subject:subjects(*)')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'completed_at' | 'subject'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: user.id })
      .select('*, subject:subjects(*)')
      .single();
    if (!error && data) {
      setTasks(prev => [...prev, data as Task].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
    }
    return error ? null : (data as Task);
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const payload: Record<string, unknown> = { ...updates };
    if (updates.due_date) {
      payload.notified_24h = false;
      payload.notified_1h = false;
    }
    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .select('*, subject:subjects(*)')
      .single();
    if (!error && data) {
      setTasks(prev => prev.map(t => t.id === id ? (data as Task) : t));
    }
    return error ? null : (data as Task);
  };

  const updateStreakOnComplete = async () => {
    if (!user || !profile) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActive = profile.last_active_date?.split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak = profile.streak_count ?? 0;
    let newLastActive = today;

    if (lastActive === today) {
      // Already active today, keep streak
    } else if (lastActive === yesterday) {
      // Consecutive day - increment streak
      newStreak = (profile.streak_count ?? 0) + 1;
    } else {
      // Streak broken or first completion - reset to 1
      newStreak = 1;
    }

    await supabase
      .from('profiles')
      .update({ streak_count: newStreak, last_active_date: newLastActive })
      .eq('id', user.id);

    refreshProfile();
  };

  const updateStreakOnUncomplete = async () => {
    if (!user || !profile) return;

    // Check if user has any other completed tasks today
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00`)
      .lte('completed_at', `${today}T23:59:59`);

    // If no completed tasks today, decrement streak if yesterday wasn't active
    if (!data || data.length === 0) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const lastActive = profile.last_active_date?.split('T')[0];

      if (lastActive === yesterday) {
        // Yesterday was active, so keep yesterday as last active
        await supabase
          .from('profiles')
          .update({ streak_count: Math.max(0, (profile.streak_count ?? 1) - 1), last_active_date: yesterday })
          .eq('id', user.id);
      } else if (lastActive === today) {
        // Was only active today, reset streak
        await supabase
          .from('profiles')
          .update({ streak_count: 0, last_active_date: null })
          .eq('id', user.id);
      }
      refreshProfile();
    }
  };

  const completeTask = async (id: string): Promise<void> => {
    const updates: Partial<Task> = {
      status: 'completed' as TaskStatus,
      completed_at: new Date().toISOString(),
    };
    await updateTask(id, updates);
    await updateStreakOnComplete();
  };

  const uncompleteTask = async (id: string): Promise<void> => {
    const updates: Partial<Task> = {
      status: 'pending' as TaskStatus,
      completed_at: null,
    };
    await updateTask(id, updates);
    await updateStreakOnUncomplete();
  };

  const toggleTaskComplete = async (id: string, isCompleted: boolean): Promise<void> => {
    if (isCompleted) {
      await uncompleteTask(id);
    } else {
      await completeTask(id);
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) setTasks(prev => prev.filter(t => t.id !== id));
    return !error;
  };

  return { tasks, loading, fetchTasks, addTask, updateTask, completeTask, uncompleteTask, toggleTaskComplete, deleteTask };
}
