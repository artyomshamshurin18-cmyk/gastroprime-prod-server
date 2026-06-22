import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { renderInvoicePdf } from '../billing/invoice-pdf';
import * as fs from 'fs';
import { join, extname } from 'path';
import { createHash, randomUUID } from 'crypto';
import { getCompanyCategoryPriceMap, getResolvedCompanyDishPrice } from '../common/company-pricing';
import { TelegramService } from '../telegram/telegram.service';

const normalizeText = (value: unknown) => String(value ?? '').trim();
const normalizeKey = (value: string) => normalizeText(value).toLowerCase().replace(/[\s_\-]+/g, '');
const getImportCell = (row: Record<string, unknown>, aliases: string[]) => {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    const match = entries.find(([key]) => normalizeKey(key) === normalizedAlias);
    if (match) return match[1];
  }
  return '';
};
const allowedCompanyRoles = new Set(['CLIENT', 'MASTER_CLIENT']);
const allowedMealModes = new Set(['LUNCH', 'LUNCH_DINNER', 'BREAKFAST_LUNCH', 'BREAKFAST_LUNCH_DINNER']);
const allowedSetTypes = new Set(['FULL', 'SOUP_SALAD', 'MAIN_SALAD', 'PREMIUM']);
const allowedPersistentUserStatuses = new Set(['ACTIVE', 'VACATION', 'DISMISSED']);
const allowedPersistentCompanyStatuses = new Set(['ONBOARDING', 'ACTIVE', 'ON_HOLD', 'TERMINATED']);

