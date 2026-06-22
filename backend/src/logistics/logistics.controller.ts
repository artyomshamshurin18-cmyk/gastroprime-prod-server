import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Req,
  UseGuards, ForbiddenException 
} from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/admin.guard';

@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get('route/:routeName/:date')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getRoutePoints(@Param('routeName') routeName: string, @Param('date') date: string) {
    return this.logisticsService.getRoutePoints(routeName, date);
  }

  @Get('driver/:driverId/:date')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getDriverPoints(@Param('driverId') driverId: string, @Param('date') date: string) {
    return this.logisticsService.getDriverPoints(driverId, date);
  }

  @Post('points')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async createPoint(@Body() body: any) {
    return this.logisticsService.createPoint(body);
  }

  @Patch('points/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async updatePoint(@Param('id') id: string, @Body() body: any) {
    return this.logisticsService.updatePoint(id, body);
  }

  @Delete('points/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async deletePoint(@Param('id') id: string) {
    await this.logisticsService.deletePoint(id);
    return { success: true };
  }

  @Patch('points/:id/status')
  @UseGuards(AuthGuard('jwt'))
  async updatePointStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.logisticsService.updatePointStatus(id, status);
  }

  @Get('my-points/:date')
  @UseGuards(AuthGuard('jwt'))
  async getMyPoints(@Param('date') date: string, @Req() req: any) {
    const driverId = req.user.userId;
    return this.logisticsService.getDriverPoints(driverId, date);
  }
}
