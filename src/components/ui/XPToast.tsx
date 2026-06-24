import { Zap } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function XPToast() {
  const { xpAnimation } = useApp();

  if (!xpAnimation.show) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] animate-slide-up pointer-events-none">
      <div className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-2xl shadow-brand shadow-lg">
        <Zap className="w-4 h-4" />
        <span className="font-bold text-sm">+{xpAnimation.amount} XP</span>
      </div>
    </div>
  );
}
