'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { GlassCard } from '../../components/GlassCard';
import { Progress } from '../../components/ui/progress';

export default function AccountSetupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', contact: '', institution: '', graduationYear: '', academicLevel: '' });
  const isComplete = Object.values(formData).every((value) => value !== '');

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step 1 of 2</span>
            <span className="text-sm text-muted-foreground">50%</span>
          </div>
          <Progress value={50} className="h-2" />
        </div>
        <GlassCard>
          <h2 className="text-3xl mb-2">Account Setup</h2>
          <p className="text-muted-foreground mb-8">Tell us a bit about yourself to personalize your experience</p>
          <div className="space-y-6">
            <div>
              <Label htmlFor="name" className="block mb-2">Full Name</Label>
              <Input id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50" placeholder="John Doe" />
              <p className="text-sm text-muted-foreground mt-1">This will appear on your profile</p>
            </div>
            <div>
              <Label htmlFor="contact" className="block mb-2">Contact Number</Label>
              <Input id="contact" type="tel" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} className="h-12 bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50" placeholder="+1 (555) 000-0000" />
              <p className="text-sm text-muted-foreground mt-1">For account recovery and notifications</p>
            </div>
            <div>
              <Label htmlFor="institution" className="block mb-2">Institution</Label>
              <Input id="institution" type="text" value={formData.institution} onChange={(e) => setFormData({ ...formData, institution: e.target.value })} className="h-12 bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50" placeholder="Stanford University" />
              <p className="text-sm text-muted-foreground mt-1">Your university or college name</p>
            </div>
            <div>
              <Label htmlFor="graduationYear" className="block mb-2">Expected Graduation Year</Label>
              <Select value={formData.graduationYear} onValueChange={(value) => setFormData({ ...formData, graduationYear: value })}>
                <SelectTrigger id="graduationYear" className="h-12 bg-input-background border-border">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">When do you plan to graduate?</p>
            </div>
            <div>
              <Label htmlFor="academicLevel" className="block mb-2">Academic Level</Label>
              <Select value={formData.academicLevel} onValueChange={(value) => setFormData({ ...formData, academicLevel: value })}>
                <SelectTrigger id="academicLevel" className="h-12 bg-input-background border-border">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                  <SelectItem value="postdoc">Post-Doctoral</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">Your current academic standing</p>
            </div>
            <Button onClick={() => router.push('/course')} disabled={!isComplete} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground mt-6">
              Continue →
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
