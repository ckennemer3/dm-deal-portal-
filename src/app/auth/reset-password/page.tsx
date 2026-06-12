'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MIN_PASSWORD_LENGTH = 8;

type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // The reset email link runs through /auth/callback, which exchanges the code
  // for a session. If no session exists here, the link was invalid or expired.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLinkState(user ? 'valid' : 'invalid');
    });
  }, []);

  /** Validates the new password locally, then updates it on the recovered session */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
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
          <h1 className="text-2xl font-bold text-surface-900">Set a new password</h1>
          <p className="text-surface-500 mt-1">Choose a new password for your account</p>
        </div>

        <div className="card p-8">
          {linkState === 'checking' && (
            <p className="text-center text-sm text-surface-500">Verifying your reset link&hellip;</p>
          )}

          {linkState === 'invalid' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-surface-700">
                This password reset link is invalid or has expired.
              </p>
              <Link
                href="/auth/forgot-password"
                className="inline-block text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Request a new link
              </Link>
            </div>
          )}

          {linkState === 'valid' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="New password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                required
                autoComplete="new-password"
                autoFocus
              />

              <Input
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                autoComplete="new-password"
              />

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Update password
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-surface-400 mt-6">
          D&M Auto Leasing &mdash; Four Stars Auto Group
        </p>
      </div>
    </div>
  );
}
