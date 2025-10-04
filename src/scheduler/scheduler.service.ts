import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { KeitaroService } from '../keitaro/keitaro.service';
import { CheckerService } from '../checker/checker.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private isRunning = false;
  private lastRunTime: Date;
  private checkCount = 0;

  constructor(
    private keitaroService: KeitaroService,
    private checkerService: CheckerService,
    private telegramService: TelegramService,
    private configService: ConfigService,
  ) { }

  async onModuleInit() {
    this.logger.log('Scheduler initialized');

    // Test connections on startup
    await this.testConnections();

    // Run initial check after a short delay
    setTimeout(() => this.runDomainCheck(), 5000);
  }

  /**
   * Test all external connections
   */
  private async testConnections() {
    this.logger.log('Testing external connections...');

    try {
      const keitaroOk = await this.keitaroService.testConnection();
      const telegramOk = await this.telegramService.testConnection();

      if (keitaroOk && telegramOk) {
        this.logger.log('All connections successful ✓');
        await this.telegramService.sendMessage(
          '✅ <b>System Started</b>\n\nDeceptive Domain Checker is now running.\n' +
          `Check interval: ${this.configService.get('CHECK_INTERVAL_MINUTES', 30)} minutes`
        );
      } else {
        this.logger.error('Some connections failed!');
        if (!keitaroOk) this.logger.error('❌ Keitaro API connection failed');
        if (!telegramOk) this.logger.error('❌ Telegram API connection failed');
      }
    } catch (error) {
      this.logger.error('Connection test error', error);
    }
  }

  /**
   * Scheduled job - runs based on CHECK_INTERVAL_MINUTES
   * Default: every 30 minutes
   */
  @Cron('*/30 * * * *', {
    name: 'domain-check',
  })
  async scheduledDomainCheck() {
    // Dynamic cron would require custom implementation
    // For now, the cron is set to 30 minutes, but can be configured via environment

    await this.runDomainCheck();
  }

  /**
   * Main check execution logic
   */
  async runDomainCheck() {
    if (this.isRunning) {
      this.logger.warn('Check already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    this.checkCount++;
    const startTime = Date.now();

    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`Starting domain check #${this.checkCount}`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      // Step 1: Fetch domains from Keitaro
      this.logger.log('Step 1: Fetching domains from Keitaro...');
      const domains = await this.keitaroService.getActiveDomains();

      if (domains.length === 0) {
        this.logger.warn('No active domains found');
        this.isRunning = false;
        return;
      }

      this.logger.log(`Found ${domains.length} active domains`);

      // Step 2: Check domains for warnings
      this.logger.log('Step 2: Checking domains for deceptive warnings...');
      const results = await this.checkerService.checkDomains(domains);

      // Step 3: Filter warnings
      this.logger.log('Step 3: Analyzing results...');
      const warningResults = this.checkerService.getDomainsWithWarnings(results);

      const duration = Date.now() - startTime;

      // Step 4: Send notifications
      if (warningResults.length > 0) {
        this.logger.warn(`⚠️  Found ${warningResults.length} warnings!`);
        this.logger.log('Step 4: Sending warning notifications...');
        await this.telegramService.sendWarningNotification(warningResults);
      } else {
        this.logger.log('✓ No warnings detected');
      }

      // Step 5: Send summary
      await this.telegramService.sendSummaryNotification(
        domains.length,
        warningResults.length,
        duration,
      );

      this.lastRunTime = new Date();
      this.logger.log(`Check completed in ${(duration / 1000).toFixed(2)}s`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    } catch (error) {
      this.logger.error('Error during domain check', error);
      await this.telegramService.sendErrorNotification(error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      checkCount: this.checkCount,
      intervalMinutes: this.configService.get<number>('CHECK_INTERVAL_MINUTES', 30),
    };
  }

  /**
   * Manually trigger a check
   */
  async triggerManualCheck() {
    this.logger.log('Manual check triggered');
    await this.runDomainCheck();
  }
}
