'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Block deactivated accounts (server-enforced again in dashboard layout)
      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('is_active')
          .eq('id', data.user.id)
          .single();

        if (profile && profile.is_active === false) {
          await supabase.auth.signOut();
          setError('Your account has been deactivated. Please contact an administrator.');
          return;
        }
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-4">
            <span className="text-2xl font-bold text-white">D&M</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">D&M Deal Portal</h1>
          <p className="text-surface-500 mt-1">Sign in to your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@dmauto.com"
              required
              autoComplete="email"
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-surface-400 mt-6">
          D&M Auto Leasing &mdash; Four Stars Auto Group
        </p>
      </div>
    </div>
  );
}
