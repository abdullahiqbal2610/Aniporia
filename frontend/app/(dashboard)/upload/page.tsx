'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Upload as UploadIcon, FileText, File, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UploadPage() {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [contentType, setContentType] = useState<'handwritten' | 'pdf' | 'syllabus'>('handwritten');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const courses = ['CS229 - Machine Learning', 'CS106B - Data Structures', 'CS148 - Computer Graphics', 'CS140 - Operating Systems'];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFiles([...files, ...Array.from(e.dataTransfer.files)]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
  };

  const handleUpload = async () => {
    if (!selectedCourse || files.length === 0) { toast.error('Please select a course and upload at least one file'); return; }
    setUploading(true);
    setUploadProgress(0);
    const messages = ['Uploading files...', 'Processing images...', 'Extracting text...', 'Running AI analysis...'];
    for (let i = 0; i < messages.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setUploadProgress(((i + 1) / messages.length) * 100);
      toast.info(messages[i]);
    }
    toast.success('Upload complete!');
    setTimeout(() => router.push('/ocr-review'), 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="upload" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={62} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl mb-8">Upload Learning Material</h2>
          <div className="space-y-6">
            <GlassCard>
              <h3 className="text-xl mb-4">Select Course</h3>
              <div className="grid grid-cols-2 gap-3">
                {courses.map((course) => (
                  <button key={course} onClick={() => setSelectedCourse(course)} className={`p-4 rounded-lg border-2 text-left transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedCourse === course ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    {course}
                  </button>
                ))}
              </div>
            </GlassCard>
            <GlassCard>
              <h3 className="text-xl mb-4">Content Type</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { type: 'handwritten' as const, icon: FileText, label: 'Handwritten Notes', desc: 'Images of handwritten material' },
                  { type: 'pdf' as const, icon: File, label: 'PDF Documents', desc: 'Lecture slides or textbooks' },
                  { type: 'syllabus' as const, icon: UploadIcon, label: 'Course Syllabus', desc: 'Reference material for comparison' },
                ].map(({ type, icon: Icon, label, desc }) => (
                  <button key={type} onClick={() => setContentType(type)} className={`p-6 rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${contentType === type ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    <Icon className="w-8 h-8 mb-3 mx-auto" />
                    <p className="font-medium text-center">{label}</p>
                    <p className="text-sm text-muted-foreground text-center mt-1">{desc}</p>
                  </button>
                ))}
              </div>
            </GlassCard>
            <GlassCard>
              <h3 className="text-xl mb-4">Upload Files</h3>
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="border-2 border-dashed border-primary/50 rounded-lg p-12 text-center hover:bg-primary/5 transition-all">
                <UploadIcon className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-lg mb-2">Drag and drop files here</p>
                <p className="text-muted-foreground mb-4">or</p>
                <label className="inline-block">
                  <input type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*,.pdf" />
                  <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" asChild><span>Browse Files</span></Button>
                </label>
                <p className="text-sm text-muted-foreground mt-4">Supports: JPG, PNG, PDF (max 10MB each)</p>
              </div>
              {files.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mt-6">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-accent rounded-lg flex items-center justify-center border border-border"><File className="w-8 h-8 text-muted-foreground" /></div>
                      <p className="text-xs text-muted-foreground mt-2 truncate">{file.name}</p>
                      <button onClick={() => setFiles(files.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
            <Button onClick={handleUpload} disabled={!selectedCourse || files.length === 0 || uploading} className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50">
              {uploading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Uploading {uploadProgress.toFixed(0)}%</> : <><UploadIcon className="w-5 h-5 mr-2" />Upload & Analyze</>}
            </Button>
          </div>
        </div>
      </div>
      {uploading && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50">
          <GlassCard className="max-w-md w-full text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
            <h3 className="text-2xl mb-2">Processing Your Upload</h3>
            <p className="text-muted-foreground mb-6">AI is analyzing your content...</p>
            <div className="w-full bg-accent rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>
            <p className="text-sm text-muted-foreground mt-2">{uploadProgress.toFixed(0)}% complete</p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
