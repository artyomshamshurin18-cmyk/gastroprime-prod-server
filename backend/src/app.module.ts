import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { MenuModule } from "./menu/menu.module";
import { OrdersModule } from "./orders/orders.module";
import { AdminModule } from "./admin/admin.module";
import { ChatModule } from "./chat/chat.module";
import { DailyMenuModule } from "./daily-menu/daily-menu.module";
import { WeeklyMenuModule } from "./weekly-menu/weekly-menu.module";
import { DriverModule } from "./driver/driver.module";
import { PrismaModule } from "./common/prisma.module";
import { TelegramModule } from "./telegram/telegram.module";
import { LogisticsModule } from "./logistics/logistics.module";
import { CrmModule } from "./crm/crm.module";
import { ExolveModule } from "./exolve/exolve.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    MenuModule,
    OrdersModule,
    AdminModule,
    ChatModule,
    DailyMenuModule,
    WeeklyMenuModule,
    DriverModule,
    TelegramModule,
    LogisticsModule,
    CrmModule,
    ExolveModule,
  ],
})
export class AppModule {}
