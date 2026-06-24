import { useState, useMemo } from 'react';
import {
  Brain, Sparkles, Clock, BookOpen, Lightbulb, RefreshCw,
  Save, CheckCircle2, Target, Zap, ChevronRight,
} from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { generateStudyPlan } from '../../lib/aiAdvisor';

const TECHNIQUE_ICONS: Record<string, string> = {
  'Pomodoro': '🍅',
  'Active Recall': '🧠',
  'Spaced Repetition': '🔁',
  'Mind Mapping': '🗺️',
  'Cornell': '📝',
  'Feynman': '💡',
  'Practice Problems': '✏️',
  'Concept Summaries': '📋',
};

function getTechniqueIcon(technique: string): string {
  for (const [key, icon] of Object.entries(TECHNIQUE_ICONS)) {
    if (technique.includes(key)) return icon;
  }
  return '📚';
}

export default function Advisor() {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { events } = useEvents();
  const [generated, setGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const plan = useMemo(() => generateStudyPlan(tasks, events), [tasks, events]);

  const handleGenerate = () => {
    setGenerated(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('study_plans').insert({
      user_id: user.id,
      title: `Study Plan — ${new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}`,
      plan_data: plan,
      date_logged: new Date().toISOString().split('T')[0],
    });
    setSaving(false);
    setSaved(true);
  };

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;
  const examCount = tasks.filter(t => t.type === 'exam' && t.status !== 'completed').length;
  const urgentCount = tasks.filter(t => {
    const days = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 2 && t.status !== 'completed';
  }).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-brand-500/5 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-brand-500/5 -translate-x-1/2 translate-y-1/2 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <Brain className="w-7 h-7 text-brand-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-display font-bold text-white">AI Plan Advisor</h2>
              <span className="badge bg-brand-500/15 text-brand-400 border border-brand-500/20">
                <Sparkles className="w-3 h-3" /> Smart
              </span>
            </div>
            <p className="text-surface-400 text-sm leading-relaxed mb-4">
              Your personalized study plan, built around your actual schedule and priorities. Updated every time you generate based on your current tasks and events.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-brand-400" />
                <span className="text-surface-300">{pendingCount} pending tasks</span>
              </div>
              {examCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-300">{examCount} exams</span>
                </div>
              )}
              {urgentCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300">{urgentCount} urgent</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generate button */}
      {!generated ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="text-center mb-2">
            <h3 className="text-lg font-display font-semibold text-surface-100 mb-1">Ready to build your plan?</h3>
            <p className="text-surface-400 text-sm">The AI analyzes your deadlines, priorities, and schedule to create the optimal study plan for you.</p>
          </div>
          <button onClick={handleGenerate} className="btn-primary flex items-center gap-2 px-8 py-3 text-base">
            <Sparkles className="w-5 h-5" />
            Generate My Study Plan
          </button>
          <p className="text-xs text-surface-600">Analyzes {pendingCount} tasks · {events.length} events</p>
        </div>
      ) : (
        <div className="space-y-5 animate-slide-up">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-surface-100">Your Personalized Plan</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setGenerated(false); setTimeout(() => setGenerated(true), 50); }}
                className="btn-ghost flex items-center gap-1.5 text-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-all ${
                  saved
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'btn-secondary'
                }`}
              >
                {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>

          {/* AI Summary */}
          <div className="glass-card p-5 border-l-4 border-l-brand-500">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-surface-300 text-sm leading-relaxed">{plan.summary}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sessions', value: plan.sessions.length, icon: BookOpen, color: 'text-brand-400' },
              { label: 'Total Hours', value: `${(plan.estimated_total_minutes / 60).toFixed(1)}h`, icon: Clock, color: 'text-blue-400' },
              { label: 'Avg Session', value: plan.sessions.length > 0 ? `${Math.round(plan.estimated_total_minutes / plan.sessions.length)}m` : '0m', icon: Target, color: 'text-amber-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass-card p-4 text-center">
                <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
                <div className={`text-xl font-display font-bold ${color}`}>{value}</div>
                <div className="text-xs text-surface-500">{label}</div>
              </div>
            ))}
          </div>

          {/* Study Sessions */}
          {plan.sessions.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">Recommended Sessions</h4>
              {plan.sessions.map((session, idx) => (
                <div
                  key={idx}
                  className="glass-card p-4 flex items-start gap-4 hover:border-surface-700 transition-all"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center flex-shrink-0 font-display font-bold text-brand-400 text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="font-medium text-surface-100 text-sm">{session.task}</div>
                        <div className="text-xs text-surface-500">{session.subject}</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-surface-400 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {session.duration_minutes}m
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <div className="flex items-center gap-1 text-xs text-brand-400">
                        <Sparkles className="w-3 h-3" />
                        {session.suggested_time}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-surface-400">
                        <span>{getTechniqueIcon(session.technique)}</span>
                        {session.technique}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-surface-600 flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-brand-400 mx-auto mb-3" />
              <h4 className="font-display font-semibold text-surface-100 mb-1">You're all caught up!</h4>
              <p className="text-surface-400 text-sm">Add tasks in the planner to get personalized study sessions.</p>
            </div>
          )}

          {/* Tips */}
          {plan.tips.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h4 className="font-semibold text-surface-100 text-sm">Smart Study Tips</h4>
              </div>
              <div className="space-y-2">
                {plan.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/50">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-400">
                      {i + 1}
                    </div>
                    <p className="text-surface-300 text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
