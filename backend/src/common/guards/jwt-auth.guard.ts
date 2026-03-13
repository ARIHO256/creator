import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { RequestUser } from '../types/request-user.type.js';
import { ACCESS_TOKEN_COOKIE_NAME, parseCookieHeader } from '../../modules/auth/auth.cookies.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const authDisabled = this.configService.get<boolean>('auth.disabled');
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: RequestUser }>();
    const authHeader = request.headers.authorization;
    const cookies = parseCookieHeader(request.headers.cookie);
    let token = '';

    if (authHeader) {
      const [scheme, bearerToken] = authHeader.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !bearerToken) {
        throw new UnauthorizedException('Invalid authorization format');
      }
      token = bearerToken;
    } else {
      token = cookies[ACCESS_TOKEN_COOKIE_NAME] || '';
    }

    if (!token) {
      if (authDisabled) {
        const role = this.configService.get<string>('auth.devUserRole') ?? 'SELLER';
        request.user = {
          sub: this.configService.get<string>('auth.devUserId') ?? 'user_seller_evhub',
          role,
          roles: [role],
          email: null
        };
        return true;
      }
      throw new UnauthorizedException('Missing Authorization header');
    }

    try {
      const accessSecret = this.configService.get<string>('auth.accessSecret');
      if (!accessSecret) {
        throw new UnauthorizedException('JWT access secret is not configured');
      }

      request.user = this.jwtService.verify<RequestUser>(token, {
        secret: accessSecret
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
