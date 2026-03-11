'use client';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { PriorityBadge } from '../../components/PriorityBadge';
import { ArrowRight } from 'lucide-react';

interface Gap {
  id: string;
  topic: string;
  course: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  gapScore: number;
  description: string;
}

export default function GapAnalysisPage() {
  const router = useRouter();
  const gaps: Gap[] = [
    { id: '1', topic: 'Process Scheduling Algorithms', course: 'CS140 - Operating Systems', priority: 'HIGH', gapScore: 75, description: 'Missing understanding of Round Robin, Priority Scheduling, and Multilevel Queue concepts' },
    { id: '2', topic: 'Memory Management & Paging', course: 'CS140 - Operating Systems', priority: 'HIGH', gapScore: 70, description: 'Gaps in virtual memory, page replacement algorithms, and TLB concepts' },
    { id: '3', topic: 'Shader Programming Fundamentals', course: 'CS148 - Computer Graphics', priority: 'HIGH', gapScore: 68, description: 'GLSL syntax, vertex and fragment shaders need attention' },
    { id: '4', topic: 'K-Means Clustering', course: 'CS229 - Machine Learning', priority: 'HIGH', gapScore: 65, description: 'Algorithm implementation and choosing optimal K value' },
    { id: '5', topic: 'Dynamic Programming Patterns', course: 'CS106B - Data Structures', priority: 'MEDIUM', gapScore: 58, description: 'Memoization, tabulation, and common DP patterns' },
    { id: '6', topic: 'Graph Traversal Algorithms', course: 'CS106B - Data Structures', priority: 'MEDIUM', gapScore: 52, description: 'BFS, DFS, and their applications need reinforcement' },
    { id: '7', topic: 'Ray Tracing Techniques', course: 'CS148 - Computer Graphics', priority: 'MEDIUM', gapScore: 48, description: 'Reflection, refraction, and shadow calculations' },
    { id: '8', topic: 'Decision Tree Pruning', course: 'CS229 - Machine Learning', priority: 'MEDIUM', gapScore: 45, description: 'Pre-pruning and post-pruning strategies' },
    { id: '9', topic: 'Hash Table Collision Resolution', course: 'CS106B - Data Structures', priority: 'LOW', gapScore: 35, description: 'Chaining vs open addressing methods' },
    { id: '10', topic: 'Neural Network Regularization', course: 'CS229 - Machine Learning', priority: 'LOW', gapScore: 30, description: 'Dropout, L1/L2 regularization techniques' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="gap-analysis" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={62} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl mb-2">Gap Analysis Dashboard</h2>
            <p className="text-muted-foreground">Prioritized knowledge gaps across all your courses</p>
          </div>
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[
              { label: 'High Priority', count: 4, level: 'HIGH' as const, colorClass: 'text-missing' },
              { label: 'Medium Priority', count: 4, level: 'MEDIUM' as const, colorClass: 'text-partial' },
              { label: 'Low Priority', count: 2, level: 'LOW' as const, colorClass: 'text-secondary' },
            ].map(({ label, count, level, colorClass }) => (
              <GlassCard key={level}>
                <div className="flex items-center justify-between">
                  <div><p className="text-muted-foreground mb-1">{label}</p><p className={`text-3xl font-bold ${colorClass}`}>{count}</p></div>
                  <PriorityBadge level={level} />
                </div>
              </GlassCard>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {gaps.map((gap) => (
              <GlassCard key={gap.id} className={gap.priority === 'HIGH' ? 'border-missing/50 bg-missing/5' : gap.priority === 'MEDIUM' ? 'border-partial/30' : ''}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{gap.topic}</h3>
                    <p className="text-sm text-muted-foreground">{gap.course}</p>
                  </div>
                  <PriorityBadge level={gap.priority} />
                </div>
                <p className="text-sm text-muted-foreground mb-4">{gap.description}</p>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Gap Score</span>
                    <span className="text-sm font-medium">{gap.gapScore}%</span>
                  </div>
                  <Progress value={gap.gapScore} className="h-2" />
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => router.push('/practice')} className="flex-1 bg-primary hover:bg-primary/90 h-11">Study Now</Button>
                  <Button onClick={() => router.push('/practice')} variant="outline" className="flex-1 border-secondary/50 text-secondary hover:bg-secondary/10 h-11">
                    Jump to Practice<ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
