import { cn } from '../../lib/utils';

interface MasteryBadgeProps {
  percentage: number;
  className?: string;
}

export function MasteryBadge({ percentage, className }: MasteryBadgeProps) {
  const getColor = () => {
    if (percentage >= 70) return 'bg-mastered/20 text-mastered border-mastered/30';
    if (percentage >= 40) return 'bg-partial/20 text-partial border-partial/30';
    return 'bg-missing/20 text-missing border-missing/30';
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium',
        getColor(),
        className
      )}
    >
      {percentage}% Mastered
    </span>
  );
}
