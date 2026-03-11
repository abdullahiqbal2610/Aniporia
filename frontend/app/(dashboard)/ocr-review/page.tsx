'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

export default function OCRReviewPage() {
  const router = useRouter();
  const [extractedText, setExtractedText] = useState(
    `Machine Learning Fundamentals\n\nSupervised Learning:\n- Linear Regression: Finding the best fit line through data points\n- Logistic Regression: Classification using sigmoid function\n- Decision Trees: Tree-based classification and regression\n\nUnsupervised Learning:\n- K-Means Clustering: Grouping similar data points\n- Principal Component Analysis (PCA): Dimensionality reduction\n\nNeural Networks:\n- Perceptrons: Basic building blocks\n- Backpropagation: Training algorithm for neural networks\n- Activation Functions: ReLU, Sigmoid, Tanh`
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="upload" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={62} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl mb-2">Review Extracted Text</h2>
          <p className="text-muted-foreground mb-8">Verify OCR accuracy before running AI analysis</p>
          <div className="grid grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-xl mb-4">Original Document</h3>
              <div className="aspect-[3/4] bg-gradient-to-br from-accent to-background rounded-lg flex items-center justify-center border border-border">
                <p className="text-muted-foreground">Uploaded image preview</p>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Extracted Text</h3>
                <div className="flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-partial" /><span className="text-partial">2 low-confidence words</span></div>
              </div>
              <Textarea value={extractedText} onChange={(e) => setExtractedText(e.target.value)} className="min-h-[500px] bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50 font-mono text-sm leading-relaxed" placeholder="Extracted text will appear here..." />
              <div className="mt-4 p-3 bg-partial/10 border border-partial/30 rounded-lg">
                <p className="text-sm text-partial flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Words with amber underlines have low confidence.</p>
              </div>
            </GlassCard>
          </div>
          <div className="flex gap-4 mt-8">
            <Button onClick={() => router.push('/gap-analysis')} className="flex-1 h-11 bg-primary hover:bg-primary/90">Looks Good — Run Analysis</Button>
            <Button onClick={() => router.push('/upload')} variant="outline" className="flex-1 h-11 border-border hover:bg-accent">Re-upload</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
