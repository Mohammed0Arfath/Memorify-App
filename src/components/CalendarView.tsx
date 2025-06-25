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

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-20" />);
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
          className={`h-20 border border-gray-200 p-1 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
            isToday ? 'bg-blue-50 border-blue-300' : ''
          }`}
          onClick={() => onDateSelect?.(date)}
        >
          <div className="h-full flex flex-col">
            <div className={`text-sm font-medium mb-1 ${
              isToday ? 'text-blue-600' : 'text-gray-700'
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
                <Plus className="w-4 h-4 text-gray-400" />
              </div>
            )}
            
            {isToday && (
              <div className="w-2 h-2 bg-blue-500 rounded-full self-center mt-auto" />
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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Calendar View</h2>
          <p className="text-gray-600">Navigate through your emotional journey</p>
        </div>
        
        {monthSummary ? (
          <div className="bg-white rounded-lg p-4 shadow-md border">
            <h3 className="text-sm font-medium text-gray-700 mb-2">This Month</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">{monthSummary.totalEntries}</span>
              <span className="text-sm text-gray-500">entries</span>
            </div>
            <p className="text-xs text-gray-500 capitalize mt-1">
              Mostly {monthSummary.dominantEmotion}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
            <h3 className="text-sm font-medium text-gray-600 mb-1">This Month</h3>
            <p className="text-xs text-gray-500">No entries yet</p>
            <p className="text-xs text-gray-400 mt-1">Start journaling to see insights</p>
          </div>
        )}
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <h3 className="text-xl font-semibold text-gray-800">
            {monthNames[month]} {year}
          </h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg p-4 shadow-md">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            <span>Day with entry</span>
          </div>
          <div className="flex items-center gap-2">
            <Plus className="w-3 h-3 text-gray-400" />
            <span>Click to create entry</span>
          </div>
        </div>
      </div>
    </div>
  );
};