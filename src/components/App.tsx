import React, { useState, useEffect } from 'react';
import { MessageCircle, BookOpen, Calendar, Sparkles, Menu, X, User, LogOut, Brain, Settings } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { DiaryTimeline } from './components/DiaryTimeline';
import { CalendarView } from './components/CalendarView';
import { AgentBoard } from './components/AgentBoard';
import { AuthWrapper } from './components/AuthWrapper';
import { UserProfile } from './components/UserProfile';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeToggle } from './components/ThemeToggle';
import { ViewMode, DiaryEntry, ChatMessage } from './types';
import { generateDiaryEntry, analyzeEmotionWithAI } from './utils/mockAI';
import { DiaryService } from './services/diaryService';
import { AgentService } from './services/agentService';
import { supabase } from './lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { errorHandler } from './utils/errorHandler';
import { useTheme } from './hooks/useTheme';

interface AppProps {
  user: SupabaseUser;
}

function AppContent({ user }: AppProps) {
  const { isDark } = useTheme();
  const [currentView, setCurrentView] = useState<ViewMode>('chat');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<DiaryEntry['emotion'] | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [isGeneratingEntry, setIsGeneratingEntry] = useState(false);
  const [viewTransition, setViewTransition] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load entries from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      loadEntries();
      runInitialAgentLoop();
    }
  }, [user]);

  // Close user menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isUserMenuOpen) return;
      
      const target = event.target as Element;
      const userMenuButton = document.querySelector('[data-user-menu-button]');
      const userMenuDropdown = document.querySelector('[data-user-menu-dropdown]');
      
      // Don't close if clicking on the button or dropdown
      if (userMenuButton?.contains(target) || userMenuDropdown?.contains(target)) {
        return;
      }
      
      setIsUserMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isUserMenuOpen) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isUserMenuOpen]);

  const loadEntries = async () => {
    try {
      setError(null);
      const { data: loadedEntries, error: loadError } = await DiaryService.safeGetEntries();
      
      if (loadError) {
        setError(loadError);
        errorHandler.logError(loadError, {
          userId: user.id,
          action: 'load_entries',
          component: 'App'
        }, 'medium');
        
        // Try fallback to localStorage
        const savedEntries = localStorage.getItem('diary-entries');
        if (savedEntries) {
          try {
            const parsedEntries = JSON.parse(savedEntries).map((entry: any) => ({
              ...entry,
              date: new Date(entry.date),
              chatMessages: entry.chatMessages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })),
            }));
            setEntries(parsedEntries);
          } catch (parseError) {
            errorHandler.logError(parseError instanceof Error ? parseError : new Error('Failed to parse localStorage entries'), {
              userId: user.id,
              action: 'parse_localStorage_entries',
              component: 'App'
            }, 'medium');
          }
        }
      } else if (loadedEntries) {
        setEntries(loadedEntries);
      }
    } catch (error) {
      const errorMessage = errorHandler.getUserFriendlyMessage(error instanceof Error ? error : 'Failed to load entries', 'loading entries');
      setError(errorMessage);
      errorHandler.logError(error instanceof Error ? error : new Error('Failed to load entries'), {
        userId: user.id,
        action: 'load_entries',
        component: 'App'
      }, 'high');
    } finally {
      setLoading(false);
    }
  };

  const runInitialAgentLoop = async () => {
    try {
      // Run agent loop on app load to check for triggers
      const { data: loadedEntries } = await DiaryService.safeGetEntries();
      if (loadedEntries) {
        await AgentService.runAgentLoop(loadedEntries);
      }
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error('Agent loop failed on startup'), {
        userId: user.id,
        action: 'run_initial_agent_loop',
        component: 'App'
      }, 'low');
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return; // Prevent multiple clicks
    
    console.log('🔄 Starting sign out process...');
    setSigningOut(true);
    
    try {
      // Close any open menus first
      setIsUserMenuOpen(false);
      setShowUserProfile(false);
      setIsMobileMenuOpen(false);
      
      console.log('📱 Closed all menus');
      
      // Clear local state immediately to provide instant feedback
      setEntries([]);
      setCurrentView('chat');
      setCurrentEmotion(null);
      setError(null);
      
      console.log('🧹 Cleared local state');
      
      // Clear localStorage
      localStorage.removeItem('diary-entries');
      localStorage.removeItem('memorify-user-session');
      
      console.log('💾 Cleared localStorage');
      
      // Sign out from Supabase with explicit session clearing
      const { error } = await supabase.auth.signOut({
        scope: 'global' // This ensures all sessions are cleared
      });
      
      if (error) {
        console.error('❌ Supabase sign out error:', error);
        errorHandler.logError(error, {
          userId: user.id,
          action: 'sign_out',
          component: 'App'
        }, 'medium');
      } else {
        console.log('✅ Successfully signed out from Supabase');
      }
      
      // Force clear any remaining session data
      await supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          console.log('⚠️ Session still exists, forcing refresh...');
          window.location.reload();
        }
      });
      
      console.log('🔄 Sign out process completed');
      
    } catch (error) {
      console.error('💥 Sign out error:', error);
      errorHandler.logError(error instanceof Error ? error : new Error('Sign out failed'), {
        userId: user.id,
        action: 'sign_out',
        component: 'App'
      }, 'high');
      
      // Even on error, try to clear everything and reload
      localStorage.clear();
      sessionStorage.clear();
      
      // Force reload as last resort
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } finally {
      setSigningOut(false);
    }
  };

  const handleOpenProfile = () => {
    setShowUserProfile(true);
    setIsUserMenuOpen(false);
  };

  const handleCloseProfile = () => {
    setShowUserProfile(false);
  };

  const handleGenerateEntry = async (messages: ChatMessage[], photo?: string) => {
    if (isGeneratingEntry) return; // Prevent multiple simultaneous generations
    
    const userMessages = messages.filter(msg => msg.isUser);
    if (userMessages.length === 0) return;

    setIsGeneratingEntry(true);
    setError(null);

    try {
      const allUserText = userMessages.map(msg => msg.text).join(' ');
      
      // Use AI-powered emotion analysis and diary generation
      const [emotion, generatedEntry] = await Promise.all([
        analyzeEmotionWithAI(allUserText),
        generateDiaryEntry(messages)
      ]);
      
      const newEntry: DiaryEntry = {
        id: Date.now().toString(),
        date: new Date(),
        chatMessages: messages,
        generatedEntry,
        emotion,
        photo,
        summary: `A day of ${emotion.primary} and reflection. ${generatedEntry.slice(0, 120)}...`,
      };

      // Save to Supabase with error handling
      const { data: savedEntry, error: saveError } = await DiaryService.safeCreateEntry(newEntry);
      
      if (saveError) {
        setError(saveError);
        errorHandler.logError(saveError, {
          userId: user.id,
          action: 'save_diary_entry',
          component: 'App',
          additionalData: { entryId: newEntry.id }
        }, 'medium');
        
        // Fallback to localStorage
        setEntries(prev => [newEntry, ...prev]);
        localStorage.setItem('diary-entries', JSON.stringify([newEntry, ...entries]));
      } else if (savedEntry) {
        setEntries(prev => [savedEntry, ...prev]);
        
        // Run agent loop after new entry to update memories and check triggers
        setTimeout(() => {
          AgentService.runAgentLoop([savedEntry, ...entries]).catch((error) => {
            errorHandler.logError(error instanceof Error ? error : new Error('Agent loop failed after entry creation'), {
              userId: user.id,
              action: 'run_agent_loop_after_entry',
              component: 'App'
            }, 'low');
          });
        }, 1000);
      }
      
      // Animate view transition
      setViewTransition(true);
      setTimeout(() => {
        setCurrentView('timeline');
        setViewTransition(false);
      }, 150);
    } catch (error) {
      const errorMessage = errorHandler.getUserFriendlyMessage(error instanceof Error ? error : 'Failed to generate entry', 'generating diary entry');
      setError(errorMessage);
      errorHandler.logError(error instanceof Error ? error : new Error('Failed to generate diary entry'), {
        userId: user.id,
        action: 'generate_diary_entry',
        component: 'App'
      }, 'medium');
      
      // Fallback to basic entry creation
      const allUserText = userMessages.map(msg => msg.text).join(' ');
      const basicEntry = `Today I reflected on ${allUserText.slice(0, 100)}...`;
      
      const newEntry: DiaryEntry = {
        id: Date.now().toString(),
        date: new Date(),
        chatMessages: messages,
        generatedEntry: basicEntry,
        emotion: {
          primary: 'reflection',
          intensity: 0.7,
          color: '#8B5CF6',
          emoji: '🤔'
        },
        photo,
        summary: `A day of reflection and introspection.`,
      };

      setEntries(prev => [newEntry, ...prev]);
      setCurrentView('timeline');
    } finally {
      setIsGeneratingEntry(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    // Switch to chat view to allow creating a new entry for the selected date
    setViewTransition(true);
    setTimeout(() => {
      setCurrentView('chat');
      setViewTransition(false);
    }, 150);
  };

  const handleViewChange = (newView: ViewMode) => {
    if (newView === currentView) return;
    
    setViewTransition(true);
    setTimeout(() => {
      setCurrentView(newView);
      setViewTransition(false);
    }, 150);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'chat' as ViewMode, icon: MessageCircle, label: 'Chat', color: 'text-blue-600' },
    { id: 'timeline' as ViewMode, icon: BookOpen, label: 'Timeline', color: 'text-emerald-600' },
    { id: 'calendar' as ViewMode, icon: Calendar, label: 'Calendar', color: 'text-purple-600' },
    { id: 'agent' as ViewMode, icon: Brain, label: 'AI Companion', color: 'text-pink-600' },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3 fade-in">
            <div className="loading-spinner w-8 h-8"></div>
            <span className="text-gray-600 dark:text-slate-300">Loading your entries...</span>
          </div>
        </div>
      );
    }

    const contentClass = `transition-all duration-300 ${viewTransition ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`;

    switch (currentView) {
      case 'chat':
        return <div className={contentClass}><ChatInterface onGenerateEntry={handleGenerateEntry} currentEmotion={currentEmotion} /></div>;
      case 'timeline':
        return <div className={contentClass}><DiaryTimeline entries={entries} /></div>;
      case 'calendar':
        return <div className={contentClass}><CalendarView entries={entries} onDateSelect={handleDateSelect} /></div>;
      case 'agent':
        return <div className={contentClass}><AgentBoard entries={entries} onRefresh={loadEntries} /></div>;
      default:
        return <div className={contentClass}><ChatInterface onGenerateEntry={handleGenerateEntry} currentEmotion={currentEmotion} /></div>;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col transition-colors duration-500 overflow-x-hidden">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/50 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                <span className="text-sm text-red-700 dark:text-red-300 truncate">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40 flex-shrink-0 fade-in-down transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3 fade-in min-w-0 flex-shrink-0">
                <div className="brand-logo hover-scale transition-smooth float">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold gradient-text truncate">
                    Memorify
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-none truncate">
                    Your AI-powered companion
                    {import.meta.env.VITE_TOGETHER_API_KEY && (
                      <span className="ml-1 text-green-600 dark:text-green-400">• Together.ai Enhanced</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleViewChange(item.id)}
                      className={`nav-item hover-lift btn-press fade-in ${
                        currentView === item.id
                          ? 'nav-item-active'
                          : 'nav-item-inactive'
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      aria-label={`Navigate to ${item.label}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* User Menu, Theme Toggle & Mobile Menu Button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Theme Toggle */}
                <ThemeToggle variant="inline" size="sm" />

                {/* User Menu */}
                <div className="relative">
                  <button
                    data-user-menu-button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    disabled={signingOut}
                    className="btn-ghost hover-scale flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed p-2"
                    aria-label="User menu"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden sm:block text-sm text-gray-600 dark:text-slate-300 max-w-32 truncate">
                      {user.email}
                    </span>
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden btn-ghost hover-scale p-2"
                  aria-label="Toggle mobile menu"
                >
                  {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm slide-in-down">
              <nav className="px-4 py-2 space-y-1">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleViewChange(item.id)}
                      className={`nav-item w-full hover-lift fade-in ${
                        currentView === item.id
                          ? 'nav-item-active'
                          : 'nav-item-inactive'
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      aria-label={`Navigate to ${item.label}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </header>

        {/* User Dropdown Overlay - Mobile-optimized positioning */}
        {isUserMenuOpen && !signingOut && (
          <div 
            data-user-menu-dropdown
            className="fixed top-16 right-2 sm:right-6 w-64 max-w-[calc(100vw-16px)] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 py-2 z-50 fade-in-down"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              transformOrigin: 'top right',
              animation: 'fadeInDown 0.2s ease-out'
            }}
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Signed in as</p>
              <p className="text-sm text-gray-600 dark:text-slate-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleOpenProfile}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 focus:outline-none focus:bg-gray-50 dark:focus:bg-slate-700"
              role="menuitem"
              tabIndex={0}
            >
              <Settings className="w-4 h-4 text-gray-500 dark:text-slate-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-slate-300">Profile Settings</span>
            </button>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:bg-gray-50 dark:focus:bg-slate-700"
              role="menuitem"
              tabIndex={0}
            >
              {signingOut ? (
                <>
                  <div className="loading-spinner w-4 h-4 border-gray-400 dark:border-slate-500 border-t-blue-500"></div>
                  <span className="text-sm text-gray-700 dark:text-slate-300">Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 text-gray-500 dark:text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-slate-300">Sign Out</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* User Profile Modal */}
        {showUserProfile && (
          <UserProfile 
            user={user} 
            onClose={handleCloseProfile} 
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-0">
          {renderContent()}
        </main>

        {/* Stats Footer */}
        {entries.length > 0 && (
          <footer className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 py-4 flex-shrink-0 fade-in-up transition-colors duration-500">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center justify-center gap-4 md:gap-8 text-sm text-gray-600 dark:text-slate-400 flex-wrap">
                <div className="flex items-center gap-2 hover-scale transition-smooth">
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  <span>{entries.length} entries</span>
                </div>
                <div className="flex items-center gap-2 hover-scale transition-smooth">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {entries.length > 0 && 
                      Math.ceil((new Date().getTime() - new Date(entries[entries.length - 1].date).getTime()) / (1000 * 60 * 60 * 24))
                    } days journaling
                  </span>
                </div>
                <div className="flex items-center gap-2 hover-scale transition-smooth">
                  <Brain className="w-4 h-4 flex-shrink-0" />
                  <span>AI companion active</span>
                </div>
                <div className="flex items-center gap-2 hover-scale transition-smooth">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {import.meta.env.VITE_TOGETHER_API_KEY ? 'Together.ai powered insights' : 'AI-powered insights'}
                  </span>
                </div>
              </div>
            </div>
          </footer>
        )}

        {/* Attribution Footer */}
        <div className="bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-2 flex-shrink-0 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-xs text-center text-gray-500 dark:text-slate-500">
              Built with ❤️ using{' '}
              <a 
                href="https://bolt.new" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline transition-smooth"
              >
                Bolt.new
              </a>
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthWrapper>
        {(user) => <AppContent user={user} />}
      </AuthWrapper>
    </ErrorBoundary>
  );
}

export default App;