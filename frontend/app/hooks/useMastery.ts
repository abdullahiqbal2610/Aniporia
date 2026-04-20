// frontend/app/hooks/useMastery.ts

'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useMastery() {
  const [mastery, setMastery] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMastery = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) { 
        setMastery(0);
        setLoading(false);
        return; 
      }

      const res = await fetch('http://localhost:8000/courses/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch courses: ${res.status}`);
      }

      const courses = await res.json();
      
      if (courses.length === 0) { 
        setMastery(0);
        setLoading(false);
        return; 
      }

      const avg = Math.round(
        courses.reduce((sum: number, c: { mastery_percent: number }) => sum + (c.mastery_percent || 0), 0) /
          courses.length
      );
      
      console.log('[useMastery] Fetched mastery:', avg, 'from', courses.length, 'courses');
      setMastery(avg);
    } catch (err) {
      console.error('[useMastery] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMastery(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMastery();
  }, [fetchMastery]);

  return { mastery, loading, error, refetch: fetchMastery };
}