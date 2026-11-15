import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Terms } from '../../database/entities/terms.entity';
import { TermsAgreement } from '../../database/entities/terms-agreement.entity';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Terms, TermsAgreement])],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
