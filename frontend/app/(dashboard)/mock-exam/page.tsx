'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Lock, Clock, FileText, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Question {
  id: number;
  topic: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── PDF generation (client-side, no extra library needed) ──────────────────
function downloadResultsPDF(
  score: number,
  correct: number,
  total: number,
  badge: string | null,
  topicBreakdown: Record<string, { correct: number; total: number }>,
  questions: Question[],
  answers: Record<number, string>
) {
  const lines: string[] = [];

  lines.push('ANIPORIA MOCK EXAM REPORT');
  lines.push('='.repeat(50));
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push('');
  lines.push(`OVERALL SCORE: ${score}% (${correct}/${total} correct)`);
  if (badge) lines.push(`Badge Earned: ${badge}`);
  lines.push(`Result: ${score >= 70 ? 'PASSED ✓' : 'NOT PASSED ✗'}`);
  lines.push('');
  lines.push('TOPIC BREAKDOWN');
  lines.push('-'.repeat(40));
  for (const [topic, vals] of Object.entries(topicBreakdown)) {
    const pct = Math.round((vals.correct / vals.total) * 100);
    lines.push(`${topic}: ${vals.correct}/${vals.total} (${pct}%)`);
  }
  lines.push('');
  lines.push('QUESTION REVIEW');
  lines.push('-'.repeat(40));
  questions.forEach((q, idx) => {
    const userAns = answers[q.id] ?? '(not answered)';
    const isCorrect = userAns === q.correct_answer;
    lines.push('');
    lines.push(`Q${idx + 1} [${q.topic}]: ${q.question}`);
    lines.push(`  Your answer:    ${userAns} ${isCorrect ? '✓' : '✗'}`);
    if (!isCorrect) lines.push(`  Correct answer: ${q.correct_answer}`);
    lines.push(`  Explanation: ${q.explanation}`);
  });

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aniporia-mock-exam-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MockExamPage() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isInProgress, setIsInProgress] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [examResults, setExamResults] = useState<{
    score: number;
    correct: number;
    total: number;
    passed: boolean;
    badge: string | null;
    topic_breakdown: Record<string, { correct: number; total: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [examStatus, setExamStatus] = useState<{
    current_mastery: number;
    is_unlocked: boolean;
    gap_topics: string[];
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 120 minutes in seconds

  useEffect(() => {
    fetchExamStatus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!isInProgress) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isInProgress]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const fetchExamStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/practice/mock-exam/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setExamStatus(await res.json());
    } catch (e) {
      console.error('Failed to fetch exam status:', e);
    }
  };

  const handleStartExam = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not authenticated'); return; }

      const res = await fetch(`${API_URL}/practice/mock-exam/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) { toast.error('Failed to start exam'); return; }

      const data = await res.json();
      setQuestions(data.questions);
      setAnswers({});
      setCurrentQuestion(1);
      setTimeLeft(data.time_limit_minutes * 60);
      setIsInProgress(true);
      toast.success(`Exam started — ${data.total_questions} questions`);
    } catch (e) {
      console.error(e);
      toast.error('Error starting exam');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExam = async () => {
    if (submitting) return;
    clearInterval(timerRef.current!);
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not authenticated'); return; }

      const res = await fetch(`${API_URL}/practice/mock-exam/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,        // { question_id: selected_answer_string }
          questions,      // full question list for server-side scoring
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Failed to submit exam');
        return;
      }

      const results = await res.json();
      setExamResults(results);
      setIsInProgress(false);
      setIsCompleted(true);
      toast.success('Exam submitted!');
    } catch (e) {
      console.error(e);
      toast.error('Error submitting exam');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAnswer = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const currentMastery = examStatus?.current_mastery ?? 0;

  // ── RESULTS PAGE ──────────────────────────────────────────────────────────
  if (isCompleted && examResults) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="mock-exam" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={currentMastery} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl mb-8">Mock Exam Results</h2>

            <GlassCard className="mb-8 text-center">
              <p className="text-6xl font-bold text-primary mb-2">{examResults.score}%</p>
              <p className="text-xl text-muted-foreground mb-2">Overall Score</p>
              <p className={`text-lg font-semibold mb-4 ${examResults.passed ? 'text-green-500' : 'text-red-500'}`}>
                {examResults.passed ? '✓ Passed' : '✗ Not Passed'}
              </p>

              <div className="grid grid-cols-3 gap-6 mt-4">
                <div className="p-4 rounded-lg bg-mastered/10 border border-mastered/30">
                  <p className="text-3xl font-bold text-mastered">{examResults.correct}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </div>
                <div className="p-4 rounded-lg bg-missing/10 border border-missing/30">
                  <p className="text-3xl font-bold text-missing">{examResults.total - examResults.correct}</p>
                  <p className="text-sm text-muted-foreground">Incorrect</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
                  <p className="text-3xl font-bold text-secondary">{examResults.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>

              {examResults.badge && (
                <div className="mt-6">
                  <Badge className="bg-primary text-white text-sm px-4 py-1">{examResults.badge}</Badge>
                </div>
              )}
            </GlassCard>

            {/* Topic Breakdown */}
            {examResults.topic_breakdown && Object.keys(examResults.topic_breakdown).length > 0 && (
              <GlassCard className="mb-8">
                <h3 className="text-xl mb-4">Topic Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(examResults.topic_breakdown).map(([topic, vals]) => {
                    const pct = Math.round((vals.correct / vals.total) * 100);
                    return (
                      <div key={topic}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{topic}</span>
                          <span className="text-muted-foreground">{vals.correct}/{vals.total} ({pct}%)</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            <div className="flex gap-4">
              <Button
                onClick={() =>
                  downloadResultsPDF(
                    examResults.score,
                    examResults.correct,
                    examResults.total,
                    examResults.badge,
                    examResults.topic_breakdown,
                    questions,
                    answers
                  )
                }
                className="flex-1 h-11 bg-primary hover:bg-primary/90"
              >
                <Download className="w-5 h-5 mr-2" /> Download Report
              </Button>
              <Button onClick={() => router.push('/dashboard')} variant="outline" className="h-11 border-border hover:bg-accent">
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── IN PROGRESS PAGE ──────────────────────────────────────────────────────
  if (isInProgress && questions.length > 0) {
    const currentQ = questions[currentQuestion - 1];
    const answered = Object.keys(answers).length;

    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="mock-exam" onNavigate={(page) => router.push(`/${page}`)} />

        {/* Top bar */}
        <div className="fixed top-0 left-60 right-0 h-16 flex items-center justify-between px-6 z-20 border-b bg-background border-border">
          <div className="flex items-center gap-4">
            <Clock className={`w-5 h-5 ${timeLeft < 600 ? 'text-red-500' : 'text-primary'}`} />
            <span className={`text-2xl font-bold font-mono ${timeLeft < 600 ? 'text-red-500' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm">
              Q{currentQuestion}/{questions.length} · {answered} answered
            </span>
            <Button
              onClick={handleSubmitExam}
              disabled={submitting}
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Submitting...</> : 'Submit Exam'}
            </Button>
          </div>
        </div>

        <div className="ml-60 mt-16 p-8 flex gap-6">
          {/* Question navigator */}
          <div className="w-60 flex-shrink-0">
            <GlassCard className="sticky top-24">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Questions</h3>
              <div className="grid grid-cols-5 gap-1.5 max-h-[70vh] overflow-y-auto">
                {questions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(q.id)}
                    className={`w-9 h-9 rounded-lg text-xs font-medium transition-all border-2 ${
                      q.id === currentQuestion
                        ? 'border-primary bg-primary/20 text-primary'
                        : answers[q.id]
                        ? 'border-green-500/50 bg-green-500/10 text-green-400'
                        : 'border-border hover:border-primary/40 text-muted-foreground'
                    }`}
                  >
                    {q.id}
                  </button>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border-2 border-green-500/50 bg-green-500/10" />
                  Answered ({answered})
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border-2 border-border" />
                  Unanswered ({questions.length - answered})
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Question card */}
          <div className="flex-1">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="text-xs">{currentQ.topic}</Badge>
                <span className="text-xs text-muted-foreground">Question {currentQuestion} of {questions.length}</span>
              </div>

              <h3 className="text-xl mb-6 leading-relaxed">{currentQ.question}</h3>

              <div className="space-y-3">
                {currentQ.options.map((option, idx) => {
                  const isSelected = answers[currentQ.id] === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(currentQ.id, option)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/15 text-foreground'
                          : 'border-border hover:border-primary/40 hover:bg-accent/50'
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border mr-3 text-xs font-bold transition-all ${
                        isSelected ? 'bg-primary border-primary text-white' : 'border-border text-muted-foreground'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-8">
                <Button
                  disabled={currentQuestion === 1}
                  onClick={() => setCurrentQuestion((p) => p - 1)}
                  variant="outline"
                  className="flex-1"
                >
                  ← Previous
                </Button>
                {currentQuestion < questions.length ? (
                  <Button
                    onClick={() => setCurrentQuestion((p) => p + 1)}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    Next →
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitExam}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Submitting...</> : 'Submit Exam ✓'}
                  </Button>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  // ── START PAGE ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="mock-exam" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={currentMastery} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl mb-8 text-center">Mock Exam</h2>

          <GlassCard className="text-center">
            <div className="w-24 h-24 rounded-full bg-mastered/20 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-mastered" />
            </div>
            <h3 className="text-2xl mb-4">AI-Generated Mock Exam</h3>
            <p className="text-muted-foreground mb-8">
              50 questions generated from your actual knowledge gaps using AI
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8 text-left">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold text-primary">50</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-muted-foreground">Time Limit</p>
                <p className="text-2xl font-bold text-primary">120 min</p>
              </div>
              <div className="p-4 rounded-lg bg-mastered/10 border border-mastered/30">
                <p className="text-sm text-muted-foreground">Your Mastery</p>
                <p className="text-2xl font-bold text-mastered">{currentMastery}%</p>
              </div>
            </div>

            {examStatus?.gap_topics && examStatus.gap_topics.length > 0 && (
              <div className="mb-8 text-left">
                <p className="text-sm text-muted-foreground mb-2">Topics covered from your gaps:</p>
                <div className="flex flex-wrap gap-2">
                  {examStatus.gap_topics.slice(0, 8).map((t) => (
                    <Badge key={t} variant="outline" className="border-primary/30 text-primary text-xs">{t}</Badge>
                  ))}
                  {examStatus.gap_topics.length > 8 && (
                    <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                      +{examStatus.gap_topics.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleStartExam}
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-lg"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating AI Questions...</>
              ) : (
                'Start Mock Exam'
              )}
            </Button>
            {loading && (
              <p className="text-xs text-muted-foreground mt-3">
                AI is generating personalized questions from your knowledge gaps...
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}