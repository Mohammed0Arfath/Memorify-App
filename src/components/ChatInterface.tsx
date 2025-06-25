import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Sparkles, AlertCircle, AlertTriangle, X, Mic } from 'lucide-react';
import { ChatMessage, DiaryEntry } from '../types';
import { generateAIResponse, analyzeEmotionWithAI } from '../utils/mockAI';
import { EmotionIndicator } from './EmotionIndicator';
import { VoiceChat } from './VoiceChat';

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB.');
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64 for preview (in a real app, you'd upload to a service)
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedPhoto(result);
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error uploading photo. Please try again.');
      setIsUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

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
      console.warn('Emotion analysis failed:', error);
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
      console.error('AI response generation failed:', error);
      
      // Check if it's a quota exceeded error
      if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
        setQuotaExceeded(true);
      }
      
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
    
    try {
      await onGenerateEntry(messages, selectedPhoto || undefined);
      // Reset photo after generating entry
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Error generating diary entry:', error);
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
      <div className="h-full flex flex-col max-w-4xl mx-auto">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        {/* Warnings Section - Fixed height to prevent layout shifts */}
        <div className="flex-shrink-0">
          {/* API Key Warning */}
          {apiKeyMissing && (
            <div className="mx-6 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 fade-in">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-amber-800 font-medium mb-1">Together.ai API Key Not Configured</p>
                <p className="text-amber-700">
                  The app is running in demo mode with mock responses. To enable AI-powered conversations with Llama 3, Mixtral, and other models, 
                  add your Together.ai API key to the <code className="bg-amber-100 px-1 rounded">.env</code> file.
                  <br />
                  <a 
                    href="https://api.together.xyz/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-800 mt-1 inline-block transition-smooth"
                  >
                    Get your Together.ai API key →
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Quota Exceeded Warning */}
          {quotaExceeded && !apiKeyMissing && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 fade-in shake">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-800 font-medium mb-1">Together.ai API Quota Exceeded</p>
                <p className="text-red-700">
                  Your Together.ai API usage limit has been reached. Please check your{' '}
                  <a 
                    href="https://api.together.xyz/settings/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-red-800 transition-smooth"
                  >
                    billing settings
                  </a>{' '}
                  and add more credits if needed. The app will continue with fallback responses.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm flex-shrink-0 fade-in-down">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover-scale transition-smooth">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                AI Companion {!apiKeyMissing && !quotaExceeded && <span className="text-xs text-green-600">(Together.ai Powered)</span>}
                {quotaExceeded && <span className="text-xs text-red-600">(Fallback Mode)</span>}
              </h2>
              <p className="text-sm text-gray-500">Your reflective writing partner</p>
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
              className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl hover-lift btn-press"
              title="Start voice conversation"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Photo Preview */}
        {selectedPhoto && (
          <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0 fade-in">
            <div className="flex items-start gap-3">
              <div className="relative">
                <img 
                  src={selectedPhoto} 
                  alt="Selected photo" 
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <button
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-smooth hover-scale"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Photo attached</p>
                <p className="text-xs text-blue-600">This photo will be included with your diary entry</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages - Scrollable area with better height management */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0" style={{ maxHeight: 'calc(100vh - 400px)' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center fade-in-up">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 float">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Start Your Reflection Journey</h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Share your thoughts, feelings, and experiences. I'm here to listen and help you process your day through meaningful conversation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                <button
                  onClick={() => handlePromptClick("I had an interesting day today...")}
                  className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-smooth hover-lift btn-press fade-in stagger-1"
                >
                  <p className="text-sm font-medium text-blue-800">Reflect on your day</p>
                  <p className="text-xs text-blue-600">Share what happened today</p>
                </button>
                <button
                  onClick={() => handlePromptClick("I'm feeling...")}
                  className="p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-smooth hover-lift btn-press fade-in stagger-2"
                >
                  <p className="text-sm font-medium text-purple-800">Explore emotions</p>
                  <p className="text-xs text-purple-600">Talk about how you're feeling</p>
                </button>
                <button
                  onClick={() => handlePromptClick("I've been thinking about...")}
                  className="p-3 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-smooth hover-lift btn-press fade-in stagger-3"
                >
                  <p className="text-sm font-medium text-green-800">Process thoughts</p>
                  <p className="text-xs text-green-600">Work through what's on your mind</p>
                </button>
                <button
                  onClick={() => handlePromptClick("I'm grateful for...")}
                  className="p-3 bg-amber-50 hover:bg-amber-100 rounded-lg text-left transition-smooth hover-lift btn-press fade-in stagger-4"
                >
                  <p className="text-sm font-medium text-amber-800">Practice gratitude</p>
                  <p className="text-xs text-amber-600">Focus on positive moments</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} message-enter`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl transition-smooth hover-lift ${
                      message.isUser
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <span className={`text-xs mt-2 block ${
                      message.isUser ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start fade-in">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom with reduced spacing */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white/80 backdrop-blur-sm flex-shrink-0 fade-in-up">
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share what's on your mind..."
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 form-input"
                rows={2}
                disabled={isTyping}
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover-lift btn-press"
              >
                <Send className="w-5 h-5" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover-lift btn-press"
                title="Upload photo"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Image className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          
          {/* Generate Entry Button */}
          {messages.filter(msg => msg.isUser).length > 0 && (
            <div className="flex justify-center fade-in">
              <button
                onClick={handleGenerateEntry}
                disabled={isTyping || isGeneratingEntry}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover-lift btn-press"
              >
                {isGeneratingEntry ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Entry...
                  </div>
                ) : (
                  'Generate Diary Entry ✨'
                )}
              </button>
            </div>
          )}
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