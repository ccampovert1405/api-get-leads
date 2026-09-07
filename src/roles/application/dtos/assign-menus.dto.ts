import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AssignMenusDto {
  @ApiProperty({
    description: 'Arreglo de IDs de menús a vincular con el rol',
    example: ['uuid-menu-1', 'uuid-menu-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  menuIds: string[];
}
