'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Upload as UploadIcon, File, X, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
}

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/jpg,image/webp';
const FILE_LABEL = 'Supports: JPG, PNG, WebP (max 10MB)';
const FILE_HINT = 'Upload a photo or scan of your handwritten notes';

const UPLOAD_STEPS = [
  'Uploading file...',
  'Processing image...',
  'Extracting text with OCR...',
  'Running AI gap analysis...',
  'Saving results...',
];

export default function UploadPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    if (!ACCEPTED_TYPES.split(',').includes(dropped.type)) {
      toast.error('Only JPG, PNG, and WebP images are supported.');
      return;
    }
    setFile(dropped);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
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
    if (!file) { toast.error('Please select a file to upload.'); return; }
    if (topics.length === 0) { toast.error('Please add at least one syllabus topic.'); return; }

    setUploading(true);
    setUploadStep(0);
    setUploadProgress(0);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { router.push('/login'); return; }

      const stepInterval = setInterval(() => {
        setUploadStep((prev) => {
          const next = prev + 1;
          setUploadProgress((next / UPLOAD_STEPS.length) * 90);
          return next < UPLOAD_STEPS.length - 1 ? next : prev;
        });
      }, 2500);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_id', selectedCourseId);
      formData.append('syllabus_topics', topics.join(','));

      const res = await fetch('http://localhost:8000/uploads/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || 'Upload failed.');
        return;
      }

      const result = await res.json();
      setUploadProgress(100);
      toast.success('Upload complete!');
      sessionStorage.setItem('upload_result', JSON.stringify(result));
      setTimeout(() => router.push('/ocr-review'), 800);
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

            {/* 3. Upload File */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">3. Upload File</h3>
                <span className="text-xs text-muted-foreground bg-accent px-3 py-1 rounded-full border border-border">
                  {FILE_LABEL}
                </span>
              </div>
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-primary/50 rounded-lg p-12 text-center hover:bg-primary/5 transition-all">
                <UploadIcon className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-lg mb-1">Drag and drop a file here</p>
                <p className="text-sm text-muted-foreground mb-4">{FILE_HINT}</p>
                <label className="inline-block cursor-pointer">
                  <input type="file" onChange={handleFileSelect} className="hidden" accept={ACCEPTED_TYPES} />
                  <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>

              {file && (
                <div className="mt-4 flex items-center justify-between p-4 rounded-lg bg-accent border border-border">
                  <div className="flex items-center gap-3">
                    <File className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="p-1 hover:bg-destructive/20 rounded transition-colors">
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              )}
            </GlassCard>

            <Button onClick={handleUpload} disabled={!selectedCourseId || !file || topics.length === 0 || uploading}
              className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 text-lg">
              {uploading
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{UPLOAD_STEPS[uploadStep]}</>
                : <><UploadIcon className="w-5 h-5 mr-2" />Upload & Analyze</>}
            </Button>

          </div>
        </div>
      </div>

      {/* Full-screen progress overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50">
          <GlassCard className="max-w-md w-full text-center p-8">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
            <h3 className="text-2xl mb-2">Analyzing Your Notes</h3>
            <p className="text-muted-foreground mb-6">{UPLOAD_STEPS[uploadStep]}</p>
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