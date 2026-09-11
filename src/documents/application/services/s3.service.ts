import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3Service {
  private s3: AWS.S3;
  private bucket: string;
  private endpoint: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('BUCKET');
    this.endpoint = this.configService.get<string>('ENDPOINT');

    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get<string>('ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('SECRET_ACCESS_KEY'),
      endpoint: this.endpoint,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
  }

  /**
   * Sube un archivo al bucket
   * @param key Ruta del archivo en el bucket (ej: 'documents/file.pdf')
   * @param buffer Buffer del archivo
   * @param mimeType Tipo MIME (ej: 'application/pdf')
   */
  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    };

    await this.s3.upload(params).promise();

    // Retorna la URL pública (si el bucket es público)
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  /**
   * Descarga un archivo desde el bucket
   * @param key Ruta del archivo en el bucket
   */
  async downloadFile(key: string): Promise<Buffer> {
    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    const data = await this.s3.getObject(params).promise();
    return Buffer.from(data.Body as string, 'binary');
  }

  /**
   * Elimina un archivo del bucket
   * @param key Ruta del archivo en el bucket
   */
  async deleteFile(key: string): Promise<void> {
    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    await this.s3.deleteObject(params).promise();
  }

  /**
   * Obtiene la URL pública de un archivo
   * @param key Ruta del archivo en el bucket
   */
  getPublicUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${key}`;
  }
}

