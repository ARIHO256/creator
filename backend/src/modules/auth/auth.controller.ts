import { Body, Controller, Get, Headers, HttpCode, Inject, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  clearCookie,
  parseCookieHeader,
  serializeCookie
} from './auth.cookies.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RecoverAccountDto } from './dto/recover-account.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SwitchRoleDto } from './dto/switch-role.dto.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  private applyAuthCookies(reply: FastifyReply, tokens: { accessToken?: string; refreshToken?: string }) {
    const secure = process.env.NODE_ENV === 'production';
    const cookies = [];
    if (tokens.accessToken) {
      cookies.push(
        serializeCookie(ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, {
          httpOnly: true,
          secure,
          sameSite: 'Lax',
          path: '/',
          maxAge: 60 * 60
        })
      );
    }
    if (tokens.refreshToken) {
      cookies.push(
        serializeCookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
          httpOnly: true,
          secure,
          sameSite: 'Lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30
        })
      );
    }
    if (cookies.length) {
      reply.header('set-cookie', cookies);
    }
  }

  private clearAuthCookies(reply: FastifyReply) {
    const secure = process.env.NODE_ENV === 'production';
    reply.header('set-cookie', [
      clearCookie(ACCESS_TOKEN_COOKIE_NAME, { httpOnly: true, secure, sameSite: 'Lax', path: '/' }),
      clearCookie(REFRESH_TOKEN_COOKIE_NAME, { httpOnly: true, secure, sameSite: 'Lax', path: '/' })
    ]);
  }

  @Public()
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Public()
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('login')
  async login(@Body() payload: LoginDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const tokens = await this.authService.login(payload);
    this.applyAuthCookies(reply, tokens);
    return tokens;
  }

  @Public()
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('refresh')
  async refresh(
    @Body() payload: RefreshTokenDto,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const cookies = parseCookieHeader(cookieHeader);
    const tokens = await this.authService.refresh({
      refreshToken: payload.refreshToken || cookies[REFRESH_TOKEN_COOKIE_NAME]
    });
    this.applyAuthCookies(reply, tokens);
    return tokens;
  }

  @Public()
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('recovery')
  recovery(@Body() payload: RecoverAccountDto) {
    return this.authService.recovery(payload);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() payload: RefreshTokenDto,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const cookies = parseCookieHeader(cookieHeader);
    const refreshToken = payload.refreshToken || cookies[REFRESH_TOKEN_COOKIE_NAME];
    const result = await this.authService.logout({ refreshToken });
    this.clearAuthCookies(reply);
    return result;
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
