import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateContentBlockDto, UpdateContentBlockDto, CreateContentPhotoDto } from './content.dto';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  // === Content Blocks ===

  async getBlocks(pageSlug?: string, type?: string) {
    const where: any = {};
    if (pageSlug) where.pageSlug = pageSlug;
    if (type) where.type = type;

    return this.prisma.contentBlock.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getBlock(id: number) {
    const block = await this.prisma.contentBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('Content block not found');
    return block;
  }

  async createBlock(dto: CreateContentBlockDto) {
    return this.prisma.contentBlock.create({ data: dto as any });
  }

  async updateBlock(id: number, dto: UpdateContentBlockDto) {
    await this.getBlock(id);
    return this.prisma.contentBlock.update({
      where: { id },
      data: dto as any,
    });
  }

  async deleteBlock(id: number) {
    await this.getBlock(id);
    return this.prisma.contentBlock.delete({ where: { id } });
  }

  // === Content Photos ===

  async getPhotos(galleryKey?: string) {
    const where: any = {};
    if (galleryKey) where.galleryKey = galleryKey;

    return this.prisma.contentPhoto.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getPhoto(id: number) {
    const photo = await this.prisma.contentPhoto.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Content photo not found');
    return photo;
  }

  async createPhoto(dto: CreateContentPhotoDto, file: Express.Multer.File) {
    const data: any = {
      galleryKey: dto.galleryKey,
      filename: file.originalname,
      filepath: `/uploads/content/${file.filename}`,
      title: dto.title || null,
      sortOrder: dto.sortOrder || 0,
      visible: dto.visible !== undefined ? dto.visible : true,
    };
    return this.prisma.contentPhoto.create({ data });
  }

  async deletePhoto(id: number) {
    await this.getPhoto(id);
    return this.prisma.contentPhoto.delete({ where: { id } });
  }
}
