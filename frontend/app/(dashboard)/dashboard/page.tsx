// frontend/app/(dashboard)/dashboard/page.tsx

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { MasteryBadge } from '../../components/MasteryBadge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Upload, BookOpen, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useMastery } from '../../hooks/useMastery';

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  mastery_percent: number;
}

interface Gap {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export default function DashboardPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use the mastery hook for real-time updates
  const { mastery: overallMastery, loading: masteryLoading, refetch: refetchMastery } = useMastery();

  const fetchDashboardData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch courses and gaps in parallel
      const [coursesRes, gapsRes] = await Promise.all([
        fetch('http://localhost:8000/courses/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:8000/gaps/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
      }

      if (gapsRes.ok) {
        const gapsData = await gapsRes.json();
        setGaps(gapsData);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [router]);

  // Auto-refresh data when returning from practice/feedback pages
  useEffect(() => {
    // Check if we just came back from practice
    const shouldRefresh = sessionStorage.getItem('refresh_dashboard');
    if (shouldRefresh === 'true') {
      sessionStorage.removeItem('refresh_dashboard');
      fetchDashboardData();
      refetchMastery(); // Force refetch mastery
    }
  }, [refetchMastery]);

  // Set up event listener for when practice completes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh data when tab becomes visible again
        fetchDashboardData();
        refetchMastery();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetchMastery]);

  // Derive mastered topics count from courses with mastery >= 70
  const masteredTopicsCount = courses.filter((c) => c.mastery_percent >= 70).length;

  // Gap counts by priority
  const highGaps = gaps.filter((g) => g.priority === 'HIGH').length;
  const totalGaps = gaps.length;

  if (loading || masteryLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="dashboard" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={overallMastery} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-7xl mx-auto">

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <GlassCard>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground">Mastered Courses</h3>
                <div className="w-12 h-12 rounded-full bg-mastered/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-mastered" />
                </div>
              </div>
              <p className="text-4xl font-bold text-mastered">{masteredTopicsCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Across all courses</p>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground">Knowledge Gaps</h3>
                <div className="w-12 h-12 rounded-full bg-missing/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-missing" />
                </div>
              </div>
              <p className="text-4xl font-bold text-missing">{totalGaps}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {highGaps > 0 ? `${highGaps} high priority` : 'None high priority'}
              </p>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground">Exam Readiness</h3>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-4xl font-bold text-primary">{overallMastery}%</p>
              <p className="text-sm text-muted-foreground mt-1">Overall score</p>
            </GlassCard>
          </div>

          <div className="grid grid-cols-5 gap-6">
            {/* Galaxy Preview */}
            <GlassCard className="col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Knowledge Galaxy</h3>
                <Button
                  onClick={() => router.push('/galaxy')}
                  variant="outline"
                  size="sm"
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  View Full Galaxy
                </Button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-lg flex items-center justify-center relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1767482386203-943cd95e6746?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzRCUyMGFic3RyYWN0JTIwZGF0YSUyMHZpc3VhbGl6YXRpb24lMjBwdXJwbGUlMjBjeWFufGVufDF8fHx8MTc3MjczMTg4N3ww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Galaxy"
                  className="w-full h-full object-cover rounded-lg opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-2">{totalGaps + masteredTopicsCount} Topics</p>
                    <p className="text-muted-foreground">Interactive visualization</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Courses List */}
            <GlassCard className="col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Your Courses</h3>
                {courses.length === 0 && (
                  <Button
                    onClick={() => router.push('/course')}
                    variant="outline"
                    size="sm"
                    className="border-primary/50 text-primary hover:bg-primary/10"
                  >
                    + Add Course
                  </Button>
                )}
              </div>

              {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <p className="mb-4">No courses added yet.</p>
                  <Button
                    onClick={() => router.push('/course')}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Set Up Courses
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <div key={course.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{course.name}</p>
                          <p className="text-sm text-muted-foreground">{course.code} • {course.semester}</p>
                        </div>
                        <MasteryBadge percentage={course.mastery_percent} />
                      </div>
                      <Progress value={course.mastery_percent} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-6 mt-6">
            <Button
              onClick={() => router.push('/upload')}
              className="h-14 bg-primary hover:bg-primary/90 text-lg"
            >
              <Upload className="w-5 h-5 mr-2" /> Upload Notes
            </Button>
            <Button
              onClick={() => router.push('/gap-analysis')}
              variant="outline"
              className="h-14 border-missing/50 text-missing hover:bg-missing/10 text-lg"
            >
              <FileText className="w-5 h-5 mr-2" /> View Gaps
            </Button>
            <Button
              onClick={() => router.push('/practice')}
              variant="outline"
              className="h-14 border-secondary/50 text-secondary hover:bg-secondary/10 text-lg"
            >
              <BookOpen className="w-5 h-5 mr-2" /> Practice
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}