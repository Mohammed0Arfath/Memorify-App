export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  domain?: string;
  type?: string;
  error?: string;
}

export class LinkPreviewService {
  private static cache = new Map<string, LinkPreview>();
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Extract URLs from text using regex
   */
  static extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    const matches = text.match(urlRegex);
    return matches ? [...new Set(matches)] : []; // Remove duplicates
  }

  /**
   * Get cached preview or fetch new one
   */
  static async getPreview(url: string): Promise<LinkPreview> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    try {
      const preview = await this.fetchPreview(url);
      this.cache.set(url, { ...preview, timestamp: Date.now() } as any);
      return preview;
    } catch (error) {
      const errorPreview: LinkPreview = {
        url,
        error: error instanceof Error ? error.message : 'Failed to fetch preview',
        domain: this.extractDomain(url),
      };
      return errorPreview;
    }
  }

  /**
   * Fetch preview using a CORS proxy service
   */
  private static async fetchPreview(url: string): Promise<LinkPreview> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL');
    }

    const domain = this.extractDomain(url);
    
    // For common platforms, we can use their oEmbed APIs
    const oEmbedPreview = await this.tryOEmbed(url);
    if (oEmbedPreview) {
      return oEmbedPreview;
    }

    // Fallback to CORS proxy for Open Graph data
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const html = data.contents;

      if (!html) {
        throw new Error('No content received');
      }

      return this.parseOpenGraph(html, url, domain);
    } catch (error) {
      // Final fallback - return basic info
      return {
        url,
        domain,
        title: domain,
        description: 'Link preview unavailable',
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      };
    }
  }

  /**
   * Try oEmbed for supported platforms
   */
  private static async tryOEmbed(url: string): Promise<LinkPreview | null> {
    const oEmbedProviders = [
      {
        pattern: /youtube\.com\/watch\?v=([^&]+)/,
        endpoint: 'https://www.youtube.com/oembed',
      },
      {
        pattern: /youtu\.be\/([^?]+)/,
        endpoint: 'https://www.youtube.com/oembed',
      },
      {
        pattern: /vimeo\.com\/(\d+)/,
        endpoint: 'https://vimeo.com/api/oembed.json',
      },
      {
        pattern: /twitter\.com\/\w+\/status\/(\d+)/,
        endpoint: 'https://publish.twitter.com/oembed',
      },
      {
        pattern: /x\.com\/\w+\/status\/(\d+)/,
        endpoint: 'https://publish.twitter.com/oembed',
      },
    ];

    for (const provider of oEmbedProviders) {
      if (provider.pattern.test(url)) {
        try {
          const oEmbedUrl = `${provider.endpoint}?url=${encodeURIComponent(url)}&format=json`;
          const response = await fetch(oEmbedUrl);
          
          if (response.ok) {
            const data = await response.json();
            return {
              url,
              title: data.title,
              description: data.description || `${data.provider_name} content`,
              image: data.thumbnail_url,
              siteName: data.provider_name,
              domain: this.extractDomain(url),
              type: data.type,
            };
          }
        } catch (error) {
          console.warn('oEmbed failed for', url, error);
        }
      }
    }

    return null;
  }

  /**
   * Parse Open Graph and meta tags from HTML
   */
  private static parseOpenGraph(html: string, url: string, domain: string): LinkPreview {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const getMetaContent = (property: string): string | undefined => {
      const meta = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
      return meta?.getAttribute('content') || undefined;
    };

    const title = 
      getMetaContent('og:title') ||
      getMetaContent('twitter:title') ||
      doc.querySelector('title')?.textContent ||
      domain;

    const description = 
      getMetaContent('og:description') ||
      getMetaContent('twitter:description') ||
      getMetaContent('description') ||
      undefined;

    const image = 
      getMetaContent('og:image') ||
      getMetaContent('twitter:image') ||
      undefined;

    const siteName = 
      getMetaContent('og:site_name') ||
      getMetaContent('application-name') ||
      domain;

    // Try to get favicon
    let favicon = getMetaContent('og:image') || undefined;
    if (!favicon) {
      const faviconLink = doc.querySelector('link[rel*="icon"]');
      if (faviconLink) {
        const href = faviconLink.getAttribute('href');
        if (href) {
          favicon = href.startsWith('http') ? href : new URL(href, url).href;
        }
      }
    }
    
    // Fallback to Google's favicon service
    if (!favicon) {
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    }

    return {
      url,
      title: title?.trim(),
      description: description?.trim(),
      image: image ? this.resolveUrl(image, url) : undefined,
      siteName: siteName?.trim(),
      favicon,
      domain,
    };
  }

  /**
   * Resolve relative URLs to absolute
   */
  private static resolveUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return relativeUrl;
    }
  }

  /**
   * Extract domain from URL
   */
  private static extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if cached preview is still valid
   */
  private static isCacheValid(preview: any): boolean {
    const timestamp = preview.timestamp;
    if (!timestamp) return false;
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Clear old cache entries
   */
  static clearExpiredCache(): void {
    const now = Date.now();
    for (const [url, preview] of this.cache.entries()) {
      if (!this.isCacheValid(preview)) {
        this.cache.delete(url);
      }
    }
  }
}