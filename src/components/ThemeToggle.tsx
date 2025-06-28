import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'floating' | 'inline' | 'minimal';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'floating'
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2.5',
    lg: 'w-12 h-12 p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const variantClasses = {
    floating: 'fixed top-6 right-6 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 shadow-lg dark:shadow-2xl',
    inline: 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    minimal: 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 border-0'
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-full transition-all duration-300 hover:scale-110 group
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Sun Icon */}
        <Sun 
          className={`
            ${iconSizes[size]} 
            absolute transition-all duration-500 transform
            ${isDark 
              ? 'opacity-0 rotate-90 scale-0' 
              : 'opacity-100 rotate-0 scale-100 text-yellow-500'
            }
          `} 
        />
        
        {/* Moon Icon */}
        <Moon 
          className={`
            ${iconSizes[size]} 
            absolute transition-all duration-500 transform
            ${isDark 
              ? 'opacity-100 rotate-0 scale-100 text-blue-400' 
              : 'opacity-0 -rotate-90 scale-0'
            }
          `} 
        />
      </div>
    </button>
  );
};