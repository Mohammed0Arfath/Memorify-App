import React, { useState, useEffect } from 'react';
import { Brain, MessageCircle, TrendingUp, Settings, Bell, Sparkles, Calendar, Target, Heart, Lightbulb, Users } from 'lucide-react';
import { AgentService } from '../services/agentService';
import { AgentCheckin, WeeklyInsight, AgentSettings } from '../types/agent';
import { DiaryEntry } from '../types';
import { EmotionIndicator } from './EmotionIndicator';

interface AgentBoardProps {
  entries: DiaryEntry[];
  onRefresh?: () => void;
}

export const AgentBoard: React.FC<AgentBoardProps> = ({ entries, onRefresh }) => {
  const [checkins, setCheckins] = useState<AgentCheckin[]>([]);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkins' | 'insights' | 'settings'>('checkins');

  useEffect(() => {
    loadAgentData();
  }, []);

  const loadAgentData = async () => {
    try {
      const [pendingCheckins, weeklyInsights, agentSettings] = await Promise.all([
        AgentService.getPendingCheckins(),
        AgentService.getWeeklyInsights(5),
        AgentService.getSettings()
      ]);

      setCheckins(pendingCheckins);
      setInsights(weeklyInsights);
      setSettings(agentSettings);
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinRead = async (checkinId: string) => {
    try {
      await AgentService.markCheckinRead(checkinId);
      setCheckins(prev => prev.filter(c => c.id !== checkinId));
      onRefresh?.();
    } catch (error) {
      console.error('Error marking check-in as read:', error);
    }
  };

  const handleSettingsUpdate = async (updates: Partial<AgentSettings>) => {
    if (!settings) return;
    
    try {
      const updatedSettings = await AgentService.updateSettings(updates);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const generateWeeklyInsight = async () => {
    try {
      setLoading(true);
      const newInsight = await AgentService.generateWeeklyInsight(entries);
      setInsights(prev => [newInsight, ...prev]);
    } catch (error) {
      console.error('Error generating weekly insight:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAgentLoop = async () => {
    try {
      await AgentService.runAgentLoop(entries);
      await loadAgentData(); // Refresh data
    } catch (error) {
      console.error('Error running agent loop:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-slate-300 mobile-text">Loading your AI companion...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'checkins' as const, label: 'Check-ins', icon: Bell, count: checkins.length },
    { id: 'insights' as const, label: 'Insights', icon: TrendingUp, count: insights.length },
    { id: 'settings' as const, label: 'Settings', icon: Settings, count: 0 }
  ];

  return (
    <div className="max-w-6xl mx-auto mobile-container py-6 mobile-overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100 mobile-text">AI Companion</h2>
            <p className="text-gray-600 dark:text-slate-300 mobile-text">
              Your personalized reflection partner
              {settings && (
                <span className="ml-2 text-sm">
                  • {settings.personality_type} mode
                  {settings.is_agentic_mode_enabled ? ' • Active' : ' • Passive'}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={runAgentLoop}
            className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-2 border border-purple-200 dark:border-purple-700/50 mobile-text"
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            Run Analysis
          </button>
          {activeTab === 'insights' && entries.length > 0 && (
            <button
              onClick={generateWeeklyInsight}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2 border border-blue-200 dark:border-blue-700/50 mobile-text"
            >
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              Generate Insight
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-slate-800/50 rounded-xl p-1 border border-gray-200 dark:border-slate-700/50 mobile-overflow-hidden overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap mobile-text ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm border border-gray-200 dark:border-slate-600'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-200 dark:border-purple-700/50 flex-shrink-0">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700/50 backdrop-blur-sm mobile-overflow-hidden">
        {activeTab === 'checkins' && (
          <div className="p-4 md:p-6">
            {checkins.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-200 dark:border-purple-700/50">
                  <MessageCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-800 dark:text-slate-100 mb-2 mobile-text">No pending check-ins</h3>
                <p className="text-gray-600 dark:text-slate-300 mb-4 mobile-text">Your AI companion will reach out when it notices patterns or milestones.</p>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 max-w-sm mx-auto border border-purple-200 dark:border-purple-700/50 mobile-overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-purple-800 dark:text-purple-300 mobile-text">How Check-ins Work</span>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-400 mobile-text">
                    Your AI companion analyzes your journaling patterns and emotional trends to provide timely, personalized check-ins when you might benefit from reflection or support.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {checkins.map((checkin) => (
                  <div
                    key={checkin.id}
                    className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 md:p-6 border border-purple-100 dark:border-purple-700/50 backdrop-blur-sm mobile-overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 dark:bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-800 dark:text-slate-100 capitalize mobile-text">
                            {checkin.trigger_type.replace('_', ' ')} Check-in
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mobile-text">
                            {checkin.created_at.toLocaleDateString()} at {checkin.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCheckinRead(checkin.id)}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/70 transition-colors text-sm border border-purple-200 dark:border-purple-700/50 mobile-text flex-shrink-0"
                      >
                        Mark as Read
                      </button>
                    </div>
                    
                    <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-3 mobile-text">
                      {checkin.message}
                    </p>
                    
                    {checkin.emotional_context && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full inline-block border border-purple-200 dark:border-purple-700/50 mobile-text">
                        Context: {checkin.emotional_context}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="p-4 md:p-6">
            {insights.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-700/50">
                  <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-800 dark:text-slate-100 mb-2 mobile-text">No insights yet</h3>
                {entries.length === 0 ? (
                  <div>
                    <p className="text-gray-600 dark:text-slate-300 mb-4 mobile-text">Start journaling to unlock personalized insights about your emotional patterns and growth.</p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md mx-auto border border-blue-200 dark:border-blue-700/50 mobile-overflow-hidden">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300 mobile-text">Weekly Insights</span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mobile-text">
                        After you create a few diary entries, your AI companion will generate comprehensive weekly insights about your emotional patterns, growth, and recommended actions.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 dark:text-slate-300 mb-4 mobile-text">Generate your first weekly insight to see patterns and growth.</p>
                    <button
                      onClick={generateWeeklyInsight}
                      className="px-6 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors mobile-text"
                    >
                      Generate Weekly Insight
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {insights.map((insight) => (
                  <div key={insight.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 md:p-6 bg-white dark:bg-slate-700/30 backdrop-blur-sm mobile-overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mobile-text">
                        Week of {insight.week_start.toLocaleDateString()}
                      </h4>
                      {insight.mood_trend && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium mobile-text flex-shrink-0 ${
                          insight.mood_trend === 'improving' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700/50' :
                          insight.mood_trend === 'declining' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700/50' :
                          'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600'
                        }`}>
                          {insight.mood_trend} trend
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2 mobile-text">
                          <Heart className="w-4 h-4 flex-shrink-0" />
                          Dominant Emotions
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {insight.dominant_emotions.map((emotion) => (
                            <span key={emotion} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm capitalize border border-blue-200 dark:border-blue-700/50 mobile-text">
                              {emotion}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2 mobile-text">
                          <Target className="w-4 h-4 flex-shrink-0" />
                          Key Themes
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {insight.key_themes.map((theme, index) => (
                            <span key={index} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm border border-purple-200 dark:border-purple-700/50 mobile-text">
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {insight.growth_observations.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2 mobile-text">
                          <TrendingUp className="w-4 h-4 flex-shrink-0" />
                          Growth Observations
                        </h5>
                        <ul className="space-y-1">
                          {insight.growth_observations.map((observation, index) => (
                            <li key={index} className="text-gray-600 dark:text-slate-400 text-sm mobile-text">• {observation}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insight.recommended_actions.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2 mobile-text">
                          <Lightbulb className="w-4 h-4 flex-shrink-0" />
                          Recommended Actions
                        </h5>
                        <ul className="space-y-1">
                          {insight.recommended_actions.map((action, index) => (
                            <li key={index} className="text-gray-600 dark:text-slate-400 text-sm mobile-text">• {action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && settings && (
          <div className="p-4 md:p-6 space-y-6 mobile-overflow-hidden">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4 mobile-text">Agent Configuration</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-4">
                    <h5 className="font-medium text-gray-700 dark:text-slate-300 mobile-text">Agentic Mode</h5>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mobile-text">Enable proactive check-ins and insights</p>
                  </div>
                  <button
                    onClick={() => handleSettingsUpdate({ is_agentic_mode_enabled: !settings.is_agentic_mode_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      settings.is_agentic_mode_enabled ? 'bg-purple-600 dark:bg-purple-500' : 'bg-gray-200 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.is_agentic_mode_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <h5 className="font-medium text-gray-700 dark:text-slate-300 mb-2 mobile-text">Personality Type</h5>
                  <select
                    value={settings.personality_type}
                    onChange={(e) => handleSettingsUpdate({ personality_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 mobile-text"
                  >
                    <option value="therapist" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">Therapist - Warm and professional</option>
                    <option value="poet" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">Poet - Lyrical and metaphorical</option>
                    <option value="coach" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">Coach - Motivating and empowering</option>
                    <option value="friend" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">Friend - Casual and supportive</option>
                    <option value="philosopher" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">Philosopher - Wise and contemplative</option>
                  </select>
                </div>

                <div>
                  <h5 className="font-medium text-gray-700 dark:text-slate-300 mb-2 mobile-text">Check-in Frequency</h5>
                  <select
                    value={settings.check_in_frequency}
                    onChange={(e) => handleSettingsUpdate({ check_in_frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 mobile-text"
                  >
                    <option value="daily" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">Daily</option>
                    <option value="every_2_days" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">Every 2 days</option>
                    <option value="weekly" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">Weekly</option>
                    <option value="as_needed" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">As needed</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-4">
                    <h5 className="font-medium text-gray-700 dark:text-slate-300 mobile-text">Proactive Insights</h5>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mobile-text">Generate weekly insights automatically</p>
                  </div>
                  <button
                    onClick={() => handleSettingsUpdate({ proactive_insights: !settings.proactive_insights })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      settings.proactive_insights ? 'bg-purple-600 dark:bg-purple-500' : 'bg-gray-200 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.proactive_insights ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-4">
                    <h5 className="font-medium text-gray-700 dark:text-slate-300 mobile-text">Visual Generation</h5>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mobile-text">Generate mood-based visual prompts</p>
                  </div>
                  <button
                    onClick={() => handleSettingsUpdate({ visual_generation: !settings.visual_generation })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      settings.visual_generation ? 'bg-purple-600 dark:bg-purple-500' : 'bg-gray-200 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.visual_generation ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-2 mobile-text">Agent Status</h4>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-slate-600 mobile-overflow-hidden">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-400 mobile-text">Last check-in:</span>
                  <span className="text-gray-800 dark:text-slate-200 mobile-text">{settings.last_check_in.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-400 mobile-text">Mode:</span>
                  <span className="text-gray-800 dark:text-slate-200 capitalize mobile-text">{settings.personality_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-400 mobile-text">Status:</span>
                  <span className={`font-medium mobile-text ${settings.is_agentic_mode_enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-slate-400'}`}>
                    {settings.is_agentic_mode_enabled ? 'Active' : 'Passive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};