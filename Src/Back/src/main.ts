import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  const port = Number(process.env.PORT ?? 5010);
  await app.listen(port);
  console.log(`말씨앗 API listening on http://localhost:${port}/v1`);
}

void bootstrap();
