import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthProvider } from '../../database/entities/auth-provider.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { TermsAgreement } from '../../database/entities/terms-agreement.entity';
import { User } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { TermsModule } from '../terms/terms.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthProvider, TermsAgreement, RefreshToken]),
    TermsModule,
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
