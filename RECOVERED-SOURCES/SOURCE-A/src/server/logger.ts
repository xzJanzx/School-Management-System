/**
 * SMS — Safe Logging Foundation
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function sanitizeMessage(message: unknown): string {
  if (typeof message === 'string') {
    // Mask potential tokens, passwords, secrets
    return message
      .replace(/(password|token|secret|authorization)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, '$1=***MASKED***')
      .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1***MASKED***');
  }
  if (typeof message === 'object' && message !== null) {
    try {
      const copy = JSON.parse(JSON.stringify(message));
      const maskObject = (obj: Record<string, unknown>) => {
        for (const key in obj) {
          if (/password|token|secret|authorization/i.test(key)) {
            obj[key] = '***MASKED***';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            maskObject(obj[key] as Record<string, unknown>);
          }
        }
      };
      maskObject(copy);
      return JSON.stringify(copy);
    } catch {
      return '[Unserializable Object]';
    }
  }
  return String(message);
}

function formatLog(level: LogLevel, message: unknown, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` | ${sanitizeMessage(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${sanitizeMessage(message)}${metaString}`;
}

export const logger = {
  info: (message: unknown, meta?: unknown) => {
    console.log(formatLog('info', message, meta));
  },
  warn: (message: unknown, meta?: unknown) => {
    console.warn(formatLog('warn', message, meta));
  },
  error: (message: unknown, meta?: unknown) => {
    console.error(formatLog('error', message, meta));
  },
  debug: (message: unknown, meta?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', message, meta));
    }
  },
};
