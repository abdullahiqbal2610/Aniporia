// frontend/app/(dashboard)/dashboard/page.tsx

'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { MasteryBadge } from '../../components/MasteryBadge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Upload, BookOpen, FileText, Loader2, Trash2, Rocket, Orbit, Sparkles } from 'lucide-react';
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

// Animated star field for the galaxy preview card
function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
    opacity: Math.random() * 0.8 + 0.2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0614] via-[#0d0a1f] to-[#050312]" />
      {/* Nebula clouds */}
      <div className="absolute inset-0 opacity-40">
        <div
          className="absolute w-64 h-64 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.6) 0%, transparent 70%)',
            top: '10%',
            left: '20%',
            animation: 'nebulaPulse 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-48 h-48 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)',
            top: '50%',
            right: '15%',
            animation: 'nebulaPulse 8s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute w-32 h-32 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)',
            bottom: '20%',
            left: '40%',
            animation: 'nebulaPulse 5s ease-in-out infinite 2s',
          }}
        />
      </div>
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: `rgba(255,255,255,${star.opacity})`,
            boxShadow: star.size > 1.5 ? `0 0 ${star.size * 2}px rgba(255,255,255,0.8)` : 'none',
            animation: `starTwinkle ${star.duration}s ease-in-out infinite ${star.delay}s`,
          }}
        />
      ))}
      {/* Orbital rings */}
      <div
        className="absolute border border-purple-500/20 rounded-full"
        style={{
          width: '200px',
          height: '80px',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%) rotateX(70deg)',
          animation: 'orbitSpin 20s linear infinite',
        }}
      />
      <div
        className="absolute border border-cyan-400/15 rounded-full"
        style={{
          width: '280px',
          height: '110px',
          top: '25%',
          left: '50%',
          transform: 'translateX(-50%) rotateX(70deg) rotateZ(30deg)',
          animation: 'orbitSpin 30s linear infinite reverse',
        }}
      />
      <style>{`
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes nebulaPulse {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.4; }
          50% { transform: scale(1.15) translateY(-8px); opacity: 0.6; }
        }
        @keyframes orbitSpin {
          from { transform: translateX(-50%) rotateX(70deg) rotateZ(0deg); }
          to { transform: translateX(-50%) rotateX(70deg) rotateZ(360deg); }
        }
        @keyframes courseCardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px) rotate(-1deg); }
          40% { transform: translateX(4px) rotate(1deg); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        .course-card-enter {
          animation: courseCardIn 0.35s ease-out forwards;
        }
        .drop-btn-hover:hover {
          animation: dropShake 0.4s ease-in-out;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
          50% { box-shadow: 0 0 20px 4px rgba(124,58,237,0.3); }
        }
        .stat-card-glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Central glowing orb for galaxy preview
function GalaxyOrb({ topics }: { topics: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative">
        {/* Core orb */}
        <div
          className="w-20 h-20 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #a855f7, #7c3aed, #4c1d95)',
            boxShadow: '0 0 40px 15px rgba(124,58,237,0.5), 0 0 80px 30px rgba(124,58,237,0.2)',
            animation: 'nebulaPulse 4s ease-in-out infinite',
          }}
        />
        {/* Floating topic count */}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-white font-bold text-xl leading-none">{topics}</span>
          <span className="text-purple-200 text-xs leading-none">nodes</span>
        </div>
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{
              background: i === 0 ? '#06b6d4' : i === 1 ? '#ec4899' : '#a855f7',
              boxShadow: `0 0 8px 2px ${i === 0 ? 'rgba(6,182,212,0.8)' : i === 1 ? 'rgba(236,72,153,0.8)' : 'rgba(168,85,247,0.8)'}`,
              top: '50%',
              left: '50%',
              transformOrigin: `${40 + i * 15}px 0`,
              animation: `orbitDot ${3 + i * 1.5}s linear infinite ${i * 0.8}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes orbitDot {
          from { transform: translate(-50%, -50%) rotate(0deg) translateX(40px); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateX(40px); }
        }
      `}</style>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [droppingCourseId, setDroppingCourseId] = useState<string | null>(null);

  const { mastery: overallMastery, loading: masteryLoading, refetch: refetchMastery } = useMastery();

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push('/login');
        return;
      }

      const [coursesRes, gapsRes] = await Promise.all([
        fetch('http://localhost:8000/courses/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:8000/gaps/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (coursesRes.ok) setCourses(await coursesRes.json());
      if (gapsRes.ok) setGaps(await gapsRes.json());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const shouldRefresh = sessionStorage.getItem('refresh_dashboard');
    if (shouldRefresh === 'true') {
      sessionStorage.removeItem('refresh_dashboard');
      fetchDashboardData();
      refetchMastery();
    }
  }, [fetchDashboardData, refetchMastery]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
        refetchMastery();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchDashboardData, refetchMastery]);

  const handleDropCourse = async (courseId: string, courseName: string) => {
    setDroppingCourseId(courseId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`http://localhost:8000/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        refetchMastery();
        toast.success(`${courseName} dropped — universe realigned. ✨`, {
          style: {
            background: 'rgba(20, 22, 37, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f1f5f9',
          },
        });
      } else {
        toast.error('Failed to drop course. Please try again.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setDroppingCourseId(null);
    }
  };

  const masteredCount = courses.filter((c) => c.mastery_percent >= 70).length;
  const highGaps = gaps.filter((g) => g.priority === 'HIGH').length;
  const totalNodes = courses.length + gaps.length;

  if (loading || masteryLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading your cosmic dashboard...</span>
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

          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
            >
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-3xl leading-none">Mission Control</h2>
              <p className="text-sm text-muted-foreground mt-1">Your academic universe at a glance</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <GlassCard className="stat-card-glow relative overflow-hidden">
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20"
                style={{ background: '#10B981', transform: 'translate(30%, -30%)' }}
              />
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground text-sm">Mastered Courses</h3>
                <div className="w-10 h-10 rounded-full bg-mastered/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-mastered" />
                </div>
              </div>
              <p className="text-4xl font-bold text-mastered">{masteredCount}</p>
              <p className="text-xs text-muted-foreground mt-1">of {courses.length} total</p>
            </GlassCard>

            <GlassCard className="relative overflow-hidden">
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20"
                style={{ background: '#EF4444', transform: 'translate(30%, -30%)' }}
              />
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground text-sm">Knowledge Gaps</h3>
                <div className="w-10 h-10 rounded-full bg-missing/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-missing" />
                </div>
              </div>
              <p className="text-4xl font-bold text-missing">{gaps.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {highGaps > 0 ? (
                  <span className="text-red-400">{highGaps} high priority</span>
                ) : (
                  'No critical gaps'
                )}
              </p>
            </GlassCard>

            <GlassCard className="relative overflow-hidden">
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20"
                style={{ background: '#7C3AED', transform: 'translate(30%, -30%)' }}
              />
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground text-sm">Exam Readiness</h3>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-4xl font-bold text-primary">{overallMastery}%</p>
              <p className="text-xs text-muted-foreground mt-1">overall mastery</p>
            </GlassCard>
          </div>

          <div className="grid grid-cols-5 gap-6">
            {/* Galaxy Preview */}
            <GlassCard className="col-span-3 relative overflow-hidden" style={{ minHeight: '340px' }}>
              <div className="absolute inset-0 rounded-2xl">
                <StarField />
              </div>
              <GalaxyOrb topics={totalNodes} />
              <div className="relative z-10 flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Orbit className="w-5 h-5 text-purple-400" />
                    <h3 className="text-xl text-white" style={{ textShadow: '0 0 20px rgba(124,58,237,0.8)' }}>
                      Knowledge Galaxy
                    </h3>
                  </div>
                  <p className="text-xs text-purple-300/70">{totalNodes} knowledge nodes orbiting</p>
                </div>
                <Button
                  onClick={() => router.push('/galaxy')}
                  size="sm"
                  className="text-xs"
                  style={{
                    background: 'rgba(124,58,237,0.3)',
                    border: '1px solid rgba(124,58,237,0.5)',
                    color: '#c4b5fd',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  Enter Galaxy →
                </Button>
              </div>
              {/* Bottom info strip */}
              <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-3">
                {[
                  { label: 'Mastered', count: masteredCount, color: '#10b981' },
                  { label: 'Partial', count: courses.filter(c => c.mastery_percent >= 40 && c.mastery_percent < 70).length, color: '#f59e0b' },
                  { label: 'Gaps', count: gaps.length, color: '#ef4444' },
                ].map(({ label, count, color }) => (
                  <div
                    key={label}
                    className="flex-1 rounded-lg px-3 py-2 text-center"
                    style={{
                      background: 'rgba(13,15,26,0.7)',
                      border: `1px solid ${color}30`,
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <p className="text-lg font-bold" style={{ color }}>{count}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Courses List with Drop */}
            <GlassCard className="col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Your Courses</h3>
                {courses.length === 0 && (
                  <Button
                    onClick={() => router.push('/course')}
                    variant="outline"
                    size="sm"
                    className="border-primary/50 text-primary hover:bg-primary/10"
                  >
                    + Add
                  </Button>
                )}
              </div>

              {courses.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <BookOpen className="w-7 h-7 text-primary/50" />
                  </div>
                  <p className="mb-3 text-sm">No courses yet.</p>
                  <Button
                    onClick={() => router.push('/course')}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    Set Up Courses
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {courses.map((course, idx) => (
                    <div
                      key={course.id}
                      className="course-card-enter group relative rounded-xl border border-border bg-accent/40 p-4 transition-all hover:border-primary/30 hover:bg-accent/60"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-sm truncate">{course.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {course.code} · {course.semester}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <MasteryBadge percentage={course.mastery_percent} />
                          {/* Drop Course Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                disabled={droppingCourseId === course.id}
                                className="drop-btn-hover w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 border border-transparent hover:border-red-500/30"
                                title="Drop course"
                              >
                                {droppingCourseId === course.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                )}
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <Trash2 className="w-5 h-5 text-destructive" />
                                  Drop {course.name}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove <strong>{course.name} ({course.code})</strong> and all its associated gaps, uploads, and data. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Course</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90 text-white"
                                  onClick={() => handleDropCourse(course.id, course.name)}
                                >
                                  Drop Course
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <Progress value={course.mastery_percent} className="h-1.5" />
                    </div>
                  ))}

                  {/* Add course subtle CTA */}
                  <button
                    onClick={() => router.push('/settings')}
                    className="w-full rounded-xl border border-dashed border-border/50 p-3 text-center text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-all"
                  >
                    + Add another course in Settings
                  </button>
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
              onClick={() => router.push('/galaxy')}
              variant="outline"
              className="h-14 text-lg"
              style={{
                border: '1px solid rgba(124,58,237,0.4)',
                color: '#a78bfa',
              }}
            >
              <Orbit className="w-5 h-5 mr-2" /> Enter Galaxy
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}