import { Module } from '@nestjs/common';
import { ExolveController } from './exolve.controller';
import { ExolveService } from './exolve.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [ExolveController],
  providers: [ExolveService],
  exports: [ExolveService],
})
export class ExolveModule {}
