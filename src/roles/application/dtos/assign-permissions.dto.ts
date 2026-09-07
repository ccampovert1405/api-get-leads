import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'Arreglo de IDs de permisos a vincular con el rol',
    example: ['uuid-perm-1', 'uuid-perm-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
