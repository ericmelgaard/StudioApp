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
}

const USER_ID_MAP: Record<UserRole, string> = {
  admin: '00000000-0000-0000-0000-000000000001',
  operator: '00000000-0000-0000-0000-000000000002',
  creator: '00000000-0000-0000-0000-000000000003',
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
      const userId = USER_ID_MAP[role];

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
      } else if (data) {
        setUser(data);
      } else {
        console.error('User profile not found for role:', role);
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();
  }, [role]);

  return { user, loading };
}
