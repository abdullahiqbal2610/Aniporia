'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { GlassCard } from '../../components/GlassCard';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

     console.log('data:', data);
     console.log('error:', error);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <h1 className="text-5xl mb-4 text-primary">Aniporia</h1>
          <p className="text-3xl mb-6">Know What You Don't Know</p>
          <p className="text-muted-foreground text-lg mb-8">
            AI-powered academic auditing that detects knowledge gaps by comparing your notes against the syllabus
          </p>
          <img
            src="https://images.unsplash.com/photo-1754149879201-f00d4737914d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzRCUyMGFic3RyYWN0JTIwZ3JhcGglMjBuZXR3b3JrJTIwcHVycGxlfGVufDF8fHx8MTc3MjczMTgxM3ww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Network"
            className="rounded-2xl shadow-2xl"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-12">
        <GlassCard className="w-full max-w-md">
          <h2 className="text-3xl mb-2 text-center">Welcome Back</h2>
          <p className="text-muted-foreground text-center mb-8">Sign in to continue your learning journey</p>

          <div className="space-y-5">
            <div>
              <Label htmlFor="email" className="block mb-2">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50"
                placeholder="your.email@university.edu"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div>
              <Label htmlFor="password" className="block mb-2">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-12 bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50"
                placeholder="Enter your password"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{' '}
              <button onClick={() => router.push('/register')} className="text-primary hover:underline">
                Sign up
              </button>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}