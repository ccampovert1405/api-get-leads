import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('documents')
@Index('IDX_DOCUMENTS_USER_ID', ['userId'])
@Index('IDX_DOCUMENTS_CATEGORY', ['category'])
@Index('IDX_DOCUMENTS_CREATED_AT', ['createdAt'])
export class DocumentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ name: 's3_key', type: 'varchar', length: 500 })
  s3Key: string;

  @Column({ type: 'varchar', length: 100 })
  category: string; // 'documents', 'leads', 'contracts', etc.

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number; // en bytes

  @Column({ name: 'file_extension', type: 'varchar', length: 10 })
  fileExtension: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

