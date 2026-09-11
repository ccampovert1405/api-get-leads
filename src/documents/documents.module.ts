import { Module } from '@nestjs/common';
import { DocumentsController } from './infrastructure/controllers/documents.controller';
import { DocumentsService } from './application/services/documents.service';
import { S3Service } from './application/services/s3.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, S3Service],
  exports: [DocumentsService, S3Service],
})
export class DocumentsModule {}

