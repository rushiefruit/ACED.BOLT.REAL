import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-surface-500" />
      </div>
      <h3 className="text-base font-semibold text-surface-200 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 max-w-xs mb-4">{description}</p>
      {action}
    </div>
  );
}
