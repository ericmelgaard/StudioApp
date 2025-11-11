import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const EXPECTED_DB_URL = 'https://igqlyqbhbqmxcksiuzix.supabase.co';

if (supabaseUrl !== EXPECTED_DB_URL) {
  console.error('⚠️  DATABASE URL MISMATCH DETECTED!');
  console.error(`Expected: ${EXPECTED_DB_URL}`);
  console.error(`Current:  ${supabaseUrl}`);
  console.error('\nThe database URL has changed unexpectedly.');
  console.error('This may cause data loss. Please verify your .env file.');
}

if (import.meta.env.DEV && supabaseUrl === EXPECTED_DB_URL) {
  console.log('✓ Database connection stable:', supabaseUrl);
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
