import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Environment check:', {
  url: supabaseUrl,
  key: supabaseAnonKey ? 'present' : 'missing',
  allEnv: import.meta.env
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'creator' | 'operator' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  display_name: string;
  created_at: string;
  updated_at: string;
}
