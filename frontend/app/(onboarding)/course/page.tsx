'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { GlassCard } from '../../components/GlassCard';
import { Progress } from '../../components/ui/progress';
import { Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
}

export default function CourseSetupPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourse, setNewCourse] = useState({ name: '', code: '', semester: '' });
  const [loading, setLoading] = useState(false);

  const addCourse = () => {
    if (!newCourse.name || !newCourse.code || !newCourse.semester) {
      toast.error('Please fill in all course fields');
      return;
    }
    setCourses([...courses, { id: Date.now().toString(), ...newCourse }]);
    setNewCourse({ name: '', code: '', semester: '' });
    toast.success(`Added ${newCourse.name}`);
  };

  const removeCourse = (id: string) => {
    setCourses(courses.filter((c) => c.id !== id));
  };

  const handleFinish = async () => {
    if (courses.length === 0) return;
    setLoading(true);

    try {
      // 1. Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast.error('Session expired. Please sign in again.');
        router.push('/login');
        return;
      }

      // 2. POST each course to the backend sequentially
      const results = await Promise.allSettled(
        courses.map((course) =>
          fetch('http://localhost:8000/courses/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: course.name,
              code: course.code,
              semester: course.semester,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.detail || `Failed to save ${course.name}`);
            }
            return res.json();
          })
        )
      );

      // 3. Check for any failures
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        const reasons = (failed as PromiseRejectedResult[]).map((f) => f.reason?.message).join(', ');
        toast.error(`Some courses failed to save: ${reasons}`);
        // Still proceed if at least some succeeded
        if (failed.length === courses.length) return;
      }

      const saved = results.filter((r) => r.status === 'fulfilled').length;
      toast.success(`${saved} course${saved !== 1 ? 's' : ''} saved! Welcome to Aniporia.`);
      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-3xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step 2 of 2</span>
            <span className="text-sm text-muted-foreground">100%</span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        <GlassCard>
          <h2 className="text-3xl mb-2">Course Setup</h2>
          <p className="text-muted-foreground mb-8">Add the courses you're currently taking</p>

          <div className="space-y-6">
            {/* Input row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="courseName" className="block mb-2">Course Name</Label>
                <Input
                  id="courseName"
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCourse()}
                  className="h-12 bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50"
                  placeholder="Machine Learning"
                />
              </div>
              <div>
                <Label htmlFor="courseCode" className="block mb-2">Course Code</Label>
                <Input
                  id="courseCode"
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCourse()}
                  className="h-12 bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50"
                  placeholder="CS229"
                />
              </div>
              <div>
                <Label htmlFor="semester" className="block mb-2">Semester</Label>
                <Input
                  id="semester"
                  type="text"
                  value={newCourse.semester}
                  onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCourse()}
                  className="h-12 bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50"
                  placeholder="Spring 2026"
                />
              </div>
            </div>

            <Button
              onClick={addCourse}
              variant="outline"
              className="w-full h-11 border-dashed border-2 border-primary/50 hover:bg-primary/10"
            >
              <Plus className="w-5 h-5 mr-2" />Add Course
            </Button>

            {/* Course list */}
            {courses.length > 0 ? (
              <div className="space-y-3 mt-6">
                <h3 className="text-lg font-semibold">Your Courses ({courses.length})</h3>
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-accent border border-border"
                  >
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {course.code} • {course.semester}
                      </p>
                    </div>
                    <button
                      onClick={() => removeCourse(course.id)}
                      className="p-2 hover:bg-destructive/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="w-5 h-5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No courses added yet. Add your first course above.</p>
              </div>
            )}

            <Button
              onClick={handleFinish}
              disabled={courses.length === 0 || loading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground mt-8"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving courses...</>
              ) : (
                `Go to Dashboard →`
              )}
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}