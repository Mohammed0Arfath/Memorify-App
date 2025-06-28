import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Sparkles, AlertCircle, AlertTriangle, X, Mic, ArrowUp } from 'lucide-react';
import { ChatMessage, DiaryEntry } from '../types';
import { generateAIResponse, analyzeEmotionWithAI } from '../utils/mockAI';
import { EmotionIndicator } from './EmotionIndicator';
import { VoiceChat } from './VoiceChat';
import { errorHandler } from '../utils/errorHandler';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if Together.ai API key is configured
    setApiKeyMissing(!import.meta.env.VITE_TOGETHER_API_KEY);
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
      {/* Gemini-style Background with Animated Gradients */}
      <div className="h-full flex flex-col relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900">
          {/* Floating Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 dark:from-blue-500/5 dark:to-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 dark:from-purple-500/5 dark:to-pink-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 dark:from-cyan-500/5 dark:to-blue-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        {/* Floating Warnings */}
        <div className="relative z-10 flex-shrink-0">
          {/* Error Message */}
          {error && (
            <div className="mx-4 md:mx-6 mt-4 p-4 bg-red-50/90 dark:bg-red-900/20 backdrop-blur-xl border border-red-200/50 dark:border-red-700/30 rounded-2xl shadow-lg fade-in">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-800 dark:text-red-300 flex-1">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* API Key Warning */}
          {apiKeyMissing && (
            <div className="mx-4 md:mx-6 mt-4 p-4 bg-amber-50/90 dark:bg-amber-900/20 backdrop-blur-xl border border-amber-200/50 dark:border-amber-700/30 rounded-2xl shadow-lg fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium mb-1">Demo Mode Active</p>
                  <p>Add your Together.ai API key to enable advanced AI features with Llama 3 and Mixtral models.</p>
                </div>
              </div>
            </div>
          )}

          {/* Quota Exceeded Warning */}
          {quotaExceeded && !apiKeyMissing && (
            <div className="mx-4 md:mx-6 mt-4 p-4 bg-red-50/90 dark:bg-red-900/20 backdrop-blur-xl border border-red-200/50 dark:border-red-700/30 rounded-2xl shadow-lg fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-300">
                  <p className="font-medium mb-1">API Quota Exceeded</p>
                  <p>Your Together.ai usage limit has been reached. Check your billing settings to continue.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Header */}
        <div className="relative z-10 flex-shrink-0 mx-4 md:mx-6 mt-4">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-3xl shadow-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    AI Companion
                    {!apiKeyMissing && !quotaExceeded && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal ml-2">• Enhanced</span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Your reflective writing partner</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {detectedEmotion && (
                  <div className="fade-in">
                    <EmotionIndicator emotion={detectedEmotion} showLabel />
                  </div>
                )}
                {/* Voice Chat Toggle */}
                <button
                  onClick={toggleVoiceChat}
                  className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center"
                  title="Start voice conversation"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Preview */}
        {selectedPhoto && (
          <div className="relative z-10 mx-4 md:mx-6 mt-4">
            <div className="bg-blue-50/90 dark:bg-blue-900/20 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/30 rounded-2xl p-4 shadow-lg fade-in">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <img 
                    src={selectedPhoto} 
                    alt="Selected photo" 
                    className="w-16 h-16 object-cover rounded-xl border border-blue-200 dark:border-blue-700"
                  />
                  <button
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Photo attached</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">This will be included with your diary entry</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 md:px-6 py-6 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-4xl mx-auto">
              {/* Gemini-style Welcome */}
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-3">
                  Start Your Reflection Journey
                </h3>
                <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  Share your thoughts, feelings, and experiences. I'm here to listen and help you process your day through meaningful conversation.
                </p>
              </div>
              
              {/* Gemini-style Prompt Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                <button
                  onClick={() => handlePromptClick("I had an interesting day today...")}
                  className="group p-6 text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 fade-in"
                  style={{ animationDelay: '0.1s' }}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Reflect on your day</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Share what happened today and explore your experiences</p>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I'm feeling...")}
                  className="group p-6 text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 fade-in"
                  style={{ animationDelay: '0.2s' }}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-2xl">💭</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Explore emotions</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Talk about how you're feeling and process emotions</p>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I've been thinking about...")}
                  className="group p-6 text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 fade-in"
                  style={{ animationDelay: '0.3s' }}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Process thoughts</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Work through what's on your mind</p>
                </button>
                
                <button
                  onClick={() => handlePromptClick("I'm grateful for...")}
                  className="group p-6 text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 fade-in"
                  style={{ animationDelay: '0.4s' }}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-2xl">🙏</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Practice gratitude</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Focus on positive moments and appreciation</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} fade-in`}
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    animation: 'messageSlideIn 0.5s ease-out forwards'
                  }}
                >
                  <div
                    className={`max-w-2xl px-6 py-4 rounded-3xl shadow-xl backdrop-blur-xl border transition-all duration-300 hover:scale-[1.02] ${
                      message.isUser
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white border-blue-400/30 shadow-blue-500/25'
                        : 'bg-white/80 dark:bg-slate-800/80 border-white/30 dark:border-slate-700/30 text-gray-900 dark:text-slate-100 shadow-gray-500/10 dark:shadow-slate-900/20'
                    }`}
                  >
                    <p className={`text-base leading-relaxed ${
                      message.isUser ? 'text-white' : 'text-gray-900 dark:text-slate-100'
                    }`}>
                      {message.text}
                    </p>
                    <span className={`text-xs mt-3 block ${
                      message.isUser ? 'text-blue-100' : 'text-gray-500 dark:text-slate-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start fade-in">
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-3xl px-6 py-4 shadow-xl">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-slate-400 ml-2">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating Input Area */}
        <div className="relative z-10 flex-shrink-0 mx-4 md:mx-6 mb-4">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-3xl shadow-2xl p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share what's on your mind..."
                  className="w-full resize-none bg-transparent text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 text-base py-3 px-4 rounded-2xl border-0 focus:outline-none focus:ring-0 max-h-32"
                  rows={1}
                  disabled={isTyping}
                  style={{
                    minHeight: '48px',
                    height: 'auto',
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-12 h-12 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg"
                  title="Upload photo"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Image className="w-5 h-5" />
                  )}
                </button>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isTyping}
                  className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Generate Entry Button */}
            {messages.filter(msg => msg.isUser).length > 0 && (
              <div className="flex justify-center mt-4 pt-4 border-t border-gray-200/50 dark:border-slate-700/30">
                <button
                  onClick={handleGenerateEntry}
                  disabled={isTyping || isGeneratingEntry}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-xl hover:shadow-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 flex items-center gap-3"
                >
                  {isGeneratingEntry ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating Entry...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Diary Entry
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Chat Modal */}
      <VoiceChat 
        isVisible={showVoiceChat} 
        onToggle={toggleVoiceChat}
        agentId="agent_01jy6v3xvyfj1rcac32g1xx25x"
      />

      <style jsx>{`
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};