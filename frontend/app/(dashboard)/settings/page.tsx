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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Sun, Moon, Eye, Keyboard, Palette, User, Lock, Trash2, X, Loader2, Plus, Pencil, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
}

interface Profile {
  full_name: string;
  contact_number: string;
  institution: string;
  graduation_year: string;
  academic_level: string;
}

export default function SettingsPage() {
  const router = useRouter();

  // Profile
  const [profile, setProfile] = useState<Profile>({ full_name: '', contact_number: '', institution: '', graduation_year: '', academic_level: '' });
  const [profileLoading, setProfileLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>({ ...profile });
  const [savingProfile, setSavingProfile] = useState(false);

  // UI preferences
  const [darkMode, setDarkMode] = useState(true);
  const [contrast, setContrast] = useState([100]);
  const [fontSize, setFontSize] = useState([16]);
  const [keyboardNav, setKeyboardNav] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [colorblindMode, setColorblindMode] = useState('none');

  // Courses
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', code: '', semester: '' });
  const [addingCourse, setAddingCourse] = useState(false);

  // Account deletion
  const [deleting, setDeleting] = useState(false);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  // Fetch profile + courses on mount
  useEffect(() => {
    const init = async () => {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }

      // Fetch profile
      try {
        const res = await fetch('http://localhost:8000/profiles/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setProfileDraft(data);
        }
      } catch {
        toast.error('Failed to load profile.');
      } finally {
        setProfileLoading(false);
      }

      // Fetch courses
      try {
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
    init();
  }, [router]);

  const handleEditProfile = () => {
    setProfileDraft({ ...profile });
    setEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setProfileDraft({ ...profile });
    setEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:8000/profiles/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileDraft),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setEditingProfile(false);
        toast.success('Profile updated.');
      } else {
        toast.error('Failed to update profile.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    setDeletingCourseId(courseId);
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCourses(courses.filter((c) => c.id !== courseId));
        toast.success('Course removed.');
      } else {
        toast.error('Failed to remove course.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse.name || !newCourse.code || !newCourse.semester) {
      toast.error('Please fill in all course fields.');
      return;
    }
    setAddingCourse(true);
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:8000/courses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newCourse),
      });
      if (res.ok) {
        const created = await res.json();
        setCourses([...courses, created]);
        setNewCourse({ name: '', code: '', semester: '' });
        setShowAddCourse(false);
        toast.success('Course added.');
      } else {
        toast.error('Failed to add course.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setAddingCourse(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }
      const res = await fetch('http://localhost:8000/profiles/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || 'Failed to delete account.');
        return;
      }
      await supabase.auth.signOut();
      toast.success('Account deleted.');
      router.push('/login');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Helper: read-only field display
  const ProfileField = ({ label, value }: { label: string; value: string }) => (
    <div>
      <Label className="block mb-1 text-muted-foreground text-xs uppercase tracking-wide">{label}</Label>
      <p className="text-sm font-medium py-2 px-3 rounded-lg bg-accent border border-border min-h-[44px] flex items-center">
        {value || <span className="text-muted-foreground italic">Not set</span>}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="settings" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={0} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl mb-8">Settings</h2>
          <div className="space-y-6">

            {/* ── Profile ── */}
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><User className="w-5 h-5" /><h3 className="text-xl">Profile</h3></div>
                {!profileLoading && !editingProfile && (
                  <Button onClick={handleEditProfile} variant="outline" className="h-9 border-primary/50 text-primary hover:bg-primary/10">
                    <Pencil className="w-4 h-4 mr-2" />Edit Profile
                  </Button>
                )}
                {editingProfile && (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="h-9 bg-primary hover:bg-primary/90">
                      {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Save</>}
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" className="h-9">Cancel</Button>
                  </div>
                )}
              </div>

              {profileLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading profile...
                </div>
              ) : editingProfile ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block mb-2">Full Name</Label>
                    <Input value={profileDraft.full_name} onChange={(e) => setProfileDraft({ ...profileDraft, full_name: e.target.value })} className="h-11 bg-input-background" placeholder="Your name" />
                  </div>
                  <div>
                    <Label className="block mb-2">Institution</Label>
                    <Input value={profileDraft.institution} onChange={(e) => setProfileDraft({ ...profileDraft, institution: e.target.value })} className="h-11 bg-input-background" placeholder="Your institution" />
                  </div>
                  <div>
                    <Label className="block mb-2">Contact Number</Label>
                    <Input value={profileDraft.contact_number} onChange={(e) => setProfileDraft({ ...profileDraft, contact_number: e.target.value })} className="h-11 bg-input-background" placeholder="+1 234 567 8900" />
                  </div>
                  <div>
                    <Label className="block mb-2">Graduation Year</Label>
                    <Input value={profileDraft.graduation_year} onChange={(e) => setProfileDraft({ ...profileDraft, graduation_year: e.target.value })} className="h-11 bg-input-background" placeholder="2026" />
                  </div>
                  <div className="col-span-2">
                    <Label className="block mb-2">Academic Level</Label>
                    <Select value={profileDraft.academic_level} onValueChange={(v) => setProfileDraft({ ...profileDraft, academic_level: v })}>
                      <SelectTrigger className="h-11 bg-input-background"><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high_school">High School</SelectItem>
                        <SelectItem value="undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="postgraduate">Postgraduate</SelectItem>
                        <SelectItem value="phd">PhD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <ProfileField label="Full Name" value={profile.full_name} />
                  <ProfileField label="Institution" value={profile.institution} />
                  <ProfileField label="Contact Number" value={profile.contact_number} />
                  <ProfileField label="Graduation Year" value={profile.graduation_year} />
                  <div className="col-span-2">
                    <ProfileField label="Academic Level" value={profile.academic_level?.replace('_', ' ')} />
                  </div>
                </div>
              )}
            </GlassCard>

            {/* ── Appearance ── */}
            <GlassCard>
              <div className="flex items-center gap-3 mb-6"><Palette className="w-5 h-5" /><h3 className="text-xl">Appearance</h3></div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">{darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}<Label>Dark Mode</Label></div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
                <div>
                  <Label className="block mb-2">Font Size: {fontSize[0]}px</Label>
                  <Slider value={fontSize} onValueChange={setFontSize} min={12} max={24} step={1} className="w-full" />
                </div>
                <div>
                  <Label className="block mb-2">Contrast: {contrast[0]}%</Label>
                  <Slider value={contrast} onValueChange={setContrast} min={75} max={150} step={5} className="w-full" />
                </div>
                <div>
                  <Label className="block mb-2">Colorblind Mode</Label>
                  <Select value={colorblindMode} onValueChange={setColorblindMode}>
                    <SelectTrigger className="h-11 bg-input-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="deuteranopia">Deuteranopia</SelectItem>
                      <SelectItem value="protanopia">Protanopia</SelectItem>
                      <SelectItem value="tritanopia">Tritanopia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </GlassCard>

            {/* ── Accessibility ── */}
            <GlassCard>
              <div className="flex items-center gap-3 mb-6"><Eye className="w-5 h-5" /><h3 className="text-xl">Accessibility</h3></div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Keyboard className="w-4 h-4" /><Label>Keyboard Navigation</Label></div>
                  <Switch checked={keyboardNav} onCheckedChange={setKeyboardNav} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Reduce Motion</Label>
                  <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
                </div>
              </div>
            </GlassCard>

            {/* ── Security ── */}
            <GlassCard>
              <div className="flex items-center gap-3 mb-6"><Lock className="w-5 h-5" /><h3 className="text-xl">Security</h3></div>
              <Input type="password" placeholder="Current password" className="h-11 bg-input-background mb-3" />
              <Input type="password" placeholder="New password" className="h-11 bg-input-background mb-3" />
              <Input type="password" placeholder="Confirm new password" className="h-11 bg-input-background" />
              <Button variant="outline" className="mt-3">Update Password</Button>
            </GlassCard>

            {/* ── Manage Courses ── */}
            <GlassCard>
              <h3 className="text-xl mb-6">Manage Courses</h3>
              {coursesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading courses...
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.length === 0 && !showAddCourse && (
                    <p className="text-muted-foreground text-sm py-2">No courses yet.</p>
                  )}
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-4 rounded-lg bg-accent border border-border">
                      <div>
                        <p className="font-medium">{course.name}</p>
                        <p className="text-sm text-muted-foreground">{course.code} • {course.semester}</p>
                      </div>
                      <button onClick={() => handleDeleteCourse(course.id)} disabled={deletingCourseId === course.id}
                        className="p-2 hover:bg-destructive/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                        {deletingCourseId === course.id
                          ? <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                          : <X className="w-5 h-5 text-destructive" />}
                      </button>
                    </div>
                  ))}
                  {showAddCourse && (
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                      <Input value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} placeholder="Course name" className="h-10 bg-input-background" />
                      <Input value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} placeholder="Course code (e.g. CS101)" className="h-10 bg-input-background" />
                      <Input value={newCourse.semester} onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })} placeholder="Semester (e.g. Spring 2026)" className="h-10 bg-input-background" />
                      <div className="flex gap-2">
                        <Button onClick={handleAddCourse} disabled={addingCourse} className="flex-1 h-10 bg-primary hover:bg-primary/90">
                          {addingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Course'}
                        </Button>
                        <Button onClick={() => setShowAddCourse(false)} variant="outline" className="h-10">Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!showAddCourse && (
                <Button onClick={() => setShowAddCourse(true)} variant="outline" className="w-full mt-4 h-11 border-primary/50 text-primary hover:bg-primary/10">
                  <Plus className="w-4 h-4 mr-2" /> Add New Course
                </Button>
              )}
            </GlassCard>

            {/* ── Danger Zone ── */}
            <GlassCard className="border-destructive/50">
              <div className="flex items-center gap-3 mb-6"><Trash2 className="w-6 h-6 text-destructive" /><h3 className="text-xl text-destructive">Danger Zone</h3></div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 mb-4">
                <p className="text-sm text-destructive">⚠️ Deleting your account will permanently remove all your data including courses, uploads, and gaps. This action cannot be undone.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full h-11" disabled={deleting}>
                    {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : <><Trash2 className="w-5 h-5 mr-2" />Delete Account</>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all your data — courses, uploads, gaps, and practice history. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteAccount}>
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </GlassCard>

            <div className="flex gap-4">
              <Button onClick={() => router.push('/dashboard')} variant="outline" className="flex-1 h-11 border-border hover:bg-accent">Back to Dashboard</Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}