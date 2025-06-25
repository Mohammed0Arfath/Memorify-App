import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

export const AuthForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Form validation
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

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
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8 fade-in-down">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-4 hover-scale transition-smooth float">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 gradient-animate">
            Memorify
          </h1>
          <p className="text-gray-600">
            Your AI-powered journal for emotional reflection
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 hover-lift transition-smooth fade-in-up">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {getTitle()}
            </h2>
            <p className="text-gray-600">
              {getSubtitle()}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 fade-in">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 checkmark-animate" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 fade-in shake">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="fade-in stagger-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 form-input ${
                    emailError ? 'border-red-300 bg-red-50 shake' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>
              {emailError && (
                <p className="mt-1 text-xs text-red-600 fade-in">{emailError}</p>
              )}
            </div>

            {/* Password Field */}
            {!isResetMode && (
              <div className="fade-in stagger-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 form-input ${
                      passwordError ? 'border-red-300 bg-red-50 shake' : 'border-gray-300'
                    }`}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-smooth hover-scale"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-xs text-red-600 fade-in">{passwordError}</p>
                )}
              </div>
            )}

            {/* Confirm Password Field */}
            {isSignUp && !isResetMode && (
              <div className="fade-in stagger-3">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
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
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 form-input ${
                      confirmPasswordError ? 'border-red-300 bg-red-50 shake' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-smooth hover-scale"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="mt-1 text-xs text-red-600 fade-in">{confirmPasswordError}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover-lift btn-press fade-in stagger-4"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {getButtonText()}
                </div>
              ) : (
                getButtonText()
              )}
            </button>
          </form>

          {/* Navigation Links */}
          <div className="mt-6 space-y-3 text-center fade-in stagger-5">
            {!isResetMode && (
              <button
                onClick={() => switchMode(isSignUp ? 'signin' : 'signup')}
                className="text-blue-600 hover:text-blue-700 font-medium transition-smooth"
                disabled={loading}
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
                  disabled={loading}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {isResetMode && (
              <button
                onClick={() => switchMode('signin')}
                className="text-blue-600 hover:text-blue-700 font-medium transition-smooth"
                disabled={loading}
              >
                Back to sign in
              </button>
            )}
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