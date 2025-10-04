import { Module } from '@nestjs/common';
import { KeitaroService } from './keitaro.service';

@Module({
  providers: [KeitaroService],
  exports: [KeitaroService],
})
export class KeitaroModule {}
