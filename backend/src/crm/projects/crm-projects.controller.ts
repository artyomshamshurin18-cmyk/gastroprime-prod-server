import { Controller, Get, Post, Patch, Delete, Param, Body, Request, Query, BadRequestException, NotFoundException, UseInterceptors, UseGuards, UploadedFile, UploadedFiles } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { CrmProjectsService } from './crm-projects.service';

@UseGuards(AuthGuard("jwt"))
@Controller('crm/projects')
export class CrmProjectsController {
  constructor(private projectsService: CrmProjectsService) {}

  @Get()
  async findAll(@Request() req, @Query('status') status?: string) {
    return this.projectsService.findAll(req.user, status);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.projectsService.findOne(req.user, id);
  }

  @Post()
  async create(@Request() req, @Body() data: any) {
    return this.projectsService.create(req.user, data);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.projectsService.update(req.user, id, data);
  }

  @Patch(':id/archive')
  async archive(@Request() req, @Param('id') id: string) {
    return this.projectsService.archive(req.user, id);
  }

  @Patch(':id/complete')
  async complete(@Request() req, @Param('id') id: string) {
    return this.projectsService.complete(req.user, id);
  }

  @Patch(':id/restore')
  async restore(@Request() req, @Param('id') id: string) {
    return this.projectsService.restore(req.user, id);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return this.projectsService.delete(req.user, id);
  }

  @Get(':id/members')
  async getMembers(@Request() req, @Param('id') id: string) {
    return this.projectsService.getMembers(req.user, id);
  }

  @Post(':id/members')
  async addMember(@Request() req, @Param('id') id: string, @Body() data: { userId: string; role: string }) {
    return this.projectsService.addMember(req.user, id, data);
  }

  @Delete(':id/members/:memberId')
  async removeMember(@Request() req, @Param('id') id: string, @Param('memberId') memberId: string) {
    return this.projectsService.removeMember(req.user, id, memberId);
  }

  @Get(':id/files')
  async getProjectFiles(@Param('id') id: string) {
    return this.projectsService.getProjectFiles(id);
  }

  @Get(':id/messages')
  async getProjectMessages(@Param('id') id: string, @Query('page') page?: string) {
    return this.projectsService.getProjectMessages(id, page ? parseInt(page) : 1);
  }

  @Post(':id/messages')
  @UseInterceptors(FilesInterceptor('files', 10))
  async createProjectMessage(@Request() req, @Param('id') id: string, @UploadedFiles() files: any[], @Body() body: any) {
    // При multipart/form-data text может быть в body.text или req.body.text
    const text = (body && body.text) || (req.body && req.body.text) || '';
    const message = await this.projectsService.createProjectMessage(req.user.userId, id, text);
    // Если есть файлы — прикрепляем к сообщению
    if (files && files.length > 0) {
      for (const file of files) {
        await this.projectsService.uploadProjectAttachment(req.user.userId, message.id, file);
      }
    }
    return message;
  }

  @Delete(':id/messages/:messageId')
  async deleteProjectMessage(@Param('messageId') messageId: string) {
    return this.projectsService.deleteProjectMessage(messageId);
  }

  @Post(':id/messages/:messageId/attachments')
  @UseInterceptors(FileInterceptor('file', { dest: 'uploads/project-messages' }))
  async uploadAttachment(@Request() req, @Param('messageId') messageId: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Файл не загружен');
    return this.projectsService.uploadProjectAttachment(req.user.userId, messageId, file);
  }

  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file', { dest: 'uploads/project-files' }))
  async uploadProjectFile(@Request() req, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Файл не загружен');
    // Декодируем кириллицу — multer может отдавать latin1 вместо utf8
    if (file.originalname) {
      try {
        const buf = Buffer.from(file.originalname, 'latin1');
        file.originalname = buf.toString('utf8');
      } catch (e) {}
    }
    return this.projectsService.uploadProjectFile(req.user.userId, id, file);
  }

  @Delete(':id/files/:fileId')
  async deleteProjectFile(@Param('fileId') fileId: string) {
    return this.projectsService.deleteProjectFile(fileId);
  }
}
