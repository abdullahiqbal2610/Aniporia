'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/* ── Star field ── */
function StarField() {
  useEffect(() => {
    const canvas = document.getElementById('stars-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    type S = { x: number; y: number; r: number; speed: number; p: number };
    const stars: S[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.2, speed: Math.random() * 0.12 + 0.02, p: Math.random() * Math.PI * 2,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.p += 0.01; s.y -= s.speed;
        if (s.y < -2) { s.y = canvas.height + 2; s.x = Math.random() * canvas.width; }
        const o = 0.15 + 0.35 * Math.sin(s.p);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190,180,255,${o})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas id="stars-canvas" className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ── Validation icon ── */
function Tick({ ok, show }: { ok: boolean; show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
      style={{ background: ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}
    >
      {ok
        ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" /></svg>}
    </div>
  );
}

/* ── Password strength bar ── */
function StrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-400"
            style={{ background: i <= score ? colors[score] : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>
      <p style={{ fontSize: '11px', color: colors[score], fontWeight: 500 }}>{labels[score]}</p>
    </div>
  );
}

/* ── Input ── */
function Field({
  id, label, type, value, onChange, placeholder, valid, showValidation, hint,
}: {
  id: string; label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; valid: boolean; showValidation: boolean; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderGlow = focused
    ? '0 0 0 1.5px rgba(139,92,246,0.7), 0 0 18px rgba(139,92,246,0.15)'
    : showValidation
    ? valid
      ? '0 0 0 1px rgba(16,185,129,0.4)'
      : '0 0 0 1px rgba(239,68,68,0.35)'
    : '0 0 0 1px rgba(255,255,255,0.07)';

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold tracking-widest uppercase mb-2"
        style={{ color: focused ? '#a78bfa' : '#6b7280' }}>
        {label}
      </label>
      <div className="relative rounded-xl transition-all duration-300"
        style={{ background: 'rgba(255,255,255,0.04)', boxShadow: borderGlow }}>
        <input
          id={id} type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-gray-700 outline-none pr-10"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
        <Tick ok={valid} show={showValidation && !focused} />
      </div>
      {hint && showValidation && !valid && (
        <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{hint}</p>
      )}
    </div>
  );
}

/* ── Logomark (shared) ── */
function Logo() {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 rounded-xl rotate-12"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }} />
        <div className="absolute inset-0 rounded-xl flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3" fill="white" opacity="0.9" />
            <circle cx="3" cy="5" r="1.5" fill="white" opacity="0.5" />
            <circle cx="15" cy="5" r="1.5" fill="white" opacity="0.5" />
            <circle cx="3" cy="13" r="1.5" fill="white" opacity="0.5" />
            <circle cx="15" cy="13" r="1.5" fill="white" opacity="0.5" />
            <line x1="9" y1="9" x2="3" y2="5" stroke="white" strokeWidth="0.8" opacity="0.3" />
            <line x1="9" y1="9" x2="15" y2="5" stroke="white" strokeWidth="0.8" opacity="0.3" />
            <line x1="9" y1="9" x2="3" y2="13" stroke="white" strokeWidth="0.8" opacity="0.3" />
            <line x1="9" y1="9" x2="15" y2="13" stroke="white" strokeWidth="0.8" opacity="0.3" />
          </svg>
        </div>
      </div>
      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
        Aniporia
      </span>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap';
    document.head.appendChild(link);
    setTimeout(() => setMounted(true), 50);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  /* validation */
  const v = {
    name: form.name.trim().length >= 2,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    password: form.password.length >= 8 && /[A-Z]/.test(form.password) && /[a-z]/.test(form.password) && /\d/.test(form.password),
    confirm: form.confirm === form.password && form.confirm.length > 0,
  };
  const isValid = Object.values(v).every(Boolean);

  const set = (key: keyof typeof form) => (val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setTouched((t) => ({ ...t, [key]: true }));
  };

  const handleSignUp = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.name } },
      });
      if (error) { toast.error(error.message); return; }
      if (data.user) {
        sessionStorage.setItem('signup_name', form.name);
        setStep('success');
        setTimeout(() => router.push('/setup'), 2200);
      }
    } catch { toast.error('Something went wrong.'); }
    finally { setLoading(false); }
  };

  /* ── Success state ── */
  if (step === 'success') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #070710 0%, #0d0b1e 40%, #0a0e1a 100%)', fontFamily: "'DM Sans', sans-serif" }}>
        <StarField />
        <div className="text-center">
          <div className="mb-6 mx-auto w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>
            <svg width="32" height="26" viewBox="0 0 32 26" fill="none">
              <path d="M2 14l9 9L30 2" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
            Account created!
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Setting up your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center overflow-hidden relative py-8"
      style={{ background: 'linear-gradient(135deg, #070710 0%, #0d0b1e 40%, #0a0e1a 100%)', fontFamily: "'DM Sans', sans-serif" }}
    >
      <StarField />

      {/* Orbs */}
      <div className="absolute w-[500px] h-[500px] top-[-150px] right-[-100px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute w-[350px] h-[350px] bottom-[-60px] left-[-60px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      {/* Card */}
      <div
        className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.9), rgba(99,102,241,0.6), transparent)' }} />

        <div className="px-8 py-9">
          {/* Header */}
          <div className="text-center mb-7"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
            }}
          >
            <div className="mb-4 flex justify-center"><Logo /></div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'white', fontFamily: "'Syne', sans-serif", marginBottom: '6px' }}>
              Create your account
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Know what you don't know</p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2 justify-center mb-7"
            style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.15s' }}>
            {['Account', 'Profile', 'Courses'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: i === 0 ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.06)',
                      color: i === 0 ? 'white' : '#4b5563',
                      boxShadow: i === 0 ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                    }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '9px', color: i === 0 ? '#a78bfa' : '#374151', letterSpacing: '0.05em' }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div className="w-8 h-px mb-4" style={{ background: 'rgba(255,255,255,0.07)' }} />}
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
            }}
          >
            <Field id="name" label="Full Name" type="text" value={form.name} onChange={set('name')}
              placeholder="Your full name" valid={v.name} showValidation={touched.name}
              hint="At least 2 characters" />
            <Field id="email" label="Email Address" type="email" value={form.email} onChange={set('email')}
              placeholder="you@university.edu" valid={v.email} showValidation={touched.email}
              hint="Enter a valid email address" />
            <div>
              <Field id="password" label="Password" type="password" value={form.password} onChange={set('password')}
                placeholder="Create a strong password" valid={v.password} showValidation={touched.password}
                hint="8+ chars, upper, lower & number" />
              <StrengthBar password={form.password} />
            </div>
            <Field id="confirm" label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')}
              placeholder="Re-enter your password" valid={v.confirm} showValidation={touched.confirm}
              hint="Passwords must match" />
          </div>

          {/* CTA */}
          <div
            className="mt-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
            }}
          >
            <button
              onClick={handleSignUp}
              disabled={!isValid || loading}
              className="w-full relative rounded-xl py-3.5 text-sm font-semibold text-white overflow-hidden transition-all duration-200 active:scale-[0.98]"
              style={{
                background: (!isValid || loading)
                  ? 'rgba(109,40,217,0.3)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                boxShadow: (!isValid || loading) ? 'none' : '0 4px 24px rgba(124,58,237,0.4)',
                cursor: (!isValid || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                {loading && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? 'Creating account…' : 'Create Account'}
              </span>
              {isValid && !loading && (
                <div
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)' }}
                />
              )}
            </button>

            <p className="text-center mt-4 text-xs" style={{ color: '#4b5563' }}>
              Already have an account?{' '}
              <button onClick={() => router.push('/login')}
                className="font-semibold transition-colors duration-200 hover:text-white"
                style={{ color: '#a78bfa' }}>
                Sign in
              </button>
            </p>
          </div>

          {/* Feature pills */}
          <div
            className="mt-7 pt-6 flex flex-wrap gap-2 justify-center"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.6s ease 0.45s',
            }}
          >
            {['AI gap detection', 'Smart practice', 'Knowledge galaxy', 'Mock exams'].map((feat) => (
              <span
                key={feat}
                className="px-3 py-1 rounded-full text-xs"
                style={{
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  color: '#8b5cf6',
                  fontWeight: 500,
                }}
              >
                {feat}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}