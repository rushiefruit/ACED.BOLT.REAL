import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Task, TaskStatus } from '../types';

export function useTasks() {
  const { user } = useAuth();
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

  const completeTask = async (id: string): Promise<void> => {
    const updates: Partial<Task> = {
      status: 'completed' as TaskStatus,
      completed_at: new Date().toISOString(),
    };
    await updateTask(id, updates);
  };

  const uncompleteTask = async (id: string): Promise<void> => {
    const updates: Partial<Task> = {
      status: 'pending' as TaskStatus,
      completed_at: null,
    };
    await updateTask(id, updates);
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
