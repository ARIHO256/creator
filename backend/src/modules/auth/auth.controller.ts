import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SwitchRoleDto } from './dto/switch-role.dto.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Public()
  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() payload: RefreshTokenDto) {
    return this.authService.refresh(payload);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@CurrentUser() user: RequestUser, @Body() payload: RefreshTokenDto) {
    return this.authService.logout(user.sub, payload);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.sub);
  }

  @Post('switch-role')
  switchRole(@CurrentUser() user: RequestUser, @Body() payload: SwitchRoleDto) {
    return this.authService.switchRole(user.sub, payload);
  }
}
