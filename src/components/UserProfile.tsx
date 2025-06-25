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
      <div className="modal-content max-h-[90vh] overflow-hidden fade-in-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center hover-scale transition-smooth">
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-responsive-xl font-semibold">User Profile</h3>
                <p className="text-blue-100 text-responsive-sm truncate">{user?.email}</p>
              </div>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="btn-icon bg-white/20 hover:bg-white/30 text-white hover-scale btn-press touch-target"
                aria-label="Close profile"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item flex-1 justify-center py-3 text-responsive-sm font-medium transition-all duration-200 hover-lift fade-in touch-target ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
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
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] optimize-scroll">
          {activeTab === 'profile' && (
            <div className="fade-in">
              <h4 className="text-responsive-lg font-semibold text-gray-800 mb-4">Profile Information</h4>
              
              {profileSuccess && (
                <div className="alert alert-success mb-4 fade-in">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 checkmark-animate" />
                  <span className="text-responsive-sm">{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="alert alert-error mb-4 fade-in shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-responsive-sm">{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-smooth" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input pl-10"
                      placeholder="Enter your email"
                      required
                      disabled={profileLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={profileLoading || email === user?.email}
                  className="btn-primary w-full hover-lift btn-press touch-target"
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
              <h4 className="text-responsive-lg font-semibold text-gray-800 mb-4">Change Password</h4>
              
              {passwordSuccess && (
                <div className="alert alert-success mb-4 fade-in">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 checkmark-animate" />
                  <span className="text-responsive-sm">{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="alert alert-error mb-4 fade-in shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-responsive-sm">{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="form-label">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-smooth" />
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input pl-10 pr-12"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                      disabled={passwordLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-smooth hover-scale touch-target"
                      disabled={passwordLoading}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-smooth" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-input pl-10 pr-12"
                      placeholder="Confirm new password"
                      required
                      disabled={passwordLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-smooth hover-scale touch-target"
                      disabled={passwordLoading}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="btn-primary w-full hover-lift btn-press touch-target"
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
        <div className="card-footer fade-in">
          <div className="text-center">
            <p className="text-responsive-xs text-gray-500">
              Account created: {new Date(user?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};