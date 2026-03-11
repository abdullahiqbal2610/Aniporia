'use client';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Trophy, TrendingUp, Target, Award } from 'lucide-react';

export default function FeedbackPage() {
  const router = useRouter();
  const score = 80;
  const oldMastery = 35;
  const newMastery = 80;
  const breakdown = [
    { topic: 'Binary Search', correct: 4, total: 5 },
    { topic: 'Hash Tables', correct: 5, total: 5 },
    { topic: 'Graph Algorithms', correct: 3, total: 5 },
    { topic: 'Dynamic Programming', correct: 4, total: 5 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={newMastery} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl mb-8 text-center">Practice Complete!</h2>
          <GlassCard className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="#1E2235" strokeWidth="12" fill="none" />
                <circle cx="96" cy="96" r="80" stroke="#7C3AED" strokeWidth="12" fill="none" strokeDasharray={`${(score / 100) * 502.4} 502.4`} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div><p className="text-5xl font-bold text-primary">{score}%</p><p className="text-sm text-muted-foreground">Score</p></div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-8 mb-6">
              <div><p className="text-muted-foreground text-sm mb-1">Before</p><p className="text-2xl font-bold text-missing">{oldMastery}%</p></div>
              <TrendingUp className="w-8 h-8 text-mastered" />
              <div><p className="text-muted-foreground text-sm mb-1">After</p><p className="text-2xl font-bold text-mastered">{newMastery}%</p></div>
            </div>
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
              <Trophy className="w-6 h-6 text-primary" />
              <div className="text-left"><p className="text-sm text-muted-foreground">Badge Earned</p><p className="font-semibold text-primary">Quick Learner</p></div>
            </div>
          </GlassCard>
          <GlassCard className="mb-8">
            <h3 className="text-xl mb-6 flex items-center gap-2"><Target className="w-6 h-6 text-secondary" />Performance Breakdown</h3>
            <div className="space-y-4">
              {breakdown.map((item) => (
                <div key={item.topic}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.topic}</span>
                    <span className="text-sm text-muted-foreground">{item.correct} / {item.total} correct</span>
                  </div>
                  <Progress value={(item.correct / item.total) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="mb-8">
            <h3 className="text-xl mb-4 flex items-center gap-2"><Award className="w-6 h-6 text-partial" />AI Insights</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-mastered/10 border border-mastered/30">
                <p className="font-medium text-mastered mb-1">Strengths</p>
                <p className="text-sm text-foreground">Excellent understanding of Hash Tables and Binary Search algorithms. Your implementation knowledge is solid.</p>
              </div>
              <div className="p-4 rounded-lg bg-partial/10 border border-partial/30">
                <p className="font-medium text-partial mb-1">Areas for Improvement</p>
                <p className="text-sm text-foreground">Focus more on Graph Algorithms, particularly shortest path algorithms and graph traversal patterns.</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
                <p className="font-medium text-secondary mb-1">Recommendation</p>
                <p className="text-sm text-foreground">Continue practicing Dynamic Programming patterns. You're making great progress! Try 5 more problems to solidify your understanding.</p>
              </div>
            </div>
          </GlassCard>
          <div className="flex gap-4">
            <Button onClick={() => router.push('/practice')} className="flex-1 h-11 bg-primary hover:bg-primary/90">Practice Again</Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline" className="flex-1 h-11 border-border hover:bg-accent">Back to Dashboard</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
