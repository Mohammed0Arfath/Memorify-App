import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

export const AuthForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Form validation
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  // Check for OAuth callback on component mount
  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('OAuth callback error:', error);
        setError('Authentication failed. Please try again.');
      } else if (data.session) {
        console.log('OAuth authentication successful:', data.session.user.email);
        // The AuthWrapper will handle the redirect
      }
    };

    // Check if this is an OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('code') || window.location.hash.includes('access_token')) {
      handleAuthCallback();
    }
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string) => {
    if (isSignUp && !confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (isSignUp && confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError(null);
    return true;
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading || loading) return;
    
    setGoogleLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) throw error;
      
      // The redirect will happen automatically
      console.log('Google OAuth initiated successfully');
      
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      if (error.message.includes('popup')) {
        setError('Please allow popups for this site and try again.');
      } else if (error.message.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else if (error.message.includes('not enabled')) {
        setError('Google authentication is not enabled. Please contact support.');
      } else {
        setError(error.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate form
    const isEmailValid = validateEmail(email);
    const isPasswordValid = !isResetMode && validatePassword(password);
    const isConfirmPasswordValid = !isResetMode && validateConfirmPassword(confirmPassword);

    if (!isEmailValid || (!isResetMode && (!isPasswordValid || !isConfirmPasswordValid))) {
      setLoading(false);
      return;
    }

    try {
      if (isResetMode) {
        // Password reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess('Password reset email sent! Check your inbox for instructions.');
      } else if (isSignUp) {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('Account created successfully! You can now sign in.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Provide user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('User already registered')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (error.message.includes('Password should be at least 6 characters')) {
        setError('Password must be at least 6 characters long.');
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (mode: 'signin' | 'signup' | 'reset') => {
    resetForm();
    setIsSignUp(mode === 'signup');
    setIsResetMode(mode === 'reset');
  };

  const getTitle = () => {
    if (isResetMode) return 'Reset Password';
    return isSignUp ? 'Create Account' : 'Welcome Back';
  };

  const getSubtitle = () => {
    if (isResetMode) return 'Enter your email to receive reset instructions';
    return isSignUp 
      ? 'Start your journey of self-reflection' 
      : 'Continue your emotional journey';
  };

  const getButtonText = () => {
    if (loading) {
      if (isResetMode) return 'Sending Reset Email...';
      return isSignUp ? 'Creating Account...' : 'Signing In...';
    }
    if (isResetMode) return 'Send Reset Email';
    return isSignUp ? 'Create Account' : 'Sign In';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8 fade-in-down">
          <div className="brand-logo mx-auto mb-4 hover-scale transition-smooth float">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2 gradient-animate">
            Memorify
          </h1>
          <p className="text-gray-600">
            Your AI-powered journal for emotional reflection
          </p>
        </div>

        {/* Auth Form */}
        <div className="card card-hover fade-in-up">
          <div className="card-header">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {getTitle()}
            </h2>
            <p className="text-gray-600">
              {getSubtitle()}
            </p>
          </div>

          <div className="card-body">
            {/* Success Message */}
            {success && (
              <div className="alert alert-success mb-4 fade-in">
                <CheckCircle className="w-4 h-4 flex-shrink-0 checkmark-animate" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="alert alert-error mb-4 fade-in shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Google Sign In Button */}
            {!isResetMode && (
              <div className="mb-6 fade-in stagger-1">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover-lift btn-press"
                >
                  {googleLoading ? (
                    <div className="loading-spinner w-5 h-5"></div>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <span>
                    {googleLoading 
                      ? 'Connecting...' 
                      : `Continue with Google`
                    }
                  </span>
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="fade-in stagger-2">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-smooth" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    className={`form-input pl-10 ${emailError ? 'form-input-error shake' : ''}`}
                    placeholder="Enter your email"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
                {emailError && (
                  <p className="form-error fade-in">{emailError}</p>
                )}
              </div>

              {/* Password Field */}
              {!isResetMode && (
                <div className="fade-in stagger-3">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-smooth" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) validatePassword(e.target.value);
                        if (confirmPassword && confirmPasswordError) {
                          validateConfirmPassword(confirmPassword);
                        }
                      }}
                      onBlur={() => validatePassword(password)}
                      className={`form-input pl-10 pr-12 ${passwordError ? 'form-input-error shake' : ''}`}
                      placeholder="Enter your password"
                      required
                      minLength={6}
                      disabled={loading || googleLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-smooth hover-scale"
                      disabled={loading || googleLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="form-error fade-in">{passwordError}</p>
                  )}
                </div>
              )}

              {/* Confirm Password Field */}
              {isSignUp && !isResetMode && (
                <div className="fade-in stagger-4">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-smooth" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) validateConfirmPassword(e.target.value);
                      }}
                      onBlur={() => validateConfirmPassword(confirmPassword)}
                      className={`form-input pl-10 pr-12 ${confirmPasswordError ? 'form-input-error shake' : ''}`}
                      placeholder="Confirm your password"
                      required
                      disabled={loading || googleLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-smooth hover-scale"
                      disabled={loading || googleLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <p className="form-error fade-in">{confirmPasswordError}</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="btn-primary w-full hover-lift btn-press fade-in stagger-5"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="loading-spinner w-4 h-4"></div>
                    {getButtonText()}
                  </div>
                ) : (
                  getButtonText()
                )}
              </button>
            </form>

            {/* Navigation Links */}
            <div className="mt-6 space-y-3 text-center fade-in stagger-6">
              {!isResetMode && (
                <button
                  onClick={() => switchMode(isSignUp ? 'signin' : 'signup')}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-smooth"
                  disabled={loading || googleLoading}
                >
                  {isSignUp 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Sign up"
                  }
                </button>
              )}
              
              {!isSignUp && !isResetMode && (
                <div>
                  <button
                    onClick={() => switchMode('reset')}
                    className="text-gray-600 hover:text-gray-700 text-sm transition-smooth"
                    disabled={loading || googleLoading}
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              {isResetMode && (
                <button
                  onClick={() => switchMode('signin')}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-smooth"
                  disabled={loading || googleLoading}
                >
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 hover-lift transition-smooth fade-in stagger-1">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2 hover-scale transition-smooth">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-800 mb-1">AI Companion</h3>
            <p className="text-xs text-gray-600">Empathetic conversations</p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 hover-lift transition-smooth fade-in stagger-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2 hover-scale transition-smooth">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-800 mb-1">Personal Growth</h3>
            <p className="text-xs text-gray-600">Track emotional journey</p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 hover-lift transition-smooth fade-in stagger-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2 hover-scale transition-smooth">
              <Lock className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-800 mb-1">Private & Secure</h3>
            <p className="text-xs text-gray-600">Your data stays safe</p>
          </div>
        </div>
      </div>
    </div>
  );
};