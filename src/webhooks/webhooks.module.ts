import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { WebhookConfigOrmEntity } from './infrastructure/persistence/entities/webhook-config.orm-entity';
import { WebhookDeliveryLogOrmEntity } from './infrastructure/persistence/entities/webhook-delivery-log.orm-entity';
import { WebhookConfigService } from './application/services/webhook-config.service';
import { WebhookDispatcherService } from './application/services/webhook-dispatcher.service';
import { WebhooksController } from './infrastructure/controllers/webhooks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookConfigOrmEntity, WebhookDeliveryLogOrmEntity]),
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 3,
    }),
  ],
  providers: [WebhookConfigService, WebhookDispatcherService],
  controllers: [WebhooksController],
  exports: [WebhookConfigService, WebhookDispatcherService],
})
export class WebhooksModule {}
