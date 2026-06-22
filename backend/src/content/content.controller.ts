import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, UseInterceptors,
  UploadedFile, ParseIntPipe, Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { ContentService } from './content.service';
import { AdminGuard } from '../common/admin.guard';
import { CreateContentBlockDto, UpdateContentBlockDto, CreateContentPhotoDto } from './content.dto';

@Controller('content')
export class ContentController {
  constructor(private contentService: ContentService) {}

  // === Public endpoints (no auth) ===
  @Get('blocks')
  async getBlocks(
    @Query('pageSlug') pageSlug?: string,
    @Query('type') type?: string,
  ) {
    return this.contentService.getBlocks(pageSlug, type);
  }

  @Get('photos')
  async getPhotos(@Query('galleryKey') galleryKey?: string) {
    return this.contentService.getPhotos(galleryKey);
  }

  // === Admin endpoints (JWT + AdminGuard) ===
  @Post('blocks')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async createBlock(@Body() dto: CreateContentBlockDto) {
    return this.contentService.createBlock(dto);
  }

  @Put('blocks/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async updateBlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContentBlockDto,
  ) {
    return this.contentService.updateBlock(id, dto);
  }

  @Delete('blocks/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async deleteBlock(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.deleteBlock(id);
  }

  @Post('photos')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = '/var/www/gastroprime/uploads/content';
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const name = `${Date.now()}-${file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9а-яА-Я]/g, '_').slice(0, 50)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(
    @Body() dto: CreateContentPhotoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.contentService.createPhoto(dto, file);
  }

  @Delete('photos/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async deletePhoto(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.deletePhoto(id);
  }
}
