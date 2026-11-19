import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import configuration from './config/configuration';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RequestLogMiddleware } from './common/logging/request-log.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TermsModule } from './modules/terms/terms.module';
import { ModelsModule } from './modules/models/models.module';
import { AppVersionModule } from './modules/app-version/app-version.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: config.get<string>('db.host'),
        port: config.get<number>('db.port'),
        username: config.get<string>('db.username'),
        password: config.get<string>('db.password'),
        database: config.get<string>('db.name'),
        autoLoadEntities: true,
        // 개발 편의용. 운영은 마이그레이션으로 관리한다 (DB_SYNCHRONIZE=false).
        synchronize: config.get<boolean>('db.synchronize') ?? false,
        // 시작할 때 아직 실행 안 된 마이그레이션을 자동 적용할지 (DB_MIGRATIONS_RUN).
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: config.get<boolean>('db.migrationsRun') ?? false,
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),

    // 기본 전역 한도. 인증 관련 라우트는 컨트롤러에서 더 낮게 덮어쓴다.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    // accessToken 서명용. 전역이라 모든 모듈·가드에서 JwtService 를 쓸 수 있다.
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<number>('jwt.accessTtlSeconds') },
      }),
    }),

    AuthModule,
    UsersModule,
    TermsModule,
    ModelsModule,
    AppVersionModule,
    AiModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLogMiddleware).forRoutes('*');
  }
}
