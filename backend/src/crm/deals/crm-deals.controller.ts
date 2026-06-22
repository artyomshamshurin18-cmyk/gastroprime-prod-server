import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CrmDealsService } from './crm-deals.service';

@UseGuards(AuthGuard('jwt'))
@Controller('crm/deals')
export class CrmDealsController {
  constructor(private readonly dealsService: CrmDealsService) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('stage') stage?: string,
    @Query('managerId') managerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dealsService.findAll(req.user, {
      stage,
      managerId,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Post()
  async create(@Request() req, @Body() data: {
    companyId: string;
    managerId?: string;
    source?: string;
    notes?: string;
    estimatedAmount?: number;
    minPrice?: number;
    maxPrice?: number;
    workDays?: number;
  }) {
    return this.dealsService.create(req.user, data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Request() req, @Body() data: {
    stage?: string;
    probability?: number;
    nextContactDate?: string;
    notes?: string;
    estimatedAmount?: number;
    minPrice?: number;
    maxPrice?: number;
    workDays?: number;
    managerId?: string;
  }) {
    return this.dealsService.update(id, req.user.userId, data);
  }

  @Post(':id/log')
  async addLog(@Param('id') id: string, @Request() req, @Body() data: {
    action: string;
    comment?: string;
    oldValue?: string;
    newValue?: string;
  }) {
    return this.dealsService.addLog(id, req.user.userId, data);
  }

  @Get(':id/logs')
  async getLogs(@Param('id') id: string) {
    return this.dealsService.getLogs(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.dealsService.remove(id);
  }

  @Patch(':id/company')
  async updateCompany(@Param('id') id: string, @Body() data: {
    contactPerson?: string;
    address?: string;
    workEmail?: string;
    peopleCount?: number;
    phone?: string;
  }) {
    return this.dealsService.updateCompany(id, data);
  }
}
