import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TelegramService } from '../../telegram/telegram.service';

@Injectable()
export class CrmTasksService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  private async ensureAccess(user: any) {
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'CRM_OPERATOR'].includes(user.role)) {
      throw new ForbiddenException('Доступ запрещён');
    }
  }

  async findAll(user: any, filters: {
    status?: string;
    type?: string;
    dueBefore?: string;
    projectId?: string;
    boardStatus?: string;
    labels?: string;
  }) {
    await this.ensureAccess(user);

    const where: any = {};
    if (user.role === 'MANAGER' || user.role === 'OPERATOR' || user.role === 'CRM_OPERATOR') {
      where.userId = user.userId;
    }
    if (filters.status && filters.status !== 'ALL') where.status = filters.status;
    if (filters.type && filters.type !== 'ALL') where.type = filters.type;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.boardStatus && filters.boardStatus !== 'ALL') where.boardStatus = filters.boardStatus;
    if (filters.labels) {
      where.labels = { hasSome: filters.labels.split(',') };
    }
    if (filters.dueBefore) {
      where.dueDate = { lte: new Date(filters.dueBefore) };
    }

    return this.prisma.crmTask.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        _count: { select: { comments: true, checklists: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { dueDate: 'asc' }, { priority: 'asc' }],
    });
  }

  async create(user: any, data: {
    title: string;
    description?: string;
    dealId?: string;
    companyId?: string;
    type?: string;
    priority?: string;
    dueDate?: string;
    assigneeId?: string;
    projectId?: string;
    labels?: string[];
    parentTaskId?: string;
  }) {
    await this.ensureAccess(user);

    // If projectId specified, check user is a member
    if (data.projectId) {
      const membership = await this.prisma.crmProjectMember.findFirst({
        where: { projectId: data.projectId, userId: user.userId },
      });
      if (!membership && !['SUPERADMIN', 'ADMIN'].includes(user.role)) {
        throw new ForbiddenException('Вы не участник этого проекта');
      }
    }

    console.log('CREATE DEBUG:', JSON.stringify({ assigneeId: data.assigneeId, userId: user.userId, title: data.title }));
    const assigneeId = data.assigneeId || user.userId;

    const task = await this.prisma.crmTask.create({
      data: {
        title: data.title,
        description: data.description,
        userId: assigneeId,
        dealId: data.dealId,
        companyId: data.companyId,
        type: data.type || 'FOLLOW_UP',
        priority: data.priority || 'NORMAL',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId: data.projectId,
        labels: data.labels || [],
        parentTaskId: data.parentTaskId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Notify if assigned to someone else
    if (data.assigneeId && data.assigneeId !== user.userId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: data.assigneeId } });
      if (assignee) {
        const name = assignee.firstName || assignee.email;
        await this.telegram.sendMessage(
          `📋 <b>Новая задача</b>\n\nЗаголовок: ${data.title}\nОтветственный: ${name}\nПостановщик: ${user.firstName || user.email}\n\n`
        );
      }
    }

    return task;
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    projectId?: string | null;
    boardStatus?: string;
    labels?: string[];
    sortOrder?: number;
    userId?: string;
  }) {
    const task = await this.prisma.crmTask.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    if (!task) throw new NotFoundException('Задача не найдена');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.boardStatus !== undefined) updateData.boardStatus = data.boardStatus;
    if (data.labels !== undefined) updateData.labels = data.labels;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.userId !== undefined) updateData.userId = data.userId;

    const result = await this.prisma.crmTask.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Telegram notification on reassignment
    if (data.userId && data.userId !== task.userId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: data.userId } });
      if (assignee) {
        await this.telegram.sendMessage(
          `🔄 <b>Переназначение задачи</b>\n\nЗаголовок: ${task.title}\nНовый ответственный: ${assignee.firstName || assignee.email}\n\n`
        );
      }
    }

    return result;
  }

  async complete(id: string) {
    const task = await this.prisma.crmTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Задача не найдена');

    return this.prisma.crmTask.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  async remove(id: string) {
    const task = await this.prisma.crmTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Задача не найдена');
    await this.prisma.crmTask.delete({ where: { id } });
    return { success: true };
  }

  // ---- Comments ----

  async findComments(taskId: string) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    return this.prisma.crmTaskComment.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createComment(user: any, taskId: string, data: { text: string; mentions?: string[] }) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    const comment = await this.prisma.crmTaskComment.create({
      data: {
        taskId,
        userId: user.userId,
        text: data.text,
        mentions: data.mentions || [],
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Telegram notification for @mentions
    if (data.mentions && data.mentions.length > 0) {
      const mentionedUsers = await this.prisma.user.findMany({
        where: { id: { in: data.mentions } },
      });
      for (const mentioned of mentionedUsers) {
        if (mentioned.id === user.userId) continue;
        await this.telegram.sendMessage(
          `💬 <b>Упоминание в комментарии</b>\n\nЗадача: ${task.title}\nАвтор: ${user.firstName || user.email}\nКомментарий: ${data.text.substring(0, 200)}`
        );
      }
    }

    return comment;
  }

  // ---- Checklists ----

  async createChecklist(taskId: string, data: { title: string }) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    // Get max sort order
    const last = await this.prisma.crmTaskChecklist.findFirst({
      where: { taskId },
      orderBy: { sortOrder: 'desc' },
    });

    return this.prisma.crmTaskChecklist.create({
      data: {
        taskId,
        title: data.title,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateChecklist(taskId: string, id: string, data: { title?: string; completed?: boolean }) {
    const checklist = await this.prisma.crmTaskChecklist.findFirst({
      where: { id, taskId },
    });
    if (!checklist) throw new NotFoundException('Чек-лист не найден');

    return this.prisma.crmTaskChecklist.update({
      where: { id },
      data,
    });
  }

  async deleteChecklist(taskId: string, id: string) {
    const checklist = await this.prisma.crmTaskChecklist.findFirst({
      where: { id, taskId },
    });
    if (!checklist) throw new NotFoundException('Чек-лист не найден');

    await this.prisma.crmTaskChecklist.delete({ where: { id } });
    return { success: true };
  }

  async createChecklistItem(taskId: string, listId: string, data: { text: string; assignedTo?: string }) {
    const checklist = await this.prisma.crmTaskChecklist.findFirst({
      where: { id: listId, taskId },
    });
    if (!checklist) throw new NotFoundException('Чек-лист не найден');

    const last = await this.prisma.crmTaskChecklistItem.findFirst({
      where: { checklistId: listId },
      orderBy: { sortOrder: 'desc' },
    });

    return this.prisma.crmTaskChecklistItem.create({
      data: {
        checklistId: listId,
        text: data.text,
        assignedTo: data.assignedTo,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateChecklistItem(
    taskId: string,
    listId: string,
    itemId: string,
    data: { text?: string; completed?: boolean; assignedTo?: string },
  ) {
    const item = await this.prisma.crmTaskChecklistItem.findFirst({
      where: { id: itemId, checklistId: listId, checklist: { taskId } },
    });
    if (!item) throw new NotFoundException('Элемент чек-листа не найден');

    return this.prisma.crmTaskChecklistItem.update({
      where: { id: itemId },
      data,
    });
  }

  async deleteChecklistItem(taskId: string, listId: string, itemId: string) {
    const item = await this.prisma.crmTaskChecklistItem.findFirst({
      where: { id: itemId, checklistId: listId, checklist: { taskId } },
    });
    if (!item) throw new NotFoundException('Элемент чек-листа не найден');

    await this.prisma.crmTaskChecklistItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  // ---- Attachments ----

  async createAttachment(user: any, taskId: string, file: any) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    if (!file) throw new BadRequestException('Файл не загружен');

    return this.prisma.crmTaskAttachment.create({
      data: {
        taskId,
        userId: user.userId,
        fileName: file.originalname || file.filename,
        fileUrl: file.path || file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  async deleteAttachment(taskId: string, id: string) {
    const attachment = await this.prisma.crmTaskAttachment.findFirst({
      where: { id, taskId },
    });
    if (!attachment) throw new NotFoundException('Вложение не найдено');

    await this.prisma.crmTaskAttachment.delete({ where: { id } });
    return { success: true };
  }
  async findOne(id: string) {
    const task = await this.prisma.crmTask.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },

        _count: { select: { comments: true, attachments: true, checklists: true } },
      },
    });
    if (!task) throw new NotFoundException('Задача не найдена');
    return task;
  }

  async findChecklists(taskId: string) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    return this.prisma.crmTaskChecklist.findMany({
      where: { taskId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAttachments(taskId: string) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    return this.prisma.crmTaskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSubTasks(taskId: string) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    return this.prisma.crmTask.findMany({
      where: { parentTaskId: taskId },
      select: { id: true, title: true, completedAt: true, status: true },
    });
  }

  async createSubTask(user: any, taskId: string, data: { title: string }) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    return this.prisma.crmTask.create({
      data: {
        title: data.title,
        userId: user.userId,
        parentTaskId: taskId,
      },
    });
  }

  async updateSubTask(taskId: string, subId: string, data: { title?: string; completed?: boolean }) {
    const sub = await this.prisma.crmTask.findFirst({ where: { id: subId, parentTaskId: taskId } });
    if (!sub) throw new NotFoundException('Подзадача не найдена');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.completed !== undefined) {
      updateData.status = data.completed ? 'COMPLETED' : 'PENDING';
      updateData.completedAt = data.completed ? new Date() : null;
    }

    return this.prisma.crmTask.update({
      where: { id: subId },
      data: updateData,
      select: { id: true, title: true, status: true, completedAt: true },
    });
  }

  async deleteSubTask(taskId: string, subId: string) {
    const sub = await this.prisma.crmTask.findFirst({ where: { id: subId, parentTaskId: taskId } });
    if (!sub) throw new NotFoundException('Подзадача не найдена');

    await this.prisma.crmTask.delete({ where: { id: subId } });
    return { success: true };
  }

  async addLabel(taskId: string, data: { name: string; color: string }) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    const currentLabels = task.labels as string[] || [];
    // Labels are stored as JSON strings: "name||color"
    // Check if a label with this name already exists
    const existingIndex = currentLabels.findIndex(l => l.startsWith(data.name + '||'));
    if (existingIndex >= 0) {
      currentLabels[existingIndex] = `${data.name}||${data.color}`;
    } else {
      currentLabels.push(`${data.name}||${data.color}`);
    }

    await this.prisma.crmTask.update({
      where: { id: taskId },
      data: { labels: currentLabels },
    });

    return { id: `${data.name}||${data.color}`, name: data.name, color: data.color };
  }

  async removeLabel(taskId: string, labelId: string) {
    const task = await this.prisma.crmTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задача не найдена');

    const currentLabels = task.labels as string[] || [];
    const updatedLabels = currentLabels.filter(l => l !== labelId);

    await this.prisma.crmTask.update({
      where: { id: taskId },
      data: { labels: updatedLabels },
    });

    return { success: true };
  }
}
