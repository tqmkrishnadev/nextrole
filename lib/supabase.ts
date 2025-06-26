import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types based on your schema
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: 'candidate' | 'recruiter' | 'super_admin';
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  isEmailVerify: boolean | null;
  isTemporaryEmail: boolean | null;
  emailVerifyOtp: any | null;
  status: string | null;
  password: string | null;
}

export interface Resume {
  id: string;
  userId: string | null;
  formattedJSON: any | null;
  status: string | null;
  savedFileName: string | null;
  created_at: string;
  updated_at: string | null;
  user_id: string | null;
}