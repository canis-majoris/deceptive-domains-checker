import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { KeitaroModule } from './keitaro/keitaro.module';
import { CheckerModule } from './checker/checker.module';
import { TelegramModule } from './telegram/telegram.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        KEITARO_API_URL: Joi.string().uri().required(),
        KEITARO_API_KEY: Joi.string().required(),
        TELEGRAM_BOT_TOKEN: Joi.string().required(),
        TELEGRAM_CHAT_ID: Joi.string().required(),
        CHECK_INTERVAL_MINUTES: Joi.number().default(30),
        BROWSER_TIMEOUT_MS: Joi.number().default(30000),
        MAX_CONCURRENT_CHECKS: Joi.number().default(10),
        REQUEST_TIMEOUT_MS: Joi.number().default(15000),
        LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
      }),
    }),
    ScheduleModule.forRoot(),
    KeitaroModule,
    CheckerModule,
    TelegramModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
