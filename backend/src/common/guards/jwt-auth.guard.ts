import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { RequestUser } from '../types/request-user.type.js';

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

    if (authDisabled) {
      request.user = {
        sub: this.configService.get<string>('auth.devUserId') ?? 'user_ronald',
        role: this.configService.get<string>('auth.devUserRole') ?? 'CREATOR',
        email: null
      };
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format');
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
