import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Sparkles, AlertCircle, AlertTriangle, X, Mic } from 'lucide-react';
import { ChatMessage, DiaryEntry } from '../types';
import { generateAIResponse, analyzeEmotionWithAI } from '../utils/mockAI';
import { EmotionIndicator } from './EmotionIndicator';
import { VoiceChat } from './VoiceChat';
import { errorHandler } from '../utils/errorHandler';

interface ChatInterfaceProps {
  onGenerateEntry: (messages: ChatMessage[], photo?: string) => void;
  currentEmotion?: DiaryEntry['emotion'];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onGenerateEntry }) => {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if Together.ai API key is configured
    setApiKeyMissing(!import.meta.env.VITE_TOGETHER_API_KEY);
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  useEffect(() => {
    // Smooth auto-scroll when new messages are added
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
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

      // Convert to base64 for preview
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
    <div className="h-full flex flex-col relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Top Warnings Banner - Glassmorphic */}
      {(error || apiKeyMissing || quotaExceeded) && (
        <div className="flex-shrink-0 bg-slate-900/50 backdrop-blur-xl border-b border-white/10">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 backdrop-blur-xl border-b border-red-500/20 px-4 py-2">
              <div className="max-w-4xl mx-auto flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300 flex-1">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* API Key Warning */}
          {apiKeyMissing && (
            <div className="bg-amber-500/10 backdrop-blur-xl border-b border-amber-500/20 px-4 py-2">
              <div className="max-w-4xl mx-auto flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-300">
                  <span className="font-medium">Demo Mode:</span> Add your{' '}
                  <a 
                    href="https://api.together.xyz/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-200"
                  >
                    Together.ai API key
                  </a>{' '}
                  for AI-powered responses.
                </div>
              </div>
            </div>
          )}

          {/* Quota Exceeded Warning */}
          {quotaExceeded && !apiKeyMissing && (
            <div className="bg-red-500/10 backdrop-blur-xl border-b border-red-500/20 px-4 py-2">
              <div className="max-w-4xl mx-auto flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-300">
                  <span className="font-medium">API Quota Exceeded:</span> Check your{' '}
                  <a 
                    href="https://api.together.xyz/settings/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-red-200"
                  >
                    billing settings
                  </a>.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages Area - Scrollable with centered content */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          /* Empty State - Starter prompts */
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
            <div className="max-w-3xl w-full text-center fade-in-up">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-slate-100 mb-3">Start Your Reflection Journey</h3>
              <p className="text-gray-600 dark:text-slate-300 mb-8 max-w-xl mx-auto">
                Share your thoughts, feelings, and experiences. I'm here to listen and help you process your day.
              </p>
              
              {/* Starter Prompts - Glassmorphic style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <button
                  onClick={() => handlePromptClick("I had an interesting day today...")}
                  className="group p-4 text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <p className="font-medium text-slate-200 mb-1">Reflect on your day</p>
                      <p className="text-sm text-slate-400">Share what happened today</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I'm feeling...")}
                  className="group p-4 text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💭</span>
                    <div>
                      <p className="font-medium text-slate-200 mb-1">Explore emotions</p>
                      <p className="text-sm text-slate-400">Talk about how you're feeling</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I've been thinking about...")}
                  className="group p-4 text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🧠</span>
                    <div>
                      <p className="font-medium text-slate-200 mb-1">Process thoughts</p>
                      <p className="text-sm text-slate-400">Work through what's on your mind</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I'm grateful for...")}
                  className="group p-4 text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🙏</span>
                    <div>
                      <p className="font-medium text-slate-200 mb-1">Practice gratitude</p>
                      <p className="text-sm text-slate-400">Focus on positive moments</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handlePromptClick("Something unexpected happened...")}
                  className="group p-4 text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <p className="font-medium text-slate-200 mb-1">Unexpected moments</p>
                      <p className="text-sm text-slate-400">Process surprising events</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I'm worried about...")}
                  className="group p-4 text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">😰</span>
                    <div>
                      <p className="font-medium text-slate-200 mb-1">Share concerns</p>
                      <p className="text-sm text-slate-400">Talk through what's worrying you</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I accomplished...")}
                  className="group p-4 text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <p className="font-medium text-slate-200 mb-1">Celebrate wins</p>
                      <p className="text-sm text-slate-400">Share your achievements</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I learned something new...")}
                  className="group p-4 text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <p className="font-medium text-slate-200 mb-1">New insights</p>
                      <p className="text-sm text-slate-400">Explore what you discovered</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Messages List - Glassmorphic style */
          <div className="pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="max-w-3xl mx-auto px-4 py-6"
              >
                <div className="flex gap-4 items-start">
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xl border shadow-lg ${
                    message.isUser 
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-purple-400/30 shadow-purple-500/20' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-500 border-pink-400/30 shadow-pink-500/20'
                  }`}>
                    <span className="text-white text-sm font-semibold">
                      {message.isUser ? 'Y' : 'AI'}
                    </span>
                  </div>
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {message.text}
                    </p>
                    <span className="text-xs text-slate-500 mt-2 block">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator - Glassmorphic */}
            {isTyping && (
              <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 backdrop-blur-xl border border-pink-400/30 shadow-lg shadow-pink-500/20 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
            
            {/* Bottom decorative section - Glassmorphic */}
            {messages.length > 0 && (
              <div className="max-w-3xl mx-auto px-4 py-8 mt-4">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                    <Sparkles className="w-4 h-4" />
                    <span>AI-powered emotional insights • Together.ai Enhanced</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Press <kbd className="px-2 py-0.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded text-xs text-slate-300">Enter</kbd> to send • <kbd className="px-2 py-0.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded text-xs text-slate-300">Shift + Enter</kbd> for new line
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Input Area - Glassmorphic */}
      <div className="flex-shrink-0 border-t border-white/10 bg-slate-900/80 backdrop-blur-2xl">
        <div className="max-w-3xl mx-auto px-4 py-2">
          {/* Photo Preview - Glassmorphic */}
          {selectedPhoto && (
            <div className="mb-2 flex items-center gap-3 p-3 bg-blue-500/10 backdrop-blur-xl border border-blue-500/20 rounded-xl">
              <div className="relative flex-shrink-0">
                <img 
                  src={selectedPhoto} 
                  alt="Selected" 
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <button
                  onClick={removePhoto}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-sm text-blue-300 flex-1">Photo attached</span>
            </div>
          )}

          {/* Emotion Indicator - Above input if present */}
          {detectedEmotion && (
            <div className="mb-2 flex justify-center">
              <EmotionIndicator emotion={detectedEmotion} showLabel />
            </div>
          )}

          {/* Generate Entry Button - Glassmorphic */}
          {messages.filter(msg => msg.isUser).length > 0 && (
            <div className="mb-2 flex justify-center">
              <button
                onClick={handleGenerateEntry}
                disabled={isTyping || isGeneratingEntry}
                className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 backdrop-blur-xl border border-emerald-400/30 text-white text-sm rounded-full hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingEntry ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Entry...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Diary Entry
                  </>
                )}
              </button>
            </div>
          )}

          {/* Input Area - Glassmorphic */}
          <div className="flex items-end gap-2">
            {/* Image Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 text-slate-300 transition-colors"
              title="Upload photo"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Image className="w-5 h-5" />
              )}
            </button>

            {/* Voice Chat Button */}
            <button
              onClick={toggleVoiceChat}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 backdrop-blur-xl border border-purple-400/30 text-white hover:from-purple-600 hover:to-pink-600 transition-all shadow-md shadow-purple-500/20"
              title="Start voice conversation"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share what's on your mind..."
                className="w-full resize-none bg-white/5 backdrop-blur-xl border border-white/10 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30 transition-all"
                rows={1}
                disabled={isTyping}
                style={{ 
                  maxHeight: '120px',
                  minHeight: '44px'
                }}
              />
            </div>

            {/* Send Button - Glassmorphic */}
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 backdrop-blur-xl border border-blue-400/30 hover:from-blue-600 hover:to-purple-600 text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Voice Chat Modal */}
      <VoiceChat 
        isVisible={showVoiceChat} 
        onToggle={toggleVoiceChat}
        agentId="agent_01jy6v3xvyfj1rcac32g1xx25x"
      />
    </div>
  );
};
