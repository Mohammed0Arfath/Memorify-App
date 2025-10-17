import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { DiaryEntry } from '../types';
import { EmotionIndicator } from './EmotionIndicator';

interface CalendarViewProps {
  entries: DiaryEntry[];
  onDateSelect?: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ entries, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getEntryForDate = (date: Date) => {
    return entries.find(entry => 
      entry.date.toDateString() === date.toDateString()
    );
  };

  const handleDateClick = (date: Date) => {
    // Always call onDateSelect when a date is clicked
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 md:h-20" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const entry = getEntryForDate(date);
      const isToday = date.toDateString() === today.toDateString();
      const hasEntry = !!entry;
      
      days.push(
        <div
          key={day}
          className={`h-16 md:h-20 border p-1 cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-md mobile-overflow-hidden ${
            isToday ? 'bg-blue-500/10 backdrop-blur-xl border-blue-500/30' : 'bg-white/5 border-white/10'
          }`}
          onClick={() => handleDateClick(date)}
          title={hasEntry ? `View entry for ${date.toDateString()}` : `Create entry for ${date.toDateString()}`}
        >
          <div className="h-full flex flex-col">
            <div className={`text-sm font-medium mb-1 mobile-text ${
              isToday ? 'text-blue-400' : 'text-slate-300'
            }`}>
              {day}
            </div>
            
            {hasEntry && (
              <div className="flex-1 flex items-center justify-center">
                <EmotionIndicator emotion={entry.emotion} size="sm" />
              </div>
            )}
            
            {!hasEntry && (
              <div className="flex-1 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Plus className="w-4 h-4 text-slate-400" />
              </div>
            )}
            
            {isToday && (
              <div className="w-2 h-2 bg-blue-400 rounded-full self-center mt-auto" />
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const getMonthSummary = () => {
    const monthEntries = entries.filter(entry => 
      entry.date.getMonth() === month && entry.date.getFullYear() === year
    );
    
    if (monthEntries.length === 0) return null;
    
    const emotionCounts = monthEntries.reduce((acc, entry) => {
      acc[entry.emotion.primary] = (acc[entry.emotion.primary] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominantEmotion = Object.entries(emotionCounts).reduce((a, b) => 
      emotionCounts[a[0]] > emotionCounts[b[0]] ? a : b
    );
    
    return {
      totalEntries: monthEntries.length,
      dominantEmotion: dominantEmotion[0],
      emotionCounts,
    };
  };

  const monthSummary = getMonthSummary();

  return (
    <div className="max-w-6xl mx-auto mobile-container py-6 mobile-overflow-hidden">
      {/* Header - Glassmorphic */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2 mobile-text">Calendar View</h2>
          <p className="text-slate-300 mobile-text">Navigate through your emotional journey</p>
        </div>
        
        {monthSummary ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-lg p-4 shadow-md shadow-purple-500/10 border border-white/10 mobile-overflow-hidden">
            <h3 className="text-sm font-medium text-slate-300 mb-2 mobile-text">This Month</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-400">{monthSummary.totalEntries}</span>
              <span className="text-sm text-slate-400 mobile-text">entries</span>
            </div>
            <p className="text-xs text-slate-400 capitalize mt-1 mobile-text">
              Mostly {monthSummary.dominantEmotion}
            </p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl rounded-lg p-4 border border-dashed border-white/10 mobile-overflow-hidden">
            <h3 className="text-sm font-medium text-slate-400 mb-1 mobile-text">This Month</h3>
            <p className="text-xs text-slate-500 mobile-text">No entries yet</p>
            <p className="text-xs text-slate-600 mt-1 mobile-text">Start journaling to see insights</p>
          </div>
        )}
      </div>

      {/* Calendar Navigation - Glassmorphic */}
      <div className="bg-white/5 backdrop-blur-2xl rounded-2xl shadow-lg shadow-purple-500/10 overflow-hidden border border-white/10 mobile-overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          
          <h3 className="text-lg md:text-xl font-semibold text-slate-100 mobile-text">
            {monthNames[month]} {year}
          </h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {dayNames.map(day => (
            <div key={day} className="p-2 md:p-3 text-center text-xs md:text-sm font-medium text-slate-400 bg-white/5 mobile-text">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 mobile-overflow-hidden">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Legend - Glassmorphic */}
      <div className="mt-6 bg-white/5 backdrop-blur-xl rounded-lg p-4 shadow-md shadow-purple-500/10 border border-white/10 mobile-overflow-hidden">
        <h4 className="text-sm font-medium text-slate-300 mb-3 mobile-text">Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full flex-shrink-0"></div>
            <span className="mobile-text">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-600 rounded-full flex-shrink-0"></div>
            <span className="mobile-text">Day with entry</span>
          </div>
          <div className="flex items-center gap-2">
            <Plus className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="mobile-text">Click to create entry</span>
          </div>
        </div>
      </div>
    </div>
  );
};