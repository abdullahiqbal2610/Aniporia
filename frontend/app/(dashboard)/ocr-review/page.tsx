'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AIResult {
  extracted_text?: string;
  ocr_text?: string;
  analysis?: {
    analysis_nodes?: Array<{
      topic: string;
      confidence_score: number;
    }>;
  };
}

interface UploadResult {
  upload_id: string;
  file_url: string;
  file_name: string;
  course_id: string;
  ai_result: AIResult;
}

export default function OCRReviewPage() {
  const router = useRouter();
  const [extractedText, setExtractedText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadId, setUploadId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUploadData = async () => {
      try {
        setLoading(true);
        
        // Get upload result from sessionStorage
        const uploadResultStr = sessionStorage.getItem('upload_result');
        if (!uploadResultStr) {
          setError('No upload found. Please upload a file first.');
          setLoading(false);
          return;
        }

        const uploadResult: UploadResult = JSON.parse(uploadResultStr);
        setUploadId(uploadResult.upload_id);
        setCourseId(uploadResult.course_id);
        setImageUrl(uploadResult.file_url);

        // Extract OCR text from AI result
        const aiResult = uploadResult.ai_result;
        const ocrText = aiResult.extracted_text || aiResult.ocr_text || '';
        setExtractedText(ocrText);

        // Count low confidence items
        const analysisNodes = aiResult.analysis?.analysis_nodes || [];
        const lowConfidence = analysisNodes.filter(
          (item) => item.confidence_score < 40
        ).length;
        setLowConfidenceCount(lowConfidence);

        setError('');
      } catch (err) {
        console.error('Error loading upload data:', err);
        setError('Failed to load upload data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUploadData();
  }, []);

  const handleRunAnalysis = async () => {
    if (!uploadId) {
      toast.error('Upload ID not found.');
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.push('/login');
        return;
      }

      // Save the corrected text
      const updateRes = await fetch(`http://localhost:8000/uploads/${uploadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extracted_text: extractedText,
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        toast.error(err.detail || 'Failed to save corrections.');
        return;
      }

      toast.success('OCR corrections saved!');
      
      // Store upload data for gap-analysis page
      sessionStorage.setItem('current_upload_id', uploadId);
      sessionStorage.setItem('current_course_id', courseId);
      
      setTimeout(() => router.push('/gap-analysis'), 800);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="upload" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={0} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading OCR data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="upload" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={0} />
        <div className="ml-60 mt-16 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => router.push('/upload')} variant="outline" className="border-primary text-primary">
                Go to Upload
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="upload" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={0} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl mb-2">Review Extracted Text</h2>
          <p className="text-muted-foreground mb-8">Verify OCR accuracy before running AI analysis</p>
          <div className="grid grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-xl mb-4">Original Document</h3>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Uploaded document"
                  className="w-full h-[500px] object-cover rounded-lg border border-border"
                />
              ) : (
                <div className="aspect-[3/4] bg-gradient-to-br from-accent to-background rounded-lg flex items-center justify-center border border-border">
                  <p className="text-muted-foreground">Uploaded image preview</p>
                </div>
              )}
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Extracted Text</h3>
                {lowConfidenceCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-partial" />
                    <span className="text-partial">{lowConfidenceCount} low-confidence items</span>
                  </div>
                )}
              </div>
              <Textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="min-h-[500px] bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50 font-mono text-sm leading-relaxed"
                placeholder="Extracted text will appear here..."
              />
              <div className="mt-4 p-3 bg-partial/10 border border-partial/30 rounded-lg">
                <p className="text-sm text-partial flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Edit any OCR errors above before proceeding.
                </p>
              </div>
            </GlassCard>
          </div>
          <div className="flex gap-4 mt-8">
            <Button
              onClick={handleRunAnalysis}
              disabled={saving}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Looks Good — Run Analysis'
              )}
            </Button>
            <Button
              onClick={() => router.push('/upload')}
              variant="outline"
              className="flex-1 h-11 border-border hover:bg-accent"
            >
              Re-upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
