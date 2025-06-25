import React, { useState, useEffect } from 'react';
import { MessageCircle, BookOpen, Calendar, Sparkles, Menu, X, User, LogOut, Brain, Settings } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { DiaryTimeline } from './components/DiaryTimeline';
import { CalendarView } from './components/CalendarView';
import { AgentBoard } from './components/AgentBoard';
import { AuthWrapper } from './components/AuthWrapper';
import { UserProfile } from './components/UserProfile';
import { ViewMode, DiaryEntry, ChatMessage } from './types';
import { generateDiaryEntry, analyzeEmotionWithAI } from './utils/mockAI';
import { DiaryService } from './services/diaryService';
import { AgentService } from './services/agentService';
import { supabase } from './lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface AppProps {
  user: SupabaseUser;
}

function AppContent({ user }: AppProps) {
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

  // Load entries from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      loadEntries();
      runInitialAgentLoop();
    }
  }, [user]);

  const loadEntries = async () => {
    try {
      const loadedEntries = await DiaryService.getEntries();
      setEntries(loadedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
      // Fallback to localStorage if Supabase fails
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
          console.error('Error parsing localStorage entries:', parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const runInitialAgentLoop = async () => {
    try {
      // Run agent loop on app load to check for triggers
      const loadedEntries = await DiaryService.getEntries();
      await AgentService.runAgentLoop(loadedEntries);
    } catch (error) {
      console.warn('Agent loop failed on startup:', error);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return; // Prevent multiple clicks
    
    setSigningOut(true);
    
    try {
      // Close any open menus first
      setIsUserMenuOpen(false);
      setShowUserProfile(false);
      
      // Clear local state immediately to provide instant feedback
      setEntries([]);
      setCurrentView('chat');
      setCurrentEmotion(null);
      
      // Clear localStorage
      localStorage.removeItem('diary-entries');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
        // Even if Supabase fails, we've cleared local state
        // The AuthWrapper will handle the redirect
      }
      
      // Force a page reload to ensure clean state
      window.location.reload();
      
    } catch (error) {
      console.error('Error during sign out:', error);
      // Even on error, try to clear everything and reload
      localStorage.clear();
      window.location.reload();
    } finally {
      setSigningOut(false);
    }
  };

  const handleGenerateEntry = async (messages: ChatMessage[], photo?: string) => {
    if (isGeneratingEntry) return; // Prevent multiple simultaneous generations
    
    const userMessages = messages.filter(msg => msg.isUser);
    if (userMessages.length === 0) return;

    setIsGeneratingEntry(true);

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

      // Save to Supabase
      try {
        const savedEntry = await DiaryService.createEntry(newEntry);
        setEntries(prev => [savedEntry, ...prev]);
        
        // Run agent loop after new entry to update memories and check triggers
        setTimeout(() => {
          AgentService.runAgentLoop([savedEntry, ...entries]).catch(console.warn);
        }, 1000);
        
      } catch (error) {
        console.error('Error saving to Supabase:', error);
        // Fallback to localStorage
        setEntries(prev => [newEntry, ...prev]);
        localStorage.setItem('diary-entries', JSON.stringify([newEntry, ...entries]));
      }
      
      // Animate view transition
      setViewTransition(true);
      setTimeout(() => {
        setCurrentView('timeline');
        setViewTransition(false);
      }, 150);
    } catch (error) {
      console.error('Error generating diary entry:', error);
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
            <span className="text-gray-600">Loading your entries...</span>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 flex-shrink-0 fade-in-down">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 fade-in">
              <div className="brand-logo hover-scale transition-smooth">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">
                  Memorify
                </h1>
                <p className="text-xs text-gray-500 leading-none">
                  Your AI-powered companion
                  {import.meta.env.VITE_TOGETHER_API_KEY && (
                    <span className="ml-1 text-green-600">• Together.ai Enhanced</span>
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

            {/* User Menu & Mobile Menu Button */}
            <div className="flex items-center gap-2">
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  disabled={signingOut}
                  className="btn-ghost hover-scale"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:block text-sm text-gray-600 max-w-32 truncate">
                    {user.email}
                  </span>
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && !signingOut && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 fade-in-down">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-800">Signed in as</p>
                      <p className="text-sm text-gray-600 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserProfile(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="btn-ghost w-full justify-start"
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="btn-ghost w-full justify-start"
                    >
                      {signingOut ? (
                        <>
                          <div className="loading-spinner w-4 h-4"></div>
                          Signing out...
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden btn-ghost hover-scale"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm slide-in-down">
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

      {/* Click outside to close user menu */}
      {isUserMenuOpen && !signingOut && (
        <div 
          className="fixed inset-0 z-10 backdrop-animate" 
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <UserProfile 
          user={user} 
          onClose={() => setShowUserProfile(false)} 
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        {renderContent()}
      </main>

      {/* Stats Footer */}
      {entries.length > 0 && (
        <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 py-4 flex-shrink-0 fade-in-up">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2 hover-scale transition-smooth">
                <BookOpen className="w-4 h-4" />
                <span>{entries.length} entries</span>
              </div>
              <div className="flex items-center gap-2 hover-scale transition-smooth">
                <Calendar className="w-4 h-4" />
                <span>
                  {entries.length > 0 && 
                    Math.ceil((new Date().getTime() - new Date(entries[entries.length - 1].date).getTime()) / (1000 * 60 * 60 * 24))
                  } days journaling
                </span>
              </div>
              <div className="flex items-center gap-2 hover-scale transition-smooth">
                <Brain className="w-4 h-4" />
                <span>AI companion active</span>
              </div>
              <div className="flex items-center gap-2 hover-scale transition-smooth">
                <Sparkles className="w-4 h-4" />
                <span>
                  {import.meta.env.VITE_TOGETHER_API_KEY ? 'Together.ai powered insights' : 'AI-powered insights'}
                </span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Attribution Footer */}
      <div className="bg-gray-50 border-t border-gray-200 py-2 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs text-center text-gray-500">
            Built with ❤️ using{' '}
            <a 
              href="https://bolt.new" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline transition-smooth"
            >
              Bolt.new
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthWrapper>
      {(user) => <AppContent user={user} />}
    </AuthWrapper>
  );
}

export default App;