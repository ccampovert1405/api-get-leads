import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'administrator' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: '4dmin2026&&' })
  @IsString()
  @MinLength(8)
  password: string;
}
