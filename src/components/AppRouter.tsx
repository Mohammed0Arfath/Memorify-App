import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { LandingPage } from './LandingPage';
import { AuthForm } from './AuthForm';
import { ThemeToggle } from './ThemeToggle';
import App from '../App';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

type AppState = 'landing' | 'auth' | 'app';

export const AppRouter: React.FC = () => {
  const { isDark } = useTheme();
  const [appState, setAppState] = useState<AppState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
        }
        
        if (session?.user) {
          setUser(session.user);
          setAppState('app');
        } else {
          setAppState('landing');
        }
      } catch (error) {
        console.error('Failed to check session:', error);
        setAppState('landing');
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        setAppState('app');
      } else {
        setUser(null);
        setAppState('landing');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading spinner while checking authentication
  if (loading) {
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

  // Render based on current state
  switch (appState) {
    case 'landing':
      return <LandingPage onNavigateToAuth={() => setAppState('auth')} />;
    
    case 'auth':
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-500">
          {/* Theme Toggle for Auth Page */}
          <ThemeToggle />
          
          <div className="absolute top-6 left-6">
            <button
              onClick={() => setAppState('landing')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors duration-300"
            >
              ← Back to Home
            </button>
          </div>
          <AuthForm />
        </div>
      );
    
    case 'app':
      return user ? <App /> : <LandingPage onNavigateToAuth={() => setAppState('auth')} />;
    
    default:
      return <LandingPage onNavigateToAuth={() => setAppState('auth')} />;
  }
};