import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CalendarEvent } from '../types';

export function useEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true });
    setEvents((data as CalendarEvent[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const addEvent = async (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    // datetime-local inputs produce "YYYY-MM-DDTHH:mm" with no timezone.
    // Append the local UTC offset so Postgres stores the correct UTC value.
    const withTz = (dt: string) => {
      if (!dt || dt.includes('+') || dt.includes('Z') || dt.endsWith('z')) return dt;
      const off = -new Date().getTimezoneOffset();
      const sign = off >= 0 ? '+' : '-';
      const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
      const mm = String(Math.abs(off) % 60).padStart(2, '0');
      return `${dt}:00${sign}${hh}:${mm}`;
    };
    const payload = {
      ...event,
      user_id: user.id,
      start_time: withTz(event.start_time),
      end_time: withTz(event.end_time),
    };
    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      setEvents(prev => [...prev, data as CalendarEvent].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ));
    }
    return error ? null : (data as CalendarEvent);
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) setEvents(prev => prev.filter(e => e.id !== id));
    return !error;
  };

  return { events, loading, fetchEvents, addEvent, deleteEvent };
}
