// Comprehensive error handling and logging system for the model registry

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export enum ErrorCategory {
  API_KEY = 'api_key',
  MODEL_SELECTION = 'model_selection',
  API_CALL = 'api_call',
  NETWORK = 'network',
  VALIDATION = 'validation',
  SYSTEM = 'system'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: ErrorCategory;
  provider?: string;
  model?: string;
  keyId?: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface ErrorReport {
  timestamp: string;
  category: ErrorCategory;
  provider?: string;
  model?: string;
  keyId?: string;
  error: string;
  context: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

// In-memory log storage (in production, this would go to a database or file)
class Logger {
  private logs: LogEntry[] = [];
  private errors: ErrorReport[] = [];
  private maxLogs = 1000;
  private maxErrors = 100;

  // Log a message
  log(level: LogLevel, category: ErrorCategory, message: string, details?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    };

    // Add context if available
    if (details) {
      entry.provider = details.provider;
      entry.model = details.model;
      entry.keyId = details.keyId;
    }

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Output to console
    const consoleMethod = level === LogLevel.ERROR ? 'error' :
                        level === LogLevel.WARN ? 'warn' :
                        level === LogLevel.INFO ? 'info' : 'debug';
    
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${category.toUpperCase()}]`;
    const contextStr = entry.provider || entry.model || entry.keyId 
      ? ` (${entry.provider || ''}${entry.model ? '/' + entry.model : ''}${entry.keyId ? '/' + entry.keyId : ''})` 
      : '';
    
    console[consoleMethod](`${prefix}${contextStr} ${message}`, details || '');
  }

  // Convenience methods
  error(category: ErrorCategory, message: string, details?: any): void {
    this.log(LogLevel.ERROR, category, message, details);
  }

  warn(category: ErrorCategory, message: string, details?: any): void {
    this.log(LogLevel.WARN, category, message, details);
  }

  info(category: ErrorCategory, message: string, details?: any): void {
    this.log(LogLevel.INFO, category, message, details);
  }

  debug(category: ErrorCategory, message: string, details?: any): void {
    this.log(LogLevel.DEBUG, category, message, details);
  }

  // Report an error with full context
  reportError(
    category: ErrorCategory,
    error: Error | string,
    context: any = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): string {
    const errorId = this.generateErrorId();
    const errorMessage = error instanceof Error ? error.message : error;
    
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      category,
      provider: context.provider,
      model: context.model,
      keyId: context.keyId,
      error: errorMessage,
      context,
      severity,
      resolved: false
    };

    // Add stack trace if available
    if (error instanceof Error && error.stack) {
      report.context.stack = error.stack;
    }

    this.errors.push(report);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log the error
    this.error(category, `Error [${errorId}]: ${errorMessage}`, { ...context, errorId, severity });

    return errorId;
  }

  // Get recent logs
  getLogs(level?: LogLevel, category?: ErrorCategory, limit?: number): LogEntry[] {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  // Get error reports
  getErrors(resolved?: boolean, severity?: string): ErrorReport[] {
    let filtered = this.errors;

    if (resolved !== undefined) {
      filtered = filtered.filter(error => error.resolved === resolved);
    }

    if (severity) {
      filtered = filtered.filter(error => error.severity === severity);
    }

    return filtered;
  }

  // Mark error as resolved
  resolveError(errorId: string): boolean {
    const error = this.errors.find(e => e.error === errorId || e.context?.errorId === errorId);
    if (error) {
      error.resolved = true;
      this.info(ErrorCategory.SYSTEM, `Error [${errorId}] marked as resolved`);
      return true;
    }
    return false;
  }

  // Get error statistics
  getErrorStats(): {
    total: number;
    unresolved: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<string, number>;
    byProvider: Record<string, number>;
  } {
    const stats = {
      total: this.errors.length,
      unresolved: this.errors.filter(e => !e.resolved).length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<string, number>,
      byProvider: {} as Record<string, number>
    };

    this.errors.forEach(error => {
      // By category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      
      // By severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // By provider
      if (error.provider) {
        stats.byProvider[error.provider] = (stats.byProvider[error.provider] || 0) + 1;
      }
    });

    return stats;
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    this.info(ErrorCategory.SYSTEM, 'Logs cleared');
  }

  // Clear errors
  clearErrors(): void {
    this.errors = [];
    this.info(ErrorCategory.SYSTEM, 'Error reports cleared');
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Export logs for analysis
  exportLogs(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      logs: this.logs,
      errors: this.errors,
      stats: this.getErrorStats()
    }, null, 2);
  }
}

// Global logger instance
export const logger = new Logger();

// Error handling utilities
export class ModelRegistryError extends Error {
  constructor(
    public category: ErrorCategory,
    message: string,
    public context?: any,
    public severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message);
    this.name = 'ModelRegistryError';
  }
}

// Safe execution wrapper
export async function safeExecute<T>(
  operation: () => Promise<T>,
  category: ErrorCategory,
  context: any = {},
  fallback?: T
): Promise<T | undefined> {
  try {
    const result = await operation();
    logger.info(category, 'Operation completed successfully', context);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorId = logger.reportError(category, error, context, 'medium');
    
    logger.error(category, `Operation failed [${errorId}]: ${errorMessage}`, { ...context, errorId });
    
    if (fallback !== undefined) {
      logger.info(category, `Using fallback value due to error [${errorId}]`, { ...context, fallback });
      return fallback;
    }
    
    return undefined;
  }
}

// Retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  category: ErrorCategory,
  context: any = {},
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        // Final attempt failed
        const errorId = logger.reportError(category, lastError, { ...context, attempt, maxRetries }, 'high');
        logger.error(category, `All ${maxRetries} attempts failed [${errorId}]`, { ...context, errorId });
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(category, `Attempt ${attempt} failed, retrying in ${delay}ms`, { ...context, attempt, error: lastError.message });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Validation utilities
export function validateInput<T>(
  value: T,
  validator: (val: T) => boolean,
  category: ErrorCategory,
  fieldName: string,
  context: any = {}
): T {
  if (!validator(value)) {
    const error = new ModelRegistryError(
      category,
      `Invalid ${fieldName}: ${JSON.stringify(value)}`,
      { ...context, fieldName, value },
      'medium'
    );
    logger.reportError(category, error, context, 'medium');
    throw error;
  }
  
  return value;
}

// Export convenience functions
export const log = {
  error: (category: ErrorCategory, message: string, details?: any) => logger.error(category, message, details),
  warn: (category: ErrorCategory, message: string, details?: any) => logger.warn(category, message, details),
  info: (category: ErrorCategory, message: string, details?: any) => logger.info(category, message, details),
  debug: (category: ErrorCategory, message: string, details?: any) => logger.debug(category, message, details),
  report: (category: ErrorCategory, error: Error | string, context?: any, severity?: 'low' | 'medium' | 'high' | 'critical') => 
    logger.reportError(category, error, context, severity)
};

export const logs = {
  get: (level?: LogLevel, category?: ErrorCategory, limit?: number) => logger.getLogs(level, category, limit),
  getErrors: (resolved?: boolean, severity?: string) => logger.getErrors(resolved, severity),
  getStats: () => logger.getErrorStats(),
  resolve: (errorId: string) => logger.resolveError(errorId),
  clear: () => { logger.clearLogs(); logger.clearErrors(); },
  export: () => logger.exportLogs()
};