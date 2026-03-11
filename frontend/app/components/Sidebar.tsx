import { LayoutDashboard, Upload, Globe, AlertCircle, BookOpen, Lock, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'galaxy', label: 'Galaxy', icon: Globe },
    { id: 'gap-analysis', label: 'Gap Analysis', icon: AlertCircle },
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'mock-exam', label: 'Mock Exam', icon: Lock, locked: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-60 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl text-primary">Aniporia</h1>
        <p className="text-xs text-muted-foreground mt-1">Know What You Don't Know</p>
      </div>

      <nav className="flex-1 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => !item.locked && onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-all min-h-[44px]',
                'hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                currentPage === item.id && 'bg-sidebar-primary text-sidebar-primary-foreground',
                item.locked && 'opacity-50 cursor-not-allowed'
              )}
              disabled={item.locked}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
