import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/datbase.module';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GISVersioningModule } from './gis-versioning/gis-versioning.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 3600, // 1 hour default TTL
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    GISVersioningModule,
  ],
})
export class AppModule {}
