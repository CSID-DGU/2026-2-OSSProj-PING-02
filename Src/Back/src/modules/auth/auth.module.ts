import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthProvider } from '../../database/entities/auth-provider.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { User } from '../../database/entities/user.entity';
import { TermsModule } from '../terms/terms.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthProvider, RefreshToken]), TermsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
