import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | undefined>;
      user?: { role?: string; roles?: string[] };
    }>();
    const authDisabled = this.configService.get<boolean>('auth.disabled');
    const hasAuthToken = Boolean(request.headers?.authorization || request.headers?.cookie);

    if (authDisabled && !hasAuthToken) {
      return true;
    }

    const activeRole = request.user?.role;
    const roles = Array.isArray(request.user?.roles) ? request.user!.roles : activeRole ? [activeRole] : [];

    if (roles.length === 0 || !roles.some((role) => requiredRoles.includes(role))) {
      throw new ForbiddenException('Insufficient role privileges');
    }

    return true;
  }
}
