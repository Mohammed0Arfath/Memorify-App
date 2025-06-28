import React, { useState } from 'react';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle, Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface UserProfileProps {
  user: any;
  onClose?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onClose }) => {
  const { updateProfile, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  // Profile form state
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const { error } = await updateProfile({ email });
      
      if (error) {
        throw new Error(error);
      }
      
      setProfileSuccess('Profile updated successfully!');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate passwords
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    try {
      const { error } = await updatePassword(newPassword);
      
      if (error) {
        throw new Error(error);
      }
      
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'password' as const, label: 'Password', icon: Lock },
  ];

  return (
    <div className="modal-backdrop backdrop-animate">
      <div className="modal-content max-w-md max-h-[90vh] overflow-hidden fade-in-up bg-white dark:bg-slate-800/95 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 dark:bg-white/30 rounded-full flex items-center justify-center hover-scale transition-smooth">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">User Profile</h3>
                <p className="text-blue-100 dark:text-blue-200 text-sm truncate">{user?.email}</p>
              </div>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="btn-icon bg-white/20 dark:bg-white/30 hover:bg-white/30 dark:hover:bg-white/40 text-white hover-scale btn-press"
                aria-label="Close profile"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item flex-1 justify-center py-3 text-sm font-medium transition-all duration-200 hover-lift fade-in ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'profile' && (
            <div className="fade-in">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Profile Information</h4>
              
              {profileSuccess && (
                <div className="alert alert-success mb-4 fade-in bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50 text-green-800 dark:text-green-300">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 checkmark-animate" />
                  <span className="text-sm">{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="alert alert-error mb-4 fade-in shake bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="email" className="form-label text-gray-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5 transition-smooth" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input pl-10 bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400"
                      placeholder="Enter your email"
                      required
                      disabled={profileLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={profileLoading || email === user?.email}
                  className="btn-primary w-full hover-lift btn-press"
                >
                  {profileLoading ? (
                    <>
                      <div className="loading-spinner w-4 h-4 border-white border-t-transparent"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Update Profile
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="fade-in">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Change Password</h4>
              
              {passwordSuccess && (
                <div className="alert alert-success mb-4 fade-in bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50 text-green-800 dark:text-green-300">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 checkmark-animate" />
                  <span className="text-sm">{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="alert alert-error mb-4 fade-in shake bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="form-label text-gray-700 dark:text-slate-300">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5 transition-smooth" />
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input pl-10 pr-12 bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                      disabled={passwordLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-smooth hover-scale"
                      disabled={passwordLoading}
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label text-gray-700 dark:text-slate-300">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5 transition-smooth" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-input pl-10 pr-12 bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400"
                      placeholder="Confirm new password"
                      required
                      disabled={passwordLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-smooth hover-scale"
                      disabled={passwordLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="btn-primary w-full hover-lift btn-press"
                >
                  {passwordLoading ? (
                    <>
                      <div className="loading-spinner w-4 h-4 border-white border-t-transparent"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer fade-in bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-700">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Account created: {new Date(user?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};