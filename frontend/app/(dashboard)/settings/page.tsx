'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Slider } from '../../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Sun, Moon, Eye, Keyboard, Palette, User, Lock, Trash2, X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
}

export default function SettingsPage() {
  const router = useRouter();

  // Appearance / accessibility state
  const [darkMode, setDarkMode] = useState(true);
  const [contrast, setContrast] = useState([100]);
  const [fontSize, setFontSize] = useState([16]);
  const [keyboardNav, setKeyboardNav] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [colorblindMode, setColorblindMode] = useState('none');

  // Courses state
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', code: '', semester: '' });
  const [addingCourse, setAddingCourse] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;

        const res = await fetch('http://localhost:8000/courses/', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      } catch {
        toast.error('Failed to load courses.');
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleAddCourse = async () => {
    if (!newCourse.name || !newCourse.code || !newCourse.semester) {
      toast.error('Please fill in all course fields.');
      return;
    }
    setAddingCourse(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { router.push('/login'); return; }

      const res = await fetch('http://localhost:8000/courses/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCourse.name,
          code: newCourse.code,
          semester: newCourse.semester,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || 'Failed to add course.');
        return;
      }

      const created: Course = await res.json();
      setCourses((prev) => [...prev, created]);
      setNewCourse({ name: '', code: '', semester: '' });
      setShowAddForm(false);
      toast.success(`${created.name} added!`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setAddingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    setDeletingId(courseId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { router.push('/login'); return; }

      const res = await fetch(`http://localhost:8000/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok || res.status === 204) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        toast.success(`${courseName} removed.`);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to remove course.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="settings" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={62} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl mb-8">Settings</h2>
          <div className="space-y-6">

            {/* Appearance */}
            <GlassCard>
              <div className="flex items-center gap-3 mb-6"><Palette className="w-6 h-6 text-primary" /><h3 className="text-xl">Appearance</h3></div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1"><Label>Dark Mode</Label><p className="text-sm text-muted-foreground">Toggle between light and dark theme</p></div>
                  <div className="flex items-center gap-3"><Sun className="w-5 h-5 text-muted-foreground" /><Switch checked={darkMode} onCheckedChange={setDarkMode} /><Moon className="w-5 h-5 text-primary" /></div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label>Contrast</Label><span className="text-sm text-muted-foreground">{contrast[0]}%</span></div>
                  <Slider value={contrast} onValueChange={setContrast} min={80} max={120} step={10} className="w-full" />
                  <p className="text-sm text-muted-foreground">Adjust contrast for better visibility</p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label>Font Size</Label><span className="text-sm text-muted-foreground">{fontSize[0]}px</span></div>
                  <Slider value={fontSize} onValueChange={setFontSize} min={12} max={20} step={2} className="w-full" />
                  <p className="text-sm text-muted-foreground">Change base font size across the app</p>
                </div>
              </div>
            </GlassCard>

            {/* Accessibility */}
            <GlassCard>
              <div className="flex items-center gap-3 mb-6"><Eye className="w-6 h-6 text-secondary" /><h3 className="text-xl">Accessibility</h3></div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1"><div className="flex items-center gap-2"><Keyboard className="w-4 h-4" /><Label>Keyboard Navigation</Label></div><p className="text-sm text-muted-foreground">Enhanced keyboard shortcuts and focus indicators</p></div>
                  <Switch checked={keyboardNav} onCheckedChange={setKeyboardNav} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1"><Label>Reduce Motion</Label><p className="text-sm text-muted-foreground">Minimize animations and transitions</p></div>
                  <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label>Colorblind Mode</Label>
                  <Select value={colorblindMode} onValueChange={setColorblindMode}>
                    <SelectTrigger className="h-12 bg-input-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="protanopia">Protanopia (Red-Blind)</SelectItem>
                      <SelectItem value="deuteranopia">Deuteranopia (Green-Blind)</SelectItem>
                      <SelectItem value="tritanopia">Tritanopia (Blue-Blind)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </GlassCard>

            {/* Account */}
            <GlassCard>
              <div className="flex items-center gap-3 mb-6"><User className="w-6 h-6 text-partial" /><h3 className="text-xl">Account</h3></div>
              <div className="space-y-6">
                <div className="space-y-3"><Label htmlFor="name">Full Name</Label><Input id="name" defaultValue="John Doe" className="h-12 bg-input-background" /></div>
                <div className="space-y-3"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" defaultValue="john.doe@university.edu" className="h-12 bg-input-background" /></div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2"><Lock className="w-4 h-4" /><Label>Change Password</Label></div>
                  <Input type="password" placeholder="Current password" className="h-12 bg-input-background mb-3" />
                  <Input type="password" placeholder="New password" className="h-12 bg-input-background mb-3" />
                  <Input type="password" placeholder="Confirm new password" className="h-12 bg-input-background" />
                  <Button variant="outline" className="mt-2">Update Password</Button>
                </div>
              </div>
            </GlassCard>

            {/* ── Manage Courses (wired to backend) ── */}
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl">Manage Courses</h3>
                <Button
                  onClick={() => setShowAddForm((v) => !v)}
                  variant="outline"
                  size="sm"
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {showAddForm ? 'Cancel' : 'Add Course'}
                </Button>
              </div>

              {/* Inline add form */}
              {showAddForm && (
                <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="block mb-1 text-sm">Course Name</Label>
                      <Input
                        value={newCourse.name}
                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()}
                        className="h-10 bg-input-background"
                        placeholder="Machine Learning"
                      />
                    </div>
                    <div>
                      <Label className="block mb-1 text-sm">Course Code</Label>
                      <Input
                        value={newCourse.code}
                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()}
                        className="h-10 bg-input-background"
                        placeholder="CS229"
                      />
                    </div>
                    <div>
                      <Label className="block mb-1 text-sm">Semester</Label>
                      <Input
                        value={newCourse.semester}
                        onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()}
                        className="h-10 bg-input-background"
                        placeholder="Spring 2026"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddCourse}
                    disabled={addingCourse}
                    className="w-full h-10 bg-primary hover:bg-primary/90"
                  >
                    {addingCourse ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                    ) : (
                      'Save Course'
                    )}
                  </Button>
                </div>
              )}

              {/* Course list */}
              {coursesLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading courses...
                </div>
              ) : courses.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
                  No courses yet. Click "Add Course" to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-4 rounded-lg bg-accent border border-border">
                      <div>
                        <p className="font-medium">{course.name}</p>
                        <p className="text-sm text-muted-foreground">{course.code} • {course.semester}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCourse(course.id, course.name)}
                        disabled={deletingId === course.id}
                        className="p-2 hover:bg-destructive/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        {deletingId === course.id
                          ? <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                          : <X className="w-5 h-5 text-destructive" />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Danger Zone */}
            <GlassCard className="border-destructive/50">
              <div className="flex items-center gap-3 mb-6"><Trash2 className="w-6 h-6 text-destructive" /><h3 className="text-xl text-destructive">Danger Zone</h3></div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 mb-4">
                <p className="text-sm text-destructive">⚠️ Deleting your account will permanently remove all your data. This action cannot be undone.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full h-11"><Trash2 className="w-5 h-5 mr-2" />Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete your account and remove all your data.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Delete Account</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </GlassCard>

            <div className="flex gap-4">
              <Button onClick={() => toast.success('Settings saved!')} className="flex-1 h-11 bg-primary hover:bg-primary/90">Save Settings</Button>
              <Button onClick={() => router.push('/dashboard')} variant="outline" className="flex-1 h-11 border-border hover:bg-accent">Cancel</Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}