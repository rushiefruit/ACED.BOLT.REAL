import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { XPTransaction } from '../types';

export function useXP() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchXP = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const txs = (data as XPTransaction[]) ?? [];
    setTransactions(txs);
    setTotalXP(txs.reduce((sum, t) => sum + t.amount, 0));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchXP(); }, [fetchXP]);

  const getLevel = (xp: number) => {
    if (xp < 100) return 1;
    if (xp < 250) return 2;
    if (xp < 500) return 3;
    if (xp < 850) return 4;
    if (xp < 1300) return 5;
    if (xp < 1900) return 6;
    if (xp < 2600) return 7;
    if (xp < 3500) return 8;
    if (xp < 4500) return 9;
    return 10;
  };

  const getLevelProgress = (xp: number) => {
    const thresholds = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4500, 6000];
    const level = getLevel(xp);
    if (level >= 10) return 100;
    const current = thresholds[level - 1];
    const next = thresholds[level];
    return Math.round(((xp - current) / (next - current)) * 100);
  };

  const getLevelTitle = (level: number) => {
    const titles = ['', 'Freshman', 'Learner', 'Scholar', 'Achiever', 'Honor Roll',
      'Dean\'s List', 'Merit Award', 'High Honors', 'Valedictorian', 'Aced Legend'];
    return titles[Math.min(level, 10)];
  };

  return { transactions, totalXP, loading, fetchXP, getLevel, getLevelProgress, getLevelTitle };
}
