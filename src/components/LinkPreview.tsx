import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe, Image as ImageIcon, X } from 'lucide-react';
import { LinkPreview as LinkPreviewType, LinkPreviewService } from '../utils/linkPreview';

interface LinkPreviewProps {
  url: string;
  onRemove?: () => void;
  className?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url, onRemove, className = '' }) => {
  const [preview, setPreview] = useState<LinkPreviewType | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchPreview = async () => {
      try {
        setLoading(true);
        const previewData = await LinkPreviewService.getPreview(url);
        if (mounted) {
          setPreview(previewData);
        }
      } catch (error) {
        console.error('Failed to fetch link preview:', error);
        if (mounted) {
          setPreview({
            url,
            error: 'Failed to load preview',
            domain: LinkPreviewService.extractDomain ? LinkPreviewService.extractDomain(url) : url,
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      mounted = false;
    };
  }, [url]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className={`link-preview-loading ${className}`}>
        <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl p-4 max-w-md animate-pulse">
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-lg flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!preview || preview.error) {
    return (
      <div className={`link-preview-error ${className}`}>
        <div className="bg-gray-50 dark:bg-slate-800/30 border border-gray-200 dark:border-slate-700 rounded-xl p-3 max-w-md">
          <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
            <Globe className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm truncate">{preview?.domain || url}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`link-preview ${className}`}>
      <div 
        className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden max-w-md hover:shadow-lg transition-all duration-200 cursor-pointer group backdrop-blur-sm"
        onClick={handleClick}
      >
        {/* Header with favicon and domain */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-slate-700/50">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {preview.favicon && (
              <img 
                src={preview.favicon} 
                alt="" 
                className="w-4 h-4 flex-shrink-0"
                onError={handleImageError}
              />
            )}
            <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
              {preview.siteName || preview.domain}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3 text-gray-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors" />
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                title="Remove preview"
              >
                <X className="w-3 h-3 text-gray-400 dark:text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex gap-3">
            {/* Thumbnail */}
            {preview.image && !imageError && (
              <div className="w-16 h-16 flex-shrink-0">
                <img 
                  src={preview.image} 
                  alt=""
                  className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-slate-600"
                  onError={handleImageError}
                />
              </div>
            )}
            
            {/* Text content */}
            <div className="flex-1 min-w-0">
              {preview.title && (
                <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm line-clamp-2 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {preview.title}
                </h4>
              )}
              
              {preview.description && (
                <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {preview.description}
                </p>
              )}
              
              {!preview.title && !preview.description && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate">{preview.domain}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* URL footer for long URLs */}
        {url.length > 50 && (
          <div className="px-4 pb-3">
            <div className="text-xs text-gray-400 dark:text-slate-500 truncate bg-gray-50 dark:bg-slate-700/50 px-2 py-1 rounded">
              {url}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for detecting and managing link previews in text
export const useLinkPreviews = (text: string) => {
  const [urls, setUrls] = useState<string[]>([]);
  const [disabledUrls, setDisabledUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    const extractedUrls = LinkPreviewService.extractUrls(text);
    setUrls(extractedUrls);
  }, [text]);

  const enabledUrls = urls.filter(url => !disabledUrls.has(url));

  const disablePreview = (url: string) => {
    setDisabledUrls(prev => new Set([...prev, url]));
  };

  const enablePreview = (url: string) => {
    setDisabledUrls(prev => {
      const newSet = new Set(prev);
      newSet.delete(url);
      return newSet;
    });
  };

  return {
    urls,
    enabledUrls,
    disabledUrls,
    disablePreview,
    enablePreview,
    hasUrls: urls.length > 0,
    hasEnabledUrls: enabledUrls.length > 0,
  };
};