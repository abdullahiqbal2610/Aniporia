'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Lock, Clock, FileText, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Question {
  id: number;
  question: string;
  options: string[];
  correct_answer: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function MockExamPage() {
  const router = useRouter();
  const [isInProgress, setIsInProgress] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(50);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [examResults, setExamResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [examStatus, setExamStatus] = useState<any>(null);
  
  const gapsRemaining = 12;
  const requiredMastery = 0;
  const [currentMastery, setCurrentMastery] = useState(78);

  const gaps = ['Process Scheduling', 'Memory Management', 'Shader Programming', 'K-Means Clustering', 'Dynamic Programming', 'Graph Traversal', 'Ray Tracing', 'Decision Trees', 'Hash Collisions', 'Neural Networks', 'File Systems', 'Concurrency'];

  const isUnlocked = currentMastery >= requiredMastery;

  // Fetch exam status on mount
  useEffect(() => {
    fetchExamStatus();
  }, []);

  const fetchExamStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`${API_URL}/practice/mock-exam/status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const status = await response.json();
        setExamStatus(status);
        setCurrentMastery(status.current_mastery);
      }
    } catch (error) {
      console.error('Failed to fetch exam status:', error);
    }
  };

  const handleStartExam = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`${API_URL}/practice/mock-exam/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions);
        setTotalQuestions(data.total_questions);
        setAnswers({});
        setCurrentQuestion(1);
        setIsInProgress(true);
        toast.success('Exam started!');
      } else {
        toast.error('Failed to start exam');
      }
    } catch (error) {
      console.error('Failed to start exam:', error);
      toast.error('Error starting exam');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExam = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`${API_URL}/practice/mock-exam/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      if (response.ok) {
        const results = await response.json();
        setExamResults(results);
        setIsInProgress(false);
        setIsCompleted(true);
        toast.success('Exam submitted!');
      } else {
        toast.error('Failed to submit exam');
      }
    } catch (error) {
      console.error('Failed to submit exam:', error);
      toast.error('Error submitting exam');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

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
              <p className="text-xl text-muted-foreground">Overall Score</p>
              <div className="grid grid-cols-3 gap-6 mt-6">
                <div className="p-4 rounded-lg bg-mastered/10 border border-mastered/30"><p className="text-3xl font-bold text-mastered">{examResults.correct}</p><p className="text-sm text-muted-foreground">Correct</p></div>
                <div className="p-4 rounded-lg bg-missing/10 border border-missing/30"><p className="text-3xl font-bold text-missing">{examResults.total - examResults.correct}</p><p className="text-sm text-muted-foreground">Incorrect</p></div>
                <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30"><p className="text-3xl font-bold text-secondary">120 min</p><p className="text-sm text-muted-foreground">Time Limit</p></div>
              </div>
              {examResults.badge && (
                <div className="mt-6">
                  <Badge className="bg-primary text-white">{examResults.badge}</Badge>
                </div>
              )}
            </GlassCard>
            <div className="flex gap-4">
              <Button className="flex-1 h-11 bg-primary hover:bg-primary/90"><Download className="w-5 h-5 mr-2" />Download PDF Report</Button>
              <Button onClick={() => router.push('/dashboard')} variant="outline" className="h-11 border-border hover:bg-accent">Dashboard</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isInProgress && questions.length > 0) {
    const currentQ = questions[currentQuestion - 1];
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="mock-exam" onNavigate={(page) => router.push(`/${page}`)} />
        <div className="fixed top-0 left-60 right-0 h-16 flex items-center justify-between px-6 z-20 border-b bg-background border-border">
          <div className="flex items-center gap-4"><Clock className="w-6 h-6 text-primary" /><span className="text-2xl font-bold">120:00</span></div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Question {currentQuestion} / {totalQuestions}</span>
            <Button onClick={handleSubmitExam} disabled={loading} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">Submit Exam</Button>
          </div>
        </div>
        <div className="ml-60 mt-16 p-8 flex gap-6">
          <div className="w-64 flex-shrink-0">
            <GlassCard className="sticky top-24">
              <h3 className="text-lg font-semibold mb-4">Questions</h3>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => (
                  <button key={num} onClick={() => setCurrentQuestion(num)} className={`w-10 h-10 rounded-lg border-2 text-sm font-medium transition-all ${num === currentQuestion ? 'border-primary bg-primary/20 text-primary' : num in answers ? 'border-mastered bg-mastered/10 text-mastered' : 'border-border hover:border-primary/50'}`}>{num}</button>
                ))}
              </div>
            </GlassCard>
          </div>
          <div className="flex-1">
            <GlassCard>
              <Badge className="mb-4">Multiple Choice</Badge>
              <h3 className="text-xl mb-6">{currentQ.question}</h3>
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <button key={index} onClick={() => handleSelectAnswer(currentQ.id, index)} className={`w-full p-4 rounded-lg border-2 transition-all ${answers[currentQ.id] === index ? 'border-primary bg-primary/20' : 'border-border hover:border-primary/50'}`}>{option}</button>
                ))}
              </div>
              <div className="flex gap-4 mt-8">
                <Button disabled={currentQuestion === 1} onClick={() => setCurrentQuestion(currentQuestion - 1)} variant="outline" className="flex-1">Previous</Button>
                <Button onClick={() => currentQuestion < totalQuestions ? setCurrentQuestion(currentQuestion + 1) : handleSubmitExam()} disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">{currentQuestion === totalQuestions ? 'Submit' : 'Next'}</Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="mock-exam" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={currentMastery} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl mb-8 text-center">Mock Exam</h2>
          {isUnlocked ? (
            <GlassCard className="text-center">
              <div className="w-24 h-24 rounded-full bg-mastered/20 flex items-center justify-center mx-auto mb-6"><FileText className="w-12 h-12 text-mastered" /></div>
              <h3 className="text-2xl mb-4">Ready for Mock Exam?</h3>
              <p className="text-muted-foreground mb-8">Test your knowledge across {totalQuestions} questions</p>
              <div className="mb-8 text-left">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30"><p className="text-sm text-muted-foreground">Total Questions</p><p className="text-2xl font-bold text-primary">{totalQuestions}</p></div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30"><p className="text-sm text-muted-foreground">Time Limit</p><p className="text-2xl font-bold text-primary">120 min</p></div>
                  <div className="p-4 rounded-lg bg-mastered/10 border border-mastered/30"><p className="text-sm text-muted-foreground">Your Mastery</p><p className="text-2xl font-bold text-mastered">{currentMastery}%</p></div>
                </div>
              </div>
              <Button onClick={handleStartExam} disabled={loading} className="w-full h-11 bg-primary hover:bg-primary/90">Start Mock Exam</Button>
            </GlassCard>
          ) : (
            <GlassCard className="text-center">
              <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-6"><Lock className="w-12 h-12 text-muted" /></div>
              <h3 className="text-2xl mb-4">Mock Exam Locked</h3>
              <p className="text-muted-foreground mb-8">Close your knowledge gaps to unlock the mock exam</p>
              <div className="relative inline-block mb-6">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle cx="96" cy="96" r="80" stroke="#1E2235" strokeWidth="12" fill="none" />
                  <circle cx="96" cy="96" r="80" stroke="#7C3AED" strokeWidth="12" fill="none" strokeDasharray={`${(currentMastery / requiredMastery) * 502.4} 502.4`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><div><p className="text-4xl font-bold text-primary">{currentMastery}%</p><p className="text-sm text-muted-foreground">of {requiredMastery}%</p></div></div>
              </div>
              <div className="mb-8">
                <p className="text-lg mb-4 font-semibold">Remaining Gaps ({gapsRemaining})</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {gaps.map((gap) => (<Badge key={gap} variant="outline" className="border-missing/30 text-missing">{gap}</Badge>))}
                </div>
              </div>
              <Button onClick={() => router.push('/gap-analysis')} className="w-full h-11 bg-primary hover:bg-primary/90">Go Study Gaps</Button>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
