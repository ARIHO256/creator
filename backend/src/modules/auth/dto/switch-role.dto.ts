import { IsIn, IsString } from 'class-validator';

export class SwitchRoleDto {
  @IsString()
  @IsIn(['CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT'])
  role!: 'CREATOR' | 'SELLER' | 'PROVIDER' | 'ADMIN' | 'SUPPORT';
}
