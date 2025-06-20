import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Sparkles, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { ChatMessage, DiaryEntry } from '../types';
import { generateAIResponse, analyzeEmotionWithAI } from '../utils/mockAI';
import { EmotionIndicator } from './EmotionIndicator';

interface ChatInterfaceProps {
  onGenerateEntry: (messages: ChatMessage[], photo?: string) => void;
  currentEmotion?: DiaryEntry['emotion'];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onGenerateEntry, currentEmotion }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Hello! I'm here to help you reflect on your day. What's on your mind?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingEntry, setIsGeneratingEntry] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<DiaryEntry['emotion'] | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* API Key Warning */}
      {apiKeyMissing && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 flex-shrink-0">
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
                className="underline hover:text-amber-800 mt-1 inline-block"
              >
                Get your Together.ai API key →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Quota Exceeded Warning */}
      {quotaExceeded && !apiKeyMissing && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-red-800 font-medium mb-1">Together.ai API Quota Exceeded</p>
            <p className="text-red-700">
              Your Together.ai API usage limit has been reached. Please check your{' '}
              <a 
                href="https://api.together.xyz/settings/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-red-800"
              >
                billing settings
              </a>{' '}
              and add more credits if needed. The app will continue with fallback responses.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between py-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
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
        {detectedEmotion && (
          <EmotionIndicator emotion={detectedEmotion} showLabel />
        )}
      </div>

      {/* Photo Preview */}
      {selectedPhoto && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="relative">
              <img 
                src={selectedPhoto} 
                alt="Selected photo" 
                className="w-20 h-20 object-cover rounded-lg"
              />
              <button
                onClick={removePhoto}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
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

      {/* Messages - This is the main scrollable area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 min-h-0">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
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
            <div className="flex justify-start">
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
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="py-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share what's on your mind..."
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                rows={2}
                disabled={isTyping}
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <Send className="w-5 h-5" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          
          {messages.filter(msg => msg.isUser).length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleGenerateEntry}
                disabled={isTyping || isGeneratingEntry}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};