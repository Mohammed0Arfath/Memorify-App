import React from 'react';
import { Emotion } from '../types';

interface EmotionIndicatorProps {
  emotion: Emotion;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const EmotionIndicator: React.FC<EmotionIndicatorProps> = ({ 
  emotion, 
  size = 'md', 
  showLabel = false 
}) => {
  const intensity = Math.round(emotion.intensity * 100);

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`emotion-indicator emotion-indicator-${size} hover:scale-110 hover-lift glow`}
        style={{ 
          backgroundColor: `${emotion.color}20`,
          borderColor: emotion.color,
          boxShadow: `0 0 20px ${emotion.color}30`
        }}
        title={`${emotion.primary} (${intensity}% intensity)`}
      >
        <span className="transition-transform duration-200 hover:scale-110">{emotion.emoji}</span>
      </div>
      {showLabel && (
        <div className="flex flex-col fade-in">
          <span className="text-sm font-medium capitalize text-gray-700">
            {emotion.primary}
          </span>
          <span className="text-xs text-gray-400">
            {intensity}% intensity
          </span>
        </div>
      )}
    </div>
  );
};