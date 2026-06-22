import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private telegram: TelegramService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { company: { select: { id: true, name: true, status: true, balance: true, creditBalance: true,
          accountNumber: true, dailyLimit: true, limit: true } } },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      if ((user.status || 'ACTIVE') === 'DISMISSED') {
        throw new UnauthorizedException('Учетная запись сотрудника отключена');
      }

      if (user.company && (user.company.status || 'ACTIVE') === 'TERMINATED') {
        throw new UnauthorizedException('Доступ в кабинет компании закрыт');
      }

      const { password: _, ...result } = user;
      return result;
    }

    return null;
  }

  private generateAccountNumber(): string {
    const date = new Date();
    const dateStr =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return 'GP-' + dateStr + '-' + rand;
  }

  async register(data: {
    email: string;
    password: string;
    companyName: string;
    firstName?: string;
    phone?: string;
    address?: string;
    peopleCount?: string;
    deliveryTime?: string;
  }) {
    const email = data.email.toLowerCase().trim();
    const password = data.password;
    const companyName = data.companyName?.trim();

    if (!email || !password || !companyName) {
      throw new BadRequestException('Email, пароль и название компании обязательны');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const accountNumber = this.generateAccountNumber();

      const company = await tx.company.create({
        data: {
          name: companyName,
          status: 'ONBOARDING',
          accountNumber: accountNumber,
          address: data.address || null,
          peopleCount: data.peopleCount || null,
          deliveryTime: data.deliveryTime || null,
          balance: 0,
          limit: 50000,
          dailyLimit: 0,
          priceSegment: 'STANDARD',
          defaultSetType: 'FULL',
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: data.firstName?.trim() || null,
          phone: data.phone?.trim() || null,
          role: 'MASTER_CLIENT',
          status: 'ACTIVE',
          companyId: company.id,
        },
      });

      await tx.company.update({
        where: { id: company.id },
        data: { userId: user.id },
      });

      const userWithCompany = await tx.user.findUnique({
        where: { id: user.id },
        include: { company: { select: { id: true, name: true, status: true, balance: true, creditBalance: true,
          accountNumber: true, dailyLimit: true, limit: true } } },
      });

      return userWithCompany;
    });
    // Отправляем уведомление в Telegram
    this.telegram.notifyNewCompany(data.email, data.companyName, result.company.accountNumber || '');
    const { password: _, ...safeUser } = result;
    const payload = { email: safeUser.email, sub: safeUser.id, role: safeUser.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: safeUser,
    };
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
    if (!newPassword || newPassword.length < 4) {
      throw new BadRequestException('Новый пароль должен быть не менее 4 символов');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (currentPassword !== undefined) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('Текущий пароль неверен');
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Пароль успешно изменен' };
  }
}
