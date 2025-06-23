import React from 'react';
import { Calendar, Image as ImageIcon, Heart } from 'lucide-react';
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
      className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 cursor-pointer`}
      style={{ borderLeftColor: entry.emotion.color }}
      onClick={onToggleExpand}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <EmotionIndicator emotion={entry.emotion} size="md" />
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
          {entry.photo && (
            <div className="w-12 h-12 rounded-lg overflow-hidden">
              <img 
                src={entry.photo} 
                alt="Entry photo" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Summary */}
        <p className="text-gray-600 leading-relaxed mb-4">
          {entry.summary}
        </p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          <div className="space-y-4">
            {/* Full Entry */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Diary Entry</h4>
              <p className="text-gray-700 leading-relaxed italic bg-gray-50 p-4 rounded-lg">
                "{entry.generatedEntry}"
              </p>
            </div>

            {/* Chat Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Conversation Highlights ({entry.chatMessages.filter(m => m.isUser).length} messages)
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {entry.chatMessages.filter(m => m.isUser).slice(0, 3).map((message) => (
                  <div key={message.id} className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
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
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Emotional Analysis</h4>
              <div className="flex items-center gap-4">
                <EmotionIndicator emotion={entry.emotion} size="lg" showLabel />
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
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
      <div className="px-6 py-3 bg-gray-50 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            Reflection
          </span>
          {entry.photo && (
            <span className="flex items-center gap-1">
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