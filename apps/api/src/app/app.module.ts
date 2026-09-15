import { Module } from '@nestjs/common';
import { PrismaModule } from '@cairn/database';
import { AppConfigModule } from '@cairn/shared-config';

import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { HouseholdModule } from './household/household.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { UsersModule } from './users/users.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    HouseholdModule,
    EventsModule,
    DocumentsModule,
    NotificationsModule,
    WhatsAppModule,
    PipelineModule,
    HealthModule,
  ],
})
export class AppModule {}
