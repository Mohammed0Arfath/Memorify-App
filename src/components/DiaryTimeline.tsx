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
      <div className="container-responsive py-responsive">
        <div className="mb-8">
          <h2 className="text-responsive-3xl font-bold text-gray-800 mb-2">Your Journey</h2>
          <p className="text-responsive-base text-gray-600">Reflecting on your emotional landscape through time</p>
        </div>
        
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h3 className="text-responsive-2xl font-semibold text-gray-800 mb-3">Your Story Begins Here</h3>
          <p className="text-responsive-base text-gray-600 mb-6 max-w-md">
            Start a conversation with your AI companion to create your first diary entry. Each reflection becomes part of your personal growth journey.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-responsive-sm font-medium text-blue-800">Getting Started</span>
            </div>
            <p className="text-responsive-xs text-blue-700">
              Go to the Chat tab and share what's on your mind. Your AI companion will help you process your thoughts and create meaningful diary entries.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-responsive">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-responsive-3xl font-bold text-gray-800 mb-2">Your Journey</h2>
        <p className="text-responsive-base text-gray-600">Reflecting on your emotional landscape through time</p>
      </div>

      {/* Filters */}
      <div className="flex-responsive mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your reflections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={emotionFilter}
            onChange={(e) => setEmotionFilter(e.target.value)}
            className="form-input pl-10 pr-8"
          >
            <option value="all">All Emotions</option>
            {uniqueEmotions.map(emotion => (
              <option key={emotion} value={emotion} className="capitalize">
                {emotion}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {filteredEntries.map((entry, index) => (
          <div key={entry.id} className="relative">
            {/* Timeline connector */}
            {index < filteredEntries.length - 1 && (
              <div className="absolute left-4 sm:left-8 top-full w-0.5 h-6 bg-gradient-to-b from-gray-300 to-transparent" />
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
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-responsive-lg font-medium text-gray-800 mb-2">No entries found</h3>
          <p className="text-responsive-base text-gray-500">Try adjusting your search terms or filters to find what you're looking for.</p>
        </div>
      )}
    </div>
  );
};