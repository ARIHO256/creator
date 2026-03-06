import { Controller, Get, Inject } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { AuthService } from './auth.service.js';

@Controller()
export class AuthCompatController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.sub);
  }
}
