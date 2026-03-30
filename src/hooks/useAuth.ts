'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserWithRelations } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<UserWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUser = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          team:teams!users_team_id_fkey(*, office:offices(*)),
          office:offices(*)
        `)
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
        return;
      }

      setUser(data as UserWithRelations);
    } catch (err) {
      console.error('Auth error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  return { user, loading, signOut, refetchUser: fetchUser };
}
