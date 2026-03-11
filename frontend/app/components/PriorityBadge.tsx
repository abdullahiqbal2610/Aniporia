import { cn } from '../../lib/utils';

interface PriorityBadgeProps {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  className?: string;
}

export function PriorityBadge({ level, className }: PriorityBadgeProps) {
  const colors = {
    HIGH: 'bg-missing/20 text-missing border-missing/30',
    MEDIUM: 'bg-partial/20 text-partial border-partial/30',
    LOW: 'bg-secondary/20 text-secondary border-secondary/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium uppercase',
        colors[level],
        className
      )}
    >
      {level}
    </span>
  );
}
