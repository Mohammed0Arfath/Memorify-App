import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Sparkles, AlertCircle, AlertTriangle, X, Mic, Plus } from 'lucide-react';
import { ChatMessage, DiaryEntry } from '../types';
import { generateAIResponse, analyzeEmotionWithAI } from '../utils/mockAI';
import { EmotionIndicator } from './EmotionIndicator';
import { VoiceChat } from './VoiceChat';
import { errorHandler } from '../utils/errorHandler';
import { supabase } from '../lib/supabase';

interface ChatInterfaceProps {
  onGenerateEntry: (messages: ChatMessage[], photo?: string) => void;
  currentEmotion?: DiaryEntry['emotion'];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onGenerateEntry, currentEmotion }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingEntry, setIsGeneratingEntry] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<DiaryEntry['emotion'] | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if Together.ai API key is configured
    setApiKeyMissing(!import.meta.env.VITE_TOGETHER_API_KEY);
    
    // Get user name from Supabase auth
    const getUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          // Extract name from email (before @) and capitalize first letter
          const emailName = user.email.split('@')[0];
          const formattedName = emailName
            .split(/[._-]/) // Split on dots, underscores, or hyphens
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
          setUserName(formattedName);
        }
      } catch (error) {
        console.error('Error getting user name:', error);
        setUserName('Friend'); // Fallback name
      }
    };

    getUserName();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file.');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Please select an image smaller than 5MB.');
      }

      setIsUploading(true);

      // Convert to base64 for preview (in a real app, you'd upload to a service)
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setSelectedPhoto(result);
        }
        setIsUploading(false);
      };
      
      reader.onerror = () => {
        const errorMsg = 'Error reading file. Please try again.';
        setError(errorMsg);
        errorHandler.logError(new Error('FileReader error'), {
          action: 'upload_photo',
          component: 'ChatInterface',
          additionalData: { fileName: file.name, fileSize: file.size }
        }, 'medium');
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error uploading photo. Please try again.';
      setError(errorMsg);
      errorHandler.logError(error instanceof Error ? error : new Error('Photo upload failed'), {
        action: 'upload_photo',
        component: 'ChatInterface',
        additionalData: { fileName: file.name, fileSize: file.size }
      }, 'medium');
      setIsUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    setError(null);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    setError(null);

    try {
      // Add welcome message when starting first conversation
      if (!hasStartedConversation) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          text: "Hello! I'm here to help you reflect on your day and explore your thoughts and feelings. What's on your mind today?",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        setHasStartedConversation(true);
      }

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: inputText,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      setIsTyping(true);

      // Analyze emotion for the current conversation
      const allUserText = [...messages.filter(msg => msg.isUser), userMessage]
        .map(msg => msg.text)
        .join(' ');
      
      try {
        const emotion = await analyzeEmotionWithAI(allUserText);
        setDetectedEmotion(emotion);
      } catch (error) {
        errorHandler.logError(error instanceof Error ? error : new Error('Emotion analysis failed'), {
          action: 'analyze_emotion',
          component: 'ChatInterface',
          additionalData: { textLength: allUserText.length }
        }, 'low');
      }

      // Generate AI response
      try {
        const aiResponseText = await generateAIResponse(inputText, messages);
        
        setTimeout(() => {
          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: aiResponseText,
            isUser: false,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, aiResponse]);
          setIsTyping(false);
          setQuotaExceeded(false); // Reset quota exceeded state on successful response
        }, 1000 + Math.random() * 1000);
      } catch (error) {
        errorHandler.logError(error instanceof Error ? error : new Error('AI response generation failed'), {
          action: 'generate_ai_response',
          component: 'ChatInterface',
          additionalData: { userMessage: inputText.slice(0, 100) }
        }, 'medium');
        
        // Check if it's a quota exceeded error
        if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
          setQuotaExceeded(true);
        } else {
          setError(errorHandler.getUserFriendlyMessage(error instanceof Error ? error : 'AI response failed', 'generating AI response'));
        }
        
        setIsTyping(false);
      }
    } catch (error) {
      const errorMsg = errorHandler.getUserFriendlyMessage(error instanceof Error ? error : 'Failed to send message', 'sending message');
      setError(errorMsg);
      errorHandler.logError(error instanceof Error ? error : new Error('Send message failed'), {
        action: 'send_message',
        component: 'ChatInterface'
      }, 'medium');
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleGenerateEntry = async () => {
    const userMessages = messages.filter(msg => msg.isUser);
    if (userMessages.length === 0 || isGeneratingEntry) return;

    setIsGeneratingEntry(true);
    setError(null);
    
    try {
      await onGenerateEntry(messages, selectedPhoto || undefined);
      // Reset photo after generating entry
      setSelectedPhoto(null);
    } catch (error) {
      const errorMsg = errorHandler.getUserFriendlyMessage(error instanceof Error ? error : 'Failed to generate entry', 'generating diary entry');
      setError(errorMsg);
      errorHandler.logError(error instanceof Error ? error : new Error('Generate entry failed'), {
        action: 'generate_diary_entry',
        component: 'ChatInterface',
        additionalData: { messageCount: messages.length }
      }, 'medium');
    } finally {
      setIsGeneratingEntry(false);
    }
  };

  const toggleVoiceChat = () => {
    setShowVoiceChat(!showVoiceChat);
  };

  const handlePromptClick = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
  };

  return (
    <>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        {/* Warnings Section - Fixed at top */}
        {(error || apiKeyMissing || quotaExceeded) && (
          <div className="flex-shrink-0 p-4 space-y-3">
            {/* Error Message */}
            {error && (
              <div className="alert alert-error fade-in bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm">{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* API Key Warning */}
            {apiKeyMissing && (
              <div className="alert alert-warning fade-in bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Together.ai API Key Not Configured</p>
                  <p>
                    The app is running in demo mode with mock responses. To enable AI-powered conversations with Llama 3, Mixtral, and other models, 
                    add your Together.ai API key to the <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">.env</code> file.
                    <br />
                    <a 
                      href="https://api.together.xyz/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-amber-800 dark:hover:text-amber-200 mt-1 inline-block transition-smooth"
                    >
                      Get your Together.ai API key →
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Quota Exceeded Warning */}
            {quotaExceeded && !apiKeyMissing && (
              <div className="alert alert-error fade-in shake bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-300">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Together.ai API Quota Exceeded</p>
                  <p>
                    Your Together.ai API usage limit has been reached. Please check your{' '}
                    <a 
                      href="https://api.together.xyz/settings/billing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-red-800 dark:hover:text-red-200 transition-smooth"
                    >
                      billing settings
                    </a>{' '}
                    and add more credits if needed. The app will continue with fallback responses.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
          {messages.length === 0 ? (
            /* Welcome Screen - Gemini Style */
            <div className="w-full max-w-5xl mx-auto text-center space-y-12">
              {/* Greeting */}
              <div className="space-y-6 fade-in-up">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-gray-800 dark:text-slate-100">
                  Hello, <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-medium">
                    {userName || 'Friend'}
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 dark:text-slate-400 font-light">
                  Start Your Reflection Journey
                </p>
              </div>

              {/* Suggestion Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 fade-in-up" style={{ animationDelay: '0.2s' }}>
                <button
                  onClick={() => handlePromptClick("I had an interesting day today...")}
                  className="group p-8 bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300 text-left hover:-translate-y-1"
                >
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl">📝</span>
                  </div>
                  <h3 className="font-medium text-gray-800 dark:text-slate-200 mb-3 text-lg">Reflect on your day</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">Share what happened today</p>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I'm feeling...")}
                  className="group p-8 bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700/50 hover:border-purple-300 dark:hover:border-purple-600/50 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300 text-left hover:-translate-y-1"
                >
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl">💭</span>
                  </div>
                  <h3 className="font-medium text-gray-800 dark:text-slate-200 mb-3 text-lg">Explore emotions</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">Talk about how you're feeling</p>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I've been thinking about...")}
                  className="group p-8 bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700/50 hover:border-green-300 dark:hover:border-green-600/50 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300 text-left hover:-translate-y-1"
                >
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl">🧠</span>
                  </div>
                  <h3 className="font-medium text-gray-800 dark:text-slate-200 mb-3 text-lg">Process thoughts</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">Work through what's on your mind</p>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I'm grateful for...")}
                  className="group p-8 bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700/50 hover:border-amber-300 dark:hover:border-amber-600/50 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300 text-left hover:-translate-y-1"
                >
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl">🙏</span>
                  </div>
                  <h3 className="font-medium text-gray-800 dark:text-slate-200 mb-3 text-lg">Practice gratitude</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">Focus on positive moments</p>
                </button>
              </div>
            </div>
          ) : (
            /* Conversation View */
            <div className="w-full max-w-4xl mx-auto">
              {/* Header with emotion indicator */}
              {detectedEmotion && (
                <div className="flex justify-center mb-8 fade-in">
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-800/50 rounded-full px-6 py-3 border border-gray-200 dark:border-slate-700/50 shadow-sm">
                    <EmotionIndicator emotion={detectedEmotion} showLabel />
                    <button
                      onClick={toggleVoiceChat}
                      className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl hover-lift btn-press"
                      title="Start voice conversation"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-8 mb-12">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} message-enter`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div
                      className={`max-w-2xl px-6 py-4 rounded-3xl transition-smooth hover-lift ${
                        message.isUser
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'bg-white dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 shadow-sm backdrop-blur-sm'
                      }`}
                    >
                      <p className={`text-base leading-relaxed ${
                        message.isUser ? 'text-white' : 'text-gray-800 dark:text-slate-200'
                      }`}>
                        {message.text}
                      </p>
                      <span className={`text-xs mt-3 block ${
                        message.isUser ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start fade-in">
                    <div className="bg-white dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 rounded-3xl px-6 py-4 shadow-sm backdrop-blur-sm">
                      <div className="loading-dots">
                        <div className="loading-dot bg-gray-400 dark:bg-slate-500"></div>
                        <div className="loading-dot bg-gray-400 dark:bg-slate-500" style={{ animationDelay: '0.1s' }}></div>
                        <div className="loading-dot bg-gray-400 dark:bg-slate-500" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Generate Entry Button */}
              {messages.filter(msg => msg.isUser).length > 0 && (
                <div className="flex justify-center mb-8 fade-in">
                  <button
                    onClick={handleGenerateEntry}
                    disabled={isTyping || isGeneratingEntry}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover-lift btn-press text-lg"
                  >
                    {isGeneratingEntry ? (
                      <div className="flex items-center gap-3">
                        <div className="loading-spinner w-5 h-5 border-white border-t-transparent"></div>
                        Generating Entry...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Generate Diary Entry
                      </div>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photo Preview */}
        {selectedPhoto && (
          <div className="flex-shrink-0 px-6 pb-4">
            <div className="max-w-4xl mx-auto">
              <div className="alert alert-info fade-in bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50 text-blue-800 dark:text-blue-300">
                <div className="flex items-start gap-3 w-full">
                  <div className="relative">
                    <img 
                      src={selectedPhoto} 
                      alt="Selected photo" 
                      className="w-20 h-20 object-cover rounded-lg border border-blue-200 dark:border-blue-700"
                    />
                    <button
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-smooth hover-scale"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Photo attached</p>
                    <p className="text-xs">This photo will be included with your diary entry</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Area - Fixed at bottom like Gemini */}
        <div className="flex-shrink-0 p-6 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white dark:bg-slate-800 rounded-full border border-gray-300 dark:border-slate-600 shadow-lg hover:shadow-xl transition-shadow duration-300 focus-within:border-blue-500 dark:focus-within:border-blue-400">
              <div className="flex items-end gap-3 p-4">
                {/* Add button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-shrink-0 p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                  title="Upload photo"
                >
                  {isUploading ? (
                    <div className="loading-spinner w-5 h-5 border-gray-400 dark:border-slate-500 border-t-blue-500"></div>
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </button>

                {/* Text input */}
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Memorify"
                  className="flex-1 resize-none bg-transparent border-none outline-none text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 text-base py-2 max-h-32"
                  rows={1}
                  disabled={isTyping}
                  style={{ 
                    minHeight: '24px',
                    height: 'auto'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />

                {/* Send button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isTyping}
                  className="flex-shrink-0 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-slate-600 text-white rounded-full transition-colors disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>

                {/* Voice button */}
                <button
                  onClick={toggleVoiceChat}
                  className="flex-shrink-0 p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                  title="Start voice conversation"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Chat Modal */}
      <VoiceChat 
        isVisible={showVoiceChat} 
        onToggle={toggleVoiceChat}
        agentId="agent_01jy6v3xvyfj1rcac32g1xx25x"
      />
    </>
  );
};