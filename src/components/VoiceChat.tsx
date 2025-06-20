import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';

interface VoiceChatProps {
  isVisible: boolean;
  onToggle: () => void;
  agentId?: string;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({ 
  isVisible, 
  onToggle, 
  agentId = "agent_01jy6v3xvyfj1rcac32g1xx25x" 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && widgetRef.current) {
      // Initialize ElevenLabs widget
      initializeElevenLabsWidget();
    }
  }, [isVisible, agentId]);

  const initializeElevenLabsWidget = () => {
    if (!widgetRef.current) return;

    setIsLoading(true);

    // Create the ElevenLabs widget element
    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', agentId);
    
    // Add custom styling
    widget.style.width = '100%';
    widget.style.height = '100%';
    widget.style.border = 'none';
    widget.style.borderRadius = '16px';
    widget.style.overflow = 'hidden';

    // Clear any existing content and add the widget
    widgetRef.current.innerHTML = '';
    widgetRef.current.appendChild(widget);

    // Listen for widget events if available
    widget.addEventListener('connected', () => {
      setIsConnected(true);
      setIsLoading(false);
    });

    widget.addEventListener('disconnected', () => {
      setIsConnected(false);
    });

    // Fallback to remove loading state after a delay
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    // You can implement actual mute functionality here if the widget supports it
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    onToggle();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Voice Companion</h3>
                <p className="text-purple-100 text-sm">
                  {isLoading ? 'Connecting...' : isConnected ? 'Connected • Ready to chat' : 'Tap to start conversation'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className={`w-3 h-3 rounded-full ${
                isLoading ? 'bg-yellow-400 animate-pulse' :
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              
              {/* Mute Toggle */}
              <button
                onClick={handleMuteToggle}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              
              {/* Close Button */}
              <button
                onClick={handleDisconnect}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                title="End conversation"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Widget Container */}
        <div className="flex-1 relative bg-gray-50">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Initializing voice chat...</p>
              </div>
            </div>
          )}
          
          <div 
            ref={widgetRef} 
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>Powered by ElevenLabs AI</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs">
                {isConnected ? 'Voice chat active' : 'Click to connect'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};