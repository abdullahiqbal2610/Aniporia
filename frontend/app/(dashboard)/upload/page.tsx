'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Upload as UploadIcon, File as FileIcon, X, Loader2, Plus, ImagePlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
}

interface FileWithPreview {
  file: File;
  id: string;
  preview: string;
}

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/jpg,image/webp';
const ACCEPTED_TYPES_LIST = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const FILE_LABEL = 'Supports: JPG, PNG, WebP (max 10MB each)';
const FILE_HINT = 'Upload photos or scans of your handwritten notes';
const MAX_FILES = 20;

const UPLOAD_STEPS = [
  'Uploading files...',
  'Processing images...',
  'Extracting text with OCR...',
  'Running AI gap analysis...',
  'Saving results...',
];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) { router.push('/login'); return; }
        const res = await fetch('http://localhost:8000/courses/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setCourses(await res.json());
      } catch {
        toast.error('Failed to load courses.');
      } finally {
        setCoursesLoading(false);
      }
    };
    fetchCourses();
  }, [router]);

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const incoming = Array.from(newFiles);
    const validFiles: FileWithPreview[] = [];
    let rejected = 0;

    for (const file of incoming) {
      if (!ACCEPTED_TYPES_LIST.includes(file.type)) {
        rejected++;
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit.`);
        continue;
      }
      validFiles.push({
        file,
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        preview: URL.createObjectURL(file),
      });
    }

    if (rejected > 0) {
      toast.error(`${rejected} file(s) rejected — only JPG, PNG, and WebP images are supported.`);
    }

    setFiles((prev) => {
      const combined = [...prev, ...validFiles];
      if (combined.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed. Some files were not added.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearAllFiles = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
  }, [files]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      // Reset input so re-selecting same file works
      e.target.value = '';
    }
  };

  const addTopic = () => {
    const trimmed = topicInput.trim();
    if (!trimmed) return;
    const newTopics = trimmed.split(',').map((t) => t.trim()).filter((t) => t && !topics.includes(t));
    if (newTopics.length > 0) { setTopics([...topics, ...newTopics]); setTopicInput(''); }
  };

  const removeTopic = (topic: string) => setTopics(topics.filter((t) => t !== topic));

  const handleUpload = async () => {
    if (!selectedCourseId) { toast.error('Please select a course.'); return; }
    if (files.length === 0) { toast.error('Please select at least one file to upload.'); return; }
    if (topics.length === 0) { toast.error('Please add at least one syllabus topic.'); return; }

    setUploading(true);
    setUploadStep(0);
    setUploadProgress(0);
    setCurrentFileIndex(0);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { router.push('/login'); return; }

      const isBatch = files.length > 1;

      if (isBatch) {
        // --- BATCH UPLOAD ---
        const stepInterval = setInterval(() => {
          setUploadStep((prev) => {
            const next = prev + 1;
            setUploadProgress(Math.min((next / UPLOAD_STEPS.length) * 85, 85));
            return next < UPLOAD_STEPS.length - 1 ? next : prev;
          });
        }, 3000);

        const formData = new FormData();
        console.log(`[BATCH] Appending ${files.length} files to FormData`);
        files.forEach((f, i) => {
          console.log(`  [${i}] ${f.file.name} (${f.file.size} bytes, type=${f.file.type})`);
          formData.append('files', f.file);
        });
        formData.append('course_id', selectedCourseId);
        formData.append('syllabus_topics', topics.join(','));

        console.log(`[BATCH] Sending to /uploads/batch with ${formData.getAll('files').length} files`);
        const res = await fetch('http://localhost:8000/uploads/batch', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        clearInterval(stepInterval);

        if (!res.ok) {
          let errorMessage = 'Upload failed.';
          try {
            const err = await res.json();
            errorMessage = err.detail || err.message || `HTTP ${res.status}: ${res.statusText}`;
          } catch {
            errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          }
          toast.error(errorMessage);
          return;
        }

        const batchResult = await res.json();
        console.log('[BATCH] Response from backend:', {
          total: batchResult.total,
          successful: batchResult.successful,
          failed: batchResult.failed,
          resultCount: batchResult.results?.length,
          errorCount: batchResult.errors?.length,
        });
        setUploadProgress(100);

        if (batchResult.failed > 0) {
          toast.warning(`${batchResult.successful} of ${batchResult.total} files uploaded. ${batchResult.failed} failed.`);
        } else {
          toast.success(`All ${batchResult.successful} files uploaded successfully!`);
        }

        // Store batch results for OCR review
        sessionStorage.setItem('upload_result_batch', JSON.stringify(batchResult));
        sessionStorage.removeItem('upload_result');
        setTimeout(() => router.push('/ocr-review'), 800);

      } else {
        // --- SINGLE FILE UPLOAD (original behavior) ---
        const stepInterval = setInterval(() => {
          setUploadStep((prev) => {
            const next = prev + 1;
            setUploadProgress((next / UPLOAD_STEPS.length) * 90);
            return next < UPLOAD_STEPS.length - 1 ? next : prev;
          });
        }, 2500);

        const formData = new FormData();
        formData.append('file', files[0].file);
        formData.append('course_id', selectedCourseId);
        formData.append('syllabus_topics', topics.join(','));

        const res = await fetch('http://localhost:8000/uploads/', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        clearInterval(stepInterval);

        if (!res.ok) {
          let errorMessage = 'Upload failed.';
          try {
            const err = await res.json();
            errorMessage = err.detail || err.message || `HTTP ${res.status}: ${res.statusText}`;
          } catch {
            errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          }
          toast.error(errorMessage);
          return;
        }

        const result = await res.json();
        setUploadProgress(100);
        toast.success('Upload complete!');
        sessionStorage.setItem('upload_result', JSON.stringify(result));
        sessionStorage.removeItem('upload_result_batch');
        setTimeout(() => router.push('/ocr-review'), 800);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="upload" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={0} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl mb-8">Upload Learning Material</h2>
          <div className="space-y-6">

            {/* 1. Select Course */}
            <GlassCard>
              <h3 className="text-xl mb-4">1. Select Course</h3>
              {coursesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading courses...
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-3">No courses found.</p>
                  <Button onClick={() => router.push('/settings')} variant="outline" className="border-primary/50 text-primary">
                    Add Courses in Settings
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {courses.map((course) => (
                    <button key={course.id} onClick={() => setSelectedCourseId(course.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selectedCourseId === course.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      }`}>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-sm text-muted-foreground">{course.code} • {course.semester}</p>
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* 2. Syllabus Topics */}
            <GlassCard>
              <h3 className="text-xl mb-2">2. Syllabus Topics</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the topics your notes should cover. The AI will check your notes against these.
              </p>
              <div className="flex gap-2 mb-3">
                <Input value={topicInput} onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                  placeholder="e.g. Neural Networks, Backpropagation, CNN"
                  className="h-11 bg-input-background border-border focus:border-primary" />
                <Button onClick={addTopic} variant="outline" className="h-11 border-primary/50 text-primary hover:bg-primary/10 px-4">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Tip: Paste multiple topics separated by commas at once.</p>
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <span key={topic} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary">
                      {topic}
                      <button onClick={() => removeTopic(topic)} className="ml-1 hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* 3. Upload Files (Multi-upload) */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">3. Upload Files</h3>
                <div className="flex items-center gap-3">
                  {files.length > 0 && (
                    <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/30">
                      {files.length} file{files.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground bg-accent px-3 py-1 rounded-full border border-border">
                    {FILE_LABEL}
                  </span>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                  isDragOver
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : 'border-primary/50 hover:bg-primary/5'
                }`}
              >
                <UploadIcon className={`w-12 h-12 mx-auto mb-4 transition-transform duration-200 ${
                  isDragOver ? 'text-primary scale-110' : 'text-primary'
                }`} />
                <p className="text-lg mb-1">Drag and drop files here</p>
                <p className="text-sm text-muted-foreground mb-1">{FILE_HINT}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  You can select <strong>multiple files</strong> at once (up to {MAX_FILES})
                </p>
                <label className="inline-block cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept={ACCEPTED_TYPES}
                    multiple
                  />
                  <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" asChild>
                    <span><ImagePlus className="w-4 h-4 mr-2" />Browse Files</span>
                  </Button>
                </label>
              </div>

              {/* File Thumbnails Grid */}
              {files.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Selected files ({files.length}/{MAX_FILES})
                    </p>
                    <button
                      onClick={clearAllFiles}
                      className="text-xs text-destructive hover:text-destructive/80 transition-colors underline underline-offset-2"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="group relative rounded-xl overflow-hidden border border-border bg-accent/50 aspect-square transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                      >
                        <img
                          src={f.preview}
                          alt={f.file.name}
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay with filename */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                          <p className="text-xs text-white truncate font-medium">{f.file.name}</p>
                          <p className="text-[10px] text-white/60">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        {/* Remove button */}
                        <button
                          onClick={() => removeFile(f.id)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add more button */}
                    {files.length < MAX_FILES && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all hover:bg-primary/5"
                      >
                        <Plus className="w-6 h-6" />
                        <span className="text-xs font-medium">Add more</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </GlassCard>

            <Button onClick={handleUpload} disabled={!selectedCourseId || files.length === 0 || topics.length === 0 || uploading}
              className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 text-lg">
              {uploading
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{UPLOAD_STEPS[uploadStep]}</>
                : <><UploadIcon className="w-5 h-5 mr-2" />Upload {files.length > 1 ? `${files.length} Files` : ''} & Analyze</>}
            </Button>

          </div>
        </div>
      </div>

      {/* Full-screen progress overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50">
          <GlassCard className="max-w-md w-full text-center p-8">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
            <h3 className="text-2xl mb-2">
              {files.length > 1 ? 'Analyzing Your Notes' : 'Analyzing Your Notes'}
            </h3>
            <p className="text-muted-foreground mb-2">{UPLOAD_STEPS[uploadStep]}</p>
            {files.length > 1 && (
              <p className="text-sm text-primary mb-4">
                Processing {files.length} files
              </p>
            )}
            <div className="w-full bg-accent rounded-full h-2 mb-2">
              <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}% complete</p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}