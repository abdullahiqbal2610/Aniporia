'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Trophy, TrendingUp, Target, Award, Loader2 } from 'lucide-react';

interface TopicResult {
  topic: string;
  correct: number;
  total: number;
}

interface PracticeResult {
  score_before: number;
  score_after: number;
  improvement: number;
  badge: string | null;
  results: TopicResult[];
}

const BADGE_MESSAGES: Record<string, string> = {
  'Massive Leap': 'Incredible improvement in one session!',
  'Quick Learner': 'Great progress — keep the momentum going.',
  'Top Scorer': 'Outstanding accuracy — you really know this.',
  'Solid Understanding': 'Strong grasp of the material.',
};

export default function FeedbackPage() {
  const router = useRouter();
  const [data, setData] = useState<PracticeResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_result');
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch {
        // Corrupt data — fall through to fallback
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallback if sessionStorage is missing (e.g. navigated here directly)
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={0} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-2xl mx-auto text-center">
            <GlassCard>
              <p className="text-muted-foreground mb-4">No session data found.</p>
              <Button onClick={() => router.push('/gap-analysis')} className="bg-primary hover:bg-primary/90">
                Go to Gap Analysis
              </Button>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  const { score_before, score_after, improvement, badge, results } = data;

  // AI insights computed from real results
  const bestTopic = results.reduce(
    (best, r) => (r.correct / r.total > (best?.correct / best?.total || 0) ? r : best),
    results[0]
  );
  const worstTopic = results.reduce(
    (worst, r) => (r.correct / r.total < (worst?.correct / worst?.total || 1) ? r : worst),
    results[0]
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={score_after} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl mb-8 text-center">Practice Complete!</h2>

          {/* Score ring */}
          <GlassCard className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="#1E2235" strokeWidth="12" fill="none" />
                <circle
                  cx="96" cy="96" r="80"
                  stroke="#7C3AED" strokeWidth="12" fill="none"
                  strokeDasharray={`${(score_after / 100) * 502.4} 502.4`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <p className="text-5xl font-bold text-primary">{score_after}%</p>
                  <p className="text-sm text-muted-foreground">Score</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 mb-6">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Before</p>
                <p className="text-2xl font-bold text-missing">{score_before}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-mastered" />
              <div>
                <p className="text-muted-foreground text-sm mb-1">After</p>
                <p className="text-2xl font-bold text-mastered">{score_after}%</p>
              </div>
            </div>

            {badge && (
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
                <Trophy className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Badge Earned</p>
                  <p className="font-semibold text-primary">{badge}</p>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Per-topic breakdown */}
          {results.length > 0 && (
            <GlassCard className="mb-8">
              <h3 className="text-xl mb-6 flex items-center gap-2">
                <Target className="w-6 h-6 text-secondary" />Performance Breakdown
              </h3>
              <div className="space-y-4">
                {results.map((item) => (
                  <div key={item.topic}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.topic}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.correct} / {item.total} correct
                      </span>
                    </div>
                    <Progress value={(item.correct / item.total) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* AI insights (derived from real results) */}
          <GlassCard className="mb-8">
            <h3 className="text-xl mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-partial" />AI Insights
            </h3>
            <div className="space-y-4">
              {improvement > 0 && (
                <div className="p-4 rounded-lg bg-mastered/10 border border-mastered/30">
                  <p className="font-medium text-mastered mb-1">Progress</p>
                  <p className="text-sm text-foreground">
                    You improved by <span className="font-semibold">+{improvement}%</span> in this session.
                    {badge && ` ${BADGE_MESSAGES[badge]}`}
                  </p>
                </div>
              )}

              {bestTopic && bestTopic.correct === bestTopic.total && (
                <div className="p-4 rounded-lg bg-mastered/10 border border-mastered/30">
                  <p className="font-medium text-mastered mb-1">Strength</p>
                  <p className="text-sm text-foreground">
                    Perfect score on <span className="font-semibold">{bestTopic.topic}</span> — excellent understanding.
                  </p>
                </div>
              )}

              {worstTopic && worstTopic.correct < worstTopic.total && (
                <div className="p-4 rounded-lg bg-partial/10 border border-partial/30">
                  <p className="font-medium text-partial mb-1">Area for improvement</p>
                  <p className="text-sm text-foreground">
                    Review <span className="font-semibold">{worstTopic.topic}</span> again — you got{' '}
                    {worstTopic.correct}/{worstTopic.total} correct. Try another round to solidify it.
                  </p>
                </div>
              )}

              <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
                <p className="font-medium text-secondary mb-1">Recommendation</p>
                <p className="text-sm text-foreground">
                  {score_after >= 80
                    ? 'Great mastery! Move on to the next gap topic or try the mock exam.'
                    : score_after >= 60
                    ? 'Good progress. Practice this topic one more time to reach mastery.'
                    : 'Keep going — consistent practice is the key. Try this topic again.'}
                </p>
              </div>
            </div>
          </GlassCard>

          <div className="flex gap-4">
            <Button
              onClick={() => router.push(`/practice?topic=${encodeURIComponent(results[0]?.topic || '')}&score=${score_after}`)}
              className="flex-1 h-11 bg-primary hover:bg-primary/90"
            >
              Practice Again
            </Button>
            <Button
              onClick={() => router.push('/gap-analysis')}
              variant="outline"
              className="flex-1 h-11 border-border hover:bg-accent"
            >
              Study Next Gap
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex-1 h-11 border-border hover:bg-accent"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}