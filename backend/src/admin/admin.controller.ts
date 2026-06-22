import { Controller, Delete, Get, Post, Patch, Body, Param, UseGuards, Query, UploadedFile, UseInterceptors, Res, Request } from "@nestjs/common"
import { diskStorage } from "multer"
import { extname, join } from "path"
import { mkdirSync } from "fs"
import { AuthGuard } from "@nestjs/passport"
import { FileInterceptor } from "@nestjs/platform-express"
import { AdminService } from "./admin.service"
import { AdminGuard } from "../common/admin.guard"

@Controller("admin")
@UseGuards(AuthGuard("jwt"), AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("stats")
  async getStats(@Query("start") start: string, @Query("end") end: string, @Query("companyId") companyId?: string) {
    return this.adminService.getStats(start, end, companyId)
  }

  @Get("user-analytics")
  async getUserAnalytics(@Query("start") start: string, @Query("end") end: string, @Query("companyId") companyId?: string) {
    return this.adminService.getUserAnalytics(start, end, companyId)
  }

  @Get("abc-analysis")
  async getAbcAnalysis(@Query("start") start: string, @Query("end") end: string, @Query("companyId") companyId?: string) {
    return this.adminService.getAbcAnalysis(start, end, companyId)
  }

  @Get("orders")
  async getAllOrders() {
    return this.adminService.getAllOrders()
  }

  @Get("dishes")
  async getAllDishes() {
    return this.adminService.getAllDishes()
  }

  @Get("categories")
  async getAllCategories() {
    return this.adminService.getAllCategories()
  }

  @Get("today-orders")
  async getTodayOrders() {
    return this.adminService.getTodayOrders()
  }

  @Get("weekly-menus")
  async getAllWeeklyMenus(@Query("start") start: string, @Query("end") end: string) {
    return this.adminService.getAllWeeklyMenus(start, end)
  }

  @Get('manager-board')
  async getManagerBoard(@Query('search') search?: string, @Query('date') date?: string) {
    return this.adminService.getManagerBoard(search, date)
  }

  @Get('company-chats')
  async getCompanyChats(@Query('search') search?: string) {
    return this.adminService.getCompanyChats(search)
  }

  @Get('company-chats/:companyId/messages')
  async getCompanyChatMessages(@Param('companyId') companyId: string) {
    return this.adminService.getCompanyChatMessages(companyId)
  }

  @Post('company-chats/:companyId/messages')
  async sendCompanyChatMessage(@Request() req, @Param('companyId') companyId: string, @Body() body: { text: string }) {
    return this.adminService.sendCompanyChatMessage(req.user.userId, companyId, body.text)
  }

  @Get("kitchen-summary/export")
  async exportKitchenSummary(@Query("date") date: string, @Query("statuses") statuses: string, @Res() res: any) {
    const result = await this.adminService.exportKitchenSummary(date, statuses)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="kitchen-summary-${result.date}.xlsx"`)
    res.end(result.buffer)
  }

  @Get("kitchen-summary")
  async getKitchenSummary(@Query("date") date: string, @Query("statuses") statuses: string) {
    return this.adminService.getKitchenSummary(date, statuses)
  }

  @Patch("delivery-closing")
  async updateDeliveryClosing(@Request() req, @Body() body: { companyId: string; date: string; status: string; deviationAmount?: number; deviationComment?: string; managerComment?: string }) {
    return this.adminService.updateDeliveryClosing(req.user.userId, body)
  }

  @Patch("weekly-menus/:id/status")
  async updateWeeklyMenuStatus(@Param("id") id: string, @Body() body: { status: string }) {
    return this.adminService.updateWeeklyMenuStatus(id, body.status)
  }

  @Patch("orders/:id/status")
  async updateOrderStatus(@Param("id") id: string, @Body() body: { status: string }) {
    return this.adminService.updateOrderStatus(id, body.status)
  }

  @Patch("invoices/:id/status")
  async updateInvoiceStatus(@Param("id") id: string, @Body() body: { status: string }) {
    return this.adminService.updateInvoiceStatus(id, body.status)
  }

  @Get("users")
  async getAllUsers() {
    return this.adminService.getAllUsers()
  }

  @Get("companies")
  async getAllCompanies(@Request() req) {
    return this.adminService.getAllCompanies(req.user)
  }

  @Get("companies/:id/users")
  async getCompanyUsers(@Param("id") id: string) {
    return this.adminService.getCompanyUsers(id)
  }

  @Patch("companies/:id/users/:userId/role")
  async updateCompanyUserRole(@Param("userId") userId: string, @Body() body: { role: string }) {
    return this.adminService.updateCompanyUserRole(userId, body.role)
  }

  @Get("reconciliation")
  async getReconciliation(@Query("companyId") companyId: string, @Query("start") start: string, @Query("end") end: string) {
    return this.adminService.getReconciliation(companyId, start, end)
  }

  @Get("invoices")
  async getInvoices() {
    return this.adminService.getInvoices()
  }

  @Get("billing-settings")
  async getBillingSettings() {
    return this.adminService.getBillingSettings()
  }

  @Post("users/import/preview")
  @UseInterceptors(FileInterceptor("file"))
  async previewUserImport(@UploadedFile() file: any, @Body() body: { defaultPassword?: string }) {
    return this.adminService.previewUserImport(file, body?.defaultPassword)
  }

  @Post("users/import/commit")
  async commitUserImport(@Body() body: { rows: any[], defaultPassword?: string }) {
    return this.adminService.commitUserImport(body.rows, body?.defaultPassword)
  }

  @Post("users")
  async createUser(@Request() req, @Body() body: any) {
    return this.adminService.createUser(req.user.userId, body)
  }

  @Post('users/:id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadUserAvatar(@Request() req, @Param('id') id: string, @UploadedFile() file: any) {
    return this.adminService.uploadUserAvatar(req.user.userId, id, file)
  }

  @Post("companies")
  async createCompany(@Body() body: any) {
    return this.adminService.createCompany(body)
  }

  @Post("companies/:id/duplicate")
  async duplicateCompany(@Param("id") id: string) {
    return this.adminService.duplicateCompany(id)
  }

  @Post("companies/:id/impersonate")
  async impersonateCompany(@Request() req, @Param("id") id: string) {
    return this.adminService.impersonateCompany(req.user.userId, id)
  }

  @Post("invoices/period")
  async createPeriodInvoice(@Body() body: { companyId: string; start: string; end: string; comment?: string }) {
    return this.adminService.createPeriodInvoice(body)
  }

  @Post("invoices/prepayment")
  async createPrepaymentInvoice(@Body() body: { companyId: string; amount: number; comment?: string }) {
    return this.adminService.createPrepaymentInvoice(body)
  }

  @Get("daily-menu/export")
  async exportDailyMenu(@Query("start") start: string, @Query("end") end: string, @Res() res: any) {
    const result = await this.adminService.exportDailyMenu(start, end)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="daily-menu-${result.start}-to-${result.end}.xlsx"`)
    res.end(result.buffer)
  }

  @Post("daily-menu/import/preview")
  @UseInterceptors(FileInterceptor("file"))
  async previewDailyMenuImport(@UploadedFile() file: any) {
    return this.adminService.previewDailyMenuImport(file)
  }

  @Post("daily-menu/import/commit")
  async commitDailyMenuImport(@Body() body: { rows: any[] }) {
    return this.adminService.commitDailyMenuImport(body.rows)
  }

  @Post("dishes/import/preview")
  @UseInterceptors(FileInterceptor("file"))
  async previewDishImport(@UploadedFile() file: any) {
    return this.adminService.previewDishImport(file)
  }

  @Post("dishes/import/commit")
  async commitDishImport(@Body() body: { rows: any[] }) {
    return this.adminService.commitDishImport(body.rows)
  }

  @Post("dishes")
  async createDish(@Body() body: any) {
    return this.adminService.createDish(body)
  }

  @Post("dishes/:id/photo")
  @UseInterceptors(FileInterceptor("file"))
  async uploadDishPhoto(@Param("id") id: string, @UploadedFile() file: any) {
    return this.adminService.uploadDishPhoto(id, file)
  }

  @Post("categories")
  async createCategory(@Body() body: { name: string }) {
    return this.adminService.createCategory(body.name)
  }

  @Patch("users/:id")
  async updateUser(@Request() req, @Param("id") id: string, @Body() body: any) {
    return this.adminService.updateUser(req.user.userId, id, body)
  }

  @Patch("companies/:id")
  async updateCompany(@Param("id") id: string, @Body() body: any) {
    return this.adminService.updateCompany(id, body)
  }

  @Patch("billing-settings")
  async updateBillingSettings(@Body() body: any) {
    return this.adminService.updateBillingSettings(body)
  }

  @Get("invoices/:id/pdf")
  async getInvoicePdf(@Param("id") id: string, @Res() res: any) {
    const result = await this.adminService.getInvoicePdf(id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${result.invoice.number}.pdf"`)
    res.end(result.buffer)
  }

  @Post("invoices/:id/apply-prepayment")
  async applyPrepaymentInvoice(@Param("id") id: string) {
    return this.adminService.applyPrepaymentInvoice(id)
  }

  @Patch("dishes/:id")
  async updateDish(@Param("id") id: string, @Body() body: any) {
    return this.adminService.updateDish(id, body)
  }

  @Patch("categories/:id")
  async updateCategory(@Param("id") id: string, @Body() body: { name: string }) {
    return this.adminService.updateCategory(id, body.name)
  }

  @Patch("users/:id/balance")
  async updateUserBalance(@Param("id") id: string, @Body() body: { balance: number }) {
    return this.adminService.updateUserBalance(id, body.balance)
  }

  @Patch("users/:id/limit")
  async updateUserLimit(@Param("id") id: string, @Body() body: { limit: number }) {
    return this.adminService.updateUserLimit(id, body.limit)
  }

  @Patch("users/:id/daily-limit")
  async updateUserDailyLimit(@Param("id") id: string, @Body() body: { dailyLimit: number }) {
    return this.adminService.updateUserDailyLimit(id, body.dailyLimit)
  }

  @Patch("users/:id/role")
  async updateUserRole(@Request() req, @Param("id") id: string, @Body() body: { role: string }) {
    return this.adminService.updateUserRole(req.user.userId, id, body.role)
  }

  @Delete("dishes/:id")
  async deleteDish(@Param("id") id: string) {
    return this.adminService.deleteDish(id)
  }

  @Delete("dishes/:id/photo")
  async removeDishPhoto(@Param("id") id: string) {
    return this.adminService.removeDishPhoto(id)
  }

  @Delete("categories/:id")
  async deleteCategory(@Param("id") id: string, @Body() body: { replacementCategoryId?: string }) {
    return this.adminService.deleteCategory(id, body?.replacementCategoryId)
  }

  @Delete("users/:id")
  async deleteUser(@Request() req, @Param("id") id: string) {
    return this.adminService.deleteUser(req.user.userId, id)
  }

  @Delete("companies/:id")
  async deleteCompany(@Param("id") id: string) {
    return this.adminService.deleteCompany(id)
  }
  @Post("companies/:id/documents")
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const companyId = req.params.id
        const dir = join(process.cwd(), 'uploads', 'company-docs', companyId)
        mkdirSync(dir, { recursive: true })
        cb(null, dir)
      },
      filename: (req, file, cb) => {
        const ext = extname(file.originalname)
        const name = `${Date.now()}-${file.originalname.replace(extname(file.originalname), '').replace(/[^a-zA-Z0-9а-яА-Я]/g, '_').slice(0, 50)}${ext}`
        cb(null, name)
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  async uploadCompanyDocument(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    return this.adminService.uploadCompanyDocument(id, file)
  }

  @Get("companies/:id/documents")
  async listCompanyDocuments(@Param("id") id: string) {
    return this.adminService.listCompanyDocuments(id)
  }

  @Delete("companies/:id/documents/:filename")
  async deleteCompanyDocument(@Param("id") id: string, @Param("filename") filename: string) {
    return this.adminService.deleteCompanyDocument(id, filename)
  }

  @Post('users/:id/change-password')
  async adminChangeUserPassword(@Request() req, @Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.adminService.adminChangePassword(req.user.userId, id, body.newPassword);
  }

  @Post('orders/:id/charge')
  async chargeOrder(@Param('id') id: string) {
    return this.adminService.chargeOrder(id);
  }

  @Post('orders/:id/defer')
  async deferOrder(@Param('id') id: string) {
    return this.adminService.deferOrder(id);
  }
  @Post('weekly-menus/:id/charge')
  async chargeWeeklyMenu(@Param('id') id: string) {
    return this.adminService.chargeWeeklyMenu(id);
  }

  @Post('weekly-menus/:id/defer')
  async deferWeeklyMenu(@Param('id') id: string) {
    return this.adminService.deferWeeklyMenu(id);
  }


}
