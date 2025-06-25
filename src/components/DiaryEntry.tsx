import React from 'react';
import { Calendar, Image as ImageIcon, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { DiaryEntry as DiaryEntryType } from '../types';
import { EmotionIndicator } from './EmotionIndicator';

interface DiaryEntryProps {
  entry: DiaryEntryType;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const DiaryEntry: React.FC<DiaryEntryProps> = ({ 
  entry, 
  isExpanded = false, 
  onToggleExpand 
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div 
      className={`card card-hover cursor-pointer border-l-4 ${
        isExpanded ? 'ring-2 ring-blue-200' : ''
      } fade-in-up`}
      style={{ borderLeftColor: entry.emotion.color }}
      onClick={onToggleExpand}
    >
      {/* Header */}
      <div className="card-header">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="emotion-pulse">
              <EmotionIndicator emotion={entry.emotion} size="md" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {formatDate(entry.date)}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{formatTime(entry.date)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {entry.photo && (
              <div className="w-12 h-12 rounded-lg overflow-hidden hover-scale transition-smooth">
                <img 
                  src={entry.photo} 
                  alt="Entry photo" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="text-gray-400 transition-transform duration-200">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Summary */}
        <p className="text-gray-600 leading-relaxed">
          {entry.summary}
        </p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="card-body border-t border-gray-100 fade-in">
          <div className="space-y-6">
            {/* Full Entry */}
            <div className="fade-in-up stagger-1">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Diary Entry</h4>
              <p className="text-gray-700 leading-relaxed italic bg-gray-50 p-4 rounded-lg transition-smooth hover:bg-gray-100">
                "{entry.generatedEntry}"
              </p>
            </div>

            {/* Chat Preview */}
            <div className="fade-in-up stagger-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Conversation Highlights ({entry.chatMessages.filter(m => m.isUser).length} messages)
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {entry.chatMessages.filter(m => m.isUser).slice(0, 3).map((message, index) => (
                  <div 
                    key={message.id} 
                    className="text-sm text-gray-600 bg-blue-50 p-2 rounded transition-smooth hover:bg-blue-100 fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    "{message.text}"
                  </div>
                ))}
                {entry.chatMessages.filter(m => m.isUser).length > 3 && (
                  <div className="text-xs text-gray-400 text-center py-1">
                    + {entry.chatMessages.filter(m => m.isUser).length - 3} more messages
                  </div>
                )}
              </div>
            </div>

            {/* Emotion Analysis */}
            <div className="fade-in-up stagger-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Emotional Analysis</h4>
              <div className="flex items-center gap-4">
                <EmotionIndicator emotion={entry.emotion} size="lg" showLabel />
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${entry.emotion.intensity * 100}%`,
                        backgroundColor: entry.emotion.color 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Emotional intensity: {Math.round(entry.emotion.intensity * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="card-footer flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 hover-scale transition-smooth">
            <Heart className="w-4 h-4" />
            Reflection
          </span>
          {entry.photo && (
            <span className="flex items-center gap-1 hover-scale transition-smooth">
              <ImageIcon className="w-4 h-4" />
              Photo
            </span>
          )}
        </div>
        <span className="text-xs">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </div>
    </div>
  );
};