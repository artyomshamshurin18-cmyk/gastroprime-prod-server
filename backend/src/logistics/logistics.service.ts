import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoutePoints(routeName: string, date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const points = await this.prisma.logisticsPoint.findMany({
      where: {
        routeName: routeName,
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return { routeName, date, points };
  }

  async getDriverPoints(driverId: string, date: string) {
    console.log('[DEB_LOG] getDriverPoints driverId=' + (driverId||'?').slice(0,8) + ' date=' + date);
    const targetDate = new Date(date);
    if (!date || Number.isNaN(targetDate.getTime())) {
      return { driverId, date, points: [] };
    }
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const points = await this.prisma.logisticsPoint.findMany({
      where: {
        driverId: driverId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return { driverId, date, points };
  }

  async createPoint(data: any) {
    return this.prisma.logisticsPoint.create({
      data: {
        companyId: data.companyId || null,
        driverId: data.driverId || null,
        routeName: data.routeName || '',
        date: new Date(data.date),
        type: data.type || 'custom',
        address: data.address || '',
        contactPerson: data.contactPerson || null,
        contactPhone: data.contactPhone || null,
        timeWindowStart: data.timeWindowStart || null,
        timeWindowEnd: data.timeWindowEnd || null,
        note: data.note || null,
        fileUrl: data.fileUrl || null,
        status: 'pending',
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  async updatePoint(id: string, data: any) {
    const existing = await this.prisma.logisticsPoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Point not found');

    const updateData: any = {};
    if (data.companyId !== undefined) updateData.companyId = data.companyId;
    if (data.driverId !== undefined) updateData.driverId = data.driverId;
    if (data.routeName !== undefined) updateData.routeName = data.routeName;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.timeWindowStart !== undefined) updateData.timeWindowStart = data.timeWindowStart;
    if (data.timeWindowEnd !== undefined) updateData.timeWindowEnd = data.timeWindowEnd;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    return this.prisma.logisticsPoint.update({
      where: { id },
      data: updateData,
    });
  }

  async deletePoint(id: string) {
    const existing = await this.prisma.logisticsPoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Point not found');
    await this.prisma.logisticsPoint.delete({ where: { id } });
  }

  async updatePointStatus(id: string, status: string) {
    const existing = await this.prisma.logisticsPoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Point not found');
    if (!['pending', 'done', 'skipped'].includes(status)) {
      throw new Error('Invalid status. Must be: pending, done, or skipped');
    }
    return this.prisma.logisticsPoint.update({
      where: { id },
      data: { status },
    });
  }
}
