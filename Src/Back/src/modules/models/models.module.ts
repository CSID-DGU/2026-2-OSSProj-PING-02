import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelRelease } from '../../database/entities/model-release.entity';
import { ModelStorageService } from './model-storage.service';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModelRelease])],
  controllers: [ModelsController],
  providers: [ModelsService, ModelStorageService],
})
export class ModelsModule {}
