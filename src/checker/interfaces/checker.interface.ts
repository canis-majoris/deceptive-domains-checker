export interface CheckResult {
  domain: string;
  browser: 'chromium' | 'webkit';
  hasWarning: boolean;
  warningType?: string;
  screenshot?: string;
  error?: string;
  checkedAt: Date;
  responseTime: number;
}

export interface DeceptiveWarningPattern {
  type: string;
  selectors: string[];
  textPatterns: RegExp[];
}
