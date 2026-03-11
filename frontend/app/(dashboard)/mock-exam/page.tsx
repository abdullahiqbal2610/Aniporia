'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Lock, Clock, FileText, Download } from 'lucide-react';

export default function MockExamPage() {
  const router = useRouter();
  const [isInProgress, setIsInProgress] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const totalQuestions = 50;
  const gapsRemaining = 12;
  const requiredMastery = 75;
  const currentMastery = 62;

  const gaps = ['Process Scheduling', 'Memory Management', 'Shader Programming', 'K-Means Clustering', 'Dynamic Programming', 'Graph Traversal', 'Ray Tracing', 'Decision Trees', 'Hash Collisions', 'Neural Networks', 'File Systems', 'Concurrency'];

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="mock-exam" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={68} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl mb-8">Mock Exam Results</h2>
            <GlassCard className="mb-8 text-center">
              <p className="text-6xl font-bold text-primary mb-2">78%</p>
              <p className="text-xl text-muted-foreground">Overall Score</p>
              <div className="grid grid-cols-3 gap-6 mt-6">
                <div className="p-4 rounded-lg bg-mastered/10 border border-mastered/30"><p className="text-3xl font-bold text-mastered">39</p><p className="text-sm text-muted-foreground">Correct</p></div>
                <div className="p-4 rounded-lg bg-missing/10 border border-missing/30"><p className="text-3xl font-bold text-missing">11</p><p className="text-sm text-muted-foreground">Incorrect</p></div>
                <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30"><p className="text-3xl font-bold text-secondary">68 min</p><p className="text-sm text-muted-foreground">Time Taken</p></div>
              </div>
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

  if (isInProgress) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="mock-exam" onNavigate={(page) => router.push(`/${page}`)} />
        <div className="fixed top-0 left-60 right-0 h-16 flex items-center justify-between px-6 z-20 border-b bg-background border-border">
          <div className="flex items-center gap-4"><Clock className="w-6 h-6 text-primary" /><span className="text-2xl font-bold">89:45</span></div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Question {currentQuestion} / {totalQuestions}</span>
            <Button onClick={() => setIsCompleted(true)} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">Submit Exam</Button>
          </div>
        </div>
        <div className="ml-60 mt-16 p-8 flex gap-6">
          <div className="w-64 flex-shrink-0">
            <GlassCard className="sticky top-24">
              <h3 className="text-lg font-semibold mb-4">Questions</h3>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => (
                  <button key={num} onClick={() => setCurrentQuestion(num)} className={`w-10 h-10 rounded-lg border-2 text-sm font-medium transition-all ${num === currentQuestion ? 'border-primary bg-primary/20 text-primary' : num <= 10 ? 'border-mastered bg-mastered/10 text-mastered' : 'border-border hover:border-primary/50'}`}>{num}</button>
                ))}
              </div>
            </GlassCard>
          </div>
          <div className="flex-1">
            <GlassCard>
              <Badge className="mb-4">Multiple Choice</Badge>
              <h3 className="text-xl mb-6">What is the time complexity of QuickSort in the average case?</h3>
              <div className="space-y-3">
                {['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'].map((option, index) => (
                  <button key={index} className="w-full p-4 rounded-lg border-2 border-border hover:border-primary/50 text-left transition-all">{option}</button>
                ))}
              </div>
              <div className="flex gap-4 mt-8">
                <Button disabled={currentQuestion === 1} variant="outline" className="flex-1">Previous</Button>
                <Button onClick={() => currentQuestion < totalQuestions ? setCurrentQuestion(currentQuestion + 1) : setIsCompleted(true)} className="flex-1 bg-primary hover:bg-primary/90">{currentQuestion === totalQuestions ? 'Submit' : 'Next'}</Button>
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
        </div>
      </div>
    </div>
  );
}
