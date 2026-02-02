/**
 * Structured logging utility for Pay402 Facilitator
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), '../logs');
const LOG_FILE = path.join(LOG_DIR, 'facilitator.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: string;
  stack?: string;
}

function formatLog(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level}]`,
    entry.message,
  ];
  
  if (entry.data) {
    parts.push(`\n  Data: ${JSON.stringify(entry.data, null, 2)}`);
  }
  
  if (entry.error) {
    parts.push(`\n  Error: ${entry.error}`);
  }
  
  if (entry.stack) {
    parts.push(`\n  Stack: ${entry.stack}`);
  }
  
  return parts.join(' ') + '\n';
}

function writeLog(entry: LogEntry): void {
  const formatted = formatLog(entry);
  
  // Write to file
  fs.appendFileSync(LOG_FILE, formatted);
  
  // Also log to console
  const color = {
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m',  // Green
    WARN: '\x1b[33m',  // Yellow
    ERROR: '\x1b[31m', // Red
  }[entry.level];
  
  console.log(`${color}${formatted}\x1b[0m`);
}

export const logger = {
  debug(message: string, data?: any) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      data,
    });
  },
  
  info(message: string, data?: any) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      data,
    });
  },
  
  warn(message: string, data?: any) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      data,
    });
  },
  
  error(message: string, error?: any, data?: any) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      data,
      error: error?.message || String(error),
      stack: error?.stack,
    });
  },
};
