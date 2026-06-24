import { useState, useMemo } from 'react';
import { User, Zap, Flame, Edit3, Save, X, BookOpen, CheckCircle2, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useXP } from '../../hooks/useXP';
import { useTasks } from '../../hooks/useTasks';

const AVATARS = ['🎓','🧠','⚡','🚀','🏆','📚','🎯','💡','🌟','🔥','🦁','🎸','⚽','🎨','🌍','🤖','🎮','🏄','🧬','🎻'];
const GRADE_LEVELS = ['6th Grade','7th Grade','8th Grade','9th Grade','10th Grade','11th Grade','12th Grade','Freshman (College)','Sophomore (College)','Junior (College)','Senior (College)','Graduate Student'];

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const { totalXP, transactions, getLevel, getLevelProgress, getLevelTitle } = useXP();
  const { tasks } = useTasks();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    school: profile?.school ?? '',
    grade_level: profile?.grade_level ?? '',
    bio: profile?.bio ?? '',
    avatar_emoji: profile?.avatar_emoji ?? '🎓',
  });

  const level = getLevel(totalXP);
  const progress = getLevelProgress(totalXP);

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed');
    const exams = completed.filter(t => t.type === 'exam');
    const projects = completed.filter(t => t.type === 'project');
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    return { completed: completed.length, exams: exams.length, projects: projects.length, completionRate };
  }, [tasks]);

  const recentXP = useMemo(() => transactions.slice(0, 8), [transactions]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      full_name: form.full_name,
      school: form.school || null,
      grade_level: form.grade_level || null,
      bio: form.bio || null,
      avatar_emoji: form.avatar_emoji,
    });
    setEditing(false);
    setSaving(false);
  };

  const handleCancel = () => {
    setForm({
      full_name: profile?.full_name ?? '',
      school: profile?.school ?? '',
      grade_level: profile?.grade_level ?? '',
      bio: profile?.bio ?? '',
      avatar_emoji: profile?.avatar_emoji ?? '🎓',
    });
    setEditing(false);
  };

  const LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4500, 6000];
  const nextLevelXP = LEVEL_THRESHOLDS[Math.min(level, 10)];
  const currLevelXP = LEVEL_THRESHOLDS[Math.max(level - 1, 0)];

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Profile card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-4">
            {editing ? (
              <div>
                <div className="text-4xl mb-2 text-center">{form.avatar_emoji}</div>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setForm(p => ({ ...p, avatar_emoji: a }))}
                      className={`text-xl w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        form.avatar_emoji === a
                          ? 'bg-brand-500/30 ring-1 ring-brand-500'
                          : 'hover:bg-surface-700'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-3xl">
                {profile?.avatar_emoji ?? '🎓'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-display font-bold text-white">{profile?.full_name ?? 'Student'}</h2>
              {profile?.grade_level && (
                <p className="text-surface-400 text-sm">{profile.grade_level}</p>
              )}
              {profile?.school && (
                <p className="text-surface-500 text-xs mt-0.5">{profile.school}</p>
              )}
              {profile?.bio && !editing && (
                <p className="text-surface-400 text-sm mt-2 max-w-xs">{profile.bio}</p>
              )}
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-ghost flex items-center gap-1.5 text-sm">
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="btn-ghost flex items-center gap-1 text-sm">
                <X className="w-4 h-4" />
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {editing && (
          <div className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Full Name</label>
                <input
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">Grade Level</label>
                <select
                  value={form.grade_level}
                  onChange={e => setForm(p => ({ ...p, grade_level: e.target.value }))}
                  className="select-field text-sm"
                >
                  <option value="">Select grade</option>
                  {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">School</label>
              <input
                value={form.school}
                onChange={e => setForm(p => ({ ...p, school: e.target.value }))}
                placeholder="Your school name"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">Bio (optional)</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={2}
                className="input-field text-sm resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* XP & Level */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-brand-400" />
          <h3 className="font-display font-semibold text-surface-100">XP & Level</h3>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-brand">
            <span className="text-2xl font-display font-bold text-white">{level}</span>
          </div>
          <div className="flex-1">
            <div className="font-bold text-surface-100">{getLevelTitle(level)}</div>
            <div className="text-brand-400 text-2xl font-display font-bold">{totalXP.toLocaleString()} XP</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-surface-500">Streak</div>
            <div className="flex items-center gap-1 justify-end">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-400">{profile?.streak_count ?? 0}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-surface-500">Level {level}</span>
            <span className="text-xs text-surface-500">{nextLevelXP - currLevelXP > 0 ? `${totalXP - currLevelXP} / ${nextLevelXP - currLevelXP} XP` : 'Max Level'}</span>
            <span className="text-xs text-surface-500">Level {level + 1}</span>
          </div>
          <div className="h-2.5 bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-brand rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-blue-400" />
          <h3 className="font-display font-semibold text-surface-100">Academic Stats</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Tasks Done', value: stats.completed, icon: CheckCircle2, color: 'text-brand-400' },
            { label: 'Completion', value: `${stats.completionRate}%`, icon: Target, color: 'text-blue-400' },
            { label: 'Exams Aced', value: stats.exams, icon: BookOpen, color: 'text-rose-400' },
            { label: 'Projects', value: stats.projects, icon: User, color: 'text-purple-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center p-3 rounded-xl bg-surface-800/50">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
              <div className={`text-xl font-display font-bold ${color}`}>{value}</div>
              <div className="text-xs text-surface-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent XP */}
      {recentXP.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-brand-400" />
            <h3 className="font-display font-semibold text-surface-100">Recent XP</h3>
          </div>
          <div className="space-y-2">
            {recentXP.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-800/50">
                <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-surface-300 truncate">{tx.reason ?? 'XP earned'}</div>
                  <div className="text-xs text-surface-600">
                    {new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="font-bold text-brand-400 text-sm">+{tx.amount}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
