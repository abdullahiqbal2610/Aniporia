'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useMastery } from '../../hooks/useMastery';

interface UploadData {
  id: string;
  file_url: string;
  file_name: string;
  extracted_text: string;
  course_id: string;
  status: string;
}

export default function OCRReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get('upload_id');

  const { mastery } = useMastery();

  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Fetch the upload data when component mounts
  useEffect(() => {
    const fetchUploadData = async () => {
      // First check sessionStorage for upload result
      const uploadResultStr = sessionStorage.getItem('upload_result');
      
      if (uploadResultStr && !uploadId) {
        try {
          const uploadResult = JSON.parse(uploadResultStr);
          setUploadData(uploadResult);
          setImageUrl(uploadResult.file_url);
          
          // Get extracted text from AI result
          const aiResult = uploadResult.ai_result || {};
          const text = aiResult.extracted_text || aiResult.ocr_text || '';
          setExtractedText(text);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Error parsing sessionStorage:', err);
        }
      }

      // If no sessionStorage data but we have uploadId in URL, fetch from API
      if (uploadId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          
          if (!token) {
            router.push('/login');
            return;
          }

          const res = await fetch(`http://localhost:8000/uploads/${uploadId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (res.ok) {
            const data = await res.json();
            setUploadData(data);
            setImageUrl(data.file_url);
            setExtractedText(data.extracted_text || '');
          } else {
            setError('Failed to load upload data');
          }
        } catch (err) {
          console.error('Error fetching upload:', err);
          setError('Failed to load upload data');
        }
      } else {
        setError('No upload found. Please upload a file first.');
      }
      
      setLoading(false);
    };

    fetchUploadData();
  }, [uploadId, router]);

  const handleSaveText = async () => {
    if (!uploadData && !uploadId) {
      toast.error('No upload found');
      router.push('/upload');
      return;
    }

    const id = uploadData?.id || uploadId;
    
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        router.push('/login');
        return;
      }

      // Save the corrected text using PATCH endpoint
      const res = await fetch(`http://localhost:8000/uploads/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ extracted_text: extractedText }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Save failed');
      }

      setSaved(true);
      toast.success('OCR text saved successfully!');
      
      // Store for gap analysis
      sessionStorage.setItem('current_upload_id', id);
      sessionStorage.setItem('current_course_id', uploadData?.course_id || '');
      
      setTimeout(() => router.push('/gap-analysis'), 800);
    } catch (error) {
      console.error('Error saving text:', error);
      toast.error(error instanceof Error ? error.message : 'Could not save text');
      // Still proceed to gap analysis as fallback
      setTimeout(() => router.push('/gap-analysis'), 800);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar currentPage="upload" onNavigate={(page) => router.push(`/${page}`)} />
        <TopNav masteryPercentage={mastery} />
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
        <TopNav masteryPercentage={mastery} />
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
      <TopNav masteryPercentage={mastery} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl mb-2">Review Extracted Text</h2>
          <p className="text-muted-foreground mb-8">Verify OCR accuracy before running AI analysis</p>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Original Document Preview */}
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

            {/* Extracted Text Editor */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Extracted Text</h3>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-partial" />
                  <span className="text-partial">Review and correct any errors</span>
                </div>
              </div>
              
              <Textarea
                value={extractedText}
                onChange={(e) => { 
                  setExtractedText(e.target.value); 
                  setSaved(false); 
                }}
                className="min-h-[500px] bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50 font-mono text-sm leading-relaxed"
                placeholder="Extracted text will appear here..."
              />
              
              <div className="mt-4 p-3 bg-partial/10 border border-partial/30 rounded-lg">
                <p className="text-sm text-partial flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Edit the text above to fix any OCR mistakes before running analysis.
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <Button
              onClick={handleSaveText}
              disabled={saving}
              className="flex-1 h-11 bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving...</>
              ) : saved ? (
                <><CheckCircle className="w-5 h-5 mr-2" />Saved! Redirecting...</>
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