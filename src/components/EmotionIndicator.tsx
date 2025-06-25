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
  const sizeClasses = {
    sm: 'w-6 h-6 text-lg',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-16 h-16 text-4xl',
  };

  const intensity = Math.round(emotion.intensity * 100);

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center border-2 transition-all duration-300 hover:scale-110 hover-lift glow`}
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