import { Body, Controller, Get, Patch, Post, Delete, UseGuards, Request, UploadedFile, UseInterceptors, Param, Res, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateMe(@Request() req, @Body() body: any) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@Request() req, @UploadedFile() file: any) {
    return this.usersService.uploadAvatar(req.user.userId, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/avatar')
  async removeAvatar(@Request() req) {
    return this.usersService.removeAvatar(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('manager-chat')
  async getManagerChat(@Request() req) {
    return this.usersService.getManagerChat(req.user.userId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('manager-chat')
  async sendManagerChatMessage(@Request() req, @Body() body: { text: string }) {
    return this.usersService.sendManagerChatMessage(req.user.userId, body.text)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company-dashboard')
  async getCompanyDashboard(@Request() req) {
    return this.usersService.getCompanyDashboard(req.user.userId, req.query.date as string | undefined);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company-dashboard/requests')
  async getCompanyScheduledRequests(@Request() req) {
    return this.usersService.getCompanyScheduledRequests(req.user.userId, {
      start: req.query.start as string | undefined,
      end: req.query.end as string | undefined,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('company-dashboard/attendance')
  async setCompanyAttendance(@Request() req, @Body() body: { userId: string; date?: string; status?: string; comment?: string }) {
    return this.usersService.setCompanyAttendance(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('company-dashboard/attendance/bulk')
  async setCompanyAttendanceBulk(@Request() req, @Body() body: { userIds: string[]; date?: string; status?: string }) {
    return this.usersService.setCompanyAttendanceBulk(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('company-dashboard/employees')
  async createCompanyEmployee(@Request() req, @Body() body: { email: string; password: string; firstName?: string; lastName?: string; phone?: string; role?: string }) {
    return this.usersService.createCompanyEmployee(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('company-dashboard/employees/import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewCompanyEmployeeImport(@Request() req, @UploadedFile() file: any, @Body() body: { defaultPassword?: string }) {
    return this.usersService.previewCompanyEmployeeImport(req.user.userId, file, body?.defaultPassword);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('company-dashboard/employees/import/commit')
  async commitCompanyEmployeeImport(@Request() req, @Body() body: { rows: any[]; defaultPassword?: string }) {
    return this.usersService.commitCompanyEmployeeImport(req.user.userId, body.rows, body?.defaultPassword);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('company-dashboard/settings')
  async updateCompanySettings(@Request() req, @Body() body: { dailyLimit?: number; mealPlan?: string; defaultSetType?: string }) {
    return this.usersService.updateCompanySettings(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('company-dashboard/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompanyLogo(@Request() req, @UploadedFile() file: any) {
    return this.usersService.uploadCompanyLogo(req.user.userId, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('company-dashboard/logo')
  async removeCompanyLogo(@Request() req) {
    return this.usersService.removeCompanyLogo(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('company-dashboard/employees/:id/preferences')
  async updateCompanyEmployeePreferences(@Request() req, @Param('id') id: string, @Body() body: { mealModeOverride?: string | null; setTypeOverride?: string | null; isHalal?: boolean; isVip?: boolean; avoidGarlic?: boolean; avoidMayonnaise?: boolean }) {
    return this.usersService.updateCompanyEmployeePreferences(req.user.userId, id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('company-dashboard/auto-fill')
  async autoFillCompanyEmployees(@Request() req, @Body() body: { date?: string; userIds?: string[] }) {
    return this.usersService.autoFillCompanyEmployees(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('company-dashboard/create-request')
  async createCompanyRequest(@Request() req, @Body() body: { date?: string }) {
    return this.usersService.createCompanyRequest(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('company-dashboard/cancel-request')
  async cancelWeeklyMenuRequest(@Request() req, @Body() data: { weeklyMenuId: string }) {
    return this.usersService.cancelWeeklyMenuRequest(req.user.userId, data.weeklyMenuId);
  }

  @Patch('company-dashboard/employees/:id/selection')
  async setCompanyEmployeeSelection(@Request() req, @Param('id') id: string, @Body() body: { date?: string; items?: { dishId: string; quantity: number }[] }) {
    return this.usersService.setCompanyEmployeeSelection(req.user.userId, id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company/analytics/stats')
  async getCompanyAnalyticsStats(@Request() req) {
    return this.usersService.getCompanyAnalyticsStats(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company/analytics/users')
  async getCompanyUserAnalytics(@Request() req) {
    return this.usersService.getCompanyUserAnalytics(req.user.userId, req.query.start as string | undefined, req.query.end as string | undefined);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company/analytics/abc')
  async getCompanyAbcAnalytics(@Request() req) {
    return this.usersService.getCompanyAbcAnalysis(req.user.userId, req.query.start as string | undefined, req.query.end as string | undefined);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company/analytics/export/monthly')
  async exportCompanyMonthlyAnalytics(@Request() req, @Query('start') start: string, @Query('end') end: string, @Res() res: any) {
    const result = await this.usersService.exportCompanyMonthlyReport(req.user.userId, start, end);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.end(result.buffer);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company/reconciliation')
  async getCompanyReconciliation(@Request() req) {
    return this.usersService.getCompanyReconciliation(req.user.userId, req.query.start as string, req.query.end as string);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company/reconciliation/pdf')
  async exportCompanyReconciliationPdf(@Request() req, @Res() res) {
    return this.usersService.exportCompanyReconciliationPdf(req.user.userId, req.query.start as string, req.query.end as string, res);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company/invoices')
  async getCompanyInvoices(@Request() req) {
    return this.usersService.getCompanyInvoices(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('company/invoices/prepayment')
  async requestCompanyPrepaymentInvoice(@Request() req, @Body() body: { amount: number; comment?: string }) {
    return this.usersService.requestCompanyPrepaymentInvoice(req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('company/invoices/prepayment/robokassa')
  async requestCompanyPrepaymentRobokassa(@Request() req, @Body() body: { amount: number; comment?: string }) {
    return this.usersService.requestCompanyPrepaymentRobokassa(req.user.userId, body);
  }

  @Post('payments/robokassa/result')
  async handleRobokassaResultPost(@Body() body: Record<string, unknown>, @Res() res: any) {
    const response = await this.usersService.handleRobokassaResult(body)
    res.type('text/plain').send(response)
  }

  @Get('payments/robokassa/result')
  async handleRobokassaResultGet(@Query() query: Record<string, unknown>, @Res() res: any) {
    const response = await this.usersService.handleRobokassaResult(query)
    res.type('text/plain').send(response)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('company/invoices/:id/pdf')
  async getCompanyInvoicePdf(@Request() req, @Param('id') id: string, @Res() res: any) {
    const result = await this.usersService.getCompanyInvoicePdf(req.user.userId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.invoice.number}.pdf"`);
    res.end(result.buffer);
  }
}
