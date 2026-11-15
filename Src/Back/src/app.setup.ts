import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validationExceptionFactory } from './common/validation/validation.factory';

/**
 * 실행(main.ts)과 테스트(e2e)가 같은 설정을 쓰도록 한 곳에 모은다.
 */
export function configureApp(app: INestApplication): void {
  // 보안 헤더(nosniff, frame 차단 등). helmet 이 X-Powered-By 도 함께 제거한다.
  app.use(helmet());

  // 명세: 모든 경로는 /v1 아래에 있다.
  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 필드는 버린다
      forbidNonWhitelisted: true, // 없는 필드가 오면 거부한다 (메시지 원문 필드 차단)
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}

/** 개발 환경에서만 API 문서를 연다. */
export function setupSwagger(app: INestApplication): void {
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('말씨앗 API').setVersion('v1').addBearerAuth().build(),
  );
  SwaggerModule.setup('docs', app, doc);
}
