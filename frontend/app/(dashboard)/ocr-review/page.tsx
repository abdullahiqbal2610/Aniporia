'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { AlertTriangle, Loader2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface BatchResultItem {
  upload_id: string;
  file_url: string;
  file_name: string;
  course_id: string;
  created_at: string;
  ai_result: {
    extracted_text?: string;
    ocr_text?: string;
    [key: string]: unknown;
  };
}

export default function OCRReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get('upload_id');

  const { mastery } = useMastery();

  // Single upload state
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Batch state
  const [isBatch, setIsBatch] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchResultItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchTexts, setBatchTexts] = useState<string[]>([]);
  const [batchSaved, setBatchSaved] = useState<boolean[]>([]);

   // Fetch the upload data when component mounts
  useEffect(() => {
    const fetchUploadData = async () => {
      // Check for batch results first
      const batchResultStr = sessionStorage.getItem('upload_result_batch');

      console.log('[OCR Review] Checking sessionStorage:', {
        hasBatch: !!batchResultStr,
        hasSingle: !!sessionStorage.getItem('upload_result'),
        uploadId,
      });

      if (batchResultStr && !uploadId) {
        try {
          const batchResult = JSON.parse(batchResultStr);
          const items: BatchResultItem[] = batchResult.results || [];

          console.log(`[OCR Review] Batch mode: ${items.length} items found`, {
            total: batchResult.total,
            successful: batchResult.successful,
            failed: batchResult.failed,
          });

          if (items.length > 0) {
            setIsBatch(true);
            setBatchItems(items);
            setCurrentIndex(0);

            // Initialize texts and saved status for all items
            const texts = items.map((item) => {
              const aiResult = item.ai_result || {};
              return aiResult.extracted_text || aiResult.ocr_text || '';
            });
            setBatchTexts(texts);
            setBatchSaved(new Array(items.length).fill(false));

            // Set first item as current display
            setImageUrl(items[0].file_url);
            setExtractedText(texts[0]);
            setUploadData({
              id: items[0].upload_id,
              file_url: items[0].file_url,
              file_name: items[0].file_name,
              extracted_text: texts[0],
              course_id: items[0].course_id,
              status: 'ready',
            });

            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error parsing batch sessionStorage:', err);
        }
      }

      // Then check sessionStorage for single upload result
      const uploadResultStr = sessionStorage.getItem('upload_result');

      if (uploadResultStr && !uploadId) {
        try {
          const uploadResult = JSON.parse(uploadResultStr);
          // Normalize the data - backend returns upload_id, convert to id for consistency
          const normalizedData = {
            ...uploadResult,
            id: uploadResult.upload_id || uploadResult.id,
            course_id: uploadResult.course_id || 'unknown',
          };
          setUploadData(normalizedData);
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

  // When navigating batch items, update the display
  useEffect(() => {
    if (!isBatch || batchItems.length === 0) return;

    const item = batchItems[currentIndex];
    if (!item) return;

    setImageUrl(item.file_url);
    setExtractedText(batchTexts[currentIndex] || '');
    setUploadData({
      id: item.upload_id,
      file_url: item.file_url,
      file_name: item.file_name,
      extracted_text: batchTexts[currentIndex] || '',
      course_id: item.course_id,
      status: 'ready',
    });
    setSaved(batchSaved[currentIndex] || false);
  }, [currentIndex, isBatch, batchItems, batchTexts, batchSaved]);

  const handleBatchTextChange = (text: string) => {
    setExtractedText(text);
    setSaved(false);
    if (isBatch) {
      setBatchTexts((prev) => {
        const updated = [...prev];
        updated[currentIndex] = text;
        return updated;
      });
    }
  };

  const navigateBatch = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < batchItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSaveText = async () => {
    const id = uploadData?.id || uploadId;

    if (!id) {
      toast.error('No upload found');
      router.push('/upload');
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

      // Save the corrected text using PATCH endpoint
      const res = await fetch(`http://localhost:8000/uploads/${id}/text`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ extracted_text: extractedText }),
      });

      if (!res.ok) {
        let errorMessage: string;
        try {
          const errorData = await res.json();
          errorMessage = (errorData.detail || errorData.message || `Error: ${res.status}`) as string;
        } catch {
          errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSaved(true);
      if (isBatch) {
        setBatchSaved((prev) => {
          const updated = [...prev];
          updated[currentIndex] = true;
          return updated;
        });
      }
      toast.success('OCR text saved successfully!');

      if (!isBatch) {
        // Single upload: redirect to gap analysis
        sessionStorage.setItem('current_upload_id', id);
        sessionStorage.setItem('current_course_id', uploadData?.course_id || '');
        setTimeout(() => router.push('/gap-analysis'), 1200);
      } else {
        // For batch: if this is the last item, redirect
        if (currentIndex === batchItems.length - 1) {
          // All done, redirect
          sessionStorage.setItem('current_course_id', uploadData?.course_id || '');
          setTimeout(() => router.push('/gap-analysis'), 1200);
        }
      }
    } catch (error) {
      console.error('Error saving text:', error);
      toast.error(error instanceof Error ? error.message : 'Could not save text');
      // Still proceed to gap analysis as fallback (wait longer for error case)
      if (!isBatch) {
        setTimeout(() => router.push('/gap-analysis'), 1500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllAndContinue = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push('/login');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        const text = batchTexts[i];

        try {
          const res = await fetch(`http://localhost:8000/uploads/${item.upload_id}/text`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ extracted_text: text }),
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (failCount > 0) {
        toast.warning(`Saved ${successCount} of ${batchItems.length} files. ${failCount} failed.`);
      } else {
        toast.success(`All ${successCount} files saved successfully!`);
      }

      // Store for gap analysis
      if (batchItems.length > 0) {
        sessionStorage.setItem('current_course_id', batchItems[0].course_id || '');
      }
      setTimeout(() => router.push('/gap-analysis'), 1200);
    } catch (error) {
      console.error('Error saving all texts:', error);
      toast.error('Failed to save some texts');
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
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl">Review Extracted Text</h2>
            {isBatch && (
              <div className="flex items-center gap-3">
                {/* Batch navigation */}
                <div className="flex items-center gap-2 bg-accent/50 border border-border rounded-full px-2 py-1">
                  <button
                    onClick={() => navigateBatch('prev')}
                    disabled={currentIndex === 0}
                    className="p-1.5 rounded-full hover:bg-primary/10 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium px-2 min-w-[80px] text-center">
                    {currentIndex + 1} of {batchItems.length}
                  </span>
                  <button
                    onClick={() => navigateBatch('next')}
                    disabled={currentIndex === batchItems.length - 1}
                    className="p-1.5 rounded-full hover:bg-primary/10 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mb-4">Verify OCR accuracy before running AI analysis</p>

          {/* Batch thumbnail strip */}
          {isBatch && batchItems.length > 1 && (
            <div className="mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {batchItems.map((item, idx) => (
                  <button
                    key={item.upload_id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentIndex
                        ? 'border-primary shadow-lg shadow-primary/20 scale-105'
                        : 'border-border hover:border-primary/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover" />
                    {batchSaved[idx] && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.5 truncate px-1">
                      {idx + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Original Document Preview */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Original Document</h3>
                {isBatch && uploadData && (
                  <span className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded-full truncate max-w-[200px]">
                    {uploadData.file_name}
                  </span>
                )}
              </div>
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
                onChange={(e) => handleBatchTextChange(e.target.value)}
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
            {isBatch ? (
              <>
                <Button
                  onClick={handleSaveText}
                  disabled={saving}
                  variant="outline"
                  className="flex-1 h-11 border-primary text-primary hover:bg-primary/10"
                >
                  {saving ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving...</>
                  ) : batchSaved[currentIndex] ? (
                    <><CheckCircle className="w-5 h-5 mr-2" />Saved ✓</>
                  ) : (
                    `Save Page ${currentIndex + 1}`
                  )}
                </Button>

                <Button
                  onClick={handleSaveAllAndContinue}
                  disabled={saving}
                  className="flex-1 h-11 bg-primary hover:bg-primary/90"
                >
                  {saving ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving All...</>
                  ) : (
                    `Save All ${batchItems.length} Pages & Run Analysis`
                  )}
                </Button>
              </>
            ) : (
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
            )}

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