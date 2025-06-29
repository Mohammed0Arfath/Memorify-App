import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { LinkPreview, useLinkPreviews } from './LinkPreview';

interface ChatMessageProps {
  message: ChatMessageType;
  index: number;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, index }) => {
  const { enabledUrls, disablePreview } = useLinkPreviews(message.text);

  return (
    <div
      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} message-enter`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="max-w-2xl">
        {/* Message bubble */}
        <div
          className={`px-5 py-3 rounded-3xl transition-smooth hover-lift shadow-lg ${
            message.isUser
              ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 shadow-gray-500/10 dark:shadow-slate-900/20 backdrop-blur-sm'
          }`}
        >
          <p className={`text-base leading-relaxed ${
            message.isUser ? 'text-white' : 'text-gray-800 dark:text-slate-200'
          }`}>
            {message.text}
          </p>
          <span className={`text-xs mt-2 block ${
            message.isUser ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'
          }`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Link previews */}
        {enabledUrls.length > 0 && (
          <div className="mt-3 space-y-2">
            {enabledUrls.map((url, urlIndex) => (
              <LinkPreview
                key={`${message.id}-${urlIndex}`}
                url={url}
                onRemove={() => disablePreview(url)}
                className="fade-in"
                style={{ animationDelay: `${(index * 0.1) + (urlIndex * 0.05)}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};