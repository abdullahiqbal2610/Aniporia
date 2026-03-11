import { MasteryBadge } from './MasteryBadge';

interface TopNavProps {
  masteryPercentage: number;
}

export function TopNav({ masteryPercentage }: TopNavProps) {
  return (
    <div className="fixed top-0 left-60 right-0 h-16 bg-background border-b border-border flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-xl">Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <MasteryBadge percentage={masteryPercentage} />
      </div>
    </div>
  );
}
