import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CheckResult } from '../checker/interfaces/checker.interface';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly chatId: string;

  constructor(private configService: ConfigService) {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');

    this.axiosInstance = axios.create({
      baseURL: `https://api.telegram.org/bot${botToken}`,
      timeout: 10000,
    });
  }

  /**
   * Send a message to Telegram
   */
  async sendMessage(message: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    try {
      await this.axiosInstance.post('/sendMessage', {
        chat_id: this.chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      });

      this.logger.log('Telegram message sent successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send Telegram message', error.message);
      return false;
    }
  }

  /**
   * Format and send warning notification
   */
  async sendWarningNotification(warningResults: CheckResult[]): Promise<boolean> {
    if (warningResults.length === 0) {
      this.logger.debug('No warnings to report');
      return true;
    }

    const message = this.formatWarningMessage(warningResults);
    return await this.sendMessage(message);
  }

  /**
   * Format warning results into a readable message
   */
  private formatWarningMessage(results: CheckResult[]): string {
    const timestamp = new Date().toISOString();
    
    // Group by domain
    const groupedByDomain = results.reduce((acc, result) => {
      if (!acc[result.domain]) {
        acc[result.domain] = [];
      }
      acc[result.domain].push(result);
      return acc;
    }, {} as Record<string, CheckResult[]>);

    let message = `🚨 <b>Deceptive Warning Alert</b> 🚨\n\n`;
    message += `⏰ <b>Time:</b> ${timestamp}\n`;
    message += `📊 <b>Affected Domains:</b> ${Object.keys(groupedByDomain).length}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const [domain, domainResults] of Object.entries(groupedByDomain)) {
      message += `🌐 <b>Domain:</b> ${domain}\n`;
      
      for (const result of domainResults) {
        const browserEmoji = result.browser === 'chromium' ? '🌐' : '🧭';
        message += `${browserEmoji} <b>${result.browser === 'chromium' ? 'Chrome' : 'Safari/WebKit'}:</b>\n`;
        message += `   ⚠️ Warning: ${result.warningType || 'Unknown'}\n`;
        message += `   ⏱️ Response time: ${result.responseTime}ms\n`;
      }
      
      message += `\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Total warnings detected: ${results.length}`;

    return message;
  }

  /**
   * Send summary notification after check completion
   */
  async sendSummaryNotification(
    totalDomains: number,
    warningCount: number,
    duration: number,
  ): Promise<boolean> {
    const status = warningCount > 0 ? '⚠️' : '✅';
    const message = `${status} <b>Check Completed</b>\n\n` +
      `📊 <b>Total Domains:</b> ${totalDomains}\n` +
      `⚠️ <b>Warnings Found:</b> ${warningCount}\n` +
      `⏱️ <b>Duration:</b> ${(duration / 1000).toFixed(2)}s\n` +
      `🕐 <b>Time:</b> ${new Date().toISOString()}`;

    return await this.sendMessage(message);
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(error: string): Promise<boolean> {
    const message = `❌ <b>Error in Domain Check</b>\n\n` +
      `<code>${error}</code>\n\n` +
      `🕐 <b>Time:</b> ${new Date().toISOString()}`;

    return await this.sendMessage(message);
  }

  /**
   * Test Telegram connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/getMe');
      this.logger.log(`Telegram bot connected: ${response.data.result.username}`);
      return true;
    } catch (error) {
      this.logger.error('Telegram connection test failed', error.message);
      return false;
    }
  }
}
