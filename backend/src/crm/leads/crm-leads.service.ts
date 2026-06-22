import { generateAccountNumber } from "../../common/utils/account-number";
import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CrmLeadsService {
  constructor(private prisma: PrismaService) {}

  private async ensureCanManage(user: any): Promise<boolean> {
    if (["SUPERADMIN", "ADMIN", "MANAGER", "CRM_OPERATOR"].includes(user.role)) return true;
    throw new ForbiddenException('Только ADMIN или MANAGER могут управлять лидами');
  }

  async create(user: any, data: {
    companyName: string;
    deliveryAddress?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    employeesCount?: number;
    avgOrder?: number;
    minPrice?: number;
    maxPrice?: number;
    workDays?: number;
    status?: string;
    source?: string;
    notes?: string;
    managerId?: string;
  }) {
    await this.ensureCanManage(user);

    if (!data.companyName || data.companyName.trim() === '') {
      throw new BadRequestException('Название компании обязательно');
    }

    // Create company (using Prisma - Company model exists)
    const company = await this.prisma.company.create({
      data: {
        name: data.companyName,
        address: data.deliveryAddress || '',
        contactPerson: data.contactPerson || null,
        workEmail: data.email || null,
        peopleCount: String(data.employeesCount) || null,
        phone: data.phone || null,
        notes: data.notes || null,
        status: 'CRM_LEAD',
        accountNumber: generateAccountNumber(),
      },
    });

    const managerId = data.managerId || user.userId;

    // Create deal using raw SQL (CrmDeal model not in Prisma schema)
    const dealId = crypto.randomUUID();
    const now = new Date();
    
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CrmDeal" (id, "companyId", "managerId", stage, probability, source, notes, "estimatedAmount", "minPrice", "maxPrice", "workDays", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'LEAD', 10, $4, $5, $6, $7, $8, $9, $10, $10)`,
      dealId,
      company.id,
      managerId,
      data.source || 'COLD',
      data.notes || null,
      data.avgOrder || 0,
      data.minPrice || null,
      data.maxPrice || null,
      data.workDays || null,
      now
    );

    // Auto-log creation
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CrmDealLog" (id, "dealId", "userId", action, comment, "createdAt")
       VALUES ($1, $2, $3, 'OTHER', 'Лид создан через форму создания', $4)`,
      crypto.randomUUID(),
      dealId,
      user.userId,
      now
    );

    // Fetch the created deal with company info
    const deal = await this.prisma.$queryRawUnsafe(
      `SELECT d.*, 
              row_to_json(c.*) as company,
              row_to_json(u.*) as manager
       FROM "CrmDeal" d
       JOIN "Company" c ON c.id = d."companyId"
       JOIN "User" u ON u.id = d."managerId"
       WHERE d.id = $1`,
      dealId
    );

    return Array.isArray(deal) ? deal[0] : deal;
  }

  async findAll(user: any, filters: {
    search?: string;
    source?: string;
    page: number;
    limit: number;
  }) {
    await this.ensureCanManage(user);

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(`(c.name ILIKE $${paramIdx} OR c."contactPerson" ILIKE $${paramIdx})`);
      params.push(searchTerm);
      paramIdx++;
    }
    if (filters.source && filters.source !== 'ALL') {
      conditions.push(`d.source = $${paramIdx}`);
      params.push(filters.source);
      paramIdx++;
    }

    // MANAGER sees only own leads
    if (user.role === 'MANAGER') {
      conditions.push(`d."managerId" = $${paramIdx}`);
      params.push(user.userId);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count total
    const countResult = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM "CrmDeal" d JOIN "Company" c ON c.id = d."companyId" ${whereClause}`,
      ...params
    );
    const total = Number((countResult as any[])[0]?.total || 0);

    // Fetch page
    const offset = (filters.page - 1) * filters.limit;
    const deals = await this.prisma.$queryRawUnsafe(
      `SELECT d.*, 
              json_build_object(
                'id', c.id, 'name', c.name, 'contactPerson', c."contactPerson",
                'address', c.address, 'workEmail', c."workEmail",
                'peopleCount', c."peopleCount", 'phone', c.phone, 'contactPhone', c."contactPhone", 'status', c.status, 'notes', c.notes
              ) as company,
              json_build_object(
                'id', u.id, 'email', u.email, 'firstName', u."firstName", 'lastName', u."lastName"
              ) as manager
       FROM "CrmDeal" d
       JOIN "Company" c ON c.id = d."companyId"
       JOIN "User" u ON u.id = d."managerId"
       ${whereClause}
       ORDER BY d."updatedAt" DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...params,
      filters.limit,
      offset
    );

    return { deals: deals as any[], total, page: filters.page, limit: filters.limit };
  }
}
