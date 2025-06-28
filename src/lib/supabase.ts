import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced validation with detailed error messages
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `
🚨 Supabase Configuration Error:
- VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}
- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}

Please check your .env file and ensure both variables are set correctly.
Refer to SUPABASE_MIGRATION_GUIDE.md for setup instructions.
  `;
  console.error(errorMessage);
  throw new Error('Missing Supabase environment variables');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('❌ Invalid Supabase URL format:', supabaseUrl);
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
}

// Create Supabase client with enhanced configuration and error handling
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'memorify-app'
    }
  },
  db: {
    schema: 'public'
  }
});

// Enhanced connection test with better error handling
const testConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection...');
    console.log('📍 URL:', supabaseUrl);
    
    // Test basic connectivity with a simple query
    const { data, error } = await supabase
      .from('diary_entries')
      .select('count')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      // Check if it's an auth error (expected for unauthenticated users)
      if (error.code === 'PGRST116' || error.message.includes('RLS')) {
        console.log('✅ Supabase connected successfully (RLS active)');
        return true;
      } else {
        console.error('❌ Supabase connection test failed:', error);
        return false;
      }
    }
    
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    
    // Provide specific guidance based on error type
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`
🔧 Connection Troubleshooting:
1. Verify your Supabase project is active (not paused)
2. Check if the URL is correct: ${supabaseUrl}
3. Ensure your internet connection is stable
4. Try refreshing the page
      `);
    }
    
    return false;
  }
};

// Test auth session with better error handling
const testAuthSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth session error:', error);
      return false;
    }
    
    if (data.session) {
      console.log('✅ User session found:', data.session.user.email);
    } else {
      console.log('ℹ️ No active user session');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check auth session:', error);
    return false;
  }
};

// Initialize connection tests
Promise.all([testConnection(), testAuthSession()])
  .then(([connectionOk, authOk]) => {
    if (connectionOk && authOk) {
      console.log('🎉 Supabase initialization complete');
    } else {
      console.warn('⚠️ Supabase initialization completed with issues');
    }
  })
  .catch((error) => {
    console.error('💥 Critical Supabase initialization error:', error);
  });