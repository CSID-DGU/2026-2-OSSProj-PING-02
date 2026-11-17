import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthProvider } from '../../database/entities/auth-provider.entity';
import { EmailVerification } from '../../database/entities/email-verification.entity';
import { MailSend } from '../../database/entities/mail-send.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { MailModule } from '../mail/mail.module';
import { User } from '../../database/entities/user.entity';
import { TermsModule } from '../terms/terms.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthProvider, RefreshToken, EmailVerification, MailSend]),
    TermsModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
