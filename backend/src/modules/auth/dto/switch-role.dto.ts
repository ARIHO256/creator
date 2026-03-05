import { IsIn, IsString } from 'class-validator';

export class SwitchRoleDto {
  @IsString()
  @IsIn(['CREATOR', 'ADMIN'])
  role!: 'CREATOR' | 'ADMIN';
}
