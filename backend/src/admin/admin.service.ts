import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import * as XLSX from 'xlsx'
import { renderInvoicePdf } from '../billing/invoice-pdf'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { buildCompanyCategoryPricesPayload, getCompanyCategoryPriceMap, getDefaultCompanyCategoryPrices, getResolvedCompanyDishPrice } from '../common/company-pricing'

import { generateAccountNumber } from "../common/utils/account-number"
const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  jobTitle: true,
  phone: true,
  allergies: true,
  routeName: true,
  avatarUrl: true,
  status: true,
  role: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: {
      id: true,
      name: true,
      status: true,
      contactPerson: true,
      address: true,
      billingAddress: true,
      billingDetails: true,
      entryConditions: true,
      routeName: true,
      deliveryTime: true,
      peopleCount: true,
      notes: true,
      mealPlan: true,
      workEmail: true,
      website: true,
      priceSegment: true,
      balance: true,
      limit: true,
      dailyLimit: true,
      userId: true,
    },
  },
} as const

const normalizeText = (value: unknown) => String(value ?? '').trim()
const normalizeKey = (value: string) => normalizeText(value).toLowerCase().replace(/[\s_\-]+/g, '')
const parseImportNumber = (value: unknown) => {
  const normalized = normalizeText(value).replace(',', '.')
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}
const formatDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const normalizeMeasureUnit = (value: unknown, categoryName?: string) => {
  const normalized = normalizeText(value).toUpperCase()
  if (['GRAM', 'G', 'Г', 'ГР', 'ГРАММ', 'ГРАММЫ'].includes(normalized)) return 'GRAM'
  if (['ML', 'МЛ', 'МЛ.', 'МЛЛ', 'L', 'Л', 'ЛИТР', 'ЛИТРЫ'].includes(normalized)) return 'ML'
  if (['PCS', 'PC', 'ШТ', 'ШТ.', 'ШТУКА', 'ШТУКИ'].includes(normalized)) return 'PCS'

  const categoryKey = normalizeKey(categoryName || '')
  if (categoryKey === normalizeKey('Суп') || categoryKey === normalizeKey('Напиток')) return 'ML'
  return 'GRAM'
}
const parseImportDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateKey(value)
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed?.y && parsed?.m && parsed?.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
    }
  }

  const normalized = normalizeText(value)
  if (!normalized) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized

  const ruMatch = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (ruMatch) {
    const [, day, month, year] = ruMatch
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateKey(parsed)
  }

  return ''
}

const getImportCell = (row: Record<string, unknown>, aliases: string[]) => {
  const entries = Object.entries(row)
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias)
    const match = entries.find(([key]) => normalizeKey(key) === normalizedAlias)
    if (match) return match[1]
  }
  return ''
}