const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  allergies: true,
  avatarUrl: true,
  status: true,
  mealModeOverride: true,
  setTypeOverride: true,
  isHalal: true,
  isVip: true,
  avoidGarlic: true,
  avoidMayonnaise: true,
  role: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: {
      id: true,
      name: true,
      status: true,
      logoUrl: true,
      contactPerson: true,
      address: true,
      entryConditions: true,
      routeName: true,
      deliveryTime: true,
      peopleCount: true,
      notes: true,
      mealPlan: true,
      workEmail: true,
      website: true,
      priceSegment: true,
      defaultSetType: true,
      balance: true,
      limit: true,
      dailyLimit: true,
      userId: true,
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private telegram: TelegramService) {}

  private parseDate(value?: string) {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Некорректная дата');
    }

    return new Date(date.toISOString().slice(0, 10));
  }

  private async getCompanyPriceMap(companyId?: string | null) {
    return getCompanyCategoryPriceMap(this.prisma, companyId)
  }

  private normalizeCategoryName(value?: string | null) {
    return normalizeText(value).toLowerCase()
  }

  private isBreakfastCategory(categoryName?: string | null) {
    return this.normalizeCategoryName(categoryName).startsWith('завтрак')
  }

  private isSoupCategory(categoryName?: string | null) {
    const normalized = this.normalizeCategoryName(categoryName)
    return normalized.startsWith('суп') || normalized === 'первые блюда'
  }

  private isMainCategory(categoryName?: string | null) {
    const normalized = this.normalizeCategoryName(categoryName)
    return normalized.startsWith('второе') || normalized === 'вторые блюда'
  }

  private isGarnishCategory(categoryName?: string | null) {
    const normalized = this.normalizeCategoryName(categoryName)
    return normalized.startsWith('гарнир') || normalized === 'гарниры'
  }

  private isSaladCategory(categoryName?: string | null) {
    const normalized = this.normalizeCategoryName(categoryName)
    return normalized.startsWith('салат')
  }

  private isPremiumCategory(categoryName?: string | null) {
    const normalized = this.normalizeCategoryName(categoryName)
    return normalized === 'премиум меню' || normalized === 'премиум комплекс'
  }

  private isBreakfastMain(item: { categoryName?: string | null; breakfastPart?: string | null }) {
    if (normalizeText(item.breakfastPart).toUpperCase() === 'MAIN') return true
    return this.normalizeCategoryName(item.categoryName).includes('основ')
  }

  private isBreakfastSide(item: { categoryName?: string | null; breakfastPart?: string | null }) {
    if (normalizeText(item.breakfastPart).toUpperCase() === 'SIDE') return true
    return this.normalizeCategoryName(item.categoryName).includes('дополн')
  }

  private getRobokassaConfig() {
    const merchantLogin = normalizeText(process.env.ROBOKASSA_MERCHANT_LOGIN)
    const password1 = normalizeText(process.env.ROBOKASSA_PASSWORD1)
    const password2 = normalizeText(process.env.ROBOKASSA_PASSWORD2)

    if (!merchantLogin || !password1 || !password2) {
      throw new BadRequestException('Онлайн-оплата Robokassa пока не настроена')
    }

    return {
      merchantLogin,
      password1,
      password2,
      successUrl: normalizeText(process.env.ROBOKASSA_SUCCESS_URL),
      failUrl: normalizeText(process.env.ROBOKASSA_FAIL_URL),
      resultUrl: normalizeText(process.env.ROBOKASSA_RESULT_URL),
      isTest: ['1', 'true', 'yes', 'on'].includes(normalizeText(process.env.ROBOKASSA_TEST_MODE).toLowerCase()),
      paymentUrl: 'https://auth.robokassa.ru/Merchant/Index.aspx',
    }
  }

  private formatRobokassaAmount(amount: number) {
    return Number(amount || 0).toFixed(2)
  }

  private getRobokassaShpParams(invoiceId: string) {
    return {
      Shp_invoiceId: invoiceId,
    }
  }

  private buildRobokassaSignature(parts: string[]) {
    return createHash('md5').update(parts.join(':')).digest('hex').toUpperCase()
  }

  private getSortedShpSignatureParts(params: Record<string, string>) {
    return Object.entries(params)
      .filter(([, value]) => normalizeText(value))
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([key, value]) => `${key}=${value}`)
  }

  private buildRobokassaPaymentUrl(invoice: { id: string, number: string, total: number }) {
    const config = this.getRobokassaConfig()
    const outSum = this.formatRobokassaAmount(invoice.total)
    const invId = String(Date.now())
    const shpParams = this.getRobokassaShpParams(invoice.id)
    const signature = this.buildRobokassaSignature([
      config.merchantLogin,
      outSum,
      invId,
      config.password1,
      ...this.getSortedShpSignatureParts(shpParams),
    ])

    const params = new URLSearchParams({
      MerchantLogin: config.merchantLogin,
      OutSum: outSum,
      InvId: invId,
      Description: `Пополнение баланса ${invoice.number}`,
      SignatureValue: signature,
      Culture: 'ru',
      Encoding: 'utf-8',
      ...shpParams,
    })

    if (config.isTest) params.set('IsTest', '1')
    return `${config.paymentUrl}?${params.toString()}`
  }

  private async createCompanyPrepaymentInvoiceRecord(userId: string, data: { amount: number; comment?: string }) {
    const currentUser = await this.getCompanyUserContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE', 'ON_HOLD'], 'Запрос счета доступен только активной или остановленной компании');
    const seller = await this.prisma.billingSettings.upsert({
      where: { key: 'main' },
      update: {},
      create: { key: 'main' },
    });

    const amount = Number(data.amount) || 0;
    if (amount <= 0) {
      throw new BadRequestException('Сумма предоплаты должна быть больше нуля');
    }

    const number = await this.generateInvoiceNumber('ADV');
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 3);

    return this.prisma.invoice.create({
      data: {
        number,
        companyId: currentUser.companyId!,
        type: 'PREPAYMENT',
        status: 'ISSUED',
        issueDate,
        dueDate,
        subtotal: amount,
        deviationTotal: 0,
        total: amount,
        comment: normalizeText(data.comment) || 'Счет на предоплату для пополнения баланса',
        buyerSnapshotName: currentUser.company!.name,
        buyerSnapshotAddress: currentUser.company!.billingAddress || null,
        buyerSnapshotDetails: currentUser.company!.billingDetails || null,
        sellerSnapshotName: seller.sellerName || 'Gastroprime',
        sellerSnapshotAddress: seller.sellerAddress || null,
        sellerSnapshotDetails: seller.sellerDetails || null,
        lines: {
          create: [{
            description: 'Предоплата для пополнения баланса',
            amount,
            deviationAmount: 0,
            total: amount,
          }],
        },
      },
      include: {
        lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
    });
  }

  private async applyPrepaymentInvoicePayment(invoiceId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { company: true },
      })

      if (!invoice) {
        throw new NotFoundException('Счет не найден')
      }

      if (invoice.type !== 'PREPAYMENT') {
        throw new BadRequestException('Robokassa доступна только для счетов на предоплату')
      }

      if (invoice.status === 'PAID') {
        return invoice
      }

      const updated = await tx.invoice.updateMany({
        where: { id: invoiceId, status: { not: 'PAID' } },
        data: { status: 'PAID' },
      })

      if (updated.count > 0) {
        await tx.company.update({
          where: { id: invoice.companyId },
          data: { balance: (invoice.company.balance || 0) + invoice.total },
        })
      }

      return tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] } },
      })
    })
  }

  private saveImage(file: any, folderName: string) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл не был загружен');
    }

    if (!String(file.mimetype || '').startsWith('image/')) {
      throw new BadRequestException('Можно загружать только изображения');
    }

    const extension = extname(file.originalname || '') || '.png';
    const uploadsDir = join(process.cwd(), 'uploads', folderName);
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    const absolutePath = join(uploadsDir, fileName);
    fs.writeFileSync(absolutePath, file.buffer);
    return `/uploads/${folderName}/${fileName}`;
  }

  private normalizeUserStatus(value: unknown) {
    const normalized = normalizeText(value).toUpperCase() || 'ACTIVE';
    if (!allowedPersistentUserStatuses.has(normalized)) {
      throw new BadRequestException('Некорректный статус пользователя');
    }
    return normalized;
  }

  private normalizeCompanyStatus(value: unknown) {
    const normalized = normalizeText(value).toUpperCase() || 'ACTIVE';
    if (!allowedPersistentCompanyStatuses.has(normalized)) {
      throw new BadRequestException('Некорректный статус компании');
    }
    return normalized;
  }

  private ensureUserIsAllowed(userStatus?: string | null) {
    if ((userStatus || 'ACTIVE') === 'DISMISSED') {
      throw new ForbiddenException('Учетная запись сотрудника отключена');
    }
  }

  private ensureCompanyStatusAllowed(companyStatus: string | undefined | null, allowedStatuses: string[], message: string) {
    const normalizedStatus = companyStatus || 'ACTIVE';
    if (!allowedStatuses.includes(normalizedStatus)) {
      throw new ForbiddenException(message);
    }
  }

  private getCompanyPermissions(companyStatus?: string | null) {
    const status = companyStatus || 'ACTIVE';
    return {
      status,
      canManageEmployees: ['ONBOARDING', 'ACTIVE'].includes(status),
      canUseFullCompanyDashboard: status === 'ACTIVE',
      canUseBillingOnly: status === 'ON_HOLD',
      canAccessAnalytics: status === 'ACTIVE',
      isTerminated: status === 'TERMINATED',
    };
  }

  private async getCoordinatorContext(userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        status: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            status: true,
            logoUrl: true,
            dailyLimit: true,
            mealPlan: true,
            defaultSetType: true,
            userId: true,
          },
        },
      },
    });

    if (!currentUser?.companyId || !currentUser.company) {
      throw new NotFoundException('Компания не найдена');
    }

    this.ensureUserIsAllowed(currentUser.status);

    if (!['ADMIN', 'SUPERADMIN', 'MASTER_CLIENT'].includes(currentUser.role) && currentUser.company.userId !== userId) {
      throw new ForbiddenException('Панель компании доступна только координатору компании');
    }

    return currentUser;
  }

  private async getCompanyUserContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            status: true,
            logoUrl: true,
            billingAddress: true,
            billingDetails: true,
          }
        }
      }
    });

    if (!user?.companyId || !user.company) {
      throw new NotFoundException('Компания не найдена');
    }

    this.ensureUserIsAllowed(user.status);
    if (user.company.status === 'TERMINATED') {
      throw new ForbiddenException('Доступ в кабинет компании закрыт');
    }

    return user;
  }

  private async generateInvoiceNumber(prefix: string) {
    const today = new Date();
    const dateKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await this.prisma.invoice.count({
      where: { number: { startsWith: `${prefix}-${dateKey}` } },
    });
    return `${prefix}-${dateKey}-${String(count + 1).padStart(3, '0')}`;
  }

  private buildMonthlyReportFileName(companyName: string, start: string, end: string) {
    const safeName = normalizeText(companyName)
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'company';

    return `payroll-report-${safeName}-${start}-${end}.xlsx`;
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateProfile(userId: string, data: any) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!existingUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        allergies: data.allergies || null,
      },
      select: safeUserSelect,
    });
  }

  async uploadAvatar(userId: string, file: any) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    const avatarUrl = this.saveImage(file, 'avatars');
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: safeUserSelect,
    });
  }

  async uploadCompanyLogo(userId: string, file: any) {
    const currentUser = await this.getCoordinatorContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Логотип компании можно менять только у активной компании');
    const logoUrl = this.saveImage(file, 'company-logos');
    await this.prisma.company.update({
      where: { id: currentUser.companyId! },
      data: { logoUrl },
    });
    return this.getCompanyDashboard(userId);
  }

  async removeAvatar(userId: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: safeUserSelect,
    });
  }

  async removeCompanyLogo(userId: string) {
    const currentUser = await this.getCoordinatorContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Логотип компании можно менять только у активной компании');
    await this.prisma.company.update({
      where: { id: currentUser.companyId! },
      data: { logoUrl: null },
    });
    return this.getCompanyDashboard(userId);
  }

  async getManagerChat(userId: string) {
    const currentUser = await this.getCompanyUserContext(userId)
    const messages = await this.prisma.supportMessage.findMany({
      where: { companyId: currentUser.companyId! },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        text: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          }
        }
      }
    })

    return {
      company: currentUser.company,
      messages: messages.map((message) => ({
        id: message.id,
        text: message.text,
        createdAt: message.createdAt,
        user: {
          id: message.user.id,
          name: [message.user.firstName, message.user.lastName].filter(Boolean).join(' ') || message.user.email,
          email: message.user.email,
          role: message.user.role,
        }
      }))
    }
  }

  async sendManagerChatMessage(userId: string, text: string) {
    const currentUser = await this.getCompanyUserContext(userId)
    const normalizedText = normalizeText(text)

    if (!normalizedText) {
      throw new BadRequestException('Сообщение не может быть пустым')
    }

    await this.prisma.supportMessage.create({
      data: {
        companyId: currentUser.companyId!,
        userId,
        text: normalizedText,
      }
    })

    return this.getManagerChat(userId)
  }

  async getCompanyDashboard(userId: string, dateValue?: string) {
    const currentUser = await this.getCoordinatorContext(userId);
    const targetDate = this.parseDate(dateValue);
    const permissions = this.getCompanyPermissions(currentUser.company?.status);

    const users = await this.prisma.user.findMany({
      where: { companyId: currentUser.companyId },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
        { email: 'asc' },
      ],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        mealModeOverride: true,
        setTypeOverride: true,
        isHalal: true,
        isVip: true,
        avoidGarlic: true,
        avoidMayonnaise: true,
        attendanceDays: {
          where: { date: targetDate },
          select: {
            status: true,
            comment: true,
          },
          take: 1,
        },
        weeklyMenus: {
          where: {
            selections: {
              some: {
                date: targetDate,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            selections: {
              where: { date: targetDate },
              select: {
                utensils: true,
                needBread: true,
                notes: true,
                items: {
                  select: {
                    quantity: true,
                    dish: {
                      select: {
                        id: true,
                        name: true,
                        price: true,
                        categoryId: true,
                        category: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const companyPriceMap = await this.getCompanyPriceMap(currentUser.company?.id)

    const employees = users.map(user => {
      const attendance = user.attendanceDays[0];
      const weeklyMenu = user.weeklyMenus[0];
      const selection = weeklyMenu?.selections[0];
      const items = selection?.items.map(item => ({
        dishId: item.dish.id,
        dishName: item.dish.name,
        categoryName: item.dish.category.name,
        quantity: item.quantity,
        price: getResolvedCompanyDishPrice(item.dish, companyPriceMap),
        total: item.quantity * getResolvedCompanyDishPrice(item.dish, companyPriceMap),
      })) || [];
      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
      const totalPortions = items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        userId: user.id,
        userName: [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email,
        email: user.email,
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
        status: user.status || 'ACTIVE',
        mealModeOverride: user.mealModeOverride,
        setTypeOverride: user.setTypeOverride,
        isHalal: user.isHalal,
        isVip: user.isVip,
        avoidGarlic: user.avoidGarlic,
        avoidMayonnaise: user.avoidMayonnaise,
        attendanceStatus: attendance?.status || 'OFFICE',
        attendanceComment: attendance?.comment || '',
        weeklyMenuId: weeklyMenu?.id || null,
        weeklyStatus: weeklyMenu?.status || null,
        hasSelection: Boolean(selection),
        utensils: selection?.utensils || 0,
        needBread: selection?.needBread || false,
        notes: selection?.notes || '',
        items,
        totalAmount,
        totalPortions,
        overLimit: currentUser.company!.dailyLimit > 0 && totalAmount > currentUser.company!.dailyLimit,
      };
    });

    return {
      date: targetDate.toISOString().slice(0, 10),
      company: {
        id: currentUser.company.id,
        name: currentUser.company.name,
        status: currentUser.company.status || 'ACTIVE',
        logoUrl: (currentUser.company as any).logoUrl || '',
        dailyLimit: currentUser.company.dailyLimit,
        mealPlan: currentUser.company.mealPlan || 'LUNCH',
        defaultSetType: currentUser.company.defaultSetType || 'FULL',
      },
      permissions,
      summary: {
        employeesCount: employees.length,
        selectedCount: employees.filter(employee => employee.hasSelection).length,
        draftCount: employees.filter(employee => employee.hasSelection && (employee.weeklyStatus === 'DRAFT' || employee.weeklyStatus === null)).length,
        confirmedCount: employees.filter(employee => employee.hasSelection && employee.weeklyStatus === 'CONFIRMED').length,
        missingCount: employees.filter(employee => employee.attendanceStatus === 'OFFICE' && !employee.hasSelection).length,
        nonOfficeCount: employees.filter(employee => employee.attendanceStatus !== 'OFFICE').length,
        totalPortions: employees.reduce((sum, employee) => sum + employee.totalPortions, 0),
        totalAmount: employees.reduce((sum, employee) => sum + employee.totalAmount, 0),
        overLimitCount: employees.filter(employee => employee.overLimit).length,
      },
      employees,
    };
  }

  async getCompanyScheduledRequests(coordinatorUserId: string, data?: { start?: string; end?: string }) {
    const context = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(context.company?.status, ['ACTIVE'], 'Просмотр заявок доступен только активной компании');

    const startDate = this.parseDate(data?.start);
    const endDate = data?.end ? this.parseDate(data.end) : new Date(startDate.getTime() + 13 * 86400000);

    if (startDate > endDate) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания');
    }

    const selections = await this.prisma.daySelection.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        weeklyMenu: {
          user: { companyId: context.companyId },
          status: { in: ['DRAFT', 'CONFIRMED', 'PAID', 'DEFERRED', 'COMPLETED'] },
        },
      },
      orderBy: [{ date: 'asc' }],
      include: {
        weeklyMenu: {
          select: {
            id: true,
            status: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        items: {
          include: {
            dish: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    })

    const companyPriceMap = await this.getCompanyPriceMap(context.companyId)
    const grouped = new Map<string, any>()

    for (const selection of selections) {
      const dateKey = selection.date.toISOString().slice(0, 10)
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          date: dateKey,
          employeesCount: 0,
          totalPortions: 0,
          totalAmount: 0,
          confirmedCount: 0,
          draftCount: 0,
          employees: [],
        })
      }

      const entry = grouped.get(dateKey)
      const employeeName = [selection.weeklyMenu.user.lastName, selection.weeklyMenu.user.firstName].filter(Boolean).join(' ').trim() || selection.weeklyMenu.user.email
      const items = selection.items.map(item => ({
        dishId: item.dishId,
        dishName: item.dish.name,
        categoryName: item.dish.category.name,
        quantity: item.quantity,
        price: getResolvedCompanyDishPrice(item.dish, companyPriceMap),
        total: getResolvedCompanyDishPrice(item.dish, companyPriceMap) * item.quantity,
      }))
      const totalPortions = items.reduce((sum, item) => sum + item.quantity, 0)
      const totalAmount = items.reduce((sum, item) => sum + item.total, 0)

      entry.employeesCount += 1
      entry.totalPortions += totalPortions
      entry.totalAmount += totalAmount
      if (selection.weeklyMenu.status === 'CONFIRMED') entry.confirmedCount += 1
      else if (selection.weeklyMenu.status === 'PAID') {
        if (!entry.paidCount) entry.paidCount = 0;
        entry.paidCount += 1;
      } else if (selection.weeklyMenu.status === 'DEFERRED') {
        if (!entry.deferredCount) entry.deferredCount = 0;
        entry.deferredCount += 1;
      } else entry.draftCount += 1
      entry.employees.push({
        userId: selection.weeklyMenu.user.id,
        userName: employeeName,
        avatarUrl: selection.weeklyMenu.user.avatarUrl || '',
        weeklyMenuId: selection.weeklyMenu.id,
        weeklyStatus: selection.weeklyMenu.status,
        totalPortions,
        totalAmount,
        items,
      })
    }

    return {
      company: {
        id: context.company.id,
        name: context.company.name,
      },
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
      dates: Array.from(grouped.values()),
    }
  }

  async setCompanyAttendance(coordinatorUserId: string, data: { userId: string; date?: string; status?: string; comment?: string }) {
    const currentUser = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Изменение статусов присутствия доступно только активной компании');
    const targetDate = this.parseDate(data.date);
    const status = data.status || 'OFFICE';
    const allowedStatuses = ['OFFICE', 'REMOTE', 'VACATION', 'SICK', 'NO_MEAL'];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Некорректный статус присутствия');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: data.userId,
        companyId: currentUser.companyId,
      },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Сотрудник не найден в компании');
    }

    return this.prisma.employeeAttendance.upsert({
      where: {
        userId_date: {
          userId: data.userId,
          date: targetDate,
        },
      },
      create: {
        userId: data.userId,
        date: targetDate,
        status,
        comment: data.comment || '',
      },
      update: {
        status,
        comment: data.comment || '',
      },
    });
  }

  async setCompanyAttendanceBulk(coordinatorUserId: string, data: { userIds: string[]; date?: string; status?: string }) {
    const currentUser = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Массовое изменение статусов доступно только активной компании');
    const targetDate = this.parseDate(data.date);
    const status = data.status || 'OFFICE';
    const allowedStatuses = ['OFFICE', 'REMOTE', 'VACATION', 'SICK', 'NO_MEAL'];

    if (!Array.isArray(data.userIds) || data.userIds.length === 0) {
      throw new BadRequestException('Не выбраны сотрудники');
    }

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Некорректный статус присутствия');
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: data.userIds },
        companyId: currentUser.companyId,
      },
      select: { id: true },
    });

    if (users.length !== data.userIds.length) {
      throw new NotFoundException('Некоторые сотрудники не найдены в компании');
    }

    await this.prisma.$transaction(
      users.map(user => this.prisma.employeeAttendance.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: targetDate,
          },
        },
        create: {
          userId: user.id,
          date: targetDate,
          status,
          comment: '',
        },
        update: {
          status,
          comment: '',
        },
      }))
    );

    return {
      success: true,
      updated: users.length,
    };
  }

  async createCompanyEmployee(coordinatorUserId: string, data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string; role?: string }) {
    const currentUser = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ONBOARDING', 'ACTIVE'], 'Добавление сотрудников доступно только на подключении или в активной работе');
    const email = normalizeText(data.email).toLowerCase();
    const password = normalizeText(data.password);
    const role = normalizeText(data.role).toUpperCase() || 'CLIENT';

    if (!email || !password) {
      throw new BadRequestException('Нужны email и пароль');
    }

    if (!allowedCompanyRoles.has(role)) {
      throw new BadRequestException('Недопустимая роль для сотрудника компании');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: normalizeText(data.firstName) || null,
        lastName: normalizeText(data.lastName) || null,
        phone: normalizeText(data.phone) || null,
        role,
        status: 'ACTIVE',
        company: { connect: { id: currentUser.companyId! } },
      },
      select: safeUserSelect,
    });
  }

  async previewCompanyEmployeeImport(coordinatorUserId: string, file?: any, defaultPassword?: string) {
    const currentUser = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ONBOARDING', 'ACTIVE'], 'Импорт сотрудников доступен только на подключении или в активной работе');

    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл не был загружен');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException('В Excel-файле нет листов');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rawRows.length === 0) {
      throw new BadRequestException('Excel-файл пустой');
    }

    const fallbackPassword = normalizeText(defaultPassword);
    const emails = rawRows
      .map(row => normalizeText(getImportCell(row, ['email', 'почта'])).toLowerCase())
      .filter(Boolean);

    const existingUsers = emails.length
      ? await this.prisma.user.findMany({
          where: { email: { in: emails } },
          select: { id: true, email: true, companyId: true },
        })
      : [];
    const userMap = new Map(existingUsers.map(user => [user.email, user]));

    const rows = rawRows.map((row, index) => {
      const email = normalizeText(getImportCell(row, ['email', 'почта'])).toLowerCase();
      const firstName = normalizeText(getImportCell(row, ['firstname', 'имя']));
      const lastName = normalizeText(getImportCell(row, ['lastname', 'фамилия']));
      const phone = normalizeText(getImportCell(row, ['phone', 'телефон']));
      const role = normalizeText(getImportCell(row, ['role', 'роль'])).toUpperCase() || 'CLIENT';
      const password = normalizeText(getImportCell(row, ['password', 'пароль'])) || fallbackPassword;
      const existingUser = userMap.get(email);

      const errors: string[] = [];
      if (!email) errors.push('Не указан email');
      if (!password) errors.push('Не указан пароль и не задан пароль по умолчанию');
      if (!allowedCompanyRoles.has(role)) errors.push(`Недопустимая роль: ${role}`);
      if (existingUser && existingUser.companyId !== currentUser.companyId) {
        errors.push('Пользователь с таким email уже привязан к другой компании');
      }

      return {
        rowNumber: index + 2,
        email,
        firstName,
        lastName,
        phone,
        role,
        password,
        action: existingUser ? 'update' : 'create',
        errors,
      };
    });

    return {
      fileName: file.originalname,
      companyName: currentUser.company!.name,
      totalRows: rows.length,
      validRows: rows.filter(row => row.errors.length === 0).length,
      errorRows: rows.filter(row => row.errors.length > 0).length,
      createCount: rows.filter(row => row.errors.length === 0 && row.action === 'create').length,
      updateCount: rows.filter(row => row.errors.length === 0 && row.action === 'update').length,
      rows,
    };
  }

  async commitCompanyEmployeeImport(coordinatorUserId: string, rows: any[], defaultPassword?: string) {
    const currentUser = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ONBOARDING', 'ACTIVE'], 'Импорт сотрудников доступен только на подключении или в активной работе');
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('Нет строк для импорта сотрудников');
    }

    const fallbackPassword = normalizeText(defaultPassword);
    const invalidRow = rows.find(row => !row.email || (Array.isArray(row.errors) && row.errors.length > 0));
    if (invalidRow) {
      throw new BadRequestException(`Нельзя импортировать файл с ошибками. Проверьте строку ${invalidRow.rowNumber || '?'}`);
    }

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const email = normalizeText(row.email).toLowerCase();
      const passwordRaw = normalizeText(row.password) || fallbackPassword;
      const role = normalizeText(row.role).toUpperCase() || 'CLIENT';

      if (!passwordRaw) {
        throw new BadRequestException(`Для пользователя ${email} не задан пароль`);
      }

      if (!allowedCompanyRoles.has(role)) {
        throw new BadRequestException(`Недопустимая роль для ${email}`);
      }

      const hashedPassword = await bcrypt.hash(passwordRaw, 10);
      const existingUser = await this.prisma.user.findUnique({ where: { email } });

      if (existingUser && existingUser.companyId && existingUser.companyId !== currentUser.companyId) {
        throw new BadRequestException(`Пользователь ${email} уже привязан к другой компании`);
      }

      const payload = {
        email,
        firstName: normalizeText(row.firstName) || null,
        lastName: normalizeText(row.lastName) || null,
        phone: normalizeText(row.phone) || null,
        role,
        status: 'ACTIVE',
        company: { connect: { id: currentUser.companyId! } },
        password: hashedPassword,
      };

      if (existingUser) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: payload,
        });
        updated += 1;
      } else {
        await this.prisma.user.create({
          data: payload,
        });
        created += 1;
      }
    }

    return {
      success: true,
      created,
      updated,
      total: created + updated,
    };
  }

  async updateCompanySettings(coordinatorUserId: string, data: { dailyLimit?: number; mealPlan?: string; defaultSetType?: string }) {
    const currentUser = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Настройки компании доступны только в активном статусе');
    const normalizedLimit = Number(data.dailyLimit);
    const mealPlan = normalizeText(data.mealPlan).toUpperCase() || 'LUNCH';
    const defaultSetType = normalizeText(data.defaultSetType).toUpperCase() || 'FULL';

    if (!Number.isFinite(normalizedLimit) || normalizedLimit < 0) {
      throw new BadRequestException('Некорректный дневной лимит');
    }

    if (!allowedMealModes.has(mealPlan)) {
      throw new BadRequestException('Некорректный режим питания');
    }

    if (!allowedSetTypes.has(defaultSetType)) {
      throw new BadRequestException('Некорректный тип комплекта');
    }

    return this.prisma.company.update({
      where: { id: currentUser.companyId! },
      data: {
        dailyLimit: Math.round(normalizedLimit),
        mealPlan,
        defaultSetType,
      },
      select: {
        id: true,
        name: true,
        dailyLimit: true,
        mealPlan: true,
        defaultSetType: true,
      },
    });
  }

  async updateCompanyEmployeePreferences(coordinatorUserId: string, employeeId: string, data: { mealModeOverride?: string | null; setTypeOverride?: string | null; isHalal?: boolean; isVip?: boolean; avoidGarlic?: boolean; avoidMayonnaise?: boolean }) {
    const currentUser = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Настройки сотрудников доступны только активной компании');
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId: currentUser.companyId,
      },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Сотрудник не найден в компании');
    }

    const mealModeOverride = normalizeText(data.mealModeOverride || '').toUpperCase();
    const setTypeOverride = normalizeText(data.setTypeOverride || '').toUpperCase();

    if (mealModeOverride && !allowedMealModes.has(mealModeOverride)) {
      throw new BadRequestException('Некорректный режим питания у сотрудника');
    }

    if (setTypeOverride && !allowedSetTypes.has(setTypeOverride)) {
      throw new BadRequestException('Некорректный тип комплекта у сотрудника');
    }

    return this.prisma.user.update({
      where: { id: employeeId },
      data: {
        mealModeOverride: mealModeOverride || null,
        setTypeOverride: setTypeOverride || null,
        isHalal: Boolean(data.isHalal),
        isVip: Boolean(data.isVip),
        avoidGarlic: Boolean(data.avoidGarlic),
        avoidMayonnaise: Boolean(data.avoidMayonnaise),
      },
      select: safeUserSelect,
    });
  }

  async autoFillCompanyEmployees(coordinatorUserId: string, data: { date?: string; userIds?: string[] }) {
    const currentUser = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Автозаполнение доступно только активной компании');
    const targetDate = this.parseDate(data.date);
    const dashboard = await this.getCompanyDashboard(coordinatorUserId, targetDate.toISOString().slice(0, 10));
    const selectedUserIds = Array.isArray(data.userIds) && data.userIds.length > 0 ? new Set(data.userIds) : null;

    const dailyMenu = await this.prisma.dailyMenu.findUnique({
      where: { date: targetDate },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            dish: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (!dailyMenu) {
      throw new BadRequestException('На выбранную дату не настроено меню');
    }

    const candidates = dailyMenu.items.map(item => ({
      dishId: item.dishId,
      name: item.dish.name,
      categoryName: item.dish.category.name,
      containsPork: Boolean((item.dish as any).containsPork),
      containsGarlic: Boolean((item.dish as any).containsGarlic),
      containsMayonnaise: Boolean((item.dish as any).containsMayonnaise),
      breakfastPart: (item.dish as any).breakfastPart || '',
    }));

    const dishUsage = new Map<string, number>();
    const pickRandom = (items: any[]) => items[Math.floor(Math.random() * items.length)];
    const pickMatching = (items: any[], matcher: (item: any) => boolean, usedIds: Set<string>, uniquePreferred = true) => {
      const matched = items.filter(matcher);
      if (!matched.length) return null;
      const pool = uniquePreferred
        ? (matched.filter(item => !usedIds.has(item.dishId)).length ? matched.filter(item => !usedIds.has(item.dishId)) : matched)
        : matched;
      const minUsage = Math.min(...pool.map(item => dishUsage.get(item.dishId) || 0));
      return pickRandom(pool.filter(item => (dishUsage.get(item.dishId) || 0) === minUsage));
    };

    const ensureWeeklyMenuForDate = async (userId: string, items: { dishId: string; quantity: number }[]) => {
      console.log("[DEB] ensureWM userId=" + userId + " date=" + targetDate.toISOString().slice(0,10));
    const existingWeeklyMenu = await this.prisma.weeklyMenu.findFirst({
        where: {
          userId,
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (existingWeeklyMenu) {
        return this.prisma.daySelection.create({
          data: {
            weeklyMenuId: existingWeeklyMenu.id,
            date: targetDate,
            utensils: 1,
            needBread: true,
            notes: 'Автозаполнено координатором компании',
            items: {
              create: items,
            },
          },
        });
      }

      return this.prisma.weeklyMenu.create({
        data: {
          userId,
          startDate: targetDate,
          endDate: targetDate,
          status: 'DRAFT',
          selections: {
            create: {
              date: targetDate,
              utensils: 1,
              needBread: true,
              notes: 'Автозаполнено координатором компании',
              items: {
                create: items,
              },
            },
          },
        },
      });
    };

    const targetEmployees = dashboard.employees.filter((employee: any) => !selectedUserIds || selectedUserIds.has(employee.userId));
    const missingEmployees = targetEmployees.filter((employee: any) => employee.attendanceStatus === 'OFFICE' && !employee.hasSelection);

    const results = {
      updated: 0,
      skipped: 0,
      updatedEmployees: [] as { userId: string; userName: string; items: string[] }[],
      skippedEmployees: [] as { userId: string; userName: string; reason: string }[],
      errors: [] as { userId: string; userName: string; reason: string }[],
    };

    targetEmployees
      .filter((employee: any) => !(employee.attendanceStatus === 'OFFICE' && !employee.hasSelection))
      .forEach((employee: any) => {
        results.skippedEmployees.push({
          userId: employee.userId,
          userName: employee.userName,
          reason: employee.hasSelection ? 'У сотрудника уже был выбор' : 'Сотрудник не отмечен как присутствующий в офисе',
        });
      });

    results.skipped = results.skippedEmployees.length;

    for (const employee of missingEmployees) {
      const mealMode = employee.mealModeOverride || dashboard.company.mealPlan || 'LUNCH';
      const setType = employee.isVip ? 'PREMIUM' : (employee.setTypeOverride || dashboard.company.defaultSetType || 'FULL');
      const filtered = candidates.filter(item => {
        if (employee.isHalal && item.containsPork) return false;
        if (employee.avoidGarlic && item.containsGarlic) return false;
        if (employee.avoidMayonnaise && (item as any).containsMayonnaise) return false;
        return true;
      });
      const usedIds = new Set<string>();
      const selectedItems: { dishId: string; quantity: number }[] = [];

      const addItem = (item: any | null) => {
        if (!item) return;
        usedIds.add(item.dishId);
        dishUsage.set(item.dishId, (dishUsage.get(item.dishId) || 0) + 1);
        const existing = selectedItems.find(entry => entry.dishId === item.dishId);
        if (existing) existing.quantity += 1;
        else selectedItems.push({ dishId: item.dishId, quantity: 1 });
      };

      const addBreakfast = () => {
        const breakfastItems = filtered.filter(item => this.isBreakfastCategory(item.categoryName));
        if (!breakfastItems.length) return;
        const main = breakfastItems.find(item => this.isBreakfastMain(item)) || pickRandom(breakfastItems);
        addItem(main);
        const sideCandidates = breakfastItems.filter(item => item.dishId !== main?.dishId && this.isBreakfastSide(item));
        const side = sideCandidates[0] || breakfastItems.find(item => item.dishId !== main?.dishId) || null;
        addItem(side);
      };

      const addSet = () => {
        if (setType === 'PREMIUM') {
          const premium = pickMatching(filtered, item => this.isPremiumCategory(item.categoryName), usedIds);
          if (!premium) throw new Error('Нет доступного премиум-комплекса');
          addItem(premium);
          return;
        }

        if (setType === 'FULL' || setType === 'SOUP_SALAD') {
          const soup = pickMatching(filtered, item => this.isSoupCategory(item.categoryName), usedIds);
          if (!soup) throw new Error('Нет доступного супа');
          addItem(soup);
        }

        if (setType === 'FULL' || setType === 'MAIN_SALAD') {
          const main = pickMatching(filtered, item => this.isMainCategory(item.categoryName), usedIds);
          const garnish = pickMatching(filtered, item => this.isGarnishCategory(item.categoryName), usedIds);
          if (!main) throw new Error('Нет доступного второго блюда');
          addItem(main);
          if (garnish) addItem(garnish);
        }

        const salad = pickMatching(filtered, item => this.isSaladCategory(item.categoryName), usedIds);
        if (!salad) throw new Error('Нет доступного салата');
        addItem(salad);
      };

      try {
        if (mealMode === 'BREAKFAST_LUNCH' || mealMode === 'BREAKFAST_LUNCH_DINNER') {
          addBreakfast();
        }

        addSet();

        if (mealMode === 'LUNCH_DINNER' || mealMode === 'BREAKFAST_LUNCH_DINNER') {
          addSet();
        }

        if (!selectedItems.length) {
          throw new Error('Не удалось подобрать блюда');
        }

        await ensureWeeklyMenuForDate(employee.userId, selectedItems);
        results.updated += 1;
        results.updatedEmployees.push({
          userId: employee.userId,
          userName: employee.userName,
          items: selectedItems.map(item => {
            const dish = filtered.find(candidate => candidate.dishId === item.dishId);
            return `${dish?.name || item.dishId} × ${item.quantity}`;
          }),
        });
      } catch (error: any) {
        results.errors.push({
          userId: employee.userId,
          userName: employee.userName,
          reason: error.message || 'Ошибка автоподбора',
        });
      }
    }

    return results;
  }

  async createCompanyRequest(coordinatorUserId: string, data: { date?: string }) {
    console.log("[DEB2] createCompanyRequest userId=" + coordinatorUserId + " date=" + (data.date || "?"));
    const allB4 = await this.prisma.daySelection.count();
    console.log("[DEB2] total DS before: " + allB4);
    const context = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(context.company?.status, ['ACTIVE'], 'Создание заявки доступно только активной компании');
    const targetDate = this.parseDate(data.date);

    const weeklyMenus = await this.prisma.weeklyMenu.findMany({
      where: {
        user: { companyId: context.companyId },
        selections: { some: { date: targetDate } },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            companyId: true,
          },
        },
        selections: {
          where: { date: targetDate },
          include: {
            items: {
              include: {
                dish: {
                  include: { category: true },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!weeklyMenus.length) {
      throw new BadRequestException('На выбранную дату нет выборов сотрудников для создания заявки');
    }

    const companyPriceMap = await this.getCompanyPriceMap(context.companyId)
    const draftIds = weeklyMenus.filter(menu => menu.status !== 'CONFIRMED').map(menu => menu.id)

    if (draftIds.length) {
      await this.prisma.weeklyMenu.updateMany({
        where: { id: { in: draftIds } },
        data: { status: 'CONFIRMED' },
      })
    }

    const employees = weeklyMenus.map(menu => {
      const userName = [menu.user.lastName, menu.user.firstName].filter(Boolean).join(' ').trim() || menu.user.email
      const selection = menu.selections[0]
      const items = (selection?.items || []).map(item => ({
        dishId: item.dishId,
        dishName: item.dish.name,
        quantity: item.quantity,
        categoryName: item.dish.category.name,
        total: getResolvedCompanyDishPrice(item.dish, companyPriceMap) * item.quantity,
      }))

      return {
        userId: menu.user.id,
        userName,
        weeklyMenuId: menu.id,
        previousStatus: menu.status,
        items,
        totalAmount: items.reduce((sum, item) => sum + item.total, 0),
        totalPortions: items.reduce((sum, item) => sum + item.quantity, 0),
      }
    })

    // Уведомление в Telegram о новой заявке
    try {
      const totalAmount = employees.reduce((sum, e) => sum + e.totalAmount, 0);
      const companyName = context.company?.name || context.companyId;
      const msg = [
        '<b>🆕 Новая заявка от компании!</b>',
        '',
        '<b>Компания:</b> ' + companyName,
        '<b>Дата:</b> ' + targetDate.toISOString().slice(0, 10),
        '<b>Сотрудников:</b> ' + employees.length,
        '<b>Порций:</b> ' + employees.reduce((s, e) => s + e.totalPortions, 0),
        '<b>Сумма:</b> ' + totalAmount.toLocaleString('ru') + ' ₽',
        '<b>ID заявок:</b> ' + employees.map(e => e.weeklyMenuId.slice(0, 8)).join(', '),
      ].join('\n');
      this.telegram.sendMessage(msg).catch(() => {});
    } catch (e) {
      console.error('Telegram notify request failed:', (e as Error).message);
    }

    return {
      date: targetDate.toISOString().slice(0, 10),
      created: true,
      confirmedMenus: draftIds.length,
      alreadyConfirmedMenus: weeklyMenus.length - draftIds.length,
      employeesCount: employees.length,
      totalPortions: employees.reduce((sum, employee) => sum + employee.totalPortions, 0),
      totalAmount: employees.reduce((sum, employee) => sum + employee.totalAmount, 0),
      employees,
    }
  }

  async setCompanyEmployeeSelection(coordinatorUserId: string, employeeId: string, data: { date?: string; items?: { dishId: string; quantity: number }[] }) {
    const context = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(context.company?.status, ['ACTIVE'], 'Ручной выбор доступен только активной компании');
    const targetDate = this.parseDate(data.date);
    const targetUser = await this.prisma.user.findFirst({
      where: { id: employeeId, companyId: context.companyId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Сотрудник не найден в компании');
    }

    const items = (data.items || []).filter(item => item.quantity && item.quantity > 0);
    if (!items.length) {
      throw new BadRequestException('Нужно выбрать хотя бы одно блюдо');
    }

    const dailyMenu = await this.prisma.dailyMenu.findUnique({
      where: { date: targetDate },
      include: { items: true },
    });

    if (!dailyMenu) {
      throw new BadRequestException('На выбранную дату не настроено меню');
    }

    const allowedByDishId = new Map(dailyMenu.items.map(item => [item.dishId, item.maxQuantity]));
    for (const item of items) {
      const maxQuantity = allowedByDishId.get(item.dishId);
      if (!maxQuantity) {
        throw new BadRequestException('Одно из выбранных блюд недоступно в меню дня');
      }
      if (item.quantity > maxQuantity) {
        throw new BadRequestException('Количество одного из блюд превышает допустимый лимит в меню дня');
      }
    }

    console.log("[DEB] setSelection emp=" + employeeId + " date=" + targetDate.toISOString().slice(0,10) + " items=" + JSON.stringify(items.map(i => i.dishId.slice(0,6) + "x" + i.quantity)));
    const existingSelection = await this.prisma.daySelection.findFirst({
      where: {
        date: targetDate,
        weeklyMenu: { userId: employeeId },
      },
      include: { items: true },
    });

    if (existingSelection) {
      await this.prisma.selectedDish.deleteMany({ where: { daySelectionId: existingSelection.id } });
      return this.prisma.daySelection.update({
        where: { id: existingSelection.id },
        data: {
          notes: existingSelection.notes || 'Выбрано координатором компании',
          items: {
            create: items.map(item => ({
              dishId: item.dishId,
              quantity: item.quantity,
            })),
          },
        },
      });
    }

    const weeklyMenu = await this.prisma.weeklyMenu.findFirst({
      where: {
        userId: employeeId,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (weeklyMenu) {
      return this.prisma.daySelection.create({
        data: {
          weeklyMenuId: weeklyMenu.id,
          date: targetDate,
          utensils: 1,
          needBread: true,
          notes: 'Выбрано координатором компании',
          items: {
            create: items.map(item => ({
              dishId: item.dishId,
              quantity: item.quantity,
            })),
          },
        },
      });
    }

    // Не нашли точный WM — ищем ближайший по дате и расширяем его
    const nearestWM = await this.prisma.weeklyMenu.findFirst({
      where: {
        userId: employeeId,
        OR: [
          { startDate: { lte: targetDate }, endDate: { gte: targetDate } },
          { startDate: { lte: targetDate } },
          { endDate: { gte: targetDate } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (nearestWM) {
      // Расширяем границы
      const newStart = nearestWM.startDate < targetDate ? nearestWM.startDate : targetDate;
      const newEnd = nearestWM.endDate > targetDate ? nearestWM.endDate : targetDate;
      await this.prisma.weeklyMenu.update({
        where: { id: nearestWM.id },
        data: { startDate: newStart, endDate: newEnd },
      });
      return this.prisma.daySelection.create({
        data: {
          weeklyMenuId: nearestWM.id,
          date: targetDate,
          utensils: 1,
          needBread: true,
          notes: 'Выбрано координатором компании',
          items: {
            create: items.map(item => ({
              dishId: item.dishId,
              quantity: item.quantity,
            })),
          },
        },
      });
    }

      return this.prisma.weeklyMenu.create({
      data: {
        userId: employeeId,
        startDate: targetDate,
        endDate: targetDate,
        status: 'DRAFT',
        selections: {
          create: {
            date: targetDate,
            utensils: 1,
            needBread: true,
            notes: 'Выбрано координатором компании',
            items: {
              create: items.map(item => ({
                dishId: item.dishId,
                quantity: item.quantity,
              })),
            },
          },
        },
      },
    });
  }

  async getCompanyAnalyticsStats(userId: string) {
    const currentUser = await this.getCompanyUserContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Аналитика доступна только активной компании');
    const companyId = currentUser.companyId!;

    const totalUsers = await this.prisma.user.count({ where: { companyId } });
    const totalOrders = await this.prisma.order.count({ where: { companyId } });
    const todayOrders = await this.prisma.order.count({
      where: {
        companyId,
        deliveryDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });
    const revenue = await this.prisma.order.aggregate({
      where: { companyId },
      _sum: { totalAmount: true },
    });

    const ordersByStatus = {
      PENDING: await this.prisma.order.count({ where: { companyId, status: 'PENDING' } }),
      CONFIRMED: await this.prisma.order.count({ where: { companyId, status: 'CONFIRMED' } }),
      PREPARING: await this.prisma.order.count({ where: { companyId, status: 'PREPARING' } }),
      READY: await this.prisma.order.count({ where: { companyId, status: 'READY' } }),
      DELIVERED: await this.prisma.order.count({ where: { companyId, status: 'DELIVERED' } }),
      CANCELLED: await this.prisma.order.count({ where: { companyId, status: 'CANCELLED' } }),
    };

    return {
      totalUsers,
      totalOrders,
      todayOrders,
      totalRevenue: revenue._sum.totalAmount || 0,
      ordersByStatus,
    };
  }

  async getCompanyUserAnalytics(userId: string, start?: string, end?: string) {
    const currentUser = await this.getCompanyUserContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Аналитика доступна только активной компании');
    const companyId = currentUser.companyId!;

    const orderDateFilter = start || end
      ? {
          deliveryDate: {
            ...(start ? { gte: new Date(start) } : {}),
            ...(end ? { lte: new Date(end) } : {}),
          },
        }
      : undefined;

    const weeklyMenuFilter = start || end
      ? {
          AND: [
            end ? { startDate: { lte: new Date(end) } } : {},
            start ? { endDate: { gte: new Date(start) } } : {},
          ],
        }
      : undefined;

    const [orders, weeklyMenus] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          ...(orderDateFilter || {}),
          companyId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              allergies: true,
              status: true,
              company: {
                select: {
                  name: true,
                  balance: true,
                  limit: true,
                  dailyLimit: true,
                },
              },
            },
          },
          items: {
            include: {
              dish: { include: { category: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.weeklyMenu.findMany({
        where: {
          ...(weeklyMenuFilter || {}),
          user: { companyId },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              allergies: true,
              status: true,
              company: {
                select: {
                  name: true,
                  balance: true,
                  limit: true,
                  dailyLimit: true,
                },
              },
            },
          },
          selections: {
            include: {
              items: {
                include: {
                  dish: { include: { category: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const userMap = new Map<string, any>();
    const ensureUser = (user: any) => {
      if (!userMap.has(user.id)) {
        userMap.set(user.id, {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          allergies: user.allergies,
          status: user.status || 'ACTIVE',
          companyName: user.company?.name || '',
          balance: user.company?.balance || 0,
          limit: user.company?.limit || 0,
          dailyLimit: user.company?.dailyLimit || 0,
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          weeklyMenuCount: 0,
          selectedDishCount: 0,
          lastOrderDate: null,
          topDishesMap: new Map<string, number>(),
          topCategoriesMap: new Map<string, number>(),
        });
      }
      return userMap.get(user.id);
    };

    for (const order of orders) {
      const analytics = ensureUser(order.user);
      analytics.totalOrders += 1;
      analytics.totalSpent += order.totalAmount || 0;
      analytics.lastOrderDate = analytics.lastOrderDate
        ? new Date(Math.max(new Date(analytics.lastOrderDate).getTime(), new Date(order.deliveryDate).getTime())).toISOString()
        : new Date(order.deliveryDate).toISOString();

      for (const item of order.items) {
        const dishName = item.dish.name;
        const categoryName = item.dish.category?.name || 'Без категории';
        analytics.topDishesMap.set(dishName, (analytics.topDishesMap.get(dishName) || 0) + item.quantity);
        analytics.topCategoriesMap.set(categoryName, (analytics.topCategoriesMap.get(categoryName) || 0) + item.quantity);
      }
    }

    for (const weeklyMenu of weeklyMenus) {
      const analytics = ensureUser(weeklyMenu.user);
      analytics.weeklyMenuCount += 1;

      for (const selection of weeklyMenu.selections) {
        for (const item of selection.items) {
          const dishName = item.dish.name;
          const categoryName = item.dish.category?.name || 'Без категории';
          analytics.selectedDishCount += item.quantity;
          analytics.topDishesMap.set(dishName, (analytics.topDishesMap.get(dishName) || 0) + item.quantity);
          analytics.topCategoriesMap.set(categoryName, (analytics.topCategoriesMap.get(categoryName) || 0) + item.quantity);
        }
      }
    }

    return Array.from(userMap.values())
      .map((item) => ({
        userId: item.userId,
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        phone: item.phone,
        allergies: item.allergies,
        status: item.status,
        companyName: item.companyName,
        balance: item.balance,
        limit: item.limit,
        dailyLimit: item.dailyLimit,
        totalOrders: item.totalOrders,
        totalSpent: item.totalSpent,
        averageOrderValue: item.totalOrders > 0 ? Math.round(item.totalSpent / item.totalOrders) : 0,
        weeklyMenuCount: item.weeklyMenuCount,
        selectedDishCount: item.selectedDishCount,
        lastOrderDate: item.lastOrderDate,
        topDishes: Array.from(item.topDishesMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity })),
        topCategories: Array.from(item.topCategoriesMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity })),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }

  async getCompanyAbcAnalysis(userId: string, start?: string, end?: string) {
    const currentUser = await this.getCompanyUserContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE'], 'Аналитика доступна только активной компании');
    const companyId = currentUser.companyId!;

    const orderDateFilter = start || end
      ? {
          deliveryDate: {
            ...(start ? { gte: new Date(start) } : {}),
            ...(end ? { lte: new Date(end) } : {}),
          },
        }
      : undefined;

    const weeklyMenuFilter = start || end
      ? {
          AND: [
            end ? { startDate: { lte: new Date(end) } } : {},
            start ? { endDate: { gte: new Date(start) } } : {},
          ],
        }
      : undefined;

    const [orderItems, selectedDishes] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: {
          order: {
            ...(orderDateFilter || {}),
            companyId,
          },
        },
        include: {
          dish: { include: { category: true } },
          order: true,
        },
      }),
      this.prisma.selectedDish.findMany({
        where: {
          daySelection: {
            weeklyMenu: {
              ...(weeklyMenuFilter || {}),
              user: { companyId },
            },
          },
        },
        include: {
          dish: { include: { category: true } },
        },
      }),
    ]);

    const classify = (items: Array<{ name: string; category: string; metric: number; quantity: number }>) => {
      const sorted = [...items].sort((a, b) => b.metric - a.metric);
      const total = sorted.reduce((sum, item) => sum + item.metric, 0);
      let cumulative = 0;
      return sorted.map((item) => {
        cumulative += item.metric;
        const cumulativeShare = total > 0 ? (cumulative / total) * 100 : 0;
        const segment = cumulativeShare <= 80 ? 'A' : cumulativeShare <= 95 ? 'B' : 'C';
        return {
          ...item,
          share: total > 0 ? Number(((item.metric / total) * 100).toFixed(2)) : 0,
          cumulativeShare: Number(cumulativeShare.toFixed(2)),
          segment,
        };
      });
    };

    const revenueMap = new Map<string, { name: string; category: string; metric: number; quantity: number }>();
    for (const item of orderItems) {
      const key = item.dishId;
      const current = revenueMap.get(key) || {
        name: item.dish.name,
        category: item.dish.category?.name || 'Без категории',
        metric: 0,
        quantity: 0,
      };
      current.metric += item.unitPrice * item.quantity;
      current.quantity += item.quantity;
      revenueMap.set(key, current);
    }

    const selectionsMap = new Map<string, { name: string; category: string; metric: number; quantity: number }>();
    for (const item of selectedDishes) {
      const key = item.dishId;
      const current = selectionsMap.get(key) || {
        name: item.dish.name,
        category: item.dish.category?.name || 'Без категории',
        metric: 0,
        quantity: 0,
      };
      current.metric += item.quantity;
      current.quantity += item.quantity;
      selectionsMap.set(key, current);
    }

    return {
      ordersABC: classify(Array.from(revenueMap.values())),
      selectionsABC: classify(Array.from(selectionsMap.values())),
    };
  }

  async exportCompanyMonthlyReport(userId: string, start?: string, end?: string) {
    const currentUser = await this.getCompanyUserContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE', 'ON_HOLD'], 'Выгрузка Excel доступна для активной компании или компании на стопе');

    if (!start || !end) {
      throw new BadRequestException('Укажите период выгрузки');
    }

    const startDate = this.parseDate(start);
    const endDate = this.parseDate(end);

    if (startDate > endDate) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания');
    }

    const selections = await this.prisma.daySelection.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        weeklyMenu: {
          user: {
            companyId: currentUser.companyId!,
          },
        },
      },
      include: {
        weeklyMenu: {
          select: {
            id: true,
            status: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                status: true,
                company: {
                  select: {
                    id: true,
                    dailyLimit: true,
                  },
                },
              },
            },
          },
        },
        items: {
          include: {
            dish: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }],
    });

    const summaryMap = new Map<string, {
      employee: string;
      email: string;
      status: string;
      days: number;
      totalAmount: number;
      companyCompensation: number;
      employeeOverLimit: number;
    }>();

    const statusLabels: Record<string, string> = {
      DRAFT: 'Черновик',
      PENDING: 'На рассмотрении',
      CONFIRMED: 'Подтверждено',
      REJECTED: 'Отклонено',
      COMPLETED: 'Выполнено',
      ACTIVE: 'Активный',
      VACATION: 'В отпуске',
      DISMISSED: 'Уволен',
    };

    const companyIds = Array.from(new Set(selections.map((selection) => selection.weeklyMenu.user.company?.id).filter(Boolean))) as string[]
    const companyPriceMaps = new Map<string, Map<string, number>>()
    await Promise.all(companyIds.map(async (companyId) => {
      companyPriceMaps.set(companyId, await this.getCompanyPriceMap(companyId))
    }))

    const dailyRows = selections.map((selection) => {
      const employee = selection.weeklyMenu.user;
      const employeeName = [employee.lastName, employee.firstName].filter(Boolean).join(' ').trim() || employee.email;
      const dailyLimit = employee.company?.dailyLimit || 0;
      const priceMap = employee.company?.id ? companyPriceMaps.get(employee.company.id) || new Map<string, number>() : new Map<string, number>()
      const totalAmount = selection.items.reduce((sum, item) => sum + (getResolvedCompanyDishPrice(item.dish, priceMap) * item.quantity), 0);
      const companyCompensation = dailyLimit > 0 ? Math.min(totalAmount, dailyLimit) : totalAmount;
      const employeeOverLimit = Math.max(totalAmount - companyCompensation, 0);
      const dishes = selection.items.map((item) => `${item.dish.name} ×${item.quantity}`).join(', ');
      const ingredients = selection.items.map((item) => `${item.dish.name}: ${item.dish.description || 'без описания'}`).join(' | ');
      const summary = summaryMap.get(employee.id) || {
        employee: employeeName,
        email: employee.email,
        status: statusLabels[employee.status || 'ACTIVE'] || employee.status || 'Активный',
        days: 0,
        totalAmount: 0,
        companyCompensation: 0,
        employeeOverLimit: 0,
      };

      summary.days += 1;
      summary.totalAmount += totalAmount;
      summary.companyCompensation += companyCompensation;
      summary.employeeOverLimit += employeeOverLimit;
      summaryMap.set(employee.id, summary);

      return {
        Дата: selection.date.toISOString().slice(0, 10),
        Сотрудник: employeeName,
        Email: employee.email,
        'Статус сотрудника': statusLabels[employee.status || 'ACTIVE'] || employee.status || 'Активный',
        'ID заявки': selection.weeklyMenu.id,
        'Статус заявки': statusLabels[selection.weeklyMenu.status] || selection.weeklyMenu.status,
        Блюда: dishes,
        Ингредиенты: ingredients,
        'Сумма заказа': totalAmount,
        'Компенсация компании': companyCompensation,
        'К удержанию из ЗП': employeeOverLimit,
        Приборы: selection.utensils,
        'Нужен хлеб': selection.needBread ? 'Да' : 'Нет',
        Комментарий: selection.notes || '',
      };
    });

    const summaryRows = Array.from(summaryMap.values())
      .sort((a, b) => a.employee.localeCompare(b.employee, 'ru'))
      .map((item) => ({
        Сотрудник: item.employee,
        Email: item.email,
        Статус: item.status,
        'Дней с заказом': item.days,
        'Общая сумма': item.totalAmount,
        'Компенсация компании': item.companyCompensation,
        'К удержанию из ЗП': item.employeeOverLimit,
      }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ Сообщение: 'Нет данных за выбранный период' }]), 'Итоги');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyRows.length ? dailyRows : [{ Сообщение: 'Нет данных за выбранный период' }]), 'По дням');

    return {
      buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
      fileName: this.buildMonthlyReportFileName(currentUser.company?.name || 'company', start, end),
    };
  }

  
  async exportCompanyReconciliationPdf(userId: string, start: string, end: string, res: any) {
    const data = await this.getCompanyReconciliation(userId, start, end);
    const { renderReconciliationPdf } = require('../billing/reconciliation-pdf');
    const buffer = await renderReconciliationPdf(data);
    const filename = `sverka_${start}_${end}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

async getCompanyReconciliation(userId: string, start: string, end: string) {
    const currentUser = await this.getCompanyUserContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE', 'ON_HOLD'], 'Сверка доступна только активной или остановленной компании');

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Укажите корректный период');
    }

    const normalizedStart = new Date(startDate.toISOString().slice(0, 10));
    const normalizedEnd = new Date(endDate.toISOString().slice(0, 10));
    if (normalizedStart > normalizedEnd) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания');
    }

    const diffDays = Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / 86400000) + 1;
    if (diffDays > 62) {
      throw new BadRequestException('Период сверки не должен превышать 2 месяца');
    }

    const companyId = currentUser.companyId!;
    const selections = await this.prisma.daySelection.findMany({
      where: {
        date: { gte: normalizedStart, lte: normalizedEnd },
        weeklyMenu: {
          user: { companyId },
        },
      },
      include: {
        items: { include: { dish: true } },
        weeklyMenu: { select: { user: { select: { id: true } } } },
      },
    });

    const closings = await this.prisma.deliveryClosing.findMany({
      where: {
        companyId,
        date: { gte: normalizedStart, lte: normalizedEnd },
      },
      orderBy: { date: 'asc' },
    });

    const companyPriceMap = await this.getCompanyPriceMap(companyId)

    const closingsByDate = new Map(closings.map(closing => [closing.date.toISOString().slice(0, 10), closing]));
    const rowsMap = new Map<string, any>();

    selections.forEach(selection => {
      const key = selection.date.toISOString().slice(0, 10);
      if (!rowsMap.has(key)) {
        rowsMap.set(key, {
          date: key,
          selectionsCount: 0,
          usersSet: new Set<string>(),
          portions: 0,
          subtotal: 0,
          dishes: new Map<string, { dishName: string; categoryName: string; quantity: number; total: number }>(),
        });
      }
      const row = rowsMap.get(key);
      row.selectionsCount += 1;
      row.usersSet.add(selection.weeklyMenu.user.id);
      selection.items.forEach(item => {
        const resolvedPrice = getResolvedCompanyDishPrice(item.dish, companyPriceMap)
        row.portions += item.quantity;
        row.subtotal += (item.quantity || 0) * resolvedPrice;
        const dishKey = item.dish.id;
        if (!row.dishes.has(dishKey)) {
          row.dishes.set(dishKey, {
            dishName: item.dish.name,

            quantity: 0,
            total: 0,
          });
        }
        const d = row.dishes.get(dishKey);
        d.quantity += item.quantity;
        d.total += (item.quantity || 0) * resolvedPrice;
      });
    });

    const rows = Array.from(rowsMap.values()).map((row: any) => {
      const closing = closingsByDate.get(row.date);
      const deviationAmount = closing?.deviationAmount || 0;
      return {
        date: row.date,
        selectionsCount: row.selectionsCount,
        usersCount: row.usersSet.size,
        portions: row.portions,
        subtotal: row.subtotal,
        dishes: Array.from(row.dishes.values()).sort((a: any, b: any) => a.dishName.localeCompare(b.dishName)),
        deliveryStatus: closing?.status || '',
        deviationAmount,
        deviationComment: closing?.deviationComment || '',
        managerComment: closing?.managerComment || '',
        total: Math.max(0, row.subtotal - deviationAmount),
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    const summary = rows.reduce((acc, row) => {
      acc.daysWithOrders += 1;
      if (row.deliveryStatus) acc.closedDays += 1;
      else acc.openDays += 1;
      if (row.deliveryStatus === 'DELIVERED_WITH_DEVIATION') acc.daysWithDeviation += 1;
      acc.subtotal += row.subtotal;
      acc.deviationTotal += row.deviationAmount;
      acc.total += row.total;
      return acc;
    }, {
      daysWithOrders: 0,
      closedDays: 0,
      openDays: 0,
      daysWithDeviation: 0,
      subtotal: 0,
      deviationTotal: 0,
      total: 0,
    });

    return {
      company: {
        id: currentUser.company!.id,
        name: currentUser.company!.name,
        billingAddress: currentUser.company!.billingAddress || null,
        billingDetails: currentUser.company!.billingDetails || null,
      },
      period: {
        start: normalizedStart.toISOString().slice(0, 10),
        end: normalizedEnd.toISOString().slice(0, 10),
        days: diffDays,
      },
      summary,
      rows,
    };
  }

  async getCompanyInvoices(userId: string) {
    const currentUser = await this.getCompanyUserContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE', 'ON_HOLD'], 'Счета доступны только активной или остановленной компании');
    return this.prisma.invoice.findMany({
      where: { companyId: currentUser.companyId! },
      include: {
        lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestCompanyPrepaymentInvoice(userId: string, data: { amount: number; comment?: string }) {
    return this.createCompanyPrepaymentInvoiceRecord(userId, data)
  }

  async requestCompanyPrepaymentRobokassa(userId: string, data: { amount: number; comment?: string }) {
    const invoice = await this.createCompanyPrepaymentInvoiceRecord(userId, data)
    return {
      invoice,
      paymentUrl: this.buildRobokassaPaymentUrl(invoice),
    }
  }

  async handleRobokassaResult(payload: Record<string, unknown>) {
    const config = this.getRobokassaConfig()
    const outSum = normalizeText(payload.OutSum || payload.outSum)
    const invId = normalizeText(payload.InvId || payload.invId)
    const signatureValue = normalizeText(payload.SignatureValue || payload.signatureValue).toUpperCase()
    const invoiceId = normalizeText(payload.Shp_invoiceId || payload.shp_invoiceId)

    if (!outSum || !invId || !signatureValue || !invoiceId) {
      throw new BadRequestException('Недостаточно параметров Robokassa')
    }

    const shpParams = this.getRobokassaShpParams(invoiceId)
    const expectedSignature = this.buildRobokassaSignature([
      outSum,
      invId,
      config.password2,
      ...this.getSortedShpSignatureParts(shpParams),
    ])

    if (expectedSignature !== signatureValue) {
      throw new ForbiddenException('Некорректная подпись Robokassa')
    }

    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) {
      throw new NotFoundException('Счет не найден')
    }

    if (this.formatRobokassaAmount(invoice.total) !== this.formatRobokassaAmount(Number(outSum))) {
      throw new BadRequestException('Сумма платежа не совпадает со счетом')
    }

    await this.applyPrepaymentInvoicePayment(invoiceId)
    return `OK${invId}`
  }

  async getCompanyInvoicePdf(userId: string, invoiceId: string) {
    const currentUser = await this.getCompanyUserContext(userId);
    this.ensureCompanyStatusAllowed(currentUser.company?.status, ['ACTIVE', 'ON_HOLD'], 'Скачивание счетов доступно только активной или остановленной компании');
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId: currentUser.companyId!,
      },
      include: {
        lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Счет не найден');
    }

    return {
      invoice,
      buffer: await renderInvoicePdf(invoice),
    };
  }

  async cancelWeeklyMenuRequest(coordinatorUserId: string, weeklyMenuId: string) {
    const context = await this.getCoordinatorContext(coordinatorUserId);
    this.ensureCompanyStatusAllowed(context.company?.status, ['ACTIVE'], 'Отмена заявки доступна только активной компании');

    // Ensure the weekly menu belongs to this company
    const menu = await this.prisma.weeklyMenu.findUnique({
      where: { id: weeklyMenuId },
      include: {
        user: { select: { companyId: true } },
        selections: {
          include: {
            items: { include: { dish: { select: { id: true, name: true, price: true, categoryId: true } } } }
          }
        }
      }
    });

    if (!menu) throw new NotFoundException('Заявка не найдена');
    if (menu.user.companyId !== context.companyId) {
      throw new BadRequestException('Эта заявка не принадлежит вашей компании');
    }

    // You can only cancel PAID or DEFERRED menus
    if (menu.status !== 'PAID' && menu.status !== 'DEFERRED') {
      throw new BadRequestException('Можно отменить только оплаченные заявки или с отсрочкой платежа');
    }

    console.log('[CANCEL] menuId:', weeklyMenuId, 'companyId:', context.companyId, 'name:', context.company?.name, 'status:', menu.status, 'company balance:', (await this.prisma.company.findUnique({ where: { id: context.companyId }, select: { balance: true } }))?.balance);

    console.log('[CANCEL] calculating refund...');
    // Calculate total to refund
    const priceMap = await getCompanyCategoryPriceMap(this.prisma, context.companyId);
    let totalAmount = 0;
    for (const sel of menu.selections) {
      for (const item of sel.items) {
        const price = getResolvedCompanyDishPrice(item.dish, priceMap);
        totalAmount += price * item.quantity;
        console.log('[CANCEL] dish:', item.dish?.name, 'basePrice:', item.dish?.price, 'resolvedPrice:', price, 'qty:', item.quantity);
      }
    }
    console.log('[CANCEL] totalAmount CALCULATED:', totalAmount);

    // If PAID — refund to balance, if DEFERRED — subtract from credit
    await this.prisma.$transaction(async (tx) => {
      if (menu.status === 'PAID') {
        await tx.company.update({
          where: { id: context.companyId },
          data: { balance: { increment: totalAmount } }
        });
      } else if (menu.status === 'DEFERRED') {
        // For deferred, deduct from creditBalance (assuming it was promised)
        await tx.company.update({
          where: { id: context.companyId },
          data: { creditBalance: { decrement: totalAmount } }
        });
      }

      await tx.weeklyMenu.update({
        where: { id: weeklyMenuId },
        data: { status: 'DRAFT' }
      });

      // Find and cancel associated order if any
      const order = await tx.order.findFirst({
        where: { comment: 'Списание заявки на меню', userId: menu.userId, status: 'PAID' },
        orderBy: { createdAt: 'desc' }
      });
      if (order) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' }
        });
      }
    });

    return {
      success: true,
      message: menu.status === 'PAID'
        ? 'Заявка отменена. Средства возвращены на баланс'
        : 'Заявка отменена. Отсрочка аннулирована',
      refundedAmount: totalAmount
    };
  }

}
