import { Module } from '@nestjs/common';
import { CrmLeadsController } from './crm-leads.controller';
import { PublicLeadsController } from './public-leads.controller';
import { CrmLeadsService } from './crm-leads.service';

@Module({
  controllers: [CrmLeadsController, PublicLeadsController],
  providers: [CrmLeadsService],
  exports: [CrmLeadsService],
})
export class CrmLeadsModule {}
