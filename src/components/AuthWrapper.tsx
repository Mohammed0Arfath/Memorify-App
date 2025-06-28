import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { AuthForm } from './AuthForm';
import { Sparkles } from 'lucide-react';

interface AuthWrapperProps {
  children: (user: User) => React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Checking initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
        }
        
        if (mounted) {
          if (session?.user) {
            console.log('✅ Found existing session for:', session.user.email);
            setUser(session.user);
          } else {
            console.log('ℹ️ No existing session found');
            setUser(null);
          }
          setSessionChecked(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('💥 Session check failed:', error);
        if (mounted) {
          setUser(null);
          setSessionChecked(true);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
      
      if (mounted) {
        if (session?.user) {
          console.log('✅ User signed in:', session.user.email);
          setUser(session.user);
        } else {
          console.log('👋 User signed out or no session');
          setUser(null);
          
          // Clear any cached data on sign out
          localStorage.removeItem('diary-entries');
          localStorage.removeItem('memorify-user-session');
        }
        setLoading(false);
        
        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('🎉 User signed in successfully');
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out successfully');
          // Force a small delay to ensure state is cleared
          setTimeout(() => {
            if (window.location.pathname !== '/') {
              window.location.href = '/';
            }
          }, 100);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
        } else if (event === 'USER_UPDATED') {
          console.log('👤 User updated');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Show loading spinner while checking authentication
  if (loading || !sessionChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center transition-colors duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">Loading Memorify...</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show auth form if user is not authenticated
  if (!user) {
    return <AuthForm />;
  }

  // Render the app if user is authenticated
  return <>{children(user)}</>;
};