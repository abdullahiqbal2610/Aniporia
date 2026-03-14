'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { PriorityBadge } from '../../components/PriorityBadge';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface Gap {
  id: string;
  topic: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  gap_score: number;
  course_id: string;
  courses?: { name: string; code: string };
}

export default function GapAnalysisPage() {
  const router = useRouter();
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGaps = async () => {
      try {
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const res = await fetch(`${API_URL}/gaps/`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) throw new Error(`Failed to fetch gaps: ${res.status}`);

        const data = await res.json();
        setGaps(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGaps();
  }, []);

  const highCount = gaps.filter(g => g.priority === 'HIGH').length;
  const mediumCount = gaps.filter(g => g.priority === 'MEDIUM').length;
  const lowCount = gaps.filter(g => g.priority === 'LOW').length;

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading gaps...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-red-500">Error: {error}</p>
    </div>
  );

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

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[
              { label: 'High Priority', count: highCount, level: 'HIGH' as const, colorClass: 'text-missing' },
              { label: 'Medium Priority', count: mediumCount, level: 'MEDIUM' as const, colorClass: 'text-partial' },
              { label: 'Low Priority', count: lowCount, level: 'LOW' as const, colorClass: 'text-secondary' },
            ].map(({ label, count, level, colorClass }) => (
              <GlassCard key={level}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground mb-1">{label}</p>
                    <p className={`text-3xl font-bold ${colorClass}`}>{count}</p>
                  </div>
                  <PriorityBadge level={level} />
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Gap Cards */}
          {gaps.length === 0 ? (
            <GlassCard>
              <p className="text-center text-muted-foreground py-8">
                No gaps found. Upload your notes to generate a gap analysis!
              </p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {gaps.map((gap) => (
                <GlassCard
                  key={gap.id}
                  className={
                    gap.priority === 'HIGH'
                      ? 'border-missing/50 bg-missing/5'
                      : gap.priority === 'MEDIUM'
                      ? 'border-partial/30'
                      : ''
                  }
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{gap.topic}</h3>
                      <p className="text-sm text-muted-foreground">
                        {gap.courses ? `${gap.courses.name} - ${gap.courses.code}` : 'Unknown Course'}
                      </p>
                    </div>
                    <PriorityBadge level={gap.priority} />
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Gap Score</span>
                      <span className="text-sm font-medium">{gap.gap_score}%</span>
                    </div>
                    <Progress value={gap.gap_score} className="h-2" />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => router.push('/practice')}
                      className="flex-1 bg-primary hover:bg-primary/90 h-11"
                    >
                      Study Now
                    </Button>
                    <Button
                      onClick={() => router.push('/practice')}
                      variant="outline"
                      className="flex-1 border-secondary/50 text-secondary hover:bg-secondary/10 h-11"
                    >
                      Jump to Practice
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}