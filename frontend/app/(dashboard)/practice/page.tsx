'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Textarea } from '../../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Check, X, ArrowRight, Lightbulb } from 'lucide-react';

interface Question {
  id: string;
  type: 'mcq' | 'subjective';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
}

export default function PracticePage() {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [subjectiveAnswer, setSubjectiveAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const questions: Question[] = [
    { id: '1', type: 'mcq', question: 'What is the time complexity of binary search in a sorted array?', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], correctAnswer: 1, explanation: 'Binary search divides the search space in half with each iteration, resulting in O(log n) time complexity.' },
    { id: '2', type: 'mcq', question: 'Which data structure uses LIFO (Last In First Out) principle?', options: ['Queue', 'Stack', 'Array', 'Linked List'], correctAnswer: 1, explanation: 'A Stack follows the LIFO principle where the last element added is the first one to be removed.' },
    { id: '3', type: 'subjective', question: 'Explain the difference between supervised and unsupervised learning in machine learning.', correctAnswer: '', explanation: 'Supervised learning uses labeled training data where the correct output is known, while unsupervised learning works with unlabeled data to find patterns and structures.' },
    { id: '4', type: 'mcq', question: 'What is the purpose of the activation function in a neural network?', options: ['To initialize weights', 'To introduce non-linearity', 'To calculate loss', 'To normalize inputs'], correctAnswer: 1, explanation: 'Activation functions introduce non-linearity into the network, allowing it to learn complex patterns.' },
    { id: '5', type: 'subjective', question: 'What is the difference between a process and a thread in operating systems?', correctAnswer: '', explanation: 'A process is an independent program in execution with its own memory space, while a thread is a lightweight subprocess that shares memory with other threads in the same process.' },
  ];

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleSubmit = () => {
    if (currentQuestion.type === 'mcq') {
      setIsCorrect(parseInt(selectedAnswer) === currentQuestion.correctAnswer);
    } else {
      setIsCorrect(subjectiveAnswer.trim().length > 20);
    }
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setSubjectiveAnswer('');
      setIsSubmitted(false);
      setIsCorrect(false);
    } else {
      router.push('/feedback');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="practice" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={62} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl">Question {currentQuestionIndex + 1} of {questions.length}</h2>
              <span className="text-muted-foreground">{progress.toFixed(0)}% Complete</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
          <GlassCard>
            <div className="mb-6">
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4 inline-block">
                {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Subjective'}
              </span>
              <h3 className="text-xl">{currentQuestion.question}</h3>
            </div>
            {currentQuestion.type === 'mcq' && currentQuestion.options && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={isSubmitted} className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index.toString();
                  const isCorrectOption = index === currentQuestion.correctAnswer;
                  return (
                    <div key={index} className={`flex items-center p-4 rounded-lg border-2 transition-all ${isSubmitted && isCorrectOption ? 'border-mastered bg-mastered/10' : isSubmitted && isSelected && !isCorrectOption ? 'border-missing bg-missing/10' : isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} className="mr-3" />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
                      {isSubmitted && isCorrectOption && <Check className="w-5 h-5 text-mastered" />}
                      {isSubmitted && isSelected && !isCorrectOption && <X className="w-5 h-5 text-missing" />}
                    </div>
                  );
                })}
              </RadioGroup>
            )}
            {currentQuestion.type === 'subjective' && (
              <Textarea value={subjectiveAnswer} onChange={(e) => setSubjectiveAnswer(e.target.value)} disabled={isSubmitted} placeholder="Type your answer here..." className="min-h-[200px] bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50" />
            )}
            {isSubmitted && (
              <div className={`mt-6 p-4 rounded-lg border-2 ${isCorrect ? 'bg-mastered/10 border-mastered/30' : 'bg-missing/10 border-missing/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? <><Check className="w-5 h-5 text-mastered" /><span className="font-semibold text-mastered">Correct!</span></> : <><X className="w-5 h-5 text-missing" /><span className="font-semibold text-missing">Incorrect</span></>}
                </div>
                <div className="mt-3 p-3 bg-partial/10 border border-partial/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-partial flex-shrink-0 mt-0.5" />
                    <div><p className="font-medium text-partial mb-1">AI Explanation</p><p className="text-sm text-foreground">{currentQuestion.explanation}</p></div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-4 mt-8">
              {!isSubmitted ? (
                <Button onClick={handleSubmit} disabled={currentQuestion.type === 'mcq' ? selectedAnswer === '' : subjectiveAnswer.trim().length === 0} className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50">Submit Answer</Button>
              ) : (
                <Button onClick={handleNext} className="w-full h-11 bg-primary hover:bg-primary/90">
                  {currentQuestionIndex < questions.length - 1 ? <><span>Next Question</span><ArrowRight className="w-5 h-5 ml-2" /></> : 'Complete Practice'}
                </Button>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
