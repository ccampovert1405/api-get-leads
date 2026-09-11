import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { S3Service } from '../services/s3.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class DocumentsService {
  constructor(private s3Service: S3Service) {}

  /**
   * Sube un documento y retorna la información
   * @param file Express.Multer.File
   * @param userId ID del usuario que sube el documento
   * @param category Categoría del documento (ej: 'leads', 'contracts')
   */
  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    category: string = 'documents',
  ): Promise<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
    uploadedAt: Date;
  }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validar tipo de archivo (opcional: agregar whitelist)
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }

    // Generar key único en el bucket
    const docId = uuid();
    const fileExtension = file.originalname.split('.').pop();
    const key = `${category}/${userId}/${docId}.${fileExtension}`;

    // Subir a S3
    const url = await this.s3Service.uploadFile(key, file.buffer, file.mimetype);

    return {
      id: docId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      uploadedAt: new Date(),
    };
  }

  /**
   * Descarga un documento privado
   * @param docId ID del documento
   * @param userId ID del usuario (para validación)
   * @param category Categoría del documento
   */
  async downloadDocument(
    docId: string,
    userId: string,
    category: string = 'documents',
  ): Promise<Buffer> {
    // En producción, validar que userId sea propietario del documento
    const key = `${category}/${userId}/${docId}.*`;

    // Nota: AWS S3 no permite wildcards en getObject, así que necesitarías
    // almacenar el path exacto en base de datos. Aquí es un ejemplo simplificado.
    // Para producción, guarda el S3 key en tu BD.

    try {
      // Usar el key completo si lo tienes almacenado en BD
      return await this.s3Service.downloadFile(key);
    } catch (error) {
      throw new NotFoundException('Document not found');
    }
  }

  /**
   * Elimina un documento
   * @param docId ID del documento
   * @param userId ID del usuario (para validación)
   * @param category Categoría del documento
   */
  async deleteDocument(
    docId: string,
    userId: string,
    category: string = 'documents',
    fileExtension: string = 'pdf', // Deberías obtener esto de la BD
  ): Promise<{ success: boolean }> {
    const key = `${category}/${userId}/${docId}.${fileExtension}`;

    await this.s3Service.deleteFile(key);

    return { success: true };
  }
}

