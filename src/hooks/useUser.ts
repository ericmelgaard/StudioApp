import { useState, useEffect } from 'react';
import { supabase, UserRole } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  display_name: string;
  concept_id: number | null;
  company_id: number | null;
  store_id: number | null;
  status: string;
  created_at: string;
  last_login_at?: string | null;
}

const USER_ID_MAP: Record<UserRole, string> = {
  admin: '00000000-0000-0000-0000-000000000001',
  operator: '00000000-0000-0000-0000-000000000002',
  creator: '00000000-0000-0000-0000-000000000003',
};

const DEMO_CREDENTIALS: Record<UserRole, { email: string; password: string }> = {
  admin: { email: 'admin@wanddigital.com', password: 'demo123456' },
  operator: { email: 'operator@wanddigital.com', password: 'demo123456' },
  creator: { email: 'creator@wanddigital.com', password: 'demo123456' },
};

export function useUser(role: UserRole | null) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(role !== null);

  useEffect(() => {
    if (!role) {
      setUser(null);
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      setLoading(true);

      try {
        // Check if already signed in
        const { data: { session } } = await supabase.auth.getSession();
        const userId = USER_ID_MAP[role];

        console.log('[useUser] Current session:', session?.user?.id, 'Target userId:', userId);

        // If not signed in or wrong user, sign in as demo user
        if (!session || session.user.id !== userId) {
          console.log('[useUser] Signing in as demo user for role:', role);
          const credentials = DEMO_CREDENTIALS[role];

          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (authError) {
            console.error('[useUser] Auth error:', authError);
            throw authError;
          }

          console.log('[useUser] Successfully signed in:', authData.user?.id);
        }

        // Load user profile
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        } else if (data) {
          console.log('[useUser] Loaded profile:', data);
          setUser(data);
        } else {
          console.error('User profile not found for role:', role);
          setUser(null);
        }
      } catch (error) {
        console.error('[useUser] Error in fetchUser:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [role]);

  return { user, loading };
}
