import { useState } from 'react';
import { BookOpen, Zap, Trophy, Brain, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (mode === 'signup') {
      if (!fullName.trim()) { setError('Please enter your name.'); setLoading(false); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      const { error: err } = await signUp(email, password, fullName);
      if (err) setError(err);
      else setSuccess(true);
    } else {
      const { error: err } = await signIn(email, password);
      if (err) setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="text-center animate-slide-up max-w-sm">
          <div className="w-20 h-20 bg-brand-500/15 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-500/30">
            <CheckCircle className="w-10 h-10 text-brand-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">Account Created!</h2>
          <p className="text-surface-400 mb-6">Check your email to confirm your account, then sign in.</p>
          <button onClick={() => { setSuccess(false); setMode('login'); }} className="btn-primary w-full">
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-surface-900 border-r border-surface-800 p-10">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white">Aced</span>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-display font-bold text-white leading-tight mb-4">
                Your academic life,{' '}
                <span className="text-gradient-brand">supercharged.</span>
              </h1>
              <p className="text-surface-400 text-lg leading-relaxed">
                AI-powered planning, gamified progress, and smart reminders — all in one place.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Brain, label: 'AI Plan Advisor', desc: 'Personalized study schedules built around your life' },
                { icon: BookOpen, label: 'Dynamic Planner', desc: 'Never miss a deadline or exam again' },
                { icon: Trophy, label: 'Leaderboard', desc: 'Climb the ranks, stay motivated' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-surface-100 text-sm">{label}</div>
                    <div className="text-surface-400 text-sm">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
          <div className="text-2xl">🎓</div>
          <div>
            <div className="text-sm font-semibold text-brand-300">Trusted by students worldwide</div>
            <div className="text-xs text-surface-500">Middle school, high school, and university</div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-display font-bold text-white">Aced</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-white mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-surface-400 text-sm">
              {mode === 'login' ? 'Sign in to continue your academic journey' : 'Start your path to academic excellence'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex bg-surface-900 border border-surface-800 rounded-xl p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === m
                    ? 'bg-brand-500 text-white shadow-brand'
                    : 'text-surface-400 hover:text-surface-200'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="input-field"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-surface-500 text-sm mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
