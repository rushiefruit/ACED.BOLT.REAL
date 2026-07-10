import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Sparkles, Loader2, Bot, Trash2, RefreshCw,
  Brain, Clock, BookOpen, Lightbulb, Save, CheckCircle2,
  Target, Zap, ChevronRight, MessageSquare, CalendarDays,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';
import { useEvents } from '../../hooks/useEvents';
import { generateStudyPlan } from '../../lib/aiAdvisor';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const SUGGESTED_PROMPTS = [
  "What should I study first today?",
  "Create a study schedule for this week",
  "How do I stay motivated?",
  "Explain active recall",
];

const TECHNIQUE_ICONS: Record<string, string> = {
  'Pomodoro': '\u{1F345}',
  'Active Recall': '\u{1F9E0}',
  'Spaced Repetition': '\u{1F501}',
  'Mind Mapping': '\u{1F5FA}\u{FE0F}',
  'Cornell': '\u{1F4DD}',
  'Feynman': '\u{1F4A1}',
  'Practice Problems': '\u{270F}\u{FE0F}',
  'Concept Summaries': '\u{1F4CB}',
};

function getTechniqueIcon(technique: string): string {
  for (const [key, icon] of Object.entries(TECHNIQUE_ICONS)) {
    if (technique.includes(key)) return icon;
  }
  return '\u{1F4DA}';
}

type Tab = 'chat' | 'plan';

export default function AIChat() {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { events } = useEvents();
  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const plan = generateStudyPlan(tasks, events);

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;
  const examCount = tasks.filter(t => t.type === 'exam' && t.status !== 'completed').length;
  const urgentCount = tasks.filter(t => {
    const days = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 2 && t.status !== 'completed';
  }).length;

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
    setLoading(false);
  }, []);

  // Only fetch once on initial mount. Never refetch on re-renders/tab switches.
  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchMessages();
    }
  }, [fetchMessages]);

  useEffect(() => {
    if (tab === 'chat') scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, tab]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    setInput('');
    setError(null);
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, role: 'user', content, created_at: new Date().toISOString(),
    }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Replace temp message with the real user message + assistant reply
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `user-${Date.now()}`, role: 'user' as const, content, created_at: new Date().toISOString() },
        { id: `ai-${Date.now()}`, role: 'assistant' as const, content: data.answer, created_at: new Date().toISOString() },
      ]);
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    if (!user) return;
    await supabase.from('chat_messages').delete().eq('user_id', user.id);
    setMessages([]);
  };

  const handleSavePlan = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('study_plans').insert({
      user_id: user.id,
      title: `Study Plan \u2014 ${new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}`,
      plan_data: plan,
      date_logged: new Date().toISOString().split('T')[0],
    });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header with tabs */}
      <div className="px-4 lg:px-6 py-4 border-b border-surface-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
                Atlas
                <span className="badge bg-brand-500/15 text-brand-400 border border-brand-500/20">
                  <Sparkles className="w-3 h-3" /> Smart
                </span>
              </h2>
              <p className="text-xs text-surface-500">Your personal study assistant</p>
            </div>
          </div>
          {tab === 'chat' && messages.length > 0 && (
            <button onClick={handleClear} className="btn-ghost flex items-center gap-1.5 text-sm">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          {tab === 'plan' && planGenerated && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPlanGenerated(false); setTimeout(() => setPlanGenerated(true), 50); }}
                className="btn-ghost flex items-center gap-1.5 text-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
              <button
                onClick={handleSavePlan}
                disabled={saving || saved}
                className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-all ${
                  saved ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'btn-secondary'
                }`}
              >
                {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-900 rounded-xl p-1 w-fit">
          <TabButton active={tab === 'chat'} onClick={() => setTab('chat')} icon={MessageSquare} label="Chat" />
          <TabButton active={tab === 'plan'} onClick={() => setTab('plan')} icon={CalendarDays} label="Study Plan" />
        </div>
      </div>

      {/* Content */}
      {tab === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <WelcomeScreen onPrompt={(p) => handleSend(p)} />
              ) : (
                <>
                  {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
                  {sending && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-brand-400" />
                      </div>
                      <div className="bg-surface-800 border border-surface-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                        <span className="text-sm text-surface-400">Thinking...</span>
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="flex justify-center">
                      <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" />
                        {error}. Try again.
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={scrollRef} />
            </div>
          </div>

          <div className="px-4 lg:px-6 py-4 border-t border-surface-800 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about your studies..."
                  className="input-field flex-1"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="btn-primary flex items-center gap-2 px-5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Stats bar */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
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

            {!planGenerated ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="text-center mb-2">
                  <h3 className="text-lg font-display font-semibold text-surface-100 mb-1">Ready to build your plan?</h3>
                  <p className="text-surface-400 text-sm">The AI analyzes your deadlines, priorities, and schedule to create the optimal study plan for you.</p>
                </div>
                <button onClick={() => setPlanGenerated(true)} className="btn-primary flex items-center gap-2 px-8 py-3 text-base">
                  <Sparkles className="w-5 h-5" />
                  Generate My Study Plan
                </button>
                <p className="text-xs text-surface-600">Analyzes {pendingCount} tasks \u00B7 {events.length} events</p>
              </div>
            ) : (
              <div className="space-y-5 animate-slide-up">
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
                      <div key={idx} className="glass-card p-4 flex items-start gap-4 hover:border-surface-700 transition-all" style={{ animationDelay: `${idx * 80}ms` }}>
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
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function WelcomeScreen({ onPrompt }: { onPrompt: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 border border-brand-500/30 flex items-center justify-center mb-6 shadow-brand">
        <Bot className="w-10 h-10 text-brand-400" />
      </div>

      <h3 className="font-display font-bold text-white text-2xl mb-2">Hi, I'm Atlas</h3>
      <p className="text-surface-400 text-sm text-center max-w-md mb-8 leading-relaxed">
        Your personal study assistant. I know your tasks, schedule, and deadlines \u2014 ask me anything to get personalized advice.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="text-left p-4 rounded-2xl bg-surface-800/60 border border-surface-700 hover:border-brand-500/30 hover:bg-surface-800 transition-all group"
          >
            <p className="text-sm text-surface-300 group-hover:text-surface-100 transition-colors">{prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-surface-700 border border-surface-600' : 'bg-brand-500/15 border border-brand-500/30'
      }`}>
        {isUser ? <span className="text-xs font-bold text-surface-300">You</span> : <Bot className="w-4 h-4 text-brand-400" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser ? 'bg-brand-500 text-white rounded-br-sm' : 'bg-surface-800 border border-surface-700 text-surface-100 rounded-bl-sm'
      }`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
