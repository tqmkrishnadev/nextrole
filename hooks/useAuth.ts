import { useState, useEffect, createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';
import { safeAsyncHandler } from '@/utils/safeAsyncHandler';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          // Clear profile when user signs out or session expires
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, try to find by email (for legacy users)
        if (error.code === 'PGRST116') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            const { data: profileByEmail, error: emailError } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', user.email)
              .single();
            
            if (emailError) {
              console.error('Error fetching profile by email:', emailError);
              return;
            }
            
            if (profileByEmail) {
              // Update profile with correct user ID
              const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({ id: userId })
                .eq('email', user.email)
                .select()
                .single();
              
              if (updateError) {
                console.error('Error updating profile ID:', updateError);
                setProfile(profileByEmail);
              } else {
                setProfile(updatedProfile);
              }
            }
          }
        }
        return;
      }

      console.log('Profile fetched successfully:', data);
      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      // First, try to sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        // Return user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Please check your email and confirm your account' };
        }
        if (error.message.includes('Too many requests')) {
          return { success: false, error: 'Too many login attempts. Please try again later' };
        }
        
        // For legacy users, check if user exists in profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .single();

        if (profileError || !profileData) {
          return { success: false, error: 'Invalid email or password' };
        }

        // For legacy users, create auth user and link to profile
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
        });

        if (signUpError) {
          return { success: false, error: 'Authentication failed' };
        }

        // Update profile with auth user ID
        if (signUpData.user) {
          await supabase
            .from('profiles')
            .update({ id: signUpData.user.id })
            .eq('email', email.toLowerCase().trim());
        }

        return { success: true };
      }

      // Check if profile exists for authenticated user
      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          // Create profile if it doesn't exist
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              role: 'candidate',
              isEmailVerify: true,
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
          }
        }
      }

      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      // Check if user already exists - use limit(1) instead of single()
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .limit(1);

      if (checkError) {
        return { success: false, error: 'Error checking existing user' };
      }

      if (existingProfiles && existingProfiles.length > 0) {
        return { success: false, error: 'User already exists with this email' };
      }

      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user' };
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          name: name.trim(),
          role: 'candidate',
          isEmailVerify: true,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Clean up auth user if profile creation fails
        await supabase.auth.signOut();
        return { success: false, error: 'Failed to create user profile' };
      }

      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      // Clear local state immediately for better UX
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Error in signOut:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      setProfile(data);
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  };
}

export { AuthContext };