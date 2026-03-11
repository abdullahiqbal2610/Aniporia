'use client';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { MasteryBadge } from '../../components/MasteryBadge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Upload, BookOpen, FileText } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const masteryPercentage = 62;
  const courses = [
    { name: 'Machine Learning', code: 'CS229', mastery: 75 },
    { name: 'Data Structures', code: 'CS106B', mastery: 58 },
    { name: 'Computer Graphics', code: 'CS148', mastery: 42 },
    { name: 'Operating Systems', code: 'CS140', mastery: 31 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="dashboard" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={masteryPercentage} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <GlassCard>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground">Mastered Topics</h3>
                <div className="w-12 h-12 rounded-full bg-mastered/20 flex items-center justify-center"><BookOpen className="w-6 h-6 text-mastered" /></div>
              </div>
              <p className="text-4xl font-bold text-mastered">42</p>
              <p className="text-sm text-muted-foreground mt-1">Across all courses</p>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground">Knowledge Gaps</h3>
                <div className="w-12 h-12 rounded-full bg-missing/20 flex items-center justify-center"><FileText className="w-6 h-6 text-missing" /></div>
              </div>
              <p className="text-4xl font-bold text-missing">18</p>
              <p className="text-sm text-muted-foreground mt-1">Need attention</p>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground">Exam Readiness</h3>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"><Upload className="w-6 h-6 text-primary" /></div>
              </div>
              <p className="text-4xl font-bold text-primary">62%</p>
              <p className="text-sm text-muted-foreground mt-1">Overall score</p>
            </GlassCard>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <GlassCard className="col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Knowledge Galaxy</h3>
                <Button onClick={() => router.push('/galaxy')} variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">View Full Galaxy</Button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-lg flex items-center justify-center relative overflow-hidden">
                <img src="https://images.unsplash.com/photo-1767482386203-943cd95e6746?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzRCUyMGFic3RyYWN0JTIwZGF0YSUyMHZpc3VhbGl6YXRpb24lMjBwdXJwbGUlMjBjeWFufGVufDF8fHx8MTc3MjczMTg4N3ww&ixlib=rb-4.1.0&q=80&w=1080" alt="Galaxy" className="w-full h-full object-cover rounded-lg opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center"><p className="text-2xl font-bold mb-2">60 Topics</p><p className="text-muted-foreground">Interactive visualization</p></div>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="col-span-2">
              <h3 className="text-xl mb-4">Your Courses</h3>
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.code} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div><p className="font-medium">{course.name}</p><p className="text-sm text-muted-foreground">{course.code}</p></div>
                      <MasteryBadge percentage={course.mastery} />
                    </div>
                    <Progress value={course.mastery} className="h-2" />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
          <div className="mt-8">
            <h3 className="text-xl mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-4">
              <GlassCard onClick={() => router.push('/upload')}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"><Upload className="w-6 h-6 text-primary" /></div>
                  <div><p className="font-medium">Upload Notes</p><p className="text-sm text-muted-foreground">Add new material</p></div>
                </div>
              </GlassCard>
              <GlassCard onClick={() => router.push('/practice')}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center"><BookOpen className="w-6 h-6 text-secondary" /></div>
                  <div><p className="font-medium">Practice Questions</p><p className="text-sm text-muted-foreground">Test your knowledge</p></div>
                </div>
              </GlassCard>
              <GlassCard className="opacity-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center"><FileText className="w-6 h-6 text-muted" /></div>
                  <div><p className="font-medium">Mock Exam</p><p className="text-sm text-muted-foreground">Close 12 gaps to unlock</p></div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
