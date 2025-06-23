import React, { useState, useEffect } from 'react';
import { Play, Pause, Download, RefreshCw, Quote, X, Volume2, VolumeX } from 'lucide-react';
import { DiaryEntry } from '../types';
import { tavusService, VideoGenerationResponse } from '../services/tavusService';
import { EmotionIndicator } from './EmotionIndicator';

interface VideoMessageProps {
  entry: DiaryEntry;
  username?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const VideoMessage: React.FC<VideoMessageProps> = ({ 
  entry, 
  username, 
  onClose,
  isModal = false 
}) => {
  const [videoData, setVideoData] = useState<VideoGenerationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-generate video when component mounts
    generateVideo();
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [entry.id]);

  const generateVideo = async () => {
    setLoading(true);
    setError(null);
    setShowFallback(false);

    try {
      const response = await tavusService.generatePersonalizedVideo(entry, username);
      setVideoData(response);
      
      // Start polling for completion if video is processing
      if (response.status === 'pending' || response.status === 'processing') {
        startPolling(response.video_id);
      }
    } catch (error) {
      console.error('Video generation failed:', error);
      
      if (error instanceof Error) {
        if (error.message === 'TAVUS_QUOTA_EXCEEDED') {
          setShowFallback(true);
          setError('Video quota exceeded. Showing inspirational message instead.');
        } else if (error.message === 'TAVUS_API_KEY_MISSING') {
          setShowFallback(true);
          setError('Tavus API not configured. Showing inspirational message instead.');
        } else {
          setError('Failed to generate video. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (videoId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await tavusService.getVideoStatus(videoId);
        setVideoData(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          setPollInterval(null);
          
          if (status.status === 'failed') {
            setError('Video generation failed. Please try again.');
            setShowFallback(true);
          }
        }
      } catch (error) {
        console.error('Failed to poll video status:', error);
        clearInterval(interval);
        setPollInterval(null);
      }
    }, 5000); // Poll every 5 seconds

    setPollInterval(interval);
  };

  const handleDownload = async () => {
    if (videoData?.download_url) {
      try {
        const response = await fetch(videoData.download_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memorify-video-${entry.date.toISOString().split('T')[0]}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.muted = !isMuted;
    }
  };

  const renderFallbackQuote = () => {
    const quote = tavusService.generateFallbackQuote(entry.emotion, username);
    
    return (
      <div 
        className="relative p-8 rounded-2xl text-white min-h-[300px] flex items-center justify-center"
        style={{ 
          background: `linear-gradient(135deg, ${entry.emotion.color}20, ${entry.emotion.color}40)`,
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="absolute inset-0 rounded-2xl opacity-20"
             style={{ backgroundColor: entry.emotion.color }} />
        
        <div className="relative z-10 text-center max-w-md">
          <Quote className="w-12 h-12 mx-auto mb-4 opacity-60" style={{ color: entry.emotion.color }} />
          <p className="text-lg leading-relaxed mb-4 text-gray-800 font-medium italic">
            {quote}
          </p>
          <div className="flex items-center justify-center gap-2">
            <EmotionIndicator emotion={entry.emotion} size="sm" />
            <span className="text-sm text-gray-600">
              Personalized for your {entry.emotion.primary} reflection
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderVideoPlayer = () => {
    if (!videoData?.download_url && !videoData?.preview_url) {
      return (
        <div className="bg-gray-100 rounded-2xl p-8 text-center min-h-[300px] flex items-center justify-center">
          <div>
            <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Generating your personalized video...</p>
            <p className="text-sm text-gray-500 mt-2">This usually takes 30-60 seconds</p>
          </div>
        </div>
      );
    }

    const videoUrl = videoData.download_url || videoData.preview_url;

    return (
      <div className="relative rounded-2xl overflow-hidden bg-black">
        <video
          src={videoUrl}
          className="w-full h-auto max-h-[400px] object-cover"
          controls
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          poster={`data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
              <rect width="400" height="300" fill="${entry.emotion.color}20"/>
              <text x="200" y="150" text-anchor="middle" fill="${entry.emotion.color}" font-size="48">${entry.emotion.emoji}</text>
            </svg>
          `)}`}
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={toggleMute}
            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          {videoData.download_url && (
            <button
              onClick={handleDownload}
              className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Download video"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Emotion indicator overlay */}
        <div className="absolute top-4 left-4">
          <EmotionIndicator emotion={entry.emotion} size="sm" showLabel />
        </div>
      </div>
    );
  };

  const content = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Your Personal Video Message</h3>
          <p className="text-sm text-gray-600">
            {showFallback ? 'Inspirational message' : 'AI-generated video based on your reflection'}
          </p>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-gray-100 rounded-2xl p-8 text-center min-h-[300px] flex items-center justify-center">
          <div>
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Creating your personalized video...</p>
          </div>
        </div>
      ) : showFallback ? (
        renderFallbackQuote()
      ) : (
        renderVideoPlayer()
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Generated for {entry.date.toLocaleDateString()}</span>
        </div>
        
        <div className="flex gap-2">
          {!showFallback && !loading && (
            <button
              onClick={generateVideo}
              disabled={loading}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      {content}
    </div>
  );
};