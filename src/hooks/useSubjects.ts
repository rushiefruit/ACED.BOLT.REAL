import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Subject } from '../types';

export function useSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    setSubjects((data as Subject[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const addSubject = async (subject: Omit<Subject, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('subjects')
      .insert({ ...subject, user_id: user.id })
      .select()
      .single();
    if (!error && data) {
      setSubjects(prev => [...prev, data as Subject].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return error ? null : (data as Subject);
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (!error) setSubjects(prev => prev.filter(s => s.id !== id));
    return !error;
  };

  return { subjects, loading, fetchSubjects, addSubject, deleteSubject };
}
