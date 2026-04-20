// frontend/app/(dashboard)/gap-analysis/page.tsx

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { AlertTriangle, TrendingUp, BookOpen, Loader2, ArrowRight } from 'lucide-react';
import { useMastery } from '../../hooks/useMastery';
import { supabase } from '@/lib/supabase';

interface Gap {
  id: string;
  topic: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  gap_score: number;
  course_id: string;
  course_name?: string;
}

export default function GapAnalysisPage() {
  const router = useRouter();
  const { mastery, loading: masteryLoading } = useMastery();
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGap, setSelectedGap] = useState<Gap | null>(null);

  useEffect(() => {
    const fetchGaps = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('http://localhost:8000/gaps/', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const gapsData = await response.json();
          setGaps(gapsData);
          
          // Select first high priority gap by default
          const highPriorityGap = gapsData.find((g: Gap) => g.priority === 'HIGH');
          if (highPriorityGap) {
            setSelectedGap(highPriorityGap);
          } else if (gapsData.length > 0) {
            setSelectedGap(gapsData[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching gaps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGaps();
  }, [router]);

  const handlePractice = () => {
    if (selectedGap) {
      // Get the current mastery for this specific gap
      const currentScore = selectedGap.gap_score || 0;
      
      // Navigate to practice with the topic and current score
      router.push(`/practice?topic=${encodeURIComponent(selectedGap.topic)}&score=${currentScore}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'text-red-500 bg-red-500/10';
      case 'MEDIUM':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'LOW':
        return 'text-green-500 bg-green-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'High Priority';
      case 'MEDIUM':
        return 'Medium Priority';
      case 'LOW':
        return 'Low Priority';
      default:
        return priority;
    }
  };

  if (loading || masteryLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const highPriorityCount = gaps.filter(g => g.priority === 'HIGH').length;
  const avgGapScore = gaps.length > 0 
    ? Math.round(gaps.reduce((sum, g) => sum + (g.gap_score || 0), 0) / gaps.length)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="gap-analysis" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={mastery} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl mb-2">Knowledge Gaps</h2>
          <p className="text-muted-foreground mb-8">
            Identify and close your knowledge gaps to improve mastery
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Gaps</p>
                  <p className="text-3xl font-bold">{gaps.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">High Priority</p>
                  <p className="text-3xl font-bold text-red-500">{highPriorityCount}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-500" />
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Avg. Gap Score</p>
                  <p className="text-3xl font-bold">{avgGapScore}%</p>
                </div>
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Gaps List */}
            <GlassCard>
              <h3 className="text-xl mb-4">Your Gaps</h3>
              {gaps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No knowledge gaps found!</p>
                  <p className="text-sm mt-2">Upload course materials to identify gaps.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gaps.map((gap) => (
                    <div
                      key={gap.id}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        selectedGap?.id === gap.id
                          ? 'bg-primary/20 border border-primary/50'
                          : 'bg-secondary/20 hover:bg-secondary/30'
                      }`}
                      onClick={() => setSelectedGap(gap)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{gap.topic}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(gap.priority)}`}>
                          {getPriorityLabel(gap.priority)}
                        </span>
                      </div>
                      <Progress value={gap.gap_score || 0} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        Score: {gap.gap_score || 0}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Selected Gap Details */}
            <GlassCard>
              {selectedGap ? (
                <>
                  <h3 className="text-xl mb-4">Practice Recommendation</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-muted-foreground text-sm">Topic</p>
                      <p className="text-lg font-semibold">{selectedGap.topic}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground text-sm">Current Score</p>
                      <div className="flex items-center gap-3">
                        <Progress value={selectedGap.gap_score || 0} className="flex-1 h-3" />
                        <span className="font-bold">{selectedGap.gap_score || 0}%</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-muted-foreground text-sm">Priority Level</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm ${getPriorityColor(selectedGap.priority)}`}>
                        {getPriorityLabel(selectedGap.priority)}
                      </span>
                    </div>

                    <div className="pt-4">
                      <Button 
                        onClick={handlePractice}
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        Practice This Topic
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-secondary/20 text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Why practice this?</p>
                      <p>
                        {selectedGap.priority === 'HIGH' 
                          ? 'This is a critical knowledge gap that needs immediate attention. Practice will significantly improve your mastery.'
                          : selectedGap.priority === 'MEDIUM'
                          ? 'Good progress but room for improvement. Regular practice will help solidify this topic.'
                          : 'You have a good grasp of this topic. A quick review will help maintain your knowledge.'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No gap selected</p>
                  <p className="text-sm mt-2">Click on a gap from the list to get started</p>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Quick Stats Section */}
          {gaps.length > 0 && (
            <div className="mt-8">
              <GlassCard>
                <h3 className="text-xl mb-4">Study Recommendations</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <p className="text-2xl font-bold text-red-500">{highPriorityCount}</p>
                    <p className="text-sm text-muted-foreground">High Priority Gaps</p>
                    <p className="text-xs mt-1">Practice these first</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                    <p className="text-2xl font-bold text-yellow-500">{gaps.filter(g => g.priority === 'MEDIUM').length}</p>
                    <p className="text-sm text-muted-foreground">Medium Priority</p>
                    <p className="text-xs mt-1">Review when possible</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <p className="text-2xl font-bold text-green-500">{gaps.filter(g => g.priority === 'LOW').length}</p>
                    <p className="text-sm text-muted-foreground">Low Priority</p>
                    <p className="text-xs mt-1">Quick maintenance</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}