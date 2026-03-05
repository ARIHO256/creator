import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthCompatController } from './auth-compat.controller.js';

@Module({
  controllers: [AuthController, AuthCompatController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
