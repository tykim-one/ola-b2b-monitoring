import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parsing (required for refresh token)
  app.use(cookieParser());

  // Enable Helmet security headers
  app.use(helmet());

  // Enable CORS for frontend
  const corsOriginEnv = process.env.CORS_ORIGIN;
  const corsOrigins =
    corsOriginEnv && corsOriginEnv !== '*'
      ? corsOriginEnv.split(',').map((o) => o.trim())
      : true;
  app.enableCors({
    origin: corsOrigins,
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

  // Swagger Setup (disabled in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('OLA B2B Monitoring API')
      .setDescription('API for querying BigQuery logs')
      .setVersion('1.0')
      .addTag('bigquery')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 NestJS Backend running on http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `📑 Swagger Documentation available at http://localhost:${port}/api`,
    );
  }
}
bootstrap();
