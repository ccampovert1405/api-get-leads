import {
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  Param,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Response,
  StreamableFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { DocumentsService } from '../../application/services/documents.service';
import { CurrentUser } from '@/auth/infrastructure/decorators/current-user.decorator';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  /**
   * POST /documents/upload
   * Sube un documento privado al bucket
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF, Word, Excel, o imagen',
        },
        category: {
          type: 'string',
          description: 'Categoría del documento (opcional, default: "documents")',
          example: 'leads',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload a private document to S3' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Query('category') category?: string,
  ) {
    if (!user?.id) {
      throw new BadRequestException('User ID not found');
    }

    const result = await this.documentsService.uploadDocument(
      file,
      user.id,
      category || 'documents',
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /documents/:docId/download
   * Descarga un documento privado
   * El backend verifica que el usuario sea propietario antes de servir el archivo
   */
  @Get(':docId/download')
  @ApiOperation({ summary: 'Download a private document' })
  async downloadDocument(
    @Param('docId') docId: string,
    @CurrentUser() user: any,
    @Query('category') category: string = 'documents',
    @Response() res: ExpressResponse,
  ) {
    if (!user?.id) {
      throw new BadRequestException('User ID not found');
    }

    const buffer = await this.documentsService.downloadDocument(
      docId,
      user.id,
      category,
    );

    // Envía el archivo como StreamableFile con headers apropiados
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${docId}"`,
    });

    return new StreamableFile(buffer);
  }

  /**
   * DELETE /documents/:docId
   * Elimina un documento del bucket
   */
  @Delete(':docId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(
    @Param('docId') docId: string,
    @CurrentUser() user: any,
    @Query('category') category: string = 'documents',
    @Query('ext') fileExtension: string = 'pdf',
  ) {
    if (!user?.id) {
      throw new BadRequestException('User ID not found');
    }

    const result = await this.documentsService.deleteDocument(
      docId,
      user.id,
      category,
      fileExtension,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /documents/:docId/preview
   * Preview en línea (si el archivo es PDF o imagen)
   * El navegador lo muestra inline en lugar de descargar
   */
  @Get(':docId/preview')
  @ApiOperation({ summary: 'Preview a document inline' })
  async previewDocument(
    @Param('docId') docId: string,
    @CurrentUser() user: any,
    @Query('category') category: string = 'documents',
    @Response() res: ExpressResponse,
  ) {
    if (!user?.id) {
      throw new BadRequestException('User ID not found');
    }

    const buffer = await this.documentsService.downloadDocument(
      docId,
      user.id,
      category,
    );

    // Inline (preview) en lugar de attachment (download)
    res.set({
      'Content-Type': 'application/pdf', // Cambiar según el tipo de archivo
      'Content-Disposition': `inline; filename="${docId}.pdf"`,
    });

    return new StreamableFile(buffer);
  }
}

