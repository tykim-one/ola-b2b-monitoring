import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parsing (required for refresh token)
  app.use(cookieParser());

  // Enable CORS for frontend
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin?.split(',').map((o) => o.trim()) ||
          'http://192.168.1.42:3001',
    credentials: true,
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('OLA B2B Monitoring API')
    .setDescription('API for querying BigQuery logs')
    .setVersion('1.0')
    .addTag('bigquery')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 NestJS Backend running on http://192.168.1.42:${port}`);
  console.log(
    `📑 Swagger Documentation available at http://192.168.1.42:${port}/api`,
  );
}
bootstrap();
