import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { getCompanyCategoryPriceMap, getResolvedCompanyDishPrice } from '../common/company-pricing';

@Injectable()
export class WeeklyMenuService {
  constructor(private prisma: PrismaService) {}

  private async applyCompanyPricesToMenus(userId: string, menus: any[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    })

    const priceMap = await getCompanyCategoryPriceMap(this.prisma, user?.companyId)

    return menus.map((menu) => ({
      ...menu,
      selections: (menu.selections || []).map((selection: any) => ({
        ...selection,
        items: (selection.items || []).map((item: any) => ({
          ...item,
          dish: {
            ...item.dish,
            price: getResolvedCompanyDishPrice(item.dish, priceMap),
          },
        })),
      })),
    }))
  }

  private async ensureActiveCompanyAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        company: {
          select: {
            status: true,
          },
        },
      },
    });

    if ((user?.status || 'ACTIVE') === 'DISMISSED') {
      throw new BadRequestException('Учетная запись сотрудника отключена');
    }

    if ((user?.company?.status || 'ACTIVE') !== 'ACTIVE') {
      throw new BadRequestException('Планирование меню доступно только активной компании');
    }
  }

  private parseDate(value: string, label: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return date;
  }

  private toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private normalizeDayDate(value: string) {
    return this.parseDate(value, 'selection date');
  }

  async getMyWeeklyMenu(userId: string, start: string, end: string) {
    await this.ensureActiveCompanyAccess(userId);
    const include = {
      selections: {
        include: {
          items: {
            include: { dish: { include: { category: true } } }
          }
        },
        orderBy: { date: 'asc' as const }
      }
    };

    const normalizedStart = typeof start === 'string' ? start.trim() : '';
    const normalizedEnd = typeof end === 'string' ? end.trim() : '';

    if (!normalizedStart || !normalizedEnd || normalizedStart === 'Invalid Date' || normalizedEnd === 'Invalid Date') {
      const menus = await this.prisma.weeklyMenu.findMany({
        where: { userId },
        include,
        orderBy: { createdAt: 'desc' },
      });

      return this.applyCompanyPricesToMenus(userId, menus)
    }

    const startDate = this.parseDate(normalizedStart, 'start date');
    const endDate = this.parseDate(normalizedEnd, 'end date');

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const menus = await this.prisma.weeklyMenu.findMany({
      where: {
        userId,
        startDate: { gte: startDate },
        endDate: { lte: endDate },
      },
      include,
      orderBy: { createdAt: 'desc' },
    });

    return this.applyCompanyPricesToMenus(userId, menus)
  }

  async createOrUpdate(userId: string, data: {
    startDate: string;
    endDate: string;
    selections: {
      date: string;
      dishIds?: string[];
      items?: { dishId: string; quantity: number }[];
      utensils: number;
      needBread: boolean;
      notes?: string;
    }[];
  }) {
    await this.ensureActiveCompanyAccess(userId);
    const startDate = this.parseDate(data.startDate, 'start date');
    const endDate = this.parseDate(data.endDate, 'end date');

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (!data.selections?.length) {
      throw new BadRequestException('Select at least one day');
    }

    const normalizedSelections = data.selections.map(sel => {
      const selectionDate = this.parseDate(sel.date, 'selection date');

      if (selectionDate < startDate || selectionDate > endDate) {
        throw new BadRequestException('Selection date is outside the chosen period');
      }

      const items = sel.items?.length
        ? sel.items
        : (sel.dishIds || []).map(dishId => ({ dishId, quantity: 1 }));

      if (!items.length) {
        throw new BadRequestException('Each selected day must contain at least one dish');
      }

      const uniqueDishIds = new Set(items.map(item => item.dishId));
      if (uniqueDishIds.size !== items.length) {
        throw new BadRequestException('Duplicate dishes in weekly menu selection are not allowed');
      }

      items.forEach(item => {
        if (!item.quantity || item.quantity < 1) {
          throw new BadRequestException('Dish quantity must be at least 1');
        }
      });

      return {
        ...sel,
        date: selectionDate,
        items,
      };
    });

    const dailyMenus = await this.prisma.dailyMenu.findMany({
      where: {
        date: {
          in: normalizedSelections.map(sel => sel.date),
        }
      },
      include: {
        items: true,
      }
    });

    const dailyMenuByDate = new Map(
      dailyMenus.map(menu => [this.toDateKey(menu.date), menu])
    );

    normalizedSelections.forEach(selection => {
      const menuForDate = dailyMenuByDate.get(this.toDateKey(selection.date));

      if (!menuForDate) {
        throw new BadRequestException(`Daily menu is not configured for ${this.toDateKey(selection.date)}`);
      }

      const allowedDishIds = new Set(menuForDate.items.map(item => item.dishId));

      selection.items.forEach(item => {
        if (!allowedDishIds.has(item.dishId)) {
          throw new BadRequestException(`Dish ${item.dishId} is not available on ${this.toDateKey(selection.date)}`);
        }
      });
    });

    // Удаляем ТОЛЬКО даты, которые переданы в selections (а не весь период)
    const selectionDates = normalizedSelections.map(s => s.date);
    // Сначала удаляем DaySelection для этих дат
    const existingWMs = await this.prisma.weeklyMenu.findMany({
      where: { userId, startDate, endDate },
      select: { id: true },
    });
    if (existingWMs.length > 0) {
      await this.prisma.daySelection.deleteMany({
        where: {
          weeklyMenuId: { in: existingWMs.map(w => w.id) },
          date: { in: selectionDates },
        }
      });
      // Удаляем пустые weeklyMenu (без selections)
      await this.prisma.weeklyMenu.deleteMany({
        where: {
          userId,
          startDate,
          endDate,
          selections: { none: {} }
        }
      });
    }

    // Создаём новое
    const weeklyMenu = await this.prisma.weeklyMenu.create({
      data: {
        userId,
        startDate,
        endDate,
        status: 'DRAFT',
        selections: {
          create: normalizedSelections.map(sel => {
            return {
              date: sel.date,
              utensils: sel.utensils,
              needBread: sel.needBread,
              notes: sel.notes || '',
              items: {
                create: sel.items.map(item => {
                  const dateKey = this.toDateKey(sel.date)
                  const menuForDate = dailyMenuByDate.get(dateKey)
                  const menuItem = menuForDate?.items.find(mi => mi.dishId === item.dishId)
                  return {
                    dishId: item.dishId,
                    quantity: item.quantity > 0 ? item.quantity : 1,
                    garnishDishId: menuItem?.garnishDishId || null,
                  }
                })
              }
            };
          })
        }
      },
      include: {
        selections: {
          include: {
            items: { include: { dish: true } }
          }
        }
      }
    });

    return weeklyMenu;
  }

  async confirm(userId: string, id: string) {
    await this.ensureActiveCompanyAccess(userId);
    const weeklyMenu = await this.prisma.weeklyMenu.findFirst({
      where: { id, userId }
    });

    if (!weeklyMenu) {
      throw new NotFoundException('Weekly menu not found');
    }

    return this.prisma.weeklyMenu.update({
      where: { id },
      data: { status: 'CONFIRMED' }
    });
  }

  async updateQuantity(userId: string, weeklyMenuId: string, date: string, data: { dishId: string; quantity: number }) {
    await this.ensureActiveCompanyAccess(userId);
    if (!data.quantity || data.quantity < 1) {
      throw new BadRequestException('Dish quantity must be at least 1');
    }

    // Находим daySelection
    const daySelection = await this.prisma.daySelection.findFirst({
      where: {
        weeklyMenuId,
        date: new Date(date),
        weeklyMenu: { userId }
      }
    });

    if (!daySelection) {
      throw new NotFoundException('Day selection not found');
    }

    const dailyMenu = await this.prisma.dailyMenu.findUnique({
      where: { date: new Date(date) },
      include: { items: { select: { id: true, dishId: true, garnishDishId: true, maxQuantity: true, sortOrder: true } } },
    });

    const menuItem = dailyMenu?.items.find(item => item.dishId === data.dishId);

    if (!menuItem) {
      throw new BadRequestException('Dish is not available in the daily menu');
    }

    // Обновляем или создаём selectedDish
    const existing = await this.prisma.selectedDish.findFirst({
      where: {
        daySelectionId: daySelection.id,
        dishId: data.dishId
      }
    });

    if (existing) {
      return this.prisma.selectedDish.update({
        where: { id: existing.id },
        data: { quantity: data.quantity }
      });
    } else {
      return this.prisma.selectedDish.create({
        data: {
          daySelectionId: daySelection.id,
          dishId: data.dishId,
          quantity: data.quantity,
          garnishDishId: menuItem.garnishDishId || null
        }
      });
    }
  }

  async deleteWeeklyMenu(userId: string, id: string) {
    await this.ensureActiveCompanyAccess(userId);

    const weeklyMenu = await this.prisma.weeklyMenu.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!weeklyMenu) {
      throw new NotFoundException('Weekly menu not found');
    }

    await this.prisma.weeklyMenu.delete({ where: { id } });
    return { success: true };
  }

  async deleteWeeklyMenuDay(userId: string, weeklyMenuId: string, date: string) {
    await this.ensureActiveCompanyAccess(userId);
    const targetDate = this.normalizeDayDate(date);
    const targetKey = this.toDateKey(targetDate);

    const weeklyMenu = await this.prisma.weeklyMenu.findFirst({
      where: { id: weeklyMenuId, userId },
      include: {
        selections: {
          orderBy: { date: 'asc' },
          select: { id: true, date: true },
        },
      },
    });

    if (!weeklyMenu) {
      throw new NotFoundException('Weekly menu not found');
    }

    const targetSelection = weeklyMenu.selections.find((selection) => this.toDateKey(selection.date) === targetKey);

    if (!targetSelection) {
      throw new NotFoundException('Day selection not found');
    }

    if (weeklyMenu.selections.length === 1) {
      await this.prisma.weeklyMenu.delete({ where: { id: weeklyMenuId } });
      return { success: true, deletedMenu: true };
    }

    await this.prisma.daySelection.delete({ where: { id: targetSelection.id } });

    const remainingSelections = weeklyMenu.selections
      .filter((selection) => selection.id !== targetSelection.id)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    await this.prisma.weeklyMenu.update({
      where: { id: weeklyMenuId },
      data: {
        startDate: remainingSelections[0].date,
        endDate: remainingSelections[remainingSelections.length - 1].date,
      },
    });

    return { success: true, deletedMenu: false };
  }
}
