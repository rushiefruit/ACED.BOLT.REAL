import { useEffect } from 'react';
import { Trophy, Flame, RefreshCw, Crown, Medal, CheckCircle2 } from 'lucide-react';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useAuth } from '../../contexts/AuthContext';

const RANK_STYLES: Record<number, { bg: string; border: string; badge: string; text: string }> = {
  1: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500 text-black', text: 'text-amber-400' },
  2: { bg: 'bg-surface-700/30', border: 'border-surface-600/30', badge: 'bg-surface-400 text-black', text: 'text-surface-300' },
  3: { bg: 'bg-amber-700/10', border: 'border-amber-700/20', badge: 'bg-amber-700 text-white', text: 'text-amber-600' },
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-4 h-4 text-amber-400" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-surface-300" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
  return <span className="text-sm font-bold text-surface-500">#{rank}</span>;
}

export default function Leaderboard() {
  const { entries, loading, fetchLeaderboard } = useLeaderboard();
  const { user, profile } = useAuth();

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const myEntry = entries.find(e => e.user_id === user?.id);
  const myRank = myEntry?.rank ?? 0;
  const myCompleted = myEntry?.completed_tasks ?? 0;
  const maxCompleted = entries[0]?.completed_tasks ?? 1;

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 to-surface-900 border border-amber-700/30 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-amber-500/5 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold text-white mb-1">Global Leaderboard</h2>
            <p className="text-surface-400 text-sm">Complete tasks and rise through the ranks. Every assignment completed counts.</p>
            {myRank > 0 && (
              <div className="flex items-center gap-3 mt-3">
                <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  Your rank: #{myRank}
                </span>
                <span className="badge bg-brand-500/15 text-brand-400 border border-brand-500/20">
                  <CheckCircle2 className="w-3 h-3" /> {myCompleted} completed
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Your position card (if not in top 10) */}
      {myRank > 10 && profile && (
        <div className="glass-card p-4 border border-brand-500/20 bg-brand-500/5">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{profile.avatar_emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-surface-100 text-sm">{profile.full_name}</div>
              <div className="text-xs text-surface-500">Your position</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-brand-400">#{myRank}</div>
              <div className="text-xs text-surface-500">{myCompleted} completed</div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 podium */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
            if (!entry) return null;
            const heights = ['h-24', 'h-32', 'h-20'];
            const positions = ['2nd', '1st', '3rd'];
            const posIdx = podiumIdx;
            const isMe = entry.user_id === user?.id;

            return (
              <div key={entry.user_id} className="flex flex-col items-center gap-2">
                <div className={`text-3xl ${isMe ? 'ring-2 ring-brand-400 rounded-full p-0.5' : ''}`}>
                  {entry.avatar_emoji}
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-surface-200 truncate max-w-[80px]">
                    {entry.full_name.split(' ')[0]}
                  </div>
                  <div className="text-xs text-brand-400">{entry.completed_tasks} done</div>
                </div>
                <div className={`w-full ${heights[posIdx]} rounded-t-xl flex items-center justify-center ${
                  posIdx === 1
                    ? 'bg-gradient-to-b from-amber-500/30 to-amber-600/20 border border-amber-500/30'
                    : posIdx === 0
                    ? 'bg-gradient-to-b from-surface-600/30 to-surface-700/20 border border-surface-600/30'
                    : 'bg-gradient-to-b from-amber-700/20 to-amber-800/10 border border-amber-700/20'
                }`}>
                  <span className="font-display font-bold text-2xl text-white/50">{positions[posIdx]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full rankings */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h3 className="font-display font-semibold text-surface-100">Rankings</h3>
          <button onClick={fetchLeaderboard} className="btn-ghost flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-surface-700 mx-auto mb-3" />
            <p className="text-surface-400">No rankings yet. Complete tasks to appear here!</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-800/50">
            {entries.slice(0, 20).map(entry => {
              const isMe = entry.user_id === user?.id;
              const rankStyle = RANK_STYLES[entry.rank];
              const barWidth = Math.max(5, Math.round((entry.completed_tasks / maxCompleted) * 100));

              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-4 transition-all ${
                    isMe
                      ? 'bg-brand-500/8 border-l-2 border-l-brand-500'
                      : rankStyle
                      ? rankStyle.bg
                      : 'hover:bg-surface-800/30'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    rankStyle ? rankStyle.badge : 'bg-surface-800 text-surface-400'
                  } font-bold text-xs`}>
                    {entry.rank <= 3
                      ? <RankIcon rank={entry.rank} />
                      : entry.rank
                    }
                  </div>

                  {/* Avatar + name */}
                  <div className="text-xl flex-shrink-0">{entry.avatar_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${isMe ? 'text-brand-300' : 'text-surface-100'} truncate`}>
                        {entry.full_name}
                        {isMe && <span className="text-xs text-brand-500 ml-1">(you)</span>}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1 bg-surface-800 rounded-full overflow-hidden w-full max-w-[160px]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isMe ? 'bg-brand-500' : 'bg-surface-600'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {entry.streak_count > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <Flame className="w-3 h-3" />
                        {entry.streak_count}
                      </div>
                    )}
                    <div className="text-right">
                      <div className={`font-bold text-sm ${rankStyle ? rankStyle.text : 'text-surface-300'}`}>
                        {entry.completed_tasks}
                      </div>
                      <div className="text-xs text-surface-600">done</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
