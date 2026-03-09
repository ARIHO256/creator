import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthCompatController } from './auth-compat.controller.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, AuthCompatController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
