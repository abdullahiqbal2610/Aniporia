'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/* ── Animated star field canvas ── */
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    type Star = { x: number; y: number; r: number; speed: number; opacity: number; pulse: number };
    const stars: Star[] = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.2,
      speed: Math.random() * 0.15 + 0.02,
      opacity: Math.random() * 0.7 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      stars.forEach((s) => {
        s.pulse += 0.012;
        const o = s.opacity * (0.6 + 0.4 * Math.sin(s.pulse));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 190, 255, ${o})`;
        ctx.fill();
        s.y -= s.speed;
        if (s.y < -2) { s.y = canvas.height + 2; s.x = Math.random() * canvas.width; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.9 }}
    />
  );
}

/* ── Floating orb decoration ── */
function Orb({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{ filter: 'blur(80px)' }}
    />
  );
}

/* ── Input field ── */
function Field({
  id, label, type, value, onChange, placeholder, onKeyDown,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="group">
      <label
        htmlFor={id}
        className="block text-xs font-semibold tracking-widest uppercase mb-2 transition-colors duration-200"
        style={{ color: focused ? '#a78bfa' : '#6b7280' }}
      >
        {label}
      </label>
      <div
        className="relative rounded-xl overflow-hidden transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.04)',
          boxShadow: focused
            ? '0 0 0 1.5px rgba(139,92,246,0.7), 0 0 20px rgba(139,92,246,0.15)'
            : '0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3.5 text-sm text-white placeholder-gray-600 outline-none"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // load google font
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap';
    document.head.appendChild(link);
    setTimeout(() => setMounted(true), 50);
    return () => document.head.removeChild(link);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { toast.error('Please enter your credentials.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); return; }
      if (data.user) { toast.success('Welcome back!'); router.push('/dashboard'); }
    } catch { toast.error('Something went wrong.'); }
    finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #070710 0%, #0d0b1e 40%, #0a0e1a 100%)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <StarField />

      {/* Ambient orbs */}
      <Orb className="w-[500px] h-[500px] top-[-100px] left-[-100px]"
        style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.25) 0%, transparent 70%)' } as any} />
      <Orb className="w-[400px] h-[400px] bottom-[-80px] right-[-80px]"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' } as any} />
      <Orb className="w-[250px] h-[250px] top-[40%] right-[15%]"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' } as any} />

      {/* Card */}
      <div
        className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.8), rgba(99,102,241,0.6), transparent)' }}
        />

        <div className="px-8 py-10">
          {/* Logo */}
          <div className="text-center mb-8"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
            }}
          >
            <div className="inline-flex items-center gap-2 mb-4">
              {/* Aniporia logomark */}
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
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'white', fontFamily: "'Syne', sans-serif", marginBottom: '6px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>
              Sign in to continue your learning journey
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
            }}
          >
            <Field id="email" label="Email Address" type="email" value={email}
              onChange={setEmail} placeholder="you@university.edu"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            <Field id="password" label="Password" type="password" value={password}
              onChange={setPassword} placeholder="Enter your password"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          </div>

          {/* CTA */}
          <div
            className="mt-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s',
            }}
          >
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full relative rounded-xl py-3.5 text-sm font-semibold text-white overflow-hidden transition-all duration-200 active:scale-[0.98]"
              style={{
                background: loading
                  ? 'rgba(109,40,217,0.5)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(124,58,237,0.4)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? 'Signing in…' : 'Sign In'}
              </span>
              {/* Shine sweep */}
              {!loading && (
                <div
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }}
                />
              )}
            </button>

            <p className="text-center mt-5 text-xs" style={{ color: '#4b5563' }}>
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/register')}
                className="font-semibold transition-colors duration-200 hover:text-white"
                style={{ color: '#a78bfa' }}
              >
                Create one
              </button>
            </p>
          </div>

          {/* Divider + stat strip */}
          <div
            className="mt-8 pt-6 flex items-center justify-around"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.7s ease 0.45s',
            }}
          >
            {[
              { value: '10K+', label: 'Students' },
              { value: '95%', label: 'Gap accuracy' },
              { value: '4.9★', label: 'Rating' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', fontFamily: "'Syne', sans-serif" }}>{value}</div>
                <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}