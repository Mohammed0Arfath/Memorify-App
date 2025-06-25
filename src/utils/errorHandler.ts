/**
 * Comprehensive Error Handling Utilities
 * Provides centralized error logging, user-friendly messages, and retry mechanisms
 */

export interface ErrorContext {
  userId?: string;
  action: string;
  component?: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 100;

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Log an error with context information
   */
  public logError(
    error: Error | string,
    context: Omit<ErrorContext, 'timestamp'>,
    severity: ErrorLog['severity'] = 'medium'
  ): string {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const errorLog: ErrorLog = {
      id: errorId,
      message: errorMessage,
      stack,
      context: {
        ...context,
        timestamp,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      severity,
      resolved: false,
    };

    // Add to local error log
    this.errorLogs.unshift(errorLog);
    
    // Keep only the most recent errors
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
    }

    // Console logging with appropriate level
    this.consoleLog(errorLog);

    // In production, you would send this to an error tracking service
    this.sendToErrorService(errorLog);

    return errorId;
  }

  /**
   * Get user-friendly error message
   */
  public getUserFriendlyMessage(error: Error | string, context?: string): string {
    const errorMessage = error instanceof Error ? error.message : error;
    
    // Network errors
    if (this.isNetworkError(errorMessage)) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    // Authentication errors
    if (this.isAuthError(errorMessage)) {
      return 'Authentication failed. Please sign in again to continue.';
    }

    // Database errors
    if (this.isDatabaseError(errorMessage)) {
      return 'There was an issue saving your data. Please try again in a moment.';
    }

    // API quota errors
    if (errorMessage.includes('QUOTA_EXCEEDED')) {
      return 'API usage limit reached. Some features may be temporarily unavailable.';
    }

    // File upload errors
    if (this.isFileError(errorMessage)) {
      return 'File upload failed. Please check the file size and format, then try again.';
    }

    // Validation errors
    if (this.isValidationError(errorMessage)) {
      return 'Please check your input and try again.';
    }

    // Generic fallback
    return context 
      ? `Something went wrong with ${context}. Please try again.`
      : 'An unexpected error occurred. Please try again.';
  }

  /**
   * Retry mechanism for failed operations
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoff?: boolean;
      context: Omit<ErrorContext, 'timestamp'>;
    }
  ): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = true, context } = options;
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.logError(lastError, {
          ...context,
          additionalData: { attempt, maxAttempts }
        }, attempt === maxAttempts ? 'high' : 'medium');

        if (attempt === maxAttempts) {
          break;
        }

        // Wait before retrying
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await this.sleep(waitTime);
      }
    }

    throw lastError!;
  }

  /**
   * Wrap async operations with error handling
   */
  public async safeAsync<T>(
    operation: () => Promise<T>,
    context: Omit<ErrorContext, 'timestamp'>,
    fallback?: T
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const data = await operation();
      return { data, error: null };
    } catch (error) {
      const errorId = this.logError(error instanceof Error ? error : new Error(String(error)), context);
      const userMessage = this.getUserFriendlyMessage(error instanceof Error ? error : String(error), context.action);
      
      return { 
        data: fallback ?? null, 
        error: userMessage 
      };
    }
  }

  /**
   * Get recent error logs for debugging
   */
  public getRecentErrors(limit = 10): ErrorLog[] {
    return this.errorLogs.slice(0, limit);
  }

  /**
   * Clear error logs
   */
  public clearLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Check if error is recoverable
   */
  public isRecoverable(error: Error | string): boolean {
    const errorMessage = error instanceof Error ? error.message : error;
    
    // Network errors are usually recoverable
    if (this.isNetworkError(errorMessage)) return true;
    
    // Temporary server errors
    if (errorMessage.includes('503') || errorMessage.includes('502')) return true;
    
    // Rate limiting
    if (errorMessage.includes('429') || errorMessage.includes('QUOTA_EXCEEDED')) return true;
    
    // Timeout errors
    if (errorMessage.includes('timeout')) return true;
    
    return false;
  }

  // Private helper methods
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private consoleLog(errorLog: ErrorLog): void {
    const { message, stack, context, severity } = errorLog;
    
    const logData = {
      message,
      context,
      stack,
      errorId: errorLog.id,
    };

    switch (severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case 'high':
        console.error('❌ HIGH SEVERITY ERROR:', logData);
        break;
      case 'medium':
        console.warn('⚠️ ERROR:', logData);
        break;
      case 'low':
        console.info('ℹ️ Minor Error:', logData);
        break;
    }
  }

  private async sendToErrorService(errorLog: ErrorLog): Promise<void> {
    // In production, send to error tracking service like Sentry
    try {
      // Example: await sentry.captureException(errorLog);
      // For now, we'll just store in localStorage for debugging
      const existingErrors = JSON.parse(localStorage.getItem('memorify_errors') || '[]');
      existingErrors.unshift(errorLog);
      localStorage.setItem('memorify_errors', JSON.stringify(existingErrors.slice(0, 50)));
    } catch (error) {
      console.warn('Failed to send error to tracking service:', error);
    }
  }

  private isNetworkError(message: string): boolean {
    return message.includes('fetch') || 
           message.includes('network') || 
           message.includes('connection') ||
           message.includes('timeout') ||
           message.includes('Failed to fetch');
  }

  private isAuthError(message: string): boolean {
    return message.includes('auth') || 
           message.includes('unauthorized') || 
           message.includes('401') ||
           message.includes('Invalid login credentials') ||
           message.includes('token');
  }

  private isDatabaseError(message: string): boolean {
    return message.includes('database') || 
           message.includes('sql') || 
           message.includes('connection') ||
           message.includes('PGRST');
  }

  private isFileError(message: string): boolean {
    return message.includes('file') || 
           message.includes('upload') || 
           message.includes('size') ||
           message.includes('format');
  }

  private isValidationError(message: string): boolean {
    return message.includes('validation') || 
           message.includes('invalid') || 
           message.includes('required') ||
           message.includes('format');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  errorHandler.logError(event.error || event.message, {
    action: 'unhandled_error',
    component: 'global',
    additionalData: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }
  }, 'high');
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  errorHandler.logError(event.reason, {
    action: 'unhandled_promise_rejection',
    component: 'global',
  }, 'high');
});