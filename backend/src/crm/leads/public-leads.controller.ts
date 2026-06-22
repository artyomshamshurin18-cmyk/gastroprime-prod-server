import { Controller, Post, Body } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { generateAccountNumber } from "../../common/utils/account-number";
import { TelegramService } from "../../telegram/telegram.service";

@Controller("public/leads")
export class PublicLeadsController {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService
  ) {}

  @Post()
  async create(
    @Body()
    data: {
      companyName: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      employeesCount?: number;
      notes?: string;
    }
  ) {
    if (!data.companyName || data.companyName.trim() === "") {
      return { error: "Название компании обязательно" };
    }

    const company = await this.prisma.company.create({
      data: {
        name: data.companyName,
        contactPerson: data.contactPerson || null,
        workEmail: data.email || null,
        peopleCount: data.employeesCount ? String(data.employeesCount) : null,
        phone: data.phone || null,
        notes: data.notes || null,
        status: "CRM_LEAD",
        accountNumber: generateAccountNumber(),
      },
    });

    const now = new Date();
    const dealId = crypto.randomUUID();

    const adminUser = await this.prisma.$queryRawUnsafe(
      `SELECT id FROM "User" WHERE role IN ('SUPERADMIN', 'ADMIN') ORDER BY "createdAt" LIMIT 1`
    );
    const managerId =
      Array.isArray(adminUser) && adminUser.length > 0
        ? (adminUser as any[])[0].id
        : null;

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CrmDeal" (id, "companyId", "managerId", stage, probability, source, notes, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'LEAD', 10, 'SITE', $4, $5, $5)`,
      dealId,
      company.id,
      managerId,
      data.notes || null,
      now
    );

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CrmDealLog" (id, "dealId", "userId", action, comment, "createdAt")
       VALUES ($1, $2, $3, 'OTHER', 'Лид создан с сайта gastroprime.ru', $4)`,
      crypto.randomUUID(),
      dealId,
      managerId,
      now
    );

    // Telegram notification
    try {
      const msg = [
        `🆕 <b>Новая заявка с сайта!</b>`,
        ``,
        `🏢 Компания: <b>${data.companyName}</b>`,
        `👤 Контакт: ${data.contactPerson || "—"}`,
        `📞 Телефон: ${data.phone || "—"}`,
        `📝 Задача: ${data.notes || "—"}`,
        ``,
        `🗓 ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`,
      ].join("\n");

      await this.telegram.sendMessage(msg);
    } catch (e) {
      console.error("Failed to send Telegram notification:", e);
    }

    return { success: true, dealId };
  }
}
