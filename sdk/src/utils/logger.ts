/**
 * Structured logging for agent activity.
 * Outputs JSON lines for easy parsing and analysis.
 */

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  Fatal = 4,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface LoggerConfig {
  level: LogLevel;
  component: string;
  outputFn?: (entry: LogEntry) => void;
  enableTimestamp?: boolean;
  enableColor?: boolean;
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.Debug]: "DEBUG",
  [LogLevel.Info]: "INFO",
  [LogLevel.Warn]: "WARN",
  [LogLevel.Error]: "ERROR",
  [LogLevel.Fatal]: "FATAL",
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.Debug]: "\x1b[36m",
  [LogLevel.Info]: "\x1b[32m",
  [LogLevel.Warn]: "\x1b[33m",
  [LogLevel.Error]: "\x1b[31m",
  [LogLevel.Fatal]: "\x1b[35m",
};

const RESET = "\x1b[0m";

export class Logger {
  private config: Required<LoggerConfig>;
  private history: LogEntry[] = [];
  private maxHistory: number = 1000;

  constructor(config: LoggerConfig) {
    this.config = {
      level: config.level,
      component: config.component,
      outputFn: config.outputFn ?? defaultOutput,
      enableTimestamp: config.enableTimestamp ?? true,
      enableColor: config.enableColor ?? true,
    };
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.Debug, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.Info, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.Warn, message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.Error, message, data);
  }

  fatal(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.Fatal, message, data);
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LEVEL_NAMES[level],
      component: this.config.component,
      message,
      data,
    };

    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.config.outputFn(entry);
  }

  /**
   * Create a child logger with a sub-component name.
   */
  child(subComponent: string): Logger {
    return new Logger({
      ...this.config,
      component: `${this.config.component}:${subComponent}`,
    });
  }

  /**
   * Get recent log entries.
   */
  getHistory(count?: number): LogEntry[] {
    if (count === undefined) return [...this.history];
    return this.history.slice(-count);
  }

  /**
   * Clear log history.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Set maximum history size.
   */
  setMaxHistory(max: number): void {
    this.maxHistory = max;
    while (this.history.length > max) {
      this.history.shift();
    }
  }

  /**
   * Set log level.
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get entries filtered by level.
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.history.filter((e) => e.level === LEVEL_NAMES[level]);
  }

  /**
   * Get error count from history.
   */
  getErrorCount(): number {
    return this.history.filter(
      (e) => e.level === "ERROR" || e.level === "FATAL"
    ).length;
  }
}

function defaultOutput(entry: LogEntry): void {
  const json = JSON.stringify(entry);
  if (entry.level === "ERROR" || entry.level === "FATAL") {
    console.error(json);
  } else {
    console.log(json);
  }
}

/**
 * Create a formatted console output function with colors.
 */
export function createColorOutput(): (entry: LogEntry) => void {
  return (entry: LogEntry) => {
    const level = Object.entries(LEVEL_NAMES).find(
      ([, v]) => v === entry.level
    );
    const levelNum = level ? (Number(level[0]) as LogLevel) : LogLevel.Info;
    const color = LEVEL_COLORS[levelNum];
    const ts = entry.timestamp.split("T")[1].replace("Z", "");
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
    console.log(
      `${color}[${ts}] [${entry.level}] [${entry.component}]${RESET} ${entry.message}${dataStr}`
    );
  };
}

/**
 * Create a silent logger (for testing).
 */
export function createSilentLogger(component: string): Logger {
  return new Logger({
    level: LogLevel.Fatal,
    component,
    outputFn: () => {},
  });
}

/**
 * Create a buffered logger that stores entries for later retrieval.
 */
export function createBufferedLogger(component: string): {
  logger: Logger;
  getBuffer: () => LogEntry[];
  clear: () => void;
} {
  const buffer: LogEntry[] = [];
  const logger = new Logger({
    level: LogLevel.Debug,
    component,
    outputFn: (entry) => buffer.push(entry),
  });
  return {
    logger,
    getBuffer: () => [...buffer],
    clear: () => {
      buffer.length = 0;
    },
  };
}