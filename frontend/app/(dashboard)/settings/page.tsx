'use client';
import { useState } from 'react';
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
import { Sun, Moon, Eye, Keyboard, Palette, User, Lock, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [contrast, setContrast] = useState([100]);
  const [fontSize, setFontSize] = useState([16]);
  const [keyboardNav, setKeyboardNav] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [colorblindMode, setColorblindMode] = useState('none');
  const [courses, setCourses] = useState([
    { id: '1', name: 'Machine Learning', code: 'CS229', semester: 'Spring 2026' },
    { id: '2', name: 'Data Structures', code: 'CS106B', semester: 'Spring 2026' },
    { id: '3', name: 'Computer Graphics', code: 'CS148', semester: 'Spring 2026' },
    { id: '4', name: 'Operating Systems', code: 'CS140', semester: 'Spring 2026' },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="settings" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={62} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl mb-8">Settings</h2>
          <div className="space-y-6">
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
            <GlassCard>
              <h3 className="text-xl mb-6">Manage Courses</h3>
              <div className="space-y-3">
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-4 rounded-lg bg-accent border border-border">
                    <div><p className="font-medium">{course.name}</p><p className="text-sm text-muted-foreground">{course.code} • {course.semester}</p></div>
                    <button onClick={() => { setCourses(courses.filter((c) => c.id !== course.id)); toast.success('Course removed'); }} className="p-2 hover:bg-destructive/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <X className="w-5 h-5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 h-11 border-primary/50 text-primary hover:bg-primary/10">+ Add New Course</Button>
            </GlassCard>
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
