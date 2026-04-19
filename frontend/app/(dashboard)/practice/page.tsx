'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Textarea } from '../../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Check, X, ArrowRight, Lightbulb, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AIQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface AILesson {
  topic: string;
  tldr: string;
  key_concepts: string[];
  why_it_matters: string;
}

interface TopicResult {
  topic: string;
  correct: number;
  total: number;
}

type Phase = 'loading' | 'lesson' | 'quiz' | 'submitting' | 'error';

export default function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Topic comes from ?topic=Neural+Networks&score=30 (passed from gap-analysis / galaxy)
  const topicParam = searchParams.get('topic') || '';
  const scoreBeforeParam = parseInt(searchParams.get('score') || '0', 10);

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // AI content
  const [lesson, setLesson] = useState<AILesson | null>(null);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [topic, setTopic] = useState(topicParam);

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<TopicResult[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  // Fetch AI questions on mount
  useEffect(() => {
    const load = async () => {
      if (!topicParam) {
        // No topic provided — show topic picker (fallback)
        setPhase('error');
        setErrorMsg('No topic selected. Please choose a gap to study from the Gap Analysis page.');
        return;
      }

      setPhase('loading');
      try {
        const token = await getToken();
        if (!token) { router.push('/login'); return; }

        const res = await fetch('http://localhost:8000/practice/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ topic: topicParam }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to generate questions.');
        }

        const data = await res.json();

        // data = { node_topic, lesson: {...}, quiz: [{...}] }
        setTopic(data.node_topic || topicParam);
        setLesson(data.lesson || null);
        setQuestions(data.quiz || []);
        setPhase(data.lesson ? 'lesson' : 'quiz');
      } catch (err: any) {
        setErrorMsg(err.message || 'Something went wrong loading questions.');
        setPhase('error');
      }
    };

    load();
  }, [topicParam, getToken, router]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0
    ? ((currentIndex + (isSubmitted ? 1 : 0)) / questions.length) * 100
    : 0;

  const handleSubmit = () => {
    const correct = selectedAnswer === currentQuestion.correct_answer;
    setIsCorrect(correct);
    setIsSubmitted(true);
  };

  const handleNext = async () => {
    // Record result for this question
    const correct = isCorrect ? 1 : 0;
    const updatedResults = [...results];
    const existing = updatedResults.find(r => r.topic === topic);
    if (existing) {
      existing.correct += correct;
      existing.total += 1;
    } else {
      updatedResults.push({ topic, correct, total: 1 });
    }
    setResults(updatedResults);

    const newCorrectCount = correctCount + (isCorrect ? 1 : 0);
    setCorrectCount(newCorrectCount);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer('');
      setIsSubmitted(false);
      setIsCorrect(false);
    } else {
      // Session complete — save and go to feedback
      await finishSession(updatedResults, newCorrectCount);
    }
  };

  const finishSession = async (finalResults: TopicResult[], finalCorrect: number) => {
    setPhase('submitting');
    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }

      const res = await fetch('http://localhost:8000/practice/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          score_before: scoreBeforeParam,
          results: finalResults,
        }),
      });

      if (!res.ok) {
        // Don't block navigation on save failure — just warn
        toast.error('Could not save session, but your results are ready.');
        sessionStorage.setItem('practice_result', JSON.stringify({
          score_before: scoreBeforeParam,
          score_after: Math.round((finalCorrect / questions.length) * 100),
          improvement: Math.round((finalCorrect / questions.length) * 100) - scoreBeforeParam,
          badge: null,
          results: finalResults,
        }));
      } else {
        const sessionData = await res.json();
        sessionStorage.setItem('practice_result', JSON.stringify(sessionData));
      }

      router.push('/feedback');
    } catch {
      toast.error('Could not save session, but your results are ready.');
      sessionStorage.setItem('practice_result', JSON.stringify({
        score_before: scoreBeforeParam,
        score_after: Math.round((finalCorrect / questions.length) * 100),
        improvement: Math.round((finalCorrect / questions.length) * 100) - scoreBeforeParam,
        badge: null,
        results: finalResults,
      }));
      router.push('/feedback');
    }
  };

  // ── Loading state ──
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={scoreBeforeParam} />
        <div className="ml-60 mt-16 p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-xl mb-2">Generating your lesson...</p>
            <p className="text-muted-foreground">AI is building a crash course on <span className="text-primary font-medium">{topicParam}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={0} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-2xl mx-auto">
            <GlassCard className="text-center">
              <X className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-xl mb-2">Could not load practice</h3>
              <p className="text-muted-foreground mb-6">{errorMsg}</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.push('/gap-analysis')} className="bg-primary hover:bg-primary/90">
                  Go to Gap Analysis
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitting state ──
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={scoreBeforeParam} />
        <div className="ml-60 mt-16 p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-xl">Saving your results...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Lesson phase ──
  if (phase === 'lesson' && lesson) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={scoreBeforeParam} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2 className="text-2xl">Quick Lesson: {lesson.topic}</h2>
            </div>

            <GlassCard className="mb-6">
              <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-primary font-medium mb-1">TL;DR</p>
                <p className="text-foreground">{lesson.tldr}</p>
              </div>

              <h3 className="text-lg font-medium mb-3">Key Concepts</h3>
              <ul className="space-y-2 mb-6">
                {lesson.key_concepts.map((concept, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-mastered mt-0.5 flex-shrink-0" />
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>

              <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
                <p className="text-sm text-secondary font-medium mb-1">Why it matters for the exam</p>
                <p className="text-sm text-foreground">{lesson.why_it_matters}</p>
              </div>
            </GlassCard>

            <Button
              onClick={() => setPhase('quiz')}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-lg"
            >
              I'm Ready — Start Quiz <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz phase ──
  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={scoreBeforeParam} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl">Quiz: {topic}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Question {currentIndex + 1} of {questions.length}
                </p>
              </div>
              <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <GlassCard>
            <div className="mb-6">
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4 inline-block">
                Multiple Choice
              </span>
              <h3 className="text-xl mt-2">{currentQuestion.question}</h3>
            </div>

            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              disabled={isSubmitted}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrectOption = option === currentQuestion.correct_answer;
                return (
                  <div
                    key={index}
                    className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                      isSubmitted && isCorrectOption
                        ? 'border-mastered bg-mastered/10'
                        : isSubmitted && isSelected && !isCorrectOption
                        ? 'border-missing bg-missing/10'
                        : isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={option} id={`option-${index}`} className="mr-3" />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                    {isSubmitted && isCorrectOption && <Check className="w-5 h-5 text-mastered" />}
                    {isSubmitted && isSelected && !isCorrectOption && <X className="w-5 h-5 text-missing" />}
                  </div>
                );
              })}
            </RadioGroup>

            {isSubmitted && (
              <div className={`mt-6 p-4 rounded-lg border-2 ${
                isCorrect ? 'bg-mastered/10 border-mastered/30' : 'bg-missing/10 border-missing/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect
                    ? <><Check className="w-5 h-5 text-mastered" /><span className="font-semibold text-mastered">Correct!</span></>
                    : <><X className="w-5 h-5 text-missing" /><span className="font-semibold text-missing">Incorrect</span></>
                  }
                </div>
                <div className="mt-3 p-3 bg-partial/10 border border-partial/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-partial flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-partial mb-1">Explanation</p>
                      <p className="text-sm text-foreground">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              {!isSubmitted ? (
                <Button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === ''}
                  className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNext} className="w-full h-11 bg-primary hover:bg-primary/90">
                  {currentIndex < questions.length - 1
                    ? <><span>Next Question</span><ArrowRight className="w-5 h-5 ml-2" /></>
                    : 'Complete Practice'
                  }
                </Button>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}