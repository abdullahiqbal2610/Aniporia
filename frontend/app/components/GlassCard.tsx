import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card rounded-2xl p-6 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-primary/50',
        className
      )}
    >
      {children}
    </div>
  );
}
