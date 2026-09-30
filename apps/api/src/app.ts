import 'reflect-metadata';
import { Body, Controller, Get, Headers, Inject, Module, Post, Query } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SliceService } from './service';
import type { Database } from './database';

@Controller('v1')
class SliceController {
  constructor(@Inject(SliceService) private readonly service: SliceService) {}
  @Get('health') health() { return { status: 'ok', scope: 'P0 development slice' }; }
  @Post('auth/codes') codes(@Body() body: unknown) { return this.service.requestCode(body); }
  @Post('auth/verify') verify(@Body() body: unknown) { return this.service.verify(body); }
  @Post('sessions/revoke') revoke(@Headers('authorization') token?: string) { return this.service.revoke(token); }
  @Post('sync/push') async push(@Headers('authorization') token: string, @Body() body: unknown) { return this.service.push(await this.service.owner(token), body); }
  @Get('sync/pull') async pull(@Headers('authorization') token: string, @Query('cursor') cursor?: string) { return this.service.pull(await this.service.owner(token), cursor); }
}
export async function createApp(db: Database, fixtureAuth: boolean) {
  @Module({ controllers: [SliceController], providers: [{ provide: SliceService, useValue: new SliceService(db, fixtureAuth) }] })
  class AppModule {}
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'], bodyParser: true });
  app.enableShutdownHooks();
  return app;
}
