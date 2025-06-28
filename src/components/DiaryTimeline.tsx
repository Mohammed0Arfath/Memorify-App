import React, { useState } from 'react';
import { DiaryEntry as DiaryEntryType } from '../types';
import { DiaryEntry } from './DiaryEntry';
import { Search, Filter, Calendar, BookOpen, Sparkles } from 'lucide-react';

interface DiaryTimelineProps {
  entries: DiaryEntryType[];
}

export const DiaryTimeline: React.FC<DiaryTimelineProps> = ({ entries }) => {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [emotionFilter, setEmotionFilter] = useState<string>('all');

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.generatedEntry.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmotion = emotionFilter === 'all' || entry.emotion.primary === emotionFilter;
    return matchesSearch && matchesEmotion;
  });

  const uniqueEmotions = Array.from(new Set(entries.map(entry => entry.emotion.primary)));

  const handleToggleExpand = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  if (entries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto mobile-container py-6">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2 mobile-text">Your Journey</h2>
          <p className="text-gray-600 dark:text-slate-300 mobile-text">Reflecting on your emotional landscape through time</p>
        </div>
        
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-slate-100 mb-3 mobile-text">Your Story Begins Here</h3>
          <p className="text-gray-600 dark:text-slate-300 mb-6 max-w-md mobile-text">
            Start a conversation with your AI companion to create your first diary entry. Each reflection becomes part of your personal growth journey.
          </p>
          <div className="bg-blue-50 dark:bg-slate-800/50 rounded-lg p-4 max-w-sm mx-auto border border-blue-200 dark:border-slate-700 mobile-overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300 mobile-text">Getting Started</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-400 mobile-text">
              Go to the Chat tab and share what's on your mind. Your AI companion will help you process your thoughts and create meaningful diary entries.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mobile-container py-6 mobile-overflow-hidden">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2 mobile-text">Your Journey</h2>
        <p className="text-gray-600 dark:text-slate-300 mobile-text">Reflecting on your emotional landscape through time</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 mobile-overflow-hidden">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search your reflections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 backdrop-blur-sm mobile-text"
          />
        </div>
        <div className="relative min-w-0 sm:min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5 flex-shrink-0" />
          <select
            value={emotionFilter}
            onChange={(e) => setEmotionFilter(e.target.value)}
            className="w-full pl-10 pr-8 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 backdrop-blur-sm appearance-none cursor-pointer mobile-text"
          >
            <option value="all" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">All Emotions</option>
            {uniqueEmotions.map(emotion => (
              <option key={emotion} value={emotion} className="capitalize bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                {emotion}
              </option>
            ))}
          </select>
          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6 mobile-overflow-hidden">
        {filteredEntries.map((entry, index) => (
          <div key={entry.id} className="relative mobile-overflow-hidden">
            {/* Timeline connector */}
            {index < filteredEntries.length - 1 && (
              <div className="absolute left-8 top-full w-0.5 h-6 bg-gradient-to-b from-gray-300 dark:from-slate-600 to-transparent" />
            )}
            
            <DiaryEntry
              entry={entry}
              isExpanded={expandedEntry === entry.id}
              onToggleExpand={() => handleToggleExpand(entry.id)}
            />
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-slate-200 mb-2 mobile-text">No entries found</h3>
          <p className="text-gray-500 dark:text-slate-400 mobile-text">Try adjusting your search terms or filters to find what you're looking for.</p>
        </div>
      )}
    </div>
  );
};