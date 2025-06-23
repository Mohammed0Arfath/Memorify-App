import React, { useState } from 'react';
import { DiaryEntry as DiaryEntryType } from '../types';
import { DiaryEntry } from './DiaryEntry';
import { Search, Filter, Calendar } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <Calendar className="w-16 h-16 mb-4 text-gray-300" />
        <h3 className="text-xl font-medium mb-2">No entries yet</h3>
        <p className="text-center">Start a conversation with your AI companion to create your first diary entry.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Journey</h2>
        <p className="text-gray-600">Reflecting on your emotional landscape through time</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your reflections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={emotionFilter}
            onChange={(e) => setEmotionFilter(e.target.value)}
            className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[200px]"
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
              <div className="absolute left-8 top-full w-0.5 h-6 bg-gradient-to-b from-gray-300 to-transparent" />
            )}
            
            <DiaryEntry
              entry={entry}
              isExpanded={expandedEntry === entry.id}
              onToggleExpand={() => handleToggleExpand(entry.id)}
            />
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No entries match your current filters.</p>
        </div>
      )}
    </div>
  );
};