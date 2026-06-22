import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DriverService {
  constructor(private prisma: PrismaService) {}

  async getRoutes(driverId: string, date: string) {
    const targetDate = new Date(date + 'T00:00:00Z');
    if (!date || Number.isNaN(targetDate.getTime())) {
      throw new ForbiddenException('Укажите корректную дату');
    }

    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
      select: { routeName: true },
    });

    if (!driver || !driver.routeName) {
      return { date, driverId, companies: [] };
    }

    const routeName = driver.routeName;

    const selections = await this.prisma.daySelection.findMany({
      where: {
        date: targetDate,
        weeklyMenu: {
          user: {
            company: { routeName },
          },
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'COMPLETED'] },
        },
      },
      include: {
        weeklyMenu: {
          select: {
            status: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                phone: true,
                company: true,
              },
            },
          },
        },
        items: {
          include: {
            dish: {
              include: { category: true },
            },
          },
        },
      },
    });

    const companyDataMap = new Map<string, any>();
    for (const sel of selections) {
      const user = sel.weeklyMenu.user;
      const company = user.company;
      const cid = company?.id || ('no-company-' + user.id);

      if (!companyDataMap.has(cid)) {
        companyDataMap.set(cid, {
          companyId: cid,
          companyName: company?.name || 'Неизвестно',
          contactPerson: company?.contactPerson || '',
          contactPhone: company?.contactPhone || '',
          address: company?.address || '',
          entryConditions: company?.entryConditions || '',
          routeName: company?.routeName || '',
          deliveryTime: company?.deliveryTime || '',
          dishes: new Map<string, any>(),
          totalPortions: 0,
          utensilsTotal: 0,
          needBreadCount: 0,
          employees: [],
        });
      }

      const cd = companyDataMap.get(cid);
      cd.totalPortions += sel.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      cd.utensilsTotal += sel.utensils || 0;
      if (sel.needBread) cd.needBreadCount++;

      for (const item of sel.items) {
        const key = item.dish.name;
        if (cd.dishes.has(key)) {
          cd.dishes.get(key)!.quantity += item.quantity;
        } else {
          cd.dishes.set(key, {
            name: item.dish.name,
            categoryName: item.dish.category?.name || 'Без категории',
            quantity: item.quantity,
          });
        }
      }

      const existingEmp = cd.employees.find((e: any) => e.userId === user.id);
      if (!existingEmp) {
        cd.employees.push({
          userId: user.id,
          userName: user.firstName || user.email,
          email: user.email,
          phones: user.phone || '',
          dishes: sel.items.map((item: any) => ({
            name: item.dish.name,
            categoryName: item.dish.category?.name || 'Без категории',
            quantity: item.quantity,
          })),
        });
      } else {
        for (const item of sel.items) {
          const existingItem = existingEmp.dishes.find((d: any) => d.name === item.dish.name);
          if (existingItem) {
            existingItem.quantity += item.quantity;
          } else {
            existingEmp.dishes.push({
              name: item.dish.name,
              categoryName: item.dish.category?.name || 'Без категории',
              quantity: item.quantity,
            });
          }
        }
      }
    }

    // Podgruzhaem zametki voditelya
    const driverRouteNotes = await this.prisma.driverRouteCompany.findMany({
      where: {
        companyId: { in: Array.from(companyDataMap.keys()) },
        driverRoute: { driverId, date: targetDate },
      },
      select: { companyId: true, driverNote: true },
    });
    const noteMap = new Map(driverRouteNotes.map(n => [n.companyId, n.driverNote]));

    const enrichedCompanies = Array.from(companyDataMap.values()).map((cd: any) => ({
      companyId: cd.companyId,
      companyName: cd.companyName,
      notes: noteMap.get(cd.companyId) || '',
      contactPerson: cd.contactPerson,
      contactPhone: cd.contactPhone,
      address: cd.address,
      entryConditions: cd.entryConditions,
      routeName: cd.routeName,
      deliveryTime: cd.deliveryTime,
      deliveryStatus: 'PENDING',
      statusChangedAt: null,
      arrivedAt: null,
      unloadedAt: null,
      departedAt: null,
      driverNote: '',
      sortOrder: 0,
      dishes: Array.from(cd.dishes.values()),
      totalPortions: cd.totalPortions,
      utensilsTotal: cd.utensilsTotal,
      needBreadCount: cd.needBreadCount,
      employees: cd.employees,
    }));

    // Добавляем точки из LogisticsPoint для этого водителя
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    const logisticsPoints = driver.routeName ? await this.prisma.logisticsPoint.findMany({
      where: {
        routeName: driver.routeName,
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { sortOrder: 'asc' },
    }) : [];

    return {
      date,
      driverId,
      companies: enrichedCompanies,
      logisticsPoints,
    };
  }

  async updateDeliveryStatus(driverId: string, companyId: string, date: string, deliveryStatus: string, driverNote?: string) {
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
      select: { routeName: true },
    });
    if (!driver || !driver.routeName) throw new ForbiddenException('У вас не назначен маршрут');

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, routeName: driver.routeName },
    });
    if (!company) throw new ForbiddenException('Компания не найдена в вашем маршруте');

    const targetDate = new Date(date + 'T00:00:00Z');
    let driverRoute = await this.prisma.driverRoute.findUnique({
      where: { driverId_date: { driverId, date: targetDate } },
    });
    if (!driverRoute) {
      driverRoute = await this.prisma.driverRoute.create({ data: { driverId, date: targetDate } });
    }

    const now = new Date();
    const updateData: Record<string, any> = { deliveryStatus, statusChangedAt: now };
    if (driverNote !== undefined) updateData.driverNote = driverNote;

    switch (deliveryStatus) {
      case 'DEPARTED': updateData.departedAt = now; break;
      case 'ARRIVED': updateData.arrivedAt = now; break;
      case 'UNLOADING': updateData.arrivedAt = now; break;
      case 'COMPLETED': updateData.arrivedAt = now; updateData.unloadedAt = now; updateData.departedAt = now; break;
    }

    return this.prisma.driverRouteCompany.upsert({
      where: { driverRouteId_companyId: { driverRouteId: driverRoute.id, companyId } },
      create: { driverRouteId: driverRoute.id, companyId, ...updateData },
      update: updateData,
    });
  }

  async updateNote(driverId: string, companyId: string, date: string, driverNote: string) {
    console.log('[DEB_NOTE] updateNote driver=' + driverId.slice(0,8) + ' company=' + companyId.slice(0,8) + ' date=' + date + ' note="' + (driverNote||'').slice(0,30) + '"');
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
      select: { routeName: true },
    });
    if (!driver || !driver.routeName) throw new ForbiddenException('У вас не назначен маршрут');

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, routeName: driver.routeName },
    });
    if (!company) throw new ForbiddenException('Компания не найдена в вашем маршруте');

    const targetDate = new Date(date + 'T00:00:00Z');
    let driverRoute = await this.prisma.driverRoute.findUnique({
      where: { driverId_date: { driverId, date: targetDate } },
    });
    if (!driverRoute) {
      driverRoute = await this.prisma.driverRoute.create({ data: { driverId, date: targetDate } });
    }

    return this.prisma.driverRouteCompany.upsert({
      where: { driverRouteId_companyId: { driverRouteId: driverRoute.id, companyId } },
      create: { driverRouteId: driverRoute.id, companyId, driverNote },
      update: { driverNote },
    });
  }
}
