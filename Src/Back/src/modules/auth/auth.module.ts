import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthProvider } from '../../database/entities/auth-provider.entity';
import { MailSend } from '../../database/entities/mail-send.entity';
import { PasswordReset } from '../../database/entities/password-reset.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { MailModule } from '../mail/mail.module';
import { User } from '../../database/entities/user.entity';
import { TermsModule } from '../terms/terms.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordVerifier } from './password-verifier';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthProvider, RefreshToken, PasswordReset, MailSend]),
    TermsModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordVerifier],
  exports: [PasswordVerifier],
})
export class AuthModule {}
