import React, { useEffect, useRef, useState } from 'react';
import { Mic, Volume2, VolumeX, X, Phone } from 'lucide-react';

interface InlineVoiceChatProps {
  agentId?: string;
  onClose?: () => void;
}

export const InlineVoiceChat: React.FC<InlineVoiceChatProps> = ({ 
  agentId = "agent_01jy6v3xvyfj1rcac32g1xx25x",
  onClose 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (widgetRef.current) {
      initializeElevenLabsWidget();
    }
  }, [agentId]);

  const initializeElevenLabsWidget = () => {
    if (!widgetRef.current) return;

    setIsLoading(true);

    // Create the ElevenLabs widget element
    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', agentId);
    
    // Add custom styling for inline display
    widget.style.width = '100%';
    widget.style.height = '300px';
    widget.style.border = 'none';
    widget.style.borderRadius = '12px';
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

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold">Voice Companion</h4>
              <p className="text-purple-100 text-xs">
                {isLoading ? 'Connecting...' : isConnected ? 'Connected • Ready to chat' : 'Tap to start conversation'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isLoading ? 'bg-yellow-400 animate-pulse' :
              isConnected ? 'bg-green-400 pulse-soft' : 'bg-red-400'
            }`} />
            
            {/* Mute Toggle */}
            <button
              onClick={handleMuteToggle}
              className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-smooth hover-scale btn-press"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
            
            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-smooth hover-scale btn-press"
                title="Close voice chat"
                aria-label="Close voice chat"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Widget Container */}
      <div className="relative bg-gray-50" style={{ height: '300px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white fade-in">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Initializing voice chat...</p>
            </div>
          </div>
        )}
        
        <div 
          ref={widgetRef} 
          className="w-full h-full transition-opacity duration-300"
        />
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3" />
            <span>Powered by ElevenLabs AI</span>
          </div>
          <span>
            {isConnected ? 'Voice chat active' : 'Click to connect'}
          </span>
        </div>
      </div>
    </div>
  );
};