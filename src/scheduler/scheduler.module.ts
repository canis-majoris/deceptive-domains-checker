import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { KeitaroModule } from '../keitaro/keitaro.module';
import { CheckerModule } from '../checker/checker.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [KeitaroModule, CheckerModule, TelegramModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule { }
