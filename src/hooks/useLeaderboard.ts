import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../types';

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('user_id, status')
      .eq('status', 'completed');

    if (!data) { setLoading(false); return; }

    const counts: Record<string, number> = {};
    for (const t of data) {
      counts[t.user_id] = (counts[t.user_id] ?? 0) + 1;
    }

    const userIds = Object.keys(counts);
    if (userIds.length === 0) { setLoading(false); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_emoji, streak_count, school')
      .in('id', userIds);

    const entries: LeaderboardEntry[] = (profiles ?? []).map((p) => ({
      user_id: p.id,
      full_name: p.full_name ?? 'Student',
      avatar_emoji: p.avatar_emoji ?? '🎓',
      completed_tasks: counts[p.id] ?? 0,
      streak_count: p.streak_count ?? 0,
      school: p.school,
      rank: 0,
    }));

    entries.sort((a, b) => b.completed_tasks - a.completed_tasks);
    entries.forEach((e, i) => { e.rank = i + 1; });

    setEntries(entries);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  return { entries, loading, fetchLeaderboard };
}
