import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  handle?: string;

  @IsOptional()
  @IsString()
  @IsIn(['CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT'])
  role?: 'CREATOR' | 'SELLER' | 'PROVIDER' | 'ADMIN' | 'SUPPORT';

  @IsOptional()
  @IsArray()
  @IsIn(['CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT'], { each: true })
  roles?: Array<'CREATOR' | 'SELLER' | 'PROVIDER' | 'ADMIN' | 'SUPPORT'>;

  @IsOptional()
  @IsString()
  sellerHandle?: string;

  @IsOptional()
  @IsString()
  sellerDisplayName?: string;

  @IsOptional()
  @IsString()
  @IsIn(['SELLER', 'PROVIDER', 'BRAND'])
  sellerKind?: 'SELLER' | 'PROVIDER' | 'BRAND';
}
