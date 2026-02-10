// Structured logging for Azure Application Insights migration readiness.
// Currently uses console with structured JSON. Swap implementation for
// Azure Application Insights SDK when migrating.
//
// Production migration:
//   import { TelemetryClient } from 'applicationinsights';
//   Replace Logger class internals with client.trackTrace / client.trackEvent / client.trackException

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  dealId?: string;
  action?: string;
  component?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private format(entry: LogEntry): string {
    if (this.isDev) {
      // Human-readable in development
      const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const err = entry.error ? ` | ${entry.error.name}: ${entry.error.message}` : '';
      return `[${entry.level.toUpperCase()}] ${entry.message}${ctx}${err}`;
    }
    // Structured JSON in production (Azure App Insights compatible)
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    const formatted = this.format(entry);

    switch (level) {
      case 'debug':
        if (this.isDev) console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | null, context?: LogContext): void {
    this.log('error', message, context, error ?? undefined);
  }

  // Track a server action execution (maps to Azure customEvent)
  trackAction(action: string, context?: LogContext & { durationMs?: number }): void {
    this.info(`Action: ${action}`, { action, ...context });
  }

  // Track a performance metric (maps to Azure customMetric)
  trackMetric(name: string, value: number, context?: LogContext): void {
    this.info(`Metric: ${name}=${value}`, { metric: name, metricValue: value, ...context });
  }
}

export const logger = new Logger();
