// frontend/app/(dashboard)/practice/page.tsx

'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMastery } from '../../hooks/useMastery';
import { supabase } from '@/lib/supabase';

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface QuizData {
  node_topic: string;
  lesson: string;
  quiz: Question[];
}

export default function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicFromUrl = searchParams.get('topic') || '';
  const scoreFromUrl = searchParams.get('score') || '0';
  
  const { mastery } = useMastery();
  const [topic, setTopic] = useState(topicFromUrl);
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-start practice if topic is provided in URL
    if (topicFromUrl && !quizData && !loading) {
      generateQuiz();
    } else if (!topicFromUrl && !loading) {
      setError('No topic selected. Please go to Gap Analysis and select a topic to practice.');
    }
  }, [topicFromUrl]);

  const generateQuiz = async () => {
    if (!topic.trim()) {
      setError('No topic selected. Please go to Gap Analysis and select a topic to practice.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Generating quiz for topic:', topic);
      
      const response = await fetch('http://localhost:8000/practice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to generate quiz: ${response.status}`);
      }

      const data = await response.json();
      console.log('Raw response from AI engine:', data);
      
      // Handle different response formats
      let formattedQuizData: QuizData | null = null;
      
      // Check if the response has the expected structure
      if (data && data.quiz && Array.isArray(data.quiz) && data.quiz.length > 0) {
        // Already in correct format
        formattedQuizData = {
          node_topic: data.node_topic || topic,
          lesson: data.lesson || '',
          quiz: data.quiz
        };
      } else if (data && data.data && data.data.quiz) {
        // Nested response format
        formattedQuizData = {
          node_topic: data.data.node_topic || topic,
          lesson: data.data.lesson || '',
          quiz: data.data.quiz
        };
      } else {
        console.error('Unexpected response format:', data);
        throw new Error('Invalid quiz data format received from server');
      }
      
      // Validate each question has required fields
      const isValid = formattedQuizData.quiz.every((q: Question) => 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length > 0 &&
        q.correct_answer
      );
      
      if (!isValid) {
        console.error('Invalid question format:', formattedQuizData.quiz);
        throw new Error('Quiz data missing required fields');
      }
      
      console.log('Formatted quiz data:', formattedQuizData);
      setQuizData(formattedQuizData);
      setAnswers(new Array(formattedQuizData.quiz.length).fill(''));
      setCurrentQuestionIndex(0);
      setSelectedAnswer('');
      
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = () => {
    if (!selectedAnswer) {
      return;
    }

    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setAnswers(newAnswers);
    setSelectedAnswer('');

    if (currentQuestionIndex + 1 < (quizData?.quiz.length || 0)) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Quiz complete - calculate results and navigate to feedback
      calculateAndNavigateResults(newAnswers);
    }
  };

  const calculateAndNavigateResults = (finalAnswers: string[]) => {
    if (!quizData) return;

    const results = quizData.quiz.map((q, idx) => ({
      topic: quizData.node_topic,
      correct: finalAnswers[idx] === q.correct_answer ? 1 : 0,
      total: 1,
    }));

    // Group results by topic
    const groupedResults = results.reduce((acc, curr) => {
      const existing = acc.find(r => r.topic === curr.topic);
      if (existing) {
        existing.correct += curr.correct;
        existing.total += curr.total;
      } else {
        acc.push({ ...curr });
      }
      return acc;
    }, [] as Array<{ topic: string; correct: number; total: number }>);

    // Calculate score percentage
    const totalCorrect = groupedResults.reduce((sum, r) => sum + r.correct, 0);
    const totalQuestions = groupedResults.reduce((sum, r) => sum + r.total, 0);
    const scoreAfter = Math.round((totalCorrect / totalQuestions) * 100);

    // Get score before from URL or use mastery
    const scoreBefore = parseInt(scoreFromUrl) || mastery;

    // Store results in sessionStorage for feedback page
    const sessionData = {
      score_before: scoreBefore,
      score_after: scoreAfter,
      improvement: scoreAfter - scoreBefore,
      badge: null,
      results: groupedResults,
    };
    
    sessionStorage.setItem('practice_result', JSON.stringify(sessionData));
    
    // Also pass via URL params as backup
    const params = new URLSearchParams({
      before: scoreBefore.toString(),
      score: scoreAfter.toString(),
      topic: quizData.node_topic,
      results: JSON.stringify(groupedResults),
    });
    
    router.push(`/feedback?${params.toString()}`);
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(answers[currentQuestionIndex - 1] || '');
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={mastery} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-2xl mx-auto">
            <GlassCard>
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Failed to Start Practice</h3>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => router.push('/gap-analysis')} className="bg-primary hover:bg-primary/90">
                  Go to Gap Analysis
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={mastery} />
        <div className="ml-60 mt-16 p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Generating your practice quiz for "{topic}"...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quizData && !topic) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={mastery} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-2xl mx-auto text-center">
            <GlassCard>
              <p className="text-muted-foreground mb-4">No topic selected for practice.</p>
              <Button onClick={() => router.push('/gap-analysis')} className="bg-primary hover:bg-primary/90">
                Go to Gap Analysis
              </Button>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={mastery} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-2xl mx-auto">
            <GlassCard>
              <h2 className="text-2xl mb-4 text-center">Practice: {topic}</h2>
              <p className="text-muted-foreground text-center mb-6">Ready to test your knowledge?</p>
              <Button onClick={generateQuiz} className="w-full bg-primary hover:bg-primary/90">
                Start Quiz
              </Button>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  // Safety check - ensure quizData and current question exist
  if (!quizData.quiz || quizData.quiz.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={mastery} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-2xl mx-auto text-center">
            <GlassCard>
              <p className="text-muted-foreground mb-4">No questions available for this topic.</p>
              <Button onClick={() => router.push('/gap-analysis')} className="bg-primary hover:bg-primary/90">
                Go to Gap Analysis
              </Button>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quizData.quiz[currentQuestionIndex];
  
  // Additional safety check for current question
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={mastery} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-2xl mx-auto text-center">
            <GlassCard>
              <p className="text-muted-foreground mb-4">Error loading question. Please try again.</p>
              <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90">
                Retry
              </Button>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === quizData.quiz.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={mastery} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Topic: {quizData.node_topic}</span>
              <span>Question {currentQuestionIndex + 1} of {quizData.quiz.length}</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / quizData.quiz.length) * 100}%` }}
              />
            </div>
          </div>

          <GlassCard>
            <h3 className="text-xl mb-6">{currentQuestion.question}</h3>
            
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} className="space-y-3">
              {currentQuestion.options && currentQuestion.options.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary/20 transition-colors">
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                    {option}
                  </label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex gap-4 mt-8">
              <Button
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button 
                onClick={handleAnswer} 
                disabled={!selectedAnswer}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isLastQuestion ? 'Complete' : 'Next'}
                {!isLastQuestion && <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}