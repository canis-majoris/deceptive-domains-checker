import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, webkit, Browser, BrowserContext, Page } from 'playwright';
import { CheckResult, DeceptiveWarningPattern } from './interfaces/checker.interface';

@Injectable()
export class CheckerService implements OnModuleDestroy {
  private readonly logger = new Logger(CheckerService.name);
  private chromiumBrowser: Browser;
  private webkitBrowser: Browser;
  private readonly timeout: number;
  private readonly maxConcurrent: number;

  // Patterns to detect deceptive warnings
  private readonly warningPatterns: DeceptiveWarningPattern[] = [
    {
      type: 'Safari Deceptive Site Warning',
      selectors: [
        'body.deceptive_warning',
        '#main-message',
        '.error-page',
      ],
      textPatterns: [
        /deceptive site/i,
        /this website may be impersonating/i,
        /fraudulent website/i,
        /phishing/i,
        /may be harmful/i,
        /contains harmful programs/i,
      ],
    },
    {
      type: 'Chrome Safe Browsing Warning',
      selectors: [
        '.error-code',
        '.main-frame-error',
        '#main-frame-error',
      ],
      textPatterns: [
        /deceptive site ahead/i,
        /the site ahead contains malware/i,
        /suspicious site/i,
        /unsafe website/i,
      ],
    },
    {
      type: 'Generic Warning',
      selectors: [
        '[class*="warning"]',
        '[class*="error"]',
        '[id*="warning"]',
      ],
      textPatterns: [
        /blocked/i,
        /restricted/i,
        /not safe/i,
        /security warning/i,
      ],
    },
  ];

  constructor(private configService: ConfigService) {
    this.timeout = this.configService.get<number>('BROWSER_TIMEOUT_MS', 30000);
    this.maxConcurrent = this.configService.get<number>('MAX_CONCURRENT_CHECKS', 10);
  }

  async onModuleDestroy() {
    await this.closeBrowsers();
  }

  /**
   * Initialize browsers for checking
   */
  private async initializeBrowsers() {
    if (!this.chromiumBrowser) {
      this.logger.log('Initializing Chromium browser...');
      this.chromiumBrowser = await chromium.launch({
        headless: true,
        args: ['--disable-dev-shm-usage'],
      });
    }

    if (!this.webkitBrowser) {
      this.logger.log('Initializing WebKit browser...');
      this.webkitBrowser = await webkit.launch({
        headless: true,
      });
    }
  }

  /**
   * Close all browsers
   */
  private async closeBrowsers() {
    if (this.chromiumBrowser) {
      await this.chromiumBrowser.close();
      this.chromiumBrowser = null;
    }
    if (this.webkitBrowser) {
      await this.webkitBrowser.close();
      this.webkitBrowser = null;
    }
  }

  /**
   * Check a single domain on a specific browser
   */
  private async checkDomainOnBrowser(
    domain: string,
    browser: Browser,
    browserType: 'chromium' | 'webkit',
  ): Promise<CheckResult> {
    const startTime = Date.now();
    let context: BrowserContext;
    let page: Page;

    try {
      // Create a new context for each check (isolation)
      context = await browser.newContext({
        userAgent: browserType === 'webkit'
          ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      });

      page = await context.newPage();

      // Set timeout
      page.setDefaultTimeout(this.timeout);

      // Navigate to domain
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      this.logger.debug(`Checking ${url} on ${browserType}...`);

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      // Wait a bit for any warnings to appear
      await page.waitForTimeout(2000);

      // Check for warning patterns
      const warningResult = await this.detectWarning(page);

      const responseTime = Date.now() - startTime;

      return {
        domain,
        browser: browserType,
        hasWarning: warningResult.hasWarning,
        warningType: warningResult.type,
        checkedAt: new Date(),
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Error checking ${domain} on ${browserType}: ${error.message}`);

      return {
        domain,
        browser: browserType,
        hasWarning: false,
        error: error.message,
        checkedAt: new Date(),
        responseTime,
      };
    } finally {
      if (page) await page.close().catch(() => { });
      if (context) await context.close().catch(() => { });
    }
  }

  /**
   * Detect warning on page using patterns
   */
  private async detectWarning(page: Page): Promise<{ hasWarning: boolean; type?: string }> {
    try {
      // Get page content
      const content = await page.content();
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');

      // Check each pattern
      for (const pattern of this.warningPatterns) {
        // Check selectors
        for (const selector of pattern.selectors) {
          const element = await page.$(selector).catch(() => null);
          if (element) {
            const elementText = await element.innerText().catch(() => '');
            // Check if any text pattern matches
            for (const textPattern of pattern.textPatterns) {
              if (textPattern.test(elementText) || textPattern.test(bodyText)) {
                this.logger.warn(`Warning detected: ${pattern.type} (selector: ${selector})`);
                return { hasWarning: true, type: pattern.type };
              }
            }
          }
        }

        // Check text patterns in full body
        for (const textPattern of pattern.textPatterns) {
          if (textPattern.test(bodyText) || textPattern.test(content)) {
            this.logger.warn(`Warning detected: ${pattern.type} (text pattern match)`);
            return { hasWarning: true, type: pattern.type };
          }
        }
      }

      return { hasWarning: false };
    } catch (error) {
      this.logger.error(`Error detecting warning: ${error.message}`);
      return { hasWarning: false };
    }
  }

  /**
   * Check a single domain on both browsers
   */
  async checkDomain(domain: string): Promise<CheckResult[]> {
    await this.initializeBrowsers();

    const [chromiumResult, webkitResult] = await Promise.all([
      this.checkDomainOnBrowser(domain, this.chromiumBrowser, 'chromium'),
      this.checkDomainOnBrowser(domain, this.webkitBrowser, 'webkit'),
    ]);

    return [chromiumResult, webkitResult];
  }

  /**
   * Check multiple domains concurrently with rate limiting
   */
  async checkDomains(domains: string[]): Promise<CheckResult[]> {
    this.logger.log(`Starting checks for ${domains.length} domains...`);
    await this.initializeBrowsers();

    const results: CheckResult[] = [];
    const chunks = this.chunkArray(domains, this.maxConcurrent);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      this.logger.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} domains)`);

      const chunkResults = await Promise.all(
        chunk.map(domain => this.checkDomain(domain))
      );

      results.push(...chunkResults.flat());

      // Small delay between chunks to avoid overwhelming the system
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.log(`Completed checks. Total results: ${results.length}`);
    return results;
  }

  /**
   * Helper to chunk array for concurrent processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get domains with warnings from results
   */
  getDomainsWithWarnings(results: CheckResult[]): CheckResult[] {
    return results.filter(result => result.hasWarning);
  }
}
