import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CrmProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any, statusFilter?: string) {
    const where: any = {};
    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }
    return this.prisma.crmProject.findMany({
      where,
      include: {
        _count: { select: { members: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: any, id: string) {
    const project = await this.prisma.crmProject.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        company: { select: { id: true, name: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(user: any, data: any) {
    const project = await this.prisma.crmProject.create({
      data: {
        name: data.name,
        description: data.description,
        companyId: data.companyId,
        dealId: data.dealId,
        color: data.color,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    if (user?.userId) {
      await this.prisma.crmProjectMember.create({
        data: { projectId: project.id, userId: user.userId, role: 'OWNER' },
      });
    }
    return this.prisma.crmProject.findUnique({
      where: { id: project.id },
      include: {
        _count: { select: { members: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
  }

  async update(user: any, id: string, data: any) {
    return this.prisma.crmProject.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        color: data.color,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        _count: { select: { members: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
  }

  async archive(user: any, id: string) {
    return this.updateStatus(id, 'ARCHIVED');
  }

  async complete(user: any, id: string) {
    return this.updateStatus(id, 'COMPLETED');
  }

  async restore(user: any, id: string) {
    return this.updateStatus(id, 'ACTIVE');
  }

  private async updateStatus(id: string, status: string) {
    const project = await this.prisma.crmProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.crmProject.update({
      where: { id },
      data: { status },
      include: {
        _count: { select: { members: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
  }

  async delete(user: any, id: string) {
    const project = await this.prisma.crmProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.crmProject.delete({ where: { id } });
  }

  async addMember(user: any, projectId: string, data: { userId: string; role: string }) {
    return this.prisma.crmProjectMember.create({
      data: { projectId, userId: data.userId, role: data.role ?? 'MEMBER' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async removeMember(user: any, projectId: string, memberId: string) {
    const member = await this.prisma.crmProjectMember.findUnique({ where: { id: memberId } });
    if (!member || member.projectId !== projectId) throw new NotFoundException('Member not found');
    return this.prisma.crmProjectMember.delete({ where: { id: memberId } });
  }

  async getMembers(user: any, projectId: string) {
    return this.prisma.crmProjectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async getProjectMessages(projectId: string, page: number = 1) {
    const take = 50;
    const skip = (page - 1) * take;
    const messages = await this.prisma.crmProjectMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take, skip,
    });
    const total = await this.prisma.crmProjectMessage.count({ where: { projectId } });
    const userIds = [...new Set(messages.map(m => m.userId))];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const messagesWithUser = messages.map(m => ({ ...m, user: userMap[m.userId] || null }));
    const messageIds = messages.map(m => m.id);
    const attachments = messageIds.length > 0
      ? await this.prisma.crmProjectAttachment.findMany({ where: { messageId: { in: messageIds } } })
      : [];
    const attachmentMap: Record<string, any[]> = {};
    for (const att of attachments) {
      if (!attachmentMap[att.messageId]) attachmentMap[att.messageId] = [];
      attachmentMap[att.messageId].push(att);
    }
    const result = messagesWithUser.map(m => ({ ...m, attachments: attachmentMap[m.id] || [] }));
    return { messages: result.reverse(), total, page, totalPages: Math.ceil(total / take) };
  }

  async createProjectMessage(userId: string, projectId: string, text: string) {
    return this.prisma.crmProjectMessage.create({
      data: { projectId, userId, text },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
  }

  async deleteProjectMessage(messageId: string) {
    await this.prisma.crmProjectAttachment.deleteMany({ where: { messageId } });
    return this.prisma.crmProjectMessage.delete({ where: { id: messageId } });
  }

  async uploadProjectAttachment(userId: string, messageId: string, file: any) {
    if (!file) throw new BadRequestException('Файл не загружен');
    // Декодируем кириллицу — multer может отдавать latin1 вместо utf8
    let originalName = file.originalname || 'file';
    try { const buf = Buffer.from(originalName, 'latin1'); originalName = buf.toString('utf8'); } catch (e) {}
    const fileName = originalName;
    const destDir = '/var/www/uploads/project-files';
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const filePath = destDir + '/' + fileName;
    const buf = file.buffer || fs.readFileSync(file.path);
    fs.writeFileSync(filePath, buf);
    try { fs.unlinkSync(file.path); } catch (e) {}
    return this.prisma.crmProjectAttachment.create({
      data: { messageId, fileName, fileUrl: '/uploads/project-files/' + encodeURIComponent(fileName), fileSize: file.size || 0 }
    });
  }

  async getProjectFiles(projectId: string) {
    return this.prisma.crmProjectAttachment.findMany({
      where: { projectId, messageId: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  async uploadProjectFile(userId: string, projectId: string, file: any) {
    if (!file) throw new BadRequestException('Файл не загружен');
    const fileName = file.originalname || 'file';
    const destDir = '/var/www/uploads/project-files';
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const filePath = destDir + '/' + fileName;
    const buf = file.buffer || fs.readFileSync(file.path);
    fs.writeFileSync(filePath, buf);
    try { fs.unlinkSync(file.path); } catch (e) {}
    return this.prisma.crmProjectAttachment.create({
      data: { projectId, fileName, fileUrl: '/uploads/project-files/' + encodeURIComponent(fileName), fileSize: file.size || 0, messageId: null }
    });
  }

  async getProjectAttachment(fileId: string) {
    return this.prisma.crmProjectAttachment.findUnique({ where: { id: fileId } });
  }

  async deleteProjectFile(fileId: string) {
    const file = await this.prisma.crmProjectAttachment.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('Файл не найден');
    // Если это файл проекта (не сообщения), удаляем с диска
    if (!file.messageId && file.fileUrl) {
      const fullPath = '/var/www' + decodeURIComponent(file.fileUrl);
      try { fs.unlinkSync(fullPath); } catch (e) { /* файл может не существовать */ }
    }
    return this.prisma.crmProjectAttachment.delete({ where: { id: fileId } });
  }
}
