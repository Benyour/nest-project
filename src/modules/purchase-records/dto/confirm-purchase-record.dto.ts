import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ConfirmPurchaseRecordDto {
  @ApiPropertyOptional({ description: '确认人用户 ID' })
  @IsOptional()
  @IsUUID()
  confirmedById?: string;

  @ApiPropertyOptional({ description: '确认备注' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}
