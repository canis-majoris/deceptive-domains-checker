import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { KeitaroDomain } from './interfaces/keitaro.interface';

@Injectable()
export class KeitaroService {
  private readonly logger = new Logger(KeitaroService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('KEITARO_API_URL');
    const apiKey = this.configService.get<string>('KEITARO_API_KEY');
    const timeout = this.configService.get<number>('REQUEST_TIMEOUT_MS', 15000);

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout,
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch all active domains from Keitaro API
   * @returns Promise<string[]> Array of active domain names
   */
  async getActiveDomains(): Promise<string[]> {
    try {
      this.logger.log('Fetching active domains from Keitaro API...');
      
      const response = await this.axiosInstance.get('/domains');
      
      if (!response.data) {
        this.logger.warn('No data received from Keitaro API');
        return [];
      }

      // Filter only active domains
      const domains: KeitaroDomain[] = Array.isArray(response.data) 
        ? response.data 
        : response.data.domains || [];
      
      const activeDomains = domains
        .filter(domain => domain.state === 'active')
        .map(domain => domain.name);

      this.logger.log(`Successfully fetched ${activeDomains.length} active domains`);
      return activeDomains;
    } catch (error) {
      this.logger.error('Failed to fetch domains from Keitaro API', error.message);
      
      if (error.response) {
        this.logger.error(`API Response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      
      throw new Error(`Keitaro API error: ${error.message}`);
    }
  }

  /**
   * Test connection to Keitaro API
   * @returns Promise<boolean> True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/domains', { timeout: 5000 });
      this.logger.log('Keitaro API connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Keitaro API connection test failed', error.message);
      return false;
    }
  }
}
