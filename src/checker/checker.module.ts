import { Module } from '@nestjs/common';
import { CheckerService } from './checker.service';

@Module({
  providers: [CheckerService],
  exports: [CheckerService],
})
export class CheckerModule {}
