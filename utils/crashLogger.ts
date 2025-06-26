interface CrashLog {
  timestamp: string;
  error: string;
  stack?: string;
  platform: string;
  action: string;
  userId?: string;
}

class CrashLogger {
  private static instance: CrashLogger;
  private logs: CrashLog[] = [];
  private maxLogs = 100;

  static getInstance(): CrashLogger {
    if (!CrashLogger.instance) {
      CrashLogger.instance = new CrashLogger();
    }
    return CrashLogger.instance;
  }

  log(error: Error | string, action: string, additionalInfo?: any) {
    const crashLog: CrashLog = {
      timestamp: new Date().toISOString(),
      error: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      platform: require('react-native').Platform.OS,
      action,
      ...additionalInfo
    };

    this.logs.push(crashLog);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (__DEV__) {
      console.error(`[CRASH LOG] ${action}:`, crashLog);
    }

    // In production, you would send this to your crash reporting service
    // Example: Sentry, Crashlytics, etc.
  }

  getLogs(): CrashLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export default CrashLogger;