const allowedUserStatuses = new Set(['ACTIVE', 'VACATION', 'DISMISSED'])
const allowedCompanyStatuses = new Set(['ONBOARDING', 'ACTIVE', 'ON_HOLD', 'TERMINATED'])
const normalizeUserStatus = (value: unknown) => {
  const normalized = normalizeText(value).toUpperCase() || 'ACTIVE'
  if (!allowedUserStatuses.has(normalized)) {
    throw new BadRequestException('Некорректный статус пользователя')
  }
  return normalized
}
const normalizeCompanyStatus = (value: unknown) => {
  const normalized = normalizeText(value).toUpperCase() || 'ACTIVE'
  if (!allowedCompanyStatuses.has(normalized)) {
    throw new BadRequestException('Некорректный статус компании')
  }
  return normalized
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private normalizeAdminRole(value: unknown, fallback = 'CLIENT') {
    const normalized = normalizeText(value).toUpperCase() || fallback
    const allowedRoles = new Set(['CLIENT', 'MASTER_CLIENT', 'ADMIN', 'SUPERADMIN', 'MANAGER', 'CRM_OPERATOR'])

    if (!allowedRoles.has(normalized)) {
      throw new BadRequestException('Недопустимая роль пользователя')
    }

    return normalized
  }

  private async getAdminActor(actorUserId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, role: true },
    })

    if (!actor) {
      throw new NotFoundException('Администратор не найден')
    }

    return actor
  }

  private ensureManagerCanMutateRole(actorRole: string, targetRole: string) {
    if (actorRole === 'MANAGER' && ['ADMIN', 'SUPERADMIN', 'MANAGER'].includes(targetRole)) {
      throw new ForbiddenException('Менеджер не может назначать или изменять административные роли')
    }
  }

  private saveImage(file: any, folderName: string) {
    if (!file) {
      throw new BadRequestException('Файл не был загружен')
    }

    if (!String(file.mimetype || '').startsWith('image/')) {
      throw new BadRequestException('Можно загружать только изображения')
    }

    const ext = path.extname(file.originalname || '') || '.jpg'
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
    const uploadsDir = path.join(process.cwd(), 'uploads', folderName)
    fs.mkdirSync(uploadsDir, { recursive: true })
    fs.writeFileSync(path.join(uploadsDir, fileName), file.buffer)
    return `/uploads/${folderName}/${fileName}`
  }

  async getStats(start?: string, end?: string, companyId?: string) {
    const companyFilter = companyId ? { companyId } : undefined
    const userFilter = companyId ? { companyId } : undefined
    const dateFilter: any = {};
    if (start) dateFilter.gte = new Date(start + "T00:00:00Z");
    if (end) dateFilter.lt = new Date(end + "T23:59:59Z");

    const totalUsers = await this.prisma.user.count({ where: userFilter })
    const totalOrders = await this.prisma.order.count({ where: { ...(companyFilter || {}), ...(start || end ? { deliveryDate: dateFilter } : {}) } })
    const todayOrders = await this.prisma.order.count({
      where: {
        ...(companyFilter || {}),
        deliveryDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    })
    const revenue = await this.prisma.order.aggregate({
      where: { ...(companyFilter || {}), ...(start || end ? { deliveryDate: dateFilter } : {}) },
      _sum: { totalAmount: true }
    })

    const ordersByStatus = {
      PENDING: await this.prisma.order.count({ where: { ...(companyFilter || {}), status: 'PENDING' } }),
      CONFIRMED: await this.prisma.order.count({ where: { ...(companyFilter || {}), status: 'CONFIRMED' } }),
      PREPARING: await this.prisma.order.count({ where: { ...(companyFilter || {}), status: 'PREPARING' } }),
      READY: await this.prisma.order.count({ where: { ...(companyFilter || {}), status: 'READY' } }),
      PAID: await this.prisma.order.count({ where: { ...(companyFilter || {}), status: 'PAID' } }),
      DELIVERED: await this.prisma.order.count({ where: { ...(companyFilter || {}), status: 'DELIVERED' } }),
      CANCELLED: await this.prisma.order.count({ where: { ...(companyFilter || {}), status: 'CANCELLED' } })
    }

    return {
      totalUsers,
      totalOrders,
      todayOrders,
      totalRevenue: revenue._sum.totalAmount || 0,
      ordersByStatus
    }
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: {
        items: { include: { dish: true } },
        company: true,
        user: { select: { email: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async getAllDishes() {
    return this.prisma.dish.findMany({
      include: { category: true },
      orderBy: { name: 'asc' }
    })
  }

  async getAllCategories() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { dishes: true }
        }
      },
      orderBy: { name: 'asc' }
    })
  }

  async getTodayOrders() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const orders = await this.prisma.order.findMany({
      where: {
        deliveryDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        items: { include: { dish: { include: { category: true } } } },
        company: true
      },
      orderBy: { deliveryTime: 'asc' }
    })

    const dishMap = new Map()
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.dishId
        if (dishMap.has(key)) {
          dishMap.get(key).totalQuantity += item.quantity
        } else {
          dishMap.set(key, {
            dishName: item.dish.name,
            category: item.dish.category.name,
            totalQuantity: item.quantity
          })
        }
      })
    })

    return {
      totalOrders: orders.length,
      orders,
      dishSummary: Array.from(dishMap.values())
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status }
    })
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' }
    })
  }

  async getAllCompanies(actor?: { role?: string }) {
    return this.prisma.company.findMany({
      where: actor?.role === 'MANAGER' ? { status: 'ACTIVE' } : { status: { not: 'CRM_LEAD' } },
      include: {
        categoryPrices: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: {
            category: {
              name: 'asc'
            }
          }
        },
        _count: {
          select: { users: true, orders: true }
        }
      },
      orderBy: { name: 'asc' }
    })
  }

  async getCompanyUsers(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    })
  }

  async updateCompanyUserRole(userId: string, role: string) {
    const allowedRoles = ['CLIENT', 'MASTER_CLIENT']
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException('Роль может быть только CLIENT или MASTER_CLIENT')
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      }
    })
  }

  async getBillingSettings() {
    return this.prisma.billingSettings.upsert({
      where: { key: 'main' },
      update: {},
      create: { key: 'main' },
    })
  }

  async createUser(actorUserId: string, data: any) {
    const actor = await this.getAdminActor(actorUserId)
    const role = this.normalizeAdminRole(data.role)
    this.ensureManagerCanMutateRole(actor.role, role)
    const hashedPassword = await bcrypt.hash(data.password, 10)

    const createInlineCompany = !data.companyId && data.companyName
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        jobTitle: data.jobTitle || null,
        phone: data.phone || null,
        allergies: data.allergies || null,
        role,
        status: normalizeUserStatus(data.status),
        ...(data.companyId ? { company: { connect: { id: data.companyId } } } : {}),
        ...(createInlineCompany ? {
          company: {
            create: {
              name: data.companyName,
              accountNumber: generateAccountNumber(),
              status: normalizeCompanyStatus(data.companyStatus),
              contactPerson: data.contactPerson || null,
              address: data.companyAddress || null,
              entryConditions: data.entryConditions || null,
              routeName: data.routeName || null,
              deliveryTime: data.deliveryTime || null,
              peopleCount: data.peopleCount ? String(data.peopleCount) : null,
              notes: data.notes || null,
              mealPlan: data.mealPlan || null,
              workEmail: data.workEmail || null,
              website: data.website || null,
              priceSegment: data.priceSegment || 'STANDARD',
              balance: data.balance || 0,
              limit: data.limit || 50000,
              dailyLimit: data.dailyLimit || 0,
            }
          }
        } : {}),
      },
      select: safeUserSelect
    })

    return user
  }

  async previewUserImport(file?: any, defaultPassword?: string) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл не был загружен')
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw new BadRequestException('В Excel-файле нет листов')
    }

    const sheet = workbook.Sheets[firstSheetName]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (rawRows.length === 0) {
      throw new BadRequestException('Excel-файл пустой')
    }

    const [companies, users] = await Promise.all([
      this.prisma.company.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ select: { id: true, email: true } }),
    ])

    const companyMap = new Map(companies.map(company => [normalizeKey(company.name), company]))
    const userMap = new Map(users.map(user => [normalizeText(user.email).toLowerCase(), user]))
    const fallbackPassword = normalizeText(defaultPassword)
    const allowedRoles = new Set(['CLIENT', 'MASTER_CLIENT', 'ADMIN', 'SUPERADMIN', 'CRM_OPERATOR'])

    const rows = rawRows.map((row, index) => {
      const companyName = normalizeText(getImportCell(row, ['company', 'компания']))
      const email = normalizeText(getImportCell(row, ['email', 'почта', 'рабочий email', 'рабочий емэил'])).toLowerCase()
      const firstName = normalizeText(getImportCell(row, ['firstname', 'имя']))
      const lastName = normalizeText(getImportCell(row, ['lastname', 'фамилия']))
      const phone = normalizeText(getImportCell(row, ['phone', 'телефон']))
      const role = normalizeText(getImportCell(row, ['role', 'роль'])).toUpperCase() || 'CLIENT'
      const password = normalizeText(getImportCell(row, ['password', 'пароль'])) || fallbackPassword

      const errors: string[] = []
      if (!companyName) errors.push('Не указана компания')
      if (!email) errors.push('Не указан email')
      if (!password) errors.push('Не указан пароль и не задан пароль по умолчанию')
      if (!allowedRoles.has(role)) errors.push(`Недопустимая роль: ${role}`)

      const company = companyMap.get(normalizeKey(companyName))
      if (companyName && !company) {
        errors.push(`Компания «${companyName}» не найдена в системе`)
      }

      const existingUser = userMap.get(email)

      return {
        rowNumber: index + 2,
        companyName: company?.name || companyName,
        companyId: company?.id || '',
        email,
        firstName,
        lastName,
        phone,
        role,
        password,
        action: existingUser ? 'update' : 'create',
        existingUserId: existingUser?.id || null,
        errors,
      }
    })

    return {
      fileName: file.originalname,
      totalRows: rows.length,
      validRows: rows.filter(row => row.errors.length === 0).length,
      errorRows: rows.filter(row => row.errors.length > 0).length,
      createCount: rows.filter(row => row.errors.length === 0 && row.action === 'create').length,
      updateCount: rows.filter(row => row.errors.length === 0 && row.action === 'update').length,
      rows,
    }
  }

  async commitUserImport(rows: any[], defaultPassword?: string) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('Нет строк для импорта пользователей')
    }

    const fallbackPassword = normalizeText(defaultPassword)
    const invalidRow = rows.find(row => !row.email || !row.companyId || (Array.isArray(row.errors) && row.errors.length > 0))
    if (invalidRow) {
      throw new BadRequestException(`Нельзя импортировать файл с ошибками. Проверьте строку ${invalidRow.rowNumber || '?'}`)
    }

    let created = 0
    let updated = 0

    for (const row of rows) {
      const email = normalizeText(row.email).toLowerCase()
      const passwordRaw = normalizeText(row.password) || fallbackPassword
      if (!passwordRaw) {
        throw new BadRequestException(`Для пользователя ${email} не задан пароль`)
      }

      const hashedPassword = await bcrypt.hash(passwordRaw, 10)
      const payload = {
        email,
        firstName: normalizeText(row.firstName) || null,
        lastName: normalizeText(row.lastName) || null,
        phone: normalizeText(row.phone) || null,
        role: normalizeText(row.role).toUpperCase() || 'CLIENT',
        company: { connect: { id: normalizeText(row.companyId) } },
        password: hashedPassword,
      }

      const existingUser = await this.prisma.user.findUnique({ where: { email } })

      if (existingUser) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: payload,
        })
        updated += 1
      } else {
        await this.prisma.user.create({
          data: payload,
        })
        created += 1
      }
    }

    return {
      success: true,
      created,
      updated,
      total: created + updated,
    }
  }

  async createCompany(data: any) {
    const name = normalizeText(data.name)
    if (!name) {
      throw new BadRequestException('Название компании обязательно')
    }

    const categoryPricesPayload = buildCompanyCategoryPricesPayload(data)
    const createCategoryPrices = categoryPricesPayload?.create || []
    const defaultCategoryPrices = !createCategoryPrices.length ? await getDefaultCompanyCategoryPrices(this.prisma) : []

    return this.prisma.company.create({
      data: {
        name,
        accountNumber: generateAccountNumber(),
        status: normalizeCompanyStatus(data.status),
        contactPerson: normalizeText(data.contactPerson) || null,
        address: normalizeText(data.address) || null,
        billingAddress: normalizeText(data.billingAddress) || null,
        billingDetails: normalizeText(data.billingDetails) || null,
        entryConditions: normalizeText(data.entryConditions) || null,
        routeName: normalizeText(data.routeName) || null,
        deliveryTime: normalizeText(data.deliveryTime) || null,
        peopleCount: data.peopleCount ? String(data.peopleCount) : null,
        notes: normalizeText(data.notes) || null,
        mealPlan: normalizeText(data.mealPlan) || null,
        workEmail: normalizeText(data.workEmail) || null,
        website: normalizeText(data.website) || null,
        priceSegment: normalizeText(data.priceSegment) || 'STANDARD',
        balance: Number(data.balance) || 0,
        limit: Number(data.limit) || 50000,
        dailyLimit: Number(data.dailyLimit) || 0,
        ...(createCategoryPrices.length ? { categoryPrices: { create: createCategoryPrices } } : (defaultCategoryPrices.length ? {
          categoryPrices: {
            create: defaultCategoryPrices,
          },
        } : {})),
      }
    })
  }

  async duplicateCompany(companyId: string) {
    const source = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        categoryPrices: true,
      },
    })

    if (!source) {
      throw new NotFoundException('Компания не найдена')
    }

    const baseName = `${source.name} (копия)`
    let name = baseName
    let index = 2

    while (await this.prisma.company.findFirst({ where: { name }, select: { id: true } })) {
      name = `${baseName} ${index}`
      index += 1
    }

    return this.prisma.company.create({
      data: {
        name,
        accountNumber: generateAccountNumber(),
        status: source.status,
        contactPerson: source.contactPerson,
        address: source.address,
        billingAddress: source.billingAddress,
        billingDetails: source.billingDetails,
        entryConditions: source.entryConditions,
        routeName: source.routeName,
        deliveryTime: source.deliveryTime,
        peopleCount: source.peopleCount,
        notes: source.notes,
        mealPlan: source.mealPlan,
        workEmail: source.workEmail,
        website: source.website,
        priceSegment: source.priceSegment,
        balance: source.balance,
        limit: source.limit,
        dailyLimit: source.dailyLimit,
        ...(source.categoryPrices?.length ? {
          categoryPrices: {
            create: source.categoryPrices.map((item) => ({
              categoryId: item.categoryId,
              price: item.price,
            })),
          },
        } : {}),
      },
    })
  }

  async impersonateCompany(actorUserId: string, companyId: string) {
    const actor = await this.getAdminActor(actorUserId)

    if (!['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(actor.role)) {
      throw new ForbiddenException('Недостаточно прав для входа в кабинет клиента')
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        user: {
          include: { company: true },
        },
        users: {
          where: {
            status: { not: 'DISMISSED' },
            role: { in: ['MASTER_CLIENT', 'CLIENT'] },
          },
          include: { company: true },
          orderBy: [
            { role: 'desc' },
            { createdAt: 'asc' },
          ],
        },
      },
    })

    if (!company) {
      throw new NotFoundException('Компания не найдена')
    }

    const candidates = [
      ...(company.user && company.user.status !== 'DISMISSED' ? [company.user] : []),
      ...company.users,
    ]

    const uniqueCandidates = candidates.filter((candidate, index, array) => array.findIndex((item) => item.id === candidate.id) === index)
    const targetUser = uniqueCandidates.find((candidate) => candidate.id === company.userId)
      || uniqueCandidates.find((candidate) => candidate.role === 'MASTER_CLIENT')

    if (!targetUser) {
      throw new BadRequestException('У этой компании нет активного координатора. Нужен пользователь с ролью MASTER_CLIENT или владелец компании.')
    }

    const payload: Record<string, unknown> = {
      email: targetUser.email,
      sub: targetUser.id,
      role: targetUser.role,
      impersonatedBy: actor.id,
      impersonatedByRole: actor.role,
    }

    const { password, ...safeUser } = targetUser as any

    return {
      access_token: this.jwtService.sign(payload),
      user: safeUser,
      impersonation: {
        companyId: company.id,
        companyName: company.name,
        actorUserId: actor.id,
        actorRole: actor.role,
      },
    }
  }

  async updateCompany(companyId: string, data: any) {
    const existingCompany = await this.prisma.company.findUnique({ where: { id: companyId } })

    if (!existingCompany) {
      throw new NotFoundException('Компания не найдена')
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: Object.prototype.hasOwnProperty.call(data, 'name') ? normalizeText(data.name) : existingCompany.name,
        status: Object.prototype.hasOwnProperty.call(data, 'status') ? normalizeCompanyStatus(data.status) : existingCompany.status,
        contactPerson: Object.prototype.hasOwnProperty.call(data, 'contactPerson') ? (normalizeText(data.contactPerson) || null) : existingCompany.contactPerson,
        address: Object.prototype.hasOwnProperty.call(data, 'address') ? (normalizeText(data.address) || null) : existingCompany.address,
        billingAddress: Object.prototype.hasOwnProperty.call(data, 'billingAddress') ? (normalizeText(data.billingAddress) || null) : existingCompany.billingAddress,
        billingDetails: Object.prototype.hasOwnProperty.call(data, 'billingDetails') ? (normalizeText(data.billingDetails) || null) : existingCompany.billingDetails,
        entryConditions: Object.prototype.hasOwnProperty.call(data, 'entryConditions') ? (normalizeText(data.entryConditions) || null) : existingCompany.entryConditions,
        routeName: Object.prototype.hasOwnProperty.call(data, 'routeName') ? (normalizeText(data.routeName) || null) : existingCompany.routeName,
        deliveryTime: Object.prototype.hasOwnProperty.call(data, 'deliveryTime') ? (normalizeText(data.deliveryTime) || null) : existingCompany.deliveryTime,
        peopleCount: Object.prototype.hasOwnProperty.call(data, 'peopleCount') ? (data.peopleCount ? String(data.peopleCount) : null) : existingCompany.peopleCount,
        notes: Object.prototype.hasOwnProperty.call(data, 'notes') ? (normalizeText(data.notes) || null) : existingCompany.notes,
        mealPlan: Object.prototype.hasOwnProperty.call(data, 'mealPlan') ? (normalizeText(data.mealPlan) || null) : existingCompany.mealPlan,
        workEmail: Object.prototype.hasOwnProperty.call(data, 'workEmail') ? (normalizeText(data.workEmail) || null) : existingCompany.workEmail,
        website: Object.prototype.hasOwnProperty.call(data, 'website') ? (normalizeText(data.website) || null) : existingCompany.website,
        priceSegment: Object.prototype.hasOwnProperty.call(data, 'priceSegment') ? (normalizeText(data.priceSegment) || 'STANDARD') : existingCompany.priceSegment,
        balance: Object.prototype.hasOwnProperty.call(data, 'balance') ? (Number(data.balance) || 0) : existingCompany.balance,
        limit: Object.prototype.hasOwnProperty.call(data, 'limit') ? (Number(data.limit) || 50000) : existingCompany.limit,
        dailyLimit: Object.prototype.hasOwnProperty.call(data, 'dailyLimit') ? (Number(data.dailyLimit) || 0) : existingCompany.dailyLimit,
        ...(Object.prototype.hasOwnProperty.call(data, 'categoryPrices') ? { categoryPrices: buildCompanyCategoryPricesPayload(data) } : {}),
      }
    })
  }

  async updateBillingSettings(data: any) {
    return this.prisma.billingSettings.upsert({
      where: { key: 'main' },
      update: {
        sellerName: normalizeText(data.sellerName) || null,
        sellerAddress: normalizeText(data.sellerAddress) || null,
        sellerDetails: normalizeText(data.sellerDetails) || null,
      },
      create: {
        key: 'main',
        sellerName: normalizeText(data.sellerName) || null,
        sellerAddress: normalizeText(data.sellerAddress) || null,
        sellerDetails: normalizeText(data.sellerDetails) || null,
      },
    })
  }

  async updateDeliveryClosing(adminUserId: string, data: any) {
    const companyId = normalizeText(data.companyId)
    const date = new Date(data.date)
    const status = normalizeText(data.status).toUpperCase()

    if (!companyId) {
      throw new BadRequestException('Компания обязательна')
    }

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Некорректная дата')
    }

    if (!['DELIVERED', 'DELIVERED_WITH_DEVIATION'].includes(status)) {
      throw new BadRequestException('Некорректный статус доставки')
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } })
    if (!company) {
      throw new NotFoundException('Компания не найдена')
    }

    return this.prisma.deliveryClosing.upsert({
      where: {
        companyId_date: {
          companyId,
          date: new Date(date.toISOString().slice(0, 10)),
        }
      },
      update: {
        status,
        deviationAmount: Number(data.deviationAmount) || 0,
        deviationComment: normalizeText(data.deviationComment) || null,
        managerComment: normalizeText(data.managerComment) || null,
        updatedById: adminUserId,
      },
      create: {
        companyId,
        date: new Date(date.toISOString().slice(0, 10)),
        status,
        deviationAmount: Number(data.deviationAmount) || 0,
        deviationComment: normalizeText(data.deviationComment) || null,
        managerComment: normalizeText(data.managerComment) || null,
        createdById: adminUserId,
        updatedById: adminUserId,
      }
    })
  }

  async getReconciliation(companyId: string, start: string, end: string) {
    const normalizedCompanyId = normalizeText(companyId)
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (!normalizedCompanyId) {
      throw new BadRequestException('Компания обязательна')
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Укажите корректный период')
    }

    const normalizedStart = new Date(startDate.toISOString().slice(0, 10))
    const normalizedEnd = new Date(endDate.toISOString().slice(0, 10))

    if (normalizedStart > normalizedEnd) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания')
    }

    const diffDays = Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / 86400000) + 1
    if (diffDays > 62) {
      throw new BadRequestException('Период сверки не должен превышать 2 месяца')
    }

    const company = await this.prisma.company.findUnique({
      where: { id: normalizedCompanyId },
      select: { id: true, name: true, billingAddress: true, billingDetails: true },
    })

    if (!company) {
      throw new NotFoundException('Компания не найдена')
    }

    const selections = await this.prisma.daySelection.findMany({
      where: {
        date: { gte: normalizedStart, lte: normalizedEnd },
        weeklyMenu: {
          status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
          user: { companyId: normalizedCompanyId },
        }
      },
      include: {
        items: { include: { dish: true } },
        weeklyMenu: {
          select: {
            user: { select: { id: true } }
          }
        }
      }
    })

    const closings = await this.prisma.deliveryClosing.findMany({
      where: {
        companyId: normalizedCompanyId,
        date: { gte: normalizedStart, lte: normalizedEnd },
      },
      orderBy: { date: 'asc' },
    })

    const companyPriceMap = await getCompanyCategoryPriceMap(this.prisma, normalizedCompanyId)

    const closingsByDate = new Map(closings.map(closing => [formatDateKey(closing.date), closing]))
    const rowsMap = new Map<string, any>()

    selections.forEach(selection => {
      const key = formatDateKey(selection.date)
      if (!rowsMap.has(key)) {
        rowsMap.set(key, {
          date: key,
          selectionsCount: 0,
          usersSet: new Set<string>(),
          portions: 0,
          subtotal: 0,
        })
      }

      const row = rowsMap.get(key)
      row.selectionsCount += 1
      row.usersSet.add(selection.weeklyMenu.user.id)

      selection.items.forEach(item => {
        const resolvedPrice = getResolvedCompanyDishPrice(item.dish, companyPriceMap)
        row.portions += item.quantity
        row.subtotal += (item.quantity || 0) * resolvedPrice
      })
    })

    const rows = Array.from(rowsMap.values())
      .map((row: any) => {
        const closing = closingsByDate.get(row.date)
        const deviationAmount = closing?.deviationAmount || 0
        return {
          date: row.date,
          selectionsCount: row.selectionsCount,
          usersCount: row.usersSet.size,
          portions: row.portions,
          subtotal: row.subtotal,
          deliveryStatus: closing?.status || '',
          deviationAmount,
          deviationComment: closing?.deviationComment || '',
          managerComment: closing?.managerComment || '',
          total: Math.max(0, row.subtotal - deviationAmount),
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    const summary = rows.reduce((acc, row) => {
      acc.daysWithOrders += 1
      if (row.deliveryStatus) acc.closedDays += 1
      else acc.openDays += 1
      if (row.deliveryStatus === 'DELIVERED_WITH_DEVIATION') acc.daysWithDeviation += 1
      acc.subtotal += row.subtotal
      acc.deviationTotal += row.deviationAmount
      acc.total += row.total
      return acc
    }, {
      daysWithOrders: 0,
      closedDays: 0,
      openDays: 0,
      daysWithDeviation: 0,
      subtotal: 0,
      deviationTotal: 0,
      total: 0,
    })

    return {
      company,
      period: {
        start: formatDateKey(normalizedStart),
        end: formatDateKey(normalizedEnd),
        days: diffDays,
      },
      summary,
      rows,
    }
  }

  private async generateInvoiceNumber(prefix: string) {
    const dateKey = formatDateKey(new Date()).replace(/-/g, '')
    const count = await this.prisma.invoice.count({
      where: {
        number: { startsWith: `${prefix}-${dateKey}` }
      }
    })
    return `${prefix}-${dateKey}-${String(count + 1).padStart(3, '0')}`
  }

  async getInvoices() {
    return this.prisma.invoice.findMany({
      include: {
        company: { select: { id: true, name: true } },
        lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createPeriodInvoice(data: { companyId: string; start: string; end: string; comment?: string }) {
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        companyId: normalizeText(data.companyId),
        type: 'PERIOD',
        periodStart: new Date(data.start),
        periodEnd: new Date(data.end),
        status: { not: 'CANCELLED' },
      },
      select: { id: true, number: true },
    })

    if (existingInvoice) {
      throw new BadRequestException(`Счет за этот период уже существует: ${existingInvoice.number}`)
    }

    const reconciliation = await this.getReconciliation(data.companyId, data.start, data.end)
    if (!reconciliation.rows.length) {
      throw new BadRequestException('За выбранный период нет данных для счета')
    }

    const seller = await this.getBillingSettings()
    const number = await this.generateInvoiceNumber('INV')
    const issueDate = new Date()
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + 3)

    return this.prisma.invoice.create({
      data: {
        number,
        companyId: reconciliation.company.id,
        type: 'PERIOD',
        status: 'ISSUED',
        periodStart: new Date(reconciliation.period.start),
        periodEnd: new Date(reconciliation.period.end),
        issueDate,
        dueDate,
        subtotal: reconciliation.summary.subtotal,
        deviationTotal: reconciliation.summary.deviationTotal,
        total: reconciliation.summary.total,
        comment: normalizeText(data.comment) || null,
        buyerSnapshotName: reconciliation.company.name,
        buyerSnapshotAddress: reconciliation.company.billingAddress || null,
        buyerSnapshotDetails: reconciliation.company.billingDetails || null,
        sellerSnapshotName: seller.sellerName || 'Gastroprime',
        sellerSnapshotAddress: seller.sellerAddress || null,
        sellerSnapshotDetails: seller.sellerDetails || null,
        lines: {
          create: reconciliation.rows.map((row: any) => ({
            date: new Date(row.date),
            description: `Питание за ${row.date}`,
            quantity: row.portions,
            unitPrice: row.portions > 0 ? Math.round(row.subtotal / row.portions) : 0,
            amount: row.subtotal,
            deviationAmount: row.deviationAmount,
            total: row.total,
          }))
        }
      },
      include: {
        company: { select: { id: true, name: true } },
        lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      }
    })
  }

  async createPrepaymentInvoice(data: { companyId: string; amount: number; comment?: string }) {
    const companyId = normalizeText(data.companyId)
    const amount = Number(data.amount) || 0
    if (!companyId) throw new BadRequestException('Компания обязательна')
    if (amount <= 0) throw new BadRequestException('Сумма предоплаты должна быть больше нуля')

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, billingAddress: true, billingDetails: true },
    })
    if (!company) throw new NotFoundException('Компания не найдена')

    const seller = await this.getBillingSettings()
    const number = await this.generateInvoiceNumber('ADV')
    const issueDate = new Date()
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + 3)

    return this.prisma.invoice.create({
      data: {
        number,
        companyId: company.id,
        type: 'PREPAYMENT',
        status: 'ISSUED',
        issueDate,
        dueDate,
        subtotal: amount,
        deviationTotal: 0,
        total: amount,
        comment: normalizeText(data.comment) || 'Счет на предоплату для пополнения баланса',
        buyerSnapshotName: company.name,
        buyerSnapshotAddress: company.billingAddress || null,
        buyerSnapshotDetails: company.billingDetails || null,
        sellerSnapshotName: seller.sellerName || 'Gastroprime',
        sellerSnapshotAddress: seller.sellerAddress || null,
        sellerSnapshotDetails: seller.sellerDetails || null,
        lines: {
          create: [{
            description: 'Предоплата для пополнения баланса',
            amount,
            deviationAmount: 0,
            total: amount,
          }]
        }
      },
      include: {
        company: { select: { id: true, name: true } },
        lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      }
    })
  }

  async getInvoicePdf(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: { select: { id: true, name: true } },
        lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      }
    })
    if (!invoice) {
      throw new NotFoundException('Счет не найден')
    }

    return {
      invoice,
      buffer: await renderInvoicePdf(invoice),
    }
  }

  async updateInvoiceStatus(invoiceId: string, status: string) {
    const normalizedStatus = normalizeText(status).toUpperCase()
    if (!['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'].includes(normalizedStatus)) {
      throw new BadRequestException('Некорректный статус счета')
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: normalizedStatus },
      include: {
        company: { select: { id: true, name: true } },
        lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
    })
  }

  async applyPrepaymentInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { company: true },
    })

    if (!invoice) {
      throw new NotFoundException('Счет не найден')
    }

    if (invoice.type !== 'PREPAYMENT') {
      throw new BadRequestException('Зачисление доступно только для счетов на предоплату')
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Этот счет уже зачислен')
    }

    await this.prisma.company.update({
      where: { id: invoice.companyId },
      data: { balance: (invoice.company.balance || 0) + invoice.total },
    })

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID' },
      include: {
        company: { select: { id: true, name: true } },
        lines: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
    })
  }

  async exportDailyMenu(start: string, end: string) {
    const startDate = parseImportDate(start)
    const endDate = parseImportDate(end)

    if (!startDate || !endDate) {
      throw new BadRequestException('Укажите корректный период для выгрузки меню')
    }

    if (startDate > endDate) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания')
    }

    const startAt = new Date(`${startDate}T00:00:00.000Z`)
    const endExclusive = new Date(`${endDate}T00:00:00.000Z`)
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)

    const menus = await this.prisma.dailyMenu.findMany({
      where: {
        date: {
          gte: startAt,
          lt: endExclusive,
        },
      },
      include: {
        items: {
          include: {
            dish: {
              include: {
                category: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    const menuRows = menus.flatMap(menu =>
      menu.items.map(item => ({
        Дата: formatDateKey(menu.date),
        Категория: item.dish.category?.name || '',
        Блюдо: item.dish.name,
        'Макс. количество': item.maxQuantity || 100,
        Порядок: item.sortOrder || 0,
      }))
    )

    const summaryRows = [
      { Показатель: 'Период с', Значение: startDate },
      { Показатель: 'Период по', Значение: endDate },
      { Показатель: 'Дат в выгрузке', Значение: menus.length },
      { Показатель: 'Всего строк меню', Значение: menuRows.length },
    ]

    const workbook = XLSX.utils.book_new()
    const menuSheet = XLSX.utils.json_to_sheet(menuRows, {
      header: ['Дата', 'Категория', 'Блюдо', 'Макс. количество', 'Порядок'],
      skipHeader: false,
    })
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows)

    XLSX.utils.book_append_sheet(workbook, menuSheet, 'Меню')
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Сводка')

    return {
      start: startDate,
      end: endDate,
      buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    }
  }

  async previewDailyMenuImport(file?: any) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл не был загружен')
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]

    if (!firstSheetName) {
      throw new BadRequestException('В Excel-файле нет листов')
    }

    const sheet = workbook.Sheets[firstSheetName]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    if (rawRows.length === 0) {
      throw new BadRequestException('Excel-файл пустой')
    }

    const dishes = await this.prisma.dish.findMany({
      include: { category: true },
      orderBy: { name: 'asc' }
    })

    const dishMap = new Map(dishes.map(dish => [normalizeKey(dish.name), dish]))
    const duplicateGuard = new Set<string>()

    const rows = rawRows.map((row, index) => {
      const date = parseImportDate(getImportCell(row, ['date', 'дата']))
      const categoryName = normalizeText(getImportCell(row, ['category', 'категория']))
      const dishName = normalizeText(getImportCell(row, ['dish', 'блюдо', 'название']))
      const maxQuantity = parseImportNumber(getImportCell(row, ['maxquantity', 'max qty', 'макс количество', 'макс. количество', 'количество'])) || 100
      const sortOrder = parseImportNumber(getImportCell(row, ['sortorder', 'порядок', 'order'])) || index

      const errors: string[] = []
      if (!date) errors.push('Не указана или неверно заполнена дата')
      if (!categoryName) errors.push('Не указана категория')
      if (!dishName) errors.push('Не указано блюдо')

      const dish = dishMap.get(normalizeKey(dishName))
      if (dishName && !dish) {
        errors.push(`Блюдо «${dishName}» не найдено в справочнике`)
      }

      if (dish && categoryName && normalizeKey(dish.category?.name || '') !== normalizeKey(categoryName)) {
        errors.push(`Блюдо «${dishName}» относится к категории «${dish.category?.name || 'Без категории'}», а в файле указано «${categoryName}»`)
      }

      const duplicateKey = `${date}::${dish?.id || dishName}`
      if (date && dishName) {
        if (duplicateGuard.has(duplicateKey)) {
          errors.push(`Дубликат блюда «${dishName}» на дату ${date}`)
        } else {
          duplicateGuard.add(duplicateKey)
        }
      }

      return {
        rowNumber: index + 2,
        date,
        categoryName: dish?.category?.name || categoryName,
        dishName: dish?.name || dishName,
        dishId: dish?.id || '',
        maxQuantity,
        sortOrder,
        action: 'assign',
        errors,
      }
    })

    const validDates = Array.from(new Set(rows.filter(row => row.date).map(row => row.date)))
    const existingMenus = validDates.length
      ? await this.prisma.dailyMenu.findMany({
          where: { date: { in: validDates.map(date => new Date(date)) } },
          select: { date: true }
        })
      : []
    const existingDateSet = new Set(existingMenus.map(menu => formatDateKey(menu.date)))

    const normalizedRows = rows.map(row => ({
      ...row,
      dateAction: row.date ? (existingDateSet.has(row.date) ? 'replace' : 'create') : 'create',
    }))

    return {
      fileName: file.originalname,
      totalRows: normalizedRows.length,
      validRows: normalizedRows.filter(row => row.errors.length === 0).length,
      errorRows: normalizedRows.filter(row => row.errors.length > 0).length,
      dateCount: validDates.length,
      createDateCount: validDates.filter(date => !existingDateSet.has(date)).length,
      replaceDateCount: validDates.filter(date => existingDateSet.has(date)).length,
      rows: normalizedRows,
    }
  }

  async commitDailyMenuImport(rows: any[]) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('Нет строк для импорта меню')
    }

    const invalidRow = rows.find(row => !row.date || !row.dishId || (Array.isArray(row.errors) && row.errors.length > 0))
    if (invalidRow) {
      throw new BadRequestException(`Нельзя импортировать файл с ошибками. Проверьте строку ${invalidRow.rowNumber || '?'}`)
    }

    const grouped = rows.reduce((acc, row) => {
      const date = normalizeText(row.date)
      if (!acc[date]) acc[date] = []
      acc[date].push(row)
      return acc
    }, {} as Record<string, any[]>)

    const dates = Object.keys(grouped).sort()

    for (const date of dates) {
      const items = grouped[date]
        .slice()
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || (Number(a.rowNumber) || 0) - (Number(b.rowNumber) || 0))
        .map((row, index) => ({
          dishId: normalizeText(row.dishId),
          maxQuantity: Number(row.maxQuantity) || 100,
          sortOrder: index,
        }))

      await this.prisma.$transaction(async tx => {
        await tx.dailyMenu.deleteMany({ where: { date: new Date(date) } })
        await tx.dailyMenu.create({
          data: {
            date: new Date(date),
            items: {
              create: items,
            }
          }
        })
      })
    }

    return {
      success: true,
      datesImported: dates.length,
      totalItems: rows.length,
      dates,
    }
  }

  async createDish(data: any) {
    return this.prisma.dish.create({
      data: {
        name: data.name,
        description: data.description || '',
        photoUrl: data.photoUrl || null,
        price: Number(data.price) || 0,
        calories: data.calories ? Number(data.calories) : null,
        weight: data.weight ? Number(data.weight) : null,
        measureUnit: normalizeMeasureUnit(data.measureUnit),
        containsPork: Boolean(data.containsPork),
        containsGarlic: Boolean(data.containsGarlic),
        containsMayonnaise: Boolean(data.containsMayonnaise),
        breakfastPart: normalizeText(data.breakfastPart) || null,
        categoryId: data.categoryId,
      },
      include: { category: true }
    })
  }

  async previewDishImport(file?: any) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл не был загружен')
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]

    if (!firstSheetName) {
      throw new BadRequestException('В Excel-файле нет листов')
    }

    const sheet = workbook.Sheets[firstSheetName]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    if (rawRows.length === 0) {
      throw new BadRequestException('Excel-файл пустой')
    }

    const [categories, existingDishes] = await Promise.all([
      this.prisma.category.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.dish.findMany({ include: { category: true } })
    ])

    const categoryMap = new Map(categories.map(category => [normalizeKey(category.name), category]))
    const dishMap = new Map(existingDishes.map(dish => [normalizeKey(dish.name), dish]))

    const rows = rawRows.map((row, index) => {
      const name = normalizeText(getImportCell(row, ['name', 'название', 'наименование', 'блюдо']))
      const description = normalizeText(getImportCell(row, ['description', 'описание']))
      const categoryName = normalizeText(getImportCell(row, ['category', 'категория']))
      const price = parseImportNumber(getImportCell(row, ['price', 'цена', 'стоимость']))
      const calories = parseImportNumber(getImportCell(row, ['calories', 'калории']))
      const weight = parseImportNumber(getImportCell(row, ['weight', 'вес', 'граммы', 'объем', 'выход']))

      const errors: string[] = []

      if (!name) errors.push('Не указано название блюда')
      if (!categoryName) errors.push('Не указана категория')

      const category = categoryMap.get(normalizeKey(categoryName))
      if (categoryName && !category) {
        errors.push(`Категория «${categoryName}» не найдена в системе`)
      }

      const existingDish = dishMap.get(normalizeKey(name))
      const measureUnit = normalizeMeasureUnit(getImportCell(row, ['measureunit', 'unit', 'ед изм', 'ед. изм', 'единица', 'единица измерения']), category?.name || categoryName || existingDish?.category?.name)

      return {
        rowNumber: index + 2,
        name,
        description,
        price,
        calories,
        weight,
        measureUnit,
        categoryName: category?.name || categoryName,
        categoryId: category?.id || '',
        action: existingDish ? 'update' : 'create',
        existingDishId: existingDish?.id || null,
        existingCategoryName: existingDish?.category?.name || null,
        errors,
      }
    })

    return {
      fileName: file.originalname,
      totalRows: rows.length,
      validRows: rows.filter(row => row.errors.length === 0).length,
      errorRows: rows.filter(row => row.errors.length > 0).length,
      createCount: rows.filter(row => row.errors.length === 0 && row.action === 'create').length,
      updateCount: rows.filter(row => row.errors.length === 0 && row.action === 'update').length,
      rows,
    }
  }

  async commitDishImport(rows: any[]) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('Нет строк для импорта')
    }

    const invalidRow = rows.find(row => !row.name || !row.categoryId || (Array.isArray(row.errors) && row.errors.length > 0))
    if (invalidRow) {
      throw new BadRequestException(`Нельзя импортировать файл с ошибками. Проверьте строку ${invalidRow.rowNumber || '?'}`)
    }

    let created = 0
    let updated = 0

    for (const row of rows) {
      const name = normalizeText(row.name)
      const description = normalizeText(row.description)
      const categoryId = normalizeText(row.categoryId)

      const category = await this.prisma.category.findUnique({ where: { id: categoryId } })
      if (!category) {
        throw new BadRequestException(`Категория для блюда «${name}» не найдена`)
      }

      const existingDish = await this.prisma.dish.findFirst({
        where: { name }
      })

      const payload = {
        name,
        description,
        price: Number(row.price) || 0,
        calories: Number(row.calories) || 0,
        weight: Number(row.weight) || 0,
        measureUnit: normalizeMeasureUnit(row.measureUnit, category.name),
        categoryId,
      }

      if (existingDish) {
        await this.prisma.dish.update({
          where: { id: existingDish.id },
          data: payload,
        })
        updated += 1
      } else {
        await this.prisma.dish.create({
          data: payload,
        })
        created += 1
      }
    }

    return {
      success: true,
      created,
      updated,
      total: created + updated,
    }
  }

  async createCategory(name: string) {
    const trimmedName = (name || '').trim()

    if (!trimmedName) {
      throw new BadRequestException('Название категории обязательно')
    }

    return this.prisma.category.create({
      data: { name: trimmedName }
    })
  }

  async updateUser(actorUserId: string, userId: string, data: any) {
    const actor = await this.getAdminActor(actorUserId)
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })

    if (!existingUser) {
      throw new NotFoundException('Пользователь не найден')
    }

    const nextRole = Object.prototype.hasOwnProperty.call(data, 'role') ? this.normalizeAdminRole(data.role, existingUser.role) : existingUser.role
    this.ensureManagerCanMutateRole(actor.role, existingUser.role)
    this.ensureManagerCanMutateRole(actor.role, nextRole)

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        jobTitle: data.jobTitle || null,
        phone: data.phone || null,
        allergies: data.allergies || null,
        role: nextRole,
        status: normalizeUserStatus(data.status),
        ...(Object.prototype.hasOwnProperty.call(data, 'companyId')
          ? (data.companyId ? { company: { connect: { id: data.companyId } } } : { company: { disconnect: true } })
          : {}),
      },
      select: safeUserSelect
    })
    return user
  }

  async uploadUserAvatar(actorUserId: string, userId: string, file: any) {
    await this.getAdminActor(actorUserId)

    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!existingUser) {
      throw new NotFoundException('Пользователь не найден')
    }

    const avatarUrl = this.saveImage(file, 'avatars')

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: safeUserSelect,
    })
  }

  async updateDish(dishId: string, data: any) {
    return this.prisma.dish.update({
      where: { id: dishId },
      data: {
        name: data.name,
        description: data.description || '',
        photoUrl: Object.prototype.hasOwnProperty.call(data, 'photoUrl') ? (data.photoUrl || null) : undefined,
        price: Number(data.price) || 0,
        calories: data.calories ? Number(data.calories) : null,
        weight: data.weight ? Number(data.weight) : null,
        measureUnit: normalizeMeasureUnit(data.measureUnit),
        containsPork: Boolean(data.containsPork),
        containsGarlic: Boolean(data.containsGarlic),
        containsMayonnaise: Boolean(data.containsMayonnaise),
        breakfastPart: normalizeText(data.breakfastPart) || null,
        categoryId: data.categoryId,
      },
      include: { category: true }
    })
  }

  async uploadDishPhoto(dishId: string, file: any) {
    const existingDish = await this.prisma.dish.findUnique({ where: { id: dishId } })
    if (!existingDish) {
      throw new NotFoundException('Блюдо не найдено')
    }

    const photoUrl = this.saveImage(file, 'dish-photos')
    return this.prisma.dish.update({
      where: { id: dishId },
      data: { photoUrl },
      include: { category: true },
    })
  }

  async removeDishPhoto(dishId: string) {
    const existingDish = await this.prisma.dish.findUnique({ where: { id: dishId } })
    if (!existingDish) {
      throw new NotFoundException('Блюдо не найдено')
    }

    return this.prisma.dish.update({
      where: { id: dishId },
      data: { photoUrl: null },
      include: { category: true },
    })
  }

  async updateCategory(categoryId: string, name: string) {
    const trimmedName = (name || '').trim()

    if (!trimmedName) {
      throw new BadRequestException('Название категории обязательно')
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: { name: trimmedName }
    })
  }

  async updateUserBalance(userId: string, balance: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    })

    if (!user?.company) {
      throw new Error('Company not found')
    }

    return this.prisma.company.update({
      where: { id: user.company.id },
      data: { balance }
    })
  }

  async updateUserLimit(userId: string, limit: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    })

    if (!user?.company) {
      throw new Error('Company not found')
    }

    return this.prisma.company.update({
      where: { id: user.company.id },
      data: { limit }
    })
  }

  async updateUserDailyLimit(userId: string, dailyLimit: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    })

    if (!user?.company) {
      throw new Error('Company not found')
    }

    return this.prisma.company.update({
      where: { id: user.company.id },
      data: { dailyLimit }
    })
  }

  async updateUserRole(actorUserId: string, userId: string, role: string) {
    const actor = await this.getAdminActor(actorUserId)
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })

    if (!existingUser) {
      throw new NotFoundException('Пользователь не найден')
    }

    const nextRole = this.normalizeAdminRole(role, existingUser.role)
    this.ensureManagerCanMutateRole(actor.role, existingUser.role)
    this.ensureManagerCanMutateRole(actor.role, nextRole)

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: nextRole },
      select: safeUserSelect
    })
  }

  async deleteUser(actorUserId: string, userId: string) {
    const actor = await this.getAdminActor(actorUserId)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, role: true },
    })

    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }

    if (actorUserId === userId) {
      throw new BadRequestException('Нельзя удалить самого себя')
    }

    this.ensureManagerCanMutateRole(actor.role, user.role)

    await this.prisma.$transaction(async (tx) => {
      await tx.company.updateMany({
        where: { userId },
        data: { userId: null },
      })
      await tx.chatInviteGuest.deleteMany({ where: { userId } })
      await tx.chatInvite.deleteMany({ where: { createdByUserId: userId } })
      await tx.chatParticipant.deleteMany({ where: { userId } })
      await tx.chatMessage.deleteMany({ where: { senderId: userId } })
      await tx.supportMessage.deleteMany({ where: { userId } })
      await tx.order.deleteMany({ where: { userId } })
      await tx.weeklyMenu.deleteMany({ where: { userId } })
      await tx.employeeAttendance.deleteMany({ where: { userId } })
      await tx.user.delete({ where: { id: userId } })
    })

    return { success: true }
  }

  async deleteCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    })

    if (!company) {
      throw new NotFoundException('Компания не найдена')
    }

    await this.prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: { companyId },
        select: { id: true },
      })
      const userIds = users.map((user) => user.id)

      await tx.company.update({
        where: { id: companyId },
        data: { userId: null },
      })

      if (userIds.length > 0) {
        await tx.chatInviteGuest.deleteMany({ where: { userId: { in: userIds } } })
        await tx.chatInvite.deleteMany({ where: { createdByUserId: { in: userIds } } })
        await tx.chatParticipant.deleteMany({ where: { userId: { in: userIds } } })
        await tx.chatMessage.deleteMany({ where: { senderId: { in: userIds } } })
        await tx.supportMessage.deleteMany({ where: { userId: { in: userIds } } })
        await tx.order.deleteMany({ where: { userId: { in: userIds } } })
        await tx.weeklyMenu.deleteMany({ where: { userId: { in: userIds } } })
        await tx.employeeAttendance.deleteMany({ where: { userId: { in: userIds } } })
        await tx.user.deleteMany({ where: { id: { in: userIds } } })
      }

      await tx.order.deleteMany({ where: { companyId } })
      await tx.company.delete({ where: { id: companyId } })
    })

    return { success: true }
  }

  async deleteDish(dishId: string) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      select: {
        id: true,
        _count: {
          select: {
            dailyMenuItems: true,
            selectedDishes: true,
            orderItems: true,
          },
        },
      },
    })

    if (!dish) {
      throw new NotFoundException('Блюдо не найдено')
    }

    const usage = [
      dish._count.dailyMenuItems ? `в меню на день (${dish._count.dailyMenuItems})` : null,
      dish._count.selectedDishes ? `в заявках клиентов (${dish._count.selectedDishes})` : null,
      dish._count.orderItems ? `в заказах (${dish._count.orderItems})` : null,
    ].filter(Boolean)

    if (usage.length) {
      throw new BadRequestException(`Нельзя удалить блюдо, оно используется ${usage.join(', ')}. Сначала уберите его из связанных сущностей.`)
    }

    await this.prisma.dish.delete({
      where: { id: dishId },
    })

    return { success: true }
  }

  async deleteCategory(categoryId: string, replacementCategoryId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { dishes: true }
        }
      }
    })

    if (!category) {
      throw new NotFoundException('Категория не найдена')
    }

    if (replacementCategoryId && replacementCategoryId === categoryId) {
      throw new BadRequestException('Нельзя переносить блюда в ту же категорию')
    }

    if (category._count.dishes > 0) {
      if (!replacementCategoryId) {
        throw new BadRequestException('В категории есть блюда. Выберите, куда их перенести перед удалением.')
      }

      const replacement = await this.prisma.category.findUnique({ where: { id: replacementCategoryId } })

      if (!replacement) {
        throw new NotFoundException('Категория для переноса не найдена')
      }

      await this.prisma.dish.updateMany({
        where: { categoryId },
        data: { categoryId: replacementCategoryId }
      })
    }

    await this.prisma.category.delete({
      where: { id: categoryId }
    })

    return { success: true }
  }

  async getAllWeeklyMenus(start: string, end: string) {
    const menus = await this.prisma.weeklyMenu.findMany({
      where: start && end
        ? {
            startDate: { gte: new Date(start) },
            endDate: { lte: new Date(end) }
          }
        : undefined,
      include: {
        user: { 
          select: { 
            email: true, 
            firstName: true, 
            lastName: true, 
            companyId: true,
            company: { 
              select: { 
                name: true,
                categoryPrices: { select: { categoryId: true, price: true } }
              } 
            } 
          } 
        },
        selections: { 
          include: { 
            items: { include: { dish: { include: { category: { select: { id: true } } } } } } 
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Post-process: calculate correct prices using company category prices
    const companyPrices = new Map<string, Map<string, number>>();
    for (const menu of menus) {
      const cid = menu.user.companyId;
      if (cid && !companyPrices.has(cid)) {
        const prices = new Map<string, number>();
        if (menu.user.company?.categoryPrices) {
          for (const cp of menu.user.company.categoryPrices) {
            prices.set(cp.categoryId, cp.price);
          }
        }
        companyPrices.set(cid, prices);
      }
    }

    // Attach effective price to each item
    return menus.map(menu => {
      const cid = menu.user.companyId;
      const catPrices = cid ? companyPrices.get(cid) : undefined;
      
      return {
        ...menu,
        selections: menu.selections.map(sel => ({
          ...sel,
          items: sel.items.map(item => ({
            ...item,
            dish: {
              ...item.dish,
              // effectivePrice: company-specific if available, else dish.price
              price: catPrices?.has(item.dish.category?.id || '')
                ? catPrices.get(item.dish.category.id)!
                : item.dish.price
            }
          }))
        }))
      };
    });
  }

  async updateWeeklyMenuStatus(id: string, status: string) {
    return this.prisma.weeklyMenu.update({
      where: { id },
      data: { status }
    })
  }

  async getKitchenSummary(date: string, statuses?: string) {
    const targetDate = new Date(date)
    if (!date || Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('Укажите корректную дату')
    }

    const statusList = (statuses || 'PENDING,CONFIRMED,COMPLETED')
      .split(',')
      .map(value => normalizeText(value).toUpperCase())
      .filter(Boolean)

    const selections = await this.prisma.daySelection.findMany({
      where: {
        date: targetDate,
        weeklyMenu: {
          status: { in: statusList }
        }
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
                phone: true,
                firstName: true,
                lastName: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                    contactPerson: true,
                    address: true,
                    entryConditions: true,
                    routeName: true,
                    deliveryTime: true,
                  }
                }
              }
            }
          }
        },
        items: {
          include: {
            dish: {
              include: { category: true }
            },
            garnishDish: true
          }
        }
      }
    })

    const byDish = new Map<string, any>()
    const byCompany = new Map<string, any>()
    const notes: Array<{ companyName: string, userName: string, note: string }> = []
    let totalPortions = 0
    let totalUtensils = 0
    let needBreadCount = 0

    selections.forEach(selection => {
      const user = selection.weeklyMenu.user
      const company = user.company
      const companyKey = company?.id || `no-company-${user.id}`
      const companyName = company?.name || 'Без компании'
      const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
      const selectionPortions = selection.items.reduce((sum, item) => sum + item.quantity, 0)

      totalPortions += selectionPortions
      totalUtensils += selection.utensils || 0
      if (selection.needBread) needBreadCount += 1
      if (selection.notes?.trim()) {
        notes.push({ companyName, userName, note: selection.notes.trim() })
      }

      if (!byCompany.has(companyKey)) {
        byCompany.set(companyKey, {
          companyId: company?.id || null,
          companyName,
          contactPerson: company?.contactPerson || '',
          address: company?.address || '',
          entryConditions: company?.entryConditions || '',
          routeName: company?.routeName || '',
          deliveryTime: company?.deliveryTime || '',
          selectionsCount: 0,
          totalPortions: 0,
          utensilsTotal: 0,
          needBreadCount: 0,
          dishesMap: new Map<string, any>(),
          users: [],
        })
      }

      const companyEntry = byCompany.get(companyKey)
      companyEntry.selectionsCount += 1
      companyEntry.totalPortions += selectionPortions
      companyEntry.utensilsTotal += selection.utensils || 0
      if (selection.needBread) companyEntry.needBreadCount += 1
      companyEntry.users.push({
        userId: user.id,
        userName,
        email: user.email,
        phone: user.phone || '',
        status: selection.weeklyMenu.status,
        utensils: selection.utensils,
        needBread: selection.needBread,
        notes: selection.notes || '',
        items: selection.items.map(item => ({
          dishName: item.dish.name,
          categoryName: item.dish.category?.name || 'Без категории',
          quantity: item.quantity,
          garnishDishName: item.garnishDish?.name || null,
        }))
      })

      selection.items.forEach(item => {
        const dishKey = item.dishId
        if (!byDish.has(dishKey)) {
          byDish.set(dishKey, {
            dishId: item.dishId,
            dishName: item.dish.name,
            categoryName: item.dish.category?.name || 'Без категории',
            weight: item.dish.weight || 0,
            measureUnit: item.dish.measureUnit || 'GRAM',
            totalQuantity: 0,
            companiesMap: new Map<string, any>(),
          })
        }

        const dishEntry = byDish.get(dishKey)
        dishEntry.totalQuantity += item.quantity

        if (!dishEntry.companiesMap.has(companyKey)) {
          dishEntry.companiesMap.set(companyKey, { companyName, quantity: 0 })
        }
        dishEntry.companiesMap.get(companyKey).quantity += item.quantity

        if (!companyEntry.dishesMap.has(dishKey)) {
          companyEntry.dishesMap.set(dishKey, {
            dishName: item.dish.name,
            categoryName: item.dish.category?.name || 'Без категории',
            quantity: 0,
            garnishDishName: item.garnishDish?.name || null,
          })
        }
        companyEntry.dishesMap.get(dishKey).quantity += item.quantity
        // Add garnish dish as separate production item
        if (item.garnishDishId) {
          const garnishKey = item.garnishDishId + '__garnish'
          if (!byDish.has(garnishKey)) {
            const g = item.garnishDish
            byDish.set(garnishKey, {
              dishId: item.garnishDishId,
              dishName: g.name,
              categoryName: 'Гарниры',
              weight: g.weight || 0,
              measureUnit: g.measureUnit || 'GRAM',
              totalQuantity: 0,
              quantityByCompany: new Map(),
              companiesMap: new Map(),
              isGarnish: true,
            })
          }
          const garnishEntry = byDish.get(garnishKey)
          garnishEntry.totalQuantity += item.quantity
        }
      })
    })

    const dishes = Array.from(byDish.values())
      .map((entry: any) => {
        const totalAmount = (Number(entry.weight) || 0) * (Number(entry.totalQuantity) || 0)
        const productionAmount = entry.measureUnit === 'ML'
          ? totalAmount / 1000
          : entry.measureUnit === 'PCS'
            ? totalAmount
            : totalAmount / 1000

        return {
          dishId: entry.dishId,
          dishName: entry.dishName,
          categoryName: entry.categoryName,
          weight: entry.weight,
          measureUnit: entry.measureUnit,
          totalQuantity: entry.totalQuantity,
          productionAmount,
          productionUnitLabel: entry.measureUnit === 'ML' ? 'л' : entry.measureUnit === 'PCS' ? 'шт' : 'кг',
          portionUnitLabel: entry.measureUnit === 'ML' ? 'мл' : entry.measureUnit === 'PCS' ? 'порц.' : 'г',
          companies: Array.from(entry.companiesMap.values()).sort((a: any, b: any) => b.quantity - a.quantity),
        }
      })
      .sort((a, b) => b.totalQuantity - a.totalQuantity || a.categoryName.localeCompare(b.categoryName, 'ru'))

    const companyEntries = Array.from(byCompany.values())

    const closings = await this.prisma.deliveryClosing.findMany({
      where: {
        date: targetDate,
        companyId: { in: companyEntries.map((entry: any) => entry.companyId).filter(Boolean) },
      }
    })
    const closingMap = new Map(closings.map(closing => [closing.companyId, closing]))

    const companies = companyEntries
      .map((entry: any) => ({
        companyId: entry.companyId,
        companyName: entry.companyName,
        contactPerson: entry.contactPerson,
        address: entry.address,
        entryConditions: entry.entryConditions,
        routeName: entry.routeName,
        deliveryTime: entry.deliveryTime,
        selectionsCount: entry.selectionsCount,
        totalPortions: entry.totalPortions,
        utensilsTotal: entry.utensilsTotal,
        needBreadCount: entry.needBreadCount,
        deliveryClosing: entry.companyId ? (() => {
          const closing = closingMap.get(entry.companyId)
          return closing ? {
            status: closing.status,
            deviationAmount: closing.deviationAmount,
            deviationComment: closing.deviationComment || '',
            managerComment: closing.managerComment || '',
            updatedAt: closing.updatedAt,
          } : null
        })() : null,
        dishes: Array.from(entry.dishesMap.values()).sort((a: any, b: any) => b.quantity - a.quantity || a.categoryName.localeCompare(b.categoryName, 'ru')),
        users: entry.users,
      }))
      .sort((a, b) => b.totalPortions - a.totalPortions || a.companyName.localeCompare(b.companyName, 'ru'))

    return {
      date: formatDateKey(targetDate),
      statuses: statusList,
      summary: {
        selectionsCount: selections.length,
        companiesCount: companies.length,
        dishesCount: dishes.length,
        totalPortions,
        totalUtensils,
        needBreadCount,
        notesCount: notes.length,
      },
      dishes,
      companies,
      notes,
    }
  }

  async exportKitchenSummary(date: string, statuses?: string) {
    const summary = await this.getKitchenSummary(date, statuses)

    const workbook = XLSX.utils.book_new()

    const summaryRows = [
      { Показатель: 'Дата', Значение: summary.date },
      { Показатель: 'Статусы', Значение: summary.statuses.join(', ') },
      { Показатель: 'Заявок', Значение: summary.summary.selectionsCount },
      { Показатель: 'Компаний', Значение: summary.summary.companiesCount },
      { Показатель: 'Блюд', Значение: summary.summary.dishesCount },
      { Показатель: 'Порций', Значение: summary.summary.totalPortions },
      { Показатель: 'Приборов', Значение: summary.summary.totalUtensils },
      { Показатель: 'Нужен хлеб', Значение: summary.summary.needBreadCount },
      { Показатель: 'Особые заметки', Значение: summary.summary.notesCount },
    ]

    const productionRows = summary.dishes.map((dish: any) => ({
      Категория: dish.categoryName,
      Блюдо: `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''}`,
      Порций: dish.totalQuantity,
      'Выход на порцию': `${dish.weight || 0} ${dish.portionUnitLabel}`,
      'К производству': `${Number(dish.productionAmount || 0).toFixed(dish.measureUnit === 'PCS' ? 0 : 2)} ${dish.productionUnitLabel}`,
    }))

    const portioningRows = summary.dishes.map((dish: any) => ({
      Категория: dish.categoryName,
      Блюдо: `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''}`,
      'Порций к фасовке': dish.totalQuantity,
      'На порцию': `${dish.weight || 0} ${dish.portionUnitLabel}`,
      'Итого': `${Number(dish.productionAmount || 0).toFixed(dish.measureUnit === 'PCS' ? 0 : 2)} ${dish.productionUnitLabel}`,
    }))

    const packagingRows = summary.companies
      .slice()
      .sort((a: any, b: any) => (a.routeName || '').localeCompare(b.routeName || '', 'ru') || (a.deliveryTime || '').localeCompare(b.deliveryTime || '', 'ru') || a.companyName.localeCompare(b.companyName, 'ru'))
      .flatMap((company: any) =>
        company.users.map((user: any) => ({
          Рейс: company.routeName || '',
          'Окно доставки': company.deliveryTime || '',
          Компания: company.companyName,
          Контакт: company.contactPerson || '',
          Адрес: company.address || '',
          'Условия заезда': company.entryConditions || '',
          Сотрудник: user.userName,
          Email: user.email,
          Упаковать: user.items.map((item: any) => `${item.dishName}${item.garnishDishName ? ' (' + item.garnishDishName + ')' : ''} × ${item.quantity}`).join(' | '),
          Приборов: user.utensils,
          Хлеб: user.needBread ? 'Да' : 'Нет',
          Примечание: user.notes || '',
        }))
      )

    const logisticsRows = summary.companies
      .slice()
      .sort((a: any, b: any) => (a.routeName || '').localeCompare(b.routeName || '', 'ru') || (a.deliveryTime || '').localeCompare(b.deliveryTime || '', 'ru') || a.companyName.localeCompare(b.companyName, 'ru'))
      .map((company: any) => ({
        Рейс: company.routeName || '',
        'Окно доставки': company.deliveryTime || '',
        Компания: company.companyName,
        Контакт: company.contactPerson || '',
        Адрес: company.address || '',
        'Условия заезда': company.entryConditions || '',
        Порций: company.totalPortions,
        Приборов: company.utensilsTotal,
        Хлеб: company.needBreadCount,
        Сотрудников: company.selectionsCount,
        Доставка: company.deliveryClosing?.status === 'DELIVERED_WITH_DEVIATION' ? 'Доставлено с отклонением' : company.deliveryClosing?.status === 'DELIVERED' ? 'Доставлено' : '',
        'Сумма отклонения': company.deliveryClosing?.deviationAmount || 0,
        Отгрузка: company.dishes.map((dish: any) => `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''} × ${dish.quantity}`).join(' | '),
      }))

    const dishesRows = summary.dishes.map((dish: any) => ({
      Категория: dish.categoryName,
      Блюдо: dish.dishName,
      'Всего порций': dish.totalQuantity,
      Компании: dish.companies.map((company: any) => `${company.companyName}: ${company.quantity}`).join(' | '),
    }))

    const companyRows = summary.companies.map((company: any) => ({
      Компания: company.companyName,
      Заявок: company.selectionsCount,
      Порций: company.totalPortions,
      Приборов: company.utensilsTotal,
      'Нужен хлеб': company.needBreadCount,
      Доставка: company.deliveryClosing?.status === 'DELIVERED_WITH_DEVIATION' ? 'Доставлено с отклонением' : company.deliveryClosing?.status === 'DELIVERED' ? 'Доставлено' : '',
      'Сумма отклонения': company.deliveryClosing?.deviationAmount || 0,
      Блюда: company.dishes.map((dish: any) => `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''} × ${dish.quantity}`).join(' | '),
    }))

    const userRows = summary.companies.flatMap(company =>
      company.users.map(user => ({
        Компания: company.companyName,
        Сотрудник: user.userName,
        Email: user.email,
        Статус: user.status,
        Приборов: user.utensils,
        Хлеб: user.needBread ? 'Да' : 'Нет',
        Примечание: user.notes || '',
        Выбор: user.items.map(item => `${item.dishName}${item.garnishDishName ? ' (' + item.garnishDishName + ')' : ''} × ${item.quantity}`).join(' | '),
      }))
    )

    const notesRows = summary.notes.map(note => ({
      Компания: note.companyName,
      Сотрудник: note.userName,
      Примечание: note.note,
    }))

    const routeGroups = summary.companies
      .slice()
      .sort((a: any, b: any) => (a.routeName || '').localeCompare(b.routeName || '', 'ru') || (a.deliveryTime || '').localeCompare(b.deliveryTime || '', 'ru') || a.companyName.localeCompare(b.companyName, 'ru'))
      .reduce((acc: Record<string, any[]>, company: any) => {
        const route = company.routeName || 'Без рейса'
        if (!acc[route]) acc[route] = []
        acc[route].push(company)
        return acc
      }, {})

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Сводка')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productionRows.length ? productionRows : [{ Сообщение: 'Нет данных' }]), 'Производственный лист')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(portioningRows.length ? portioningRows : [{ Сообщение: 'Нет данных' }]), 'Фасовка')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(packagingRows.length ? packagingRows : [{ Сообщение: 'Нет данных' }]), 'Упаковка')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(logisticsRows.length ? logisticsRows : [{ Сообщение: 'Нет данных' }]), 'Логистика')

    Object.entries(routeGroups).forEach(([route, companies], index) => {
      const sheetName = `${index + 1}. ${route}`.slice(0, 31)
      const rows = (companies as any[]).flatMap(company =>
        company.users.map((user: any) => ({
          'Окно доставки': company.deliveryTime || '',
          Компания: company.companyName,
          Контакт: company.contactPerson || '',
          Адрес: company.address || '',
          'Условия заезда': company.entryConditions || '',
          Сотрудник: user.userName,
          Телефон: user.phone || '',
          Email: user.email,
          Отгрузка: user.items.map((item: any) => `${item.dishName}${item.garnishDishName ? ' (' + item.garnishDishName + ')' : ''} × ${item.quantity}`).join(' | '),
          Приборов: user.utensils,
          Хлеб: user.needBread ? 'Да' : 'Нет',
          Примечание: user.notes || '',
        }))
      )
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Сообщение: 'Нет данных' }]), sheetName)
    })

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dishesRows.length ? dishesRows : [{ Сообщение: 'Нет данных' }]), 'По блюдам')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(companyRows.length ? companyRows : [{ Сообщение: 'Нет данных' }]), 'По компаниям')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(userRows.length ? userRows : [{ Сообщение: 'Нет данных' }]), 'Сотрудники')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(notesRows.length ? notesRows : [{ Сообщение: 'Нет заметок' }]), 'Заметки')

    return {
      date: summary.date,
      buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    }
  }

  async getUserAnalytics(start?: string, end?: string, companyId?: string) {
    const orderDateFilter = start || end
      ? {
          deliveryDate: {
            ...(start ? { gte: new Date(start) } : {}),
            ...(end ? { lte: new Date(end) } : {}),
          }
        }
      : undefined

    const weeklyMenuFilter = start || end
      ? {
          AND: [
            end ? { startDate: { lte: new Date(end) } } : {},
            start ? { endDate: { gte: new Date(start) } } : {},
          ]
        }
      : undefined

    const [orders, weeklyMenus] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          ...(orderDateFilter || {}),
          ...(companyId ? { companyId } : {}),
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
              company: {
                select: {
                  name: true,
                  balance: true,
                  limit: true,
                  dailyLimit: true,
                }
              }
            }
          },
          items: {
            include: {
              dish: {
                include: { category: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.weeklyMenu.findMany({
        where: {
          ...(weeklyMenuFilter || {}),
          ...(companyId ? { user: { companyId } } : {}),
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
              company: {
                select: {
                  name: true,
                  balance: true,
                  limit: true,
                  dailyLimit: true,
                }
              }
            }
          },
          selections: {
            include: {
              items: {
                include: {
                  dish: {
                    include: { category: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    const userMap = new Map<string, any>()

    const ensureUser = (user: any) => {
      if (!userMap.has(user.id)) {
        userMap.set(user.id, {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          allergies: user.allergies,
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
        })
      }

      return userMap.get(user.id)
    }

    for (const order of orders) {
      const analytics = ensureUser(order.user)
      analytics.totalOrders += 1
      analytics.totalSpent += order.totalAmount || 0
      analytics.lastOrderDate = analytics.lastOrderDate
        ? new Date(Math.max(new Date(analytics.lastOrderDate).getTime(), new Date(order.deliveryDate).getTime())).toISOString()
        : new Date(order.deliveryDate).toISOString()

      for (const item of order.items) {
        const dishName = item.dish.name
        const categoryName = item.dish.category?.name || 'Без категории'
        analytics.topDishesMap.set(dishName, (analytics.topDishesMap.get(dishName) || 0) + item.quantity)
        analytics.topCategoriesMap.set(categoryName, (analytics.topCategoriesMap.get(categoryName) || 0) + item.quantity)
      }
    }

    for (const weeklyMenu of weeklyMenus) {
      const analytics = ensureUser(weeklyMenu.user)
      analytics.weeklyMenuCount += 1

      for (const selection of weeklyMenu.selections) {
        for (const item of selection.items) {
          const dishName = item.dish.name
          const categoryName = item.dish.category?.name || 'Без категории'
          analytics.selectedDishCount += item.quantity
          analytics.topDishesMap.set(dishName, (analytics.topDishesMap.get(dishName) || 0) + item.quantity)
          analytics.topCategoriesMap.set(categoryName, (analytics.topCategoriesMap.get(categoryName) || 0) + item.quantity)
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
        topDishes: Array.from(item.topDishesMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, quantity]) => ({ name, quantity })),
        topCategories: Array.from(item.topCategoriesMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, quantity]) => ({ name, quantity })),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
  }

  async getAbcAnalysis(start?: string, end?: string, companyId?: string) {
    const orderDateFilter = start || end
      ? {
          deliveryDate: {
            ...(start ? { gte: new Date(start) } : {}),
            ...(end ? { lte: new Date(end) } : {}),
          }
        }
      : undefined

    const weeklyMenuFilter = start || end
      ? {
          AND: [
            end ? { startDate: { lte: new Date(end) } } : {},
            start ? { endDate: { gte: new Date(start) } } : {},
          ]
        }
      : undefined

    const [orderItems, selectedDishes] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: {
          order: {
            ...(orderDateFilter || {}),
            ...(companyId ? { companyId } : {}),
          },
        },
        include: {
          dish: {
            include: { category: true }
          },
          order: true,
        }
      }),
      this.prisma.selectedDish.findMany({
        where: {
          daySelection: {
            weeklyMenu: {
              ...(weeklyMenuFilter || {}),
              ...(companyId ? { user: { companyId } } : {}),
            },
          }
        },
        include: {
          dish: {
            include: { category: true }
          },
          daySelection: {
            include: {
              weeklyMenu: true,
            }
          }
        }
      })
    ])

    const classify = (items: Array<{ name: string, category: string, metric: number, extra?: Record<string, any> }>) => {
      const sorted = [...items].sort((a, b) => b.metric - a.metric)
      const total = sorted.reduce((sum, item) => sum + item.metric, 0)
      let cumulative = 0

      return sorted.map((item) => {
        cumulative += item.metric
        const cumulativeShare = total > 0 ? (cumulative / total) * 100 : 0
        const segment = cumulativeShare <= 80 ? 'A' : cumulativeShare <= 95 ? 'B' : 'C'

        return {
          ...item,
          share: total > 0 ? Number(((item.metric / total) * 100).toFixed(2)) : 0,
          cumulativeShare: Number(cumulativeShare.toFixed(2)),
          segment,
        }
      })
    }

    const revenueMap = new Map<string, { name: string, category: string, metric: number, quantity: number }>()
    for (const item of orderItems) {
      const key = item.dishId
      const current = revenueMap.get(key) || {
        name: item.dish.name,
        category: item.dish.category?.name || 'Без категории',
        metric: 0,
        quantity: 0,
      }
      current.metric += item.unitPrice * item.quantity
      current.quantity += item.quantity
      revenueMap.set(key, current)
    }

    const selectionMap = new Map<string, { name: string, category: string, metric: number }>()
    for (const item of selectedDishes) {
      const key = item.dishId
      const current = selectionMap.get(key) || {
        name: item.dish.name,
        category: item.dish.category?.name || 'Без категории',
        metric: 0,
      }
      current.metric += item.quantity
      selectionMap.set(key, current)
    }

    return {
      ordersABC: classify(Array.from(revenueMap.values()).map((item) => ({
        name: item.name,
        category: item.category,
        metric: item.metric,
        extra: { quantity: item.quantity }
      }))),
      selectionsABC: classify(Array.from(selectionMap.values()).map((item) => ({
        name: item.name,
        category: item.category,
        metric: item.metric,
      }))),
    }
  }

  async getManagerBoard(search?: string, date?: string) {
    const baseDate = date ? new Date(date) : new Date()
    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Некорректная дата')
    }

    baseDate.setHours(12, 0, 0, 0)
    const startDate = new Date(baseDate)
    startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)

    const companies = await this.prisma.company.findMany({
      where: search ? { name: { contains: normalizeText(search), mode: 'insensitive' } } : undefined,
      select: {
        id: true,
        name: true,
        status: true,
        contactPerson: true,
        workEmail: true,
        routeName: true,
        deliveryTime: true,
        dailyLimit: true,
        notes: true,
        categoryPrices: {
          select: {
            categoryId: true,
            price: true,
            category: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: {
            category: {
              name: 'asc'
            }
          }
        },
        users: {
          select: {
            id: true,
            role: true,
            status: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
      },
      orderBy: { name: 'asc' },
    })

    const companyIds = companies.map(company => company.id)
    const [menus, latestMessages] = await Promise.all([
      companyIds.length
        ? this.prisma.weeklyMenu.findMany({
            where: {
              user: { companyId: { in: companyIds } },
              startDate: { lte: endDate },
              endDate: { gte: startDate },
              status: { not: 'REJECTED' },
            },
            select: {
              id: true,
              status: true,
              createdAt: true,
              userId: true,
              user: {
                select: {
                  companyId: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      companyIds.length
        ? this.prisma.supportMessage.findMany({
            where: { companyId: { in: companyIds } },
            select: {
              companyId: true,
              text: true,
              createdAt: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ])

    const submittedUsersByCompany = new Map<string, Set<string>>()
    const latestMenuByCompany = new Map<string, { status: string, createdAt: Date }>()

    for (const menu of menus) {
      const companyId = menu.user?.companyId
      if (!companyId) continue
      if (!submittedUsersByCompany.has(companyId)) {
        submittedUsersByCompany.set(companyId, new Set())
      }
      submittedUsersByCompany.get(companyId)!.add(menu.userId)

      if (!latestMenuByCompany.has(companyId)) {
        latestMenuByCompany.set(companyId, {
          status: menu.status,
          createdAt: menu.createdAt,
        })
      }
    }

    const latestMessageByCompany = new Map<string, any>()
    for (const message of latestMessages) {
      if (!latestMessageByCompany.has(message.companyId)) {
        latestMessageByCompany.set(message.companyId, message)
      }
    }

    return companies
      .map((company) => {
        const activeUsers = company.users.filter((user) => !['ADMIN', 'SUPERADMIN', 'MANAGER'].includes(user.role) && user.status !== 'DISMISSED')
        const submittedUsers = submittedUsersByCompany.get(company.id) || new Set<string>()
        const missingUsers = activeUsers.filter((user) => !submittedUsers.has(user.id))
        const latestMenu = latestMenuByCompany.get(company.id)
        const latestMessage = latestMessageByCompany.get(company.id)

        return {
          id: company.id,
          name: company.name,
          status: company.status,
          contactPerson: company.contactPerson,
          workEmail: company.workEmail,
          routeName: company.routeName,
          deliveryTime: company.deliveryTime,
          dailyLimit: company.dailyLimit,
          notes: company.notes,
          categoryPrices: company.categoryPrices.map((item) => ({
            categoryId: item.categoryId,
            categoryName: item.category.name,
            price: item.price,
          })),
          summary: {
            employeesTotal: activeUsers.length,
            employeesWithRequest: submittedUsers.size,
            employeesWithoutRequest: missingUsers.length,
            hasRequests: submittedUsers.size > 0,
            latestWeeklyMenuStatus: latestMenu?.status || null,
            latestWeeklyMenuAt: latestMenu?.createdAt || null,
          },
          pendingUsers: missingUsers.slice(0, 8).map((user) => ({
            id: user.id,
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
            email: user.email,
          })),
          latestMessage: latestMessage ? {
            text: latestMessage.text,
            createdAt: latestMessage.createdAt,
            senderName: [latestMessage.user?.firstName, latestMessage.user?.lastName].filter(Boolean).join(' ') || latestMessage.user?.email || 'Пользователь',
            senderRole: latestMessage.user?.role || 'CLIENT',
          } : null,
        }
      })
      .sort((a, b) => {
        if (a.summary.hasRequests !== b.summary.hasRequests) {
          return a.summary.hasRequests ? 1 : -1
        }
        return a.name.localeCompare(b.name, 'ru')
      })
  }

  async getCompanyChats(search?: string) {
    const companies = await this.getManagerBoard(search)
    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      status: company.status,
      latestMessage: company.latestMessage,
      summary: company.summary,
    }))
  }

  async getCompanyChatMessages(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } })

    if (!company) {
      throw new NotFoundException('Компания не найдена')
    }

    const messages = await this.prisma.supportMessage.findMany({
      where: { companyId },
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
      company,
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

  async sendCompanyChatMessage(senderUserId: string, companyId: string, text: string) {
    const normalizedText = normalizeText(text)
    if (!normalizedText) {
      throw new BadRequestException('Сообщение не может быть пустым')
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderUserId },
      select: { id: true, role: true, companyId: true },
    })

    if (!sender) {
      throw new NotFoundException('Пользователь не найден')
    }

    if (!['ADMIN', 'SUPERADMIN', 'MANAGER'].includes(sender.role) && sender.companyId !== companyId) {
      throw new ForbiddenException('Нельзя писать в чат другой компании')
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } })
    if (!company) {
      throw new NotFoundException('Компания не найдена')
    }

    await this.prisma.supportMessage.create({
      data: {
        companyId,
        userId: senderUserId,
        text: normalizedText,
      }
    })

    return this.getCompanyChatMessages(companyId)
  }
  async uploadCompanyDocument(companyId: string, file: Express.Multer.File) {
    const { originalname, filename, size, mimetype } = file
    const doc = await this.prisma.companyFile.create({
      data: {
        companyId,
        fileName: originalname,
        fileUrl: filename,
        sizeBytes: size,
        mimeType: mimetype,
      },
    })
    return doc
  }

  async listCompanyDocuments(companyId: string) {
    return this.prisma.companyFile.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async deleteCompanyDocument(companyId: string, docId: string) {
    const doc = await this.prisma.companyFile.findFirst({
      where: { id: docId, companyId },
    })
    if (!doc) {
      throw new NotFoundException('Документ не найден')
    }
    // Delete file
    const filePath = path.join(process.cwd(), 'uploads', 'company-docs', companyId, doc.fileName)
    try { fs.unlinkSync(filePath) } catch {}
    // Delete from DB
    await this.prisma.companyFile.delete({ where: { id: docId } })
    return { deleted: true }
  }

  async chargeOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { company: true },
    });
    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'PENDING') {
      throw new BadRequestException('Заказ уже обработан');
    }

    const newBalance = (order.company.balance || 0) - order.totalAmount;
    if (newBalance < 0) {
      throw new BadRequestException('Недостаточно средств на балансе компании');
    }

    await this.prisma.company.update({
      where: { id: order.companyId },
      data: { balance: newBalance },
    });

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
      include: {
        items: { include: { dish: true } },
        company: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    return updatedOrder;
  }

  async deferOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { company: true },
    });
    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'PENDING') {
      throw new BadRequestException('Заказ уже обработан');
    }

    await this.prisma.company.update({
      where: { id: order.companyId },
      data: { creditBalance: (order.company.creditBalance || 0) + order.totalAmount },
    });

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'DEFERRED' },
      include: {
        items: { include: { dish: true } },
        company: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    return updatedOrder;
  }
  async adminChangePassword(adminUserId: string, targetUserId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 4) {
      throw new BadRequestException('Пароль должен быть не менее 4 символов');
    }
    const admin = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin) throw new NotFoundException('Администратор не найден');
    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('Пользователь не найден');
    if (admin.role !== 'ADMIN' && admin.role !== 'SUPERADMIN') {
      if (admin.role !== 'MASTER_CLIENT') {
        throw new ForbiddenException('Недостаточно прав для смены пароля');
      }
      if (admin.companyId !== targetUser.companyId) {
        throw new ForbiddenException('Вы можете менять пароль только сотрудникам своей компании');
      }
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword },
    });
    return { message: 'Пароль успешно изменен' };
  }


  async chargeWeeklyMenu(id: string) {
    const weeklyMenu = await this.prisma.weeklyMenu.findUnique({
      where: { id },
      include: {
        user: { select: { companyId: true } },
        selections: { include: { items: { include: { dish: { select: { id: true, name: true, price: true, categoryId: true } } } } } }
      }
    });
    if (!weeklyMenu) throw new NotFoundException('Weekly menu not found');

    // Calculate total with company-specific prices
    const companyId = weeklyMenu.user.companyId;
    const categoryPrices = companyId ? await this.prisma.companyCategoryPrice.findMany({
      where: { companyId },
      select: { categoryId: true, price: true }
    }) : [];
    const priceMap = new Map(categoryPrices.map(cp => [cp.categoryId, cp.price]));
    
    let totalAmount = 0;
    for (const sel of weeklyMenu.selections) {
      for (const item of sel.items) {
        const price = priceMap.get(item.dish.categoryId || '') ?? item.dish.price;
        totalAmount += price * item.quantity;
      }
    }

    // Check balance
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    if (company.balance < totalAmount) {
      throw new BadRequestException('Недостаточно средств на балансе');
    }

    // Create Order and deduct balance
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: companyId },
        data: { balance: { decrement: totalAmount } }
      });

      await tx.weeklyMenu.update({
        where: { id },
        data: { status: 'PAID' }
      });

      const order = await tx.order.create({
        data: {
          orderNumber: 'WM-' + id.slice(0, 8).toUpperCase() + String.fromCharCode(45) + Date.now().toString(36).toUpperCase(),
          userId: weeklyMenu.userId,
          companyId,
          status: 'PAID',
          totalAmount,
          deliveryDate: weeklyMenu.startDate,
          deliveryTime: null,
          comment: 'Списание заявки на меню',
          items: {
            create: weeklyMenu.selections.flatMap(sel =>
              sel.items.map(item => ({
                dishId: item.dish.id,
                quantity: item.quantity,
                unitPrice: priceMap.get(item.dish.categoryId || '') ?? item.dish.price
              }))
            )
          }
        }
      });

      return order;
    });

    return { success: true, orderId: result.id, totalAmount };
  }

  async deferWeeklyMenu(id: string) {
    const weeklyMenu = await this.prisma.weeklyMenu.findUnique({
      where: { id },
      include: {
        user: { select: { companyId: true } },
        selections: {
          include: {
            items: { include: { dish: { select: { id: true, name: true, price: true, categoryId: true } } } }
          }
        }
      }
    });
    if (!weeklyMenu) throw new NotFoundException('Weekly menu not found');

    const priceMap = await getCompanyCategoryPriceMap(this.prisma, weeklyMenu.user.companyId);
    let totalAmount = 0;
    for (const sel of weeklyMenu.selections) {
      for (const item of sel.items) {
        totalAmount += getResolvedCompanyDishPrice(item.dish, priceMap) * item.quantity;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: weeklyMenu.user.companyId },
        data: { creditBalance: { increment: totalAmount } }
      });
      await tx.weeklyMenu.update({
        where: { id },
        data: { status: 'DEFERRED' }
      });
    });

    return { success: true, totalAmount };
  }


  async syncSiteContent() {
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('cd /root/gastroprime/site && npm run build 2>&1', { timeout: 60000 }, (error, stdout) => {
          if (error) {
            console.error('Site sync error:', error.message);
            resolve({ success: false, message: error.message });
          } else {
            console.log('Site sync stdout:', stdout.slice(0, 500));
            resolve({ success: true, message: 'Сайт перестроен' });
          }
        });
      });
    } catch (e) {
      console.error('Site sync error:', e);
      return { success: false, message: e.message };
    }
  }
}
