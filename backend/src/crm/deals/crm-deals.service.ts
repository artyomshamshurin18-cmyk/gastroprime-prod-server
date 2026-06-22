import { generateAccountNumber } from "../../common/utils/account-number";
import { TelegramService } from "../../telegram/telegram.service";
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

const STAGE_ORDER = ['LEAD', 'MODERATION', 'TASTING_SCHEDULED', 'TASTING_DONE', 'NEGOTIATION', 'QUOTE_SENT', 'CONTRACT', 'DEFERRED', 'LOST', 'CONTRACT_SIGNED'];

@Injectable()
export class CrmDealsService {
  constructor(private prisma: PrismaService, private telegram: TelegramService) {}

  private async ensureCanManage(user: any): Promise<boolean> {
    if (["SUPERADMIN", "ADMIN", "MANAGER", "CRM_OPERATOR"].includes(user.role)) return true;
    throw new ForbiddenException('Только ADMIN или MANAGER могут управлять сделками');
  }

  async findAll(user: any, filters: {
    stage?: string;
    managerId?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    await this.ensureCanManage(user);

    const where: any = {};
    if (filters.stage && filters.stage !== 'ALL') where.stage = filters.stage;
    if (filters.managerId) where.managerId = filters.managerId;
    if (filters.search) {
      where.OR = [
        { company: { name: { contains: filters.search, mode: 'insensitive' } } },
        { company: { contactPerson: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // MANAGER sees only own deals
    if (user.role === 'MANAGER') {
      where.managerId = user.userId;
    }

    const [deals, total] = await Promise.all([
      this.prisma.crmDeal.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, contactPerson: true, address: true, status: true, workEmail: true, peopleCount: true } },
          manager: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: { select: { logs: true } },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.crmDeal.count({ where }),
    ]);

    return { deals, total, page: filters.page, limit: filters.limit };
  }

  async findOne(id: string) {
    const deal = await this.prisma.crmDeal.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true, name: true, contactPerson: true, address: true,
            workEmail: true, peopleCount: true, status: true, balance: true,
            phone: true, contactPhone: true, creditBalance: true, notes: true,
          },
        },
        manager: { select: { id: true, email: true, firstName: true, lastName: true } },
        logs: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });
    if (!deal) throw new NotFoundException('Сделка не найдена');
    return deal;
  }

  async create(user: any, data: {
    companyId?: string;
    companyName?: string;
    deliveryAddress?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    employeesCount?: number;
    managerId?: string;
    source?: string;
    notes?: string;
    estimatedAmount?: number;
    minPrice?: number;
    maxPrice?: number;
    workDays?: number;
  }) {
    await this.ensureCanManage(user);

    let companyId = data.companyId;

    // If no companyId but companyName provided, create company inline
    if (!companyId && data.companyName) {
      let companyNotes = '';
      if (data.notes) companyNotes = data.notes;
      if (data.phone) {
        companyNotes = (companyNotes ? companyNotes + '\n' : '') + `Телефон: ${data.phone}`;
      }

      const company = await this.prisma.company.create({
        data: {
          name: data.companyName,
          address: data.deliveryAddress || '',
          contactPerson: data.contactPerson || null,
          workEmail: data.email || null,
          peopleCount: String(data.employeesCount) || null,
          notes: companyNotes || null,
          status: 'ACTIVE',
          accountNumber: generateAccountNumber(),
        },
      });
      companyId = company.id;
    }

    if (!companyId) {
      throw new BadRequestException('Необходимо указать companyId или companyName');
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Компания не найдена');

    const managerId = data.managerId || user.userId;
    const deal = await this.prisma.crmDeal.create({
      data: {
        companyId,
        managerId,
        source: data.source || 'COLD',
        notes: data.notes,
        estimatedAmount: data.estimatedAmount || 0,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        workDays: data.workDays,
        stage: 'LEAD',
        probability: 10,
      },
    });

    // Auto-log creation
    await this.prisma.crmDealLog.create({
      data: {
        dealId: deal.id,
        userId: user.userId,
        action: 'OTHER',
        comment: 'Сделка создана',
      },
    });

    // Telegram notification: new lead
    try {
      const msg = [
        '<b>\u{1F4E5} Новый лид!</b>',
        '',
        '<b>Компания:</b> ' + (data.companyName || '\u2014'),
        '<b>Менеджер:</b> ' + (user.firstName || user.email || '\u2014'),
        '<b>Сумма:</b> ' + (data.estimatedAmount || 0).toLocaleString() + ' \u20BD',
        '<b>Источник:</b> ' + (data.source || '\u2014'),
        data.notes ? '<b>Заметки:</b> ' + data.notes : '',
      ].join('\n');
      await this.telegram.sendMessage(msg);
    } catch (e) {
      console.error('Telegram notify new lead failed:', e.message);
    }

    return deal;
  }

  async update(id: string, userId: string, data: {
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
    const deal = await this.prisma.crmDeal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException('Сделка не найдена');

    const updateData: any = {};
    const logEntries: { action: string; comment?: string; oldValue?: string; newValue?: string }[] = [];

    if (data.stage && data.stage !== deal.stage) {
      if (!STAGE_ORDER.includes(data.stage)) {
        throw new BadRequestException(`Недопустимый этап: ${data.stage}`);
      }
      updateData.stage = data.stage;
      logEntries.push({
        action: 'STAGE_CHANGE',
        oldValue: deal.stage,
        newValue: data.stage,
        comment: `Этап изменён: ${deal.stage} → ${data.stage}`,
      });

      if (data.stage === 'CONTRACT') {
        updateData.probability = 90;
      }
      if (data.stage === 'CONTRACT_SIGNED') {
        updateData.probability = 100;
        updateData.closedAt = new Date();
        await this.prisma.company.update({
          where: { id: deal.companyId },
          data: { status: 'ACTIVE' },
        });
      }
    }

    if (data.probability !== undefined && data.probability !== deal.probability) {
      updateData.probability = data.probability;
    }

    if (data.nextContactDate !== undefined) {
      updateData.nextContactDate = data.nextContactDate ? new Date(data.nextContactDate) : null;
    }

    if (data.notes !== undefined && data.notes !== deal.notes) {
      updateData.notes = data.notes;
      logEntries.push({ action: 'NOTE', comment: 'Обновлены заметки' });
    }

    if (data.estimatedAmount !== undefined) {
      updateData.estimatedAmount = data.estimatedAmount;
    }

    if (data.minPrice !== undefined) {
      updateData.minPrice = data.minPrice;
    }

    if (data.maxPrice !== undefined) {
      updateData.maxPrice = data.maxPrice;
    }

    if (data.workDays !== undefined) {
      updateData.workDays = data.workDays;
    }

    if (data.managerId !== undefined && data.managerId !== deal.managerId) {
      updateData.managerId = data.managerId;
      logEntries.push({ action: 'OTHER', comment: `Назначен новый менеджер` });
    }

    const updated = await this.prisma.crmDeal.update({ where: { id }, data: updateData });

    // Telegram notification on stage change
    if (data.stage && data.stage !== deal.stage) {
      try {
        const dealCompany = await this.prisma.company.findUnique({ where: { id: deal.companyId }, select: { name: true } });
        const msg = [
          '<b>🔄 Статус лида изменён</b>',
          '',
          '<b>Компания:</b> ' + (dealCompany?.name || '—'),
          '<b>Было:</b> ' + (deal.stage || '—'),
          '<b>Стало:</b> ' + data.stage,
        ].join('\n');
        await this.telegram.sendMessage(msg);
      } catch (e) {
        console.error('Telegram notify stage change failed:', e.message);
      }
    }
    for (const log of logEntries) {
      try {
        await this.prisma.crmDealLog.create({
          data: { dealId: id, userId, action: log.action, comment: log.comment, oldValue: log.oldValue, newValue: log.newValue },
        });
      } catch (e) {
        console.error('Failed to create deal log:', e.message);
      }
    }

    return updated;
  }

  async addLog(dealId: string, userId: string, data: {
    action: string;
    comment?: string;
    oldValue?: string;
    newValue?: string;
  }) {
    const deal = await this.prisma.crmDeal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Сделка не найдена');

    return this.prisma.crmDealLog.create({
      data: {
        dealId,
        userId,
        action: data.action,
        comment: data.comment,
        oldValue: data.oldValue,
        newValue: data.newValue,
      },
    });
  }

  async getLogs(dealId: string) {
    return this.prisma.crmDealLog.findMany({
      where: { dealId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateCompany(dealId: string, data: {
    contactPerson?: string;
    address?: string;
    workEmail?: string;
    peopleCount?: number;
    phone?: string;
  }) {
    // Get deal to find companyId
    const deal = await this.prisma.crmDeal.findUnique({
      where: { id: dealId },
      select: { companyId: true },
    });
    if (!deal) throw new NotFoundException('Deal not found');

    const updateData: any = {};
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.workEmail !== undefined) updateData.workEmail = data.workEmail;
    if (data.peopleCount !== undefined) updateData.peopleCount = data.peopleCount;
    if (data.phone !== undefined) updateData.phone = data.phone;

    const company = await this.prisma.company.update({
      where: { id: deal.companyId },
      data: updateData,
    });
    return company;
  }

  async remove(id: string) {
    // If already deleted, just return success (race condition / stale UI)
    const deal = await this.prisma.crmDeal.findUnique({ where: { id } });
    if (!deal) return { success: true };
    // Delete log entries first to avoid FK constraint violation
    await this.prisma.crmDealLog.deleteMany({ where: { dealId: id } });
    await this.prisma.crmDeal.delete({ where: { id } });
    return { success: true };
  }
}
