'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { GlassCard } from '../../components/GlassCard';
import { AlertCircle, Check } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [validation, setValidation] = useState({
    name: { valid: false, message: '' },
    email: { valid: false, message: '' },
    password: { valid: false, message: '' },
    confirmPassword: { valid: false, message: '' },
  });

  const validateName = (value: string) => {
    if (!value) return { valid: false, message: '' };
    if (value.length < 2) return { valid: false, message: 'Name must be at least 2 characters' };
    return { valid: true, message: 'Looks good!' };
  };
  const validateEmail = (value: string) => {
    if (!value) return { valid: false, message: '' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return { valid: false, message: 'Please enter a valid email' };
    return { valid: true, message: 'Valid email' };
  };
  const validatePassword = (value: string) => {
    if (!value) return { valid: false, message: '' };
    if (value.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) return { valid: false, message: 'Must include uppercase, lowercase, and number' };
    return { valid: true, message: 'Strong password' };
  };
  const validateConfirmPassword = (value: string, password: string) => {
    if (!value) return { valid: false, message: '' };
    if (value !== password) return { valid: false, message: 'Passwords do not match' };
    return { valid: true, message: 'Passwords match' };
  };

  const handleChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    let validationResult;
    switch (field) {
      case 'name': validationResult = validateName(value); break;
      case 'email': validationResult = validateEmail(value); break;
      case 'password':
        setValidation({ ...validation, password: validatePassword(value), confirmPassword: validateConfirmPassword(formData.confirmPassword, value) });
        return;
      case 'confirmPassword': validationResult = validateConfirmPassword(value, formData.password); break;
      default: return;
    }
    setValidation({ ...validation, [field]: validationResult });
  };

  const isFormValid = Object.values(validation).every((v) => v.valid);

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <h1 className="text-5xl mb-4 text-primary">Aniporia</h1>
          <p className="text-3xl mb-6">Know What You Don't Know</p>
          <p className="text-muted-foreground text-lg mb-8">AI-powered academic auditing that detects knowledge gaps by comparing your notes against the syllabus</p>
          <img src="https://images.unsplash.com/photo-1754149879201-f00d4737914d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzRCUyMGFic3RyYWN0JTIwZ3JhcGglMjBuZXR3b3JrJTIwcHVycGxlfGVufDF8fHx8MTc3MjczMTgxM3ww&ixlib=rb-4.1.0&q=80&w=1080" alt="Network" className="rounded-2xl shadow-2xl" />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-12">
        <GlassCard className="w-full max-w-md">
          <h2 className="text-3xl mb-6 text-center">Create Account</h2>
          <div className="space-y-5">
            {[
              { field: 'name', label: 'Full Name', type: 'text', placeholder: 'Enter your full name' },
              { field: 'email', label: 'Email Address', type: 'email', placeholder: 'your.email@university.edu' },
              { field: 'password', label: 'Password', type: 'password', placeholder: 'Create a strong password' },
              { field: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Re-enter your password' },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field}>
                <Label htmlFor={field} className="block mb-2">{label}</Label>
                <Input
                  id={field}
                  type={type}
                  value={formData[field as keyof typeof formData]}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="h-12 bg-input-background border-border focus:border-primary focus:ring-2 focus:ring-primary/50"
                  placeholder={placeholder}
                />
                {formData[field as keyof typeof formData] && (
                  <div className={`flex items-center gap-2 mt-2 text-sm ${validation[field as keyof typeof validation].valid ? 'text-mastered' : 'text-missing'}`}>
                    {validation[field as keyof typeof validation].valid ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {validation[field as keyof typeof validation].message}
                  </div>
                )}
              </div>
            ))}
            <Button onClick={() => router.push('/setup')} disabled={!isFormValid} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground mt-6">
              Create Account
            </Button>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-card text-muted-foreground">Or continue with</span></div>
            </div>
            <Button variant="outline" className="w-full h-11 border-border hover:bg-accent">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <button onClick={() => router.push('/login')} className="text-primary hover:underline">Sign in</button>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
