import * as dotenv from 'dotenv';
dotenv.config();

console.log('Environment Verification');
console.log('========================\n');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('Expected URL: https://igqlyqbhbqmxcksiuzix.supabase.co');
console.log('Match:', process.env.VITE_SUPABASE_URL === 'https://igqlyqbhbqmxcksiuzix.supabase.co' ? '✓' : '✗');
console.log('\nAnon Key Present:', process.env.VITE_SUPABASE_ANON_KEY ? '✓' : '✗');
