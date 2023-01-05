import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityModule } from 'src/activity/activity.module';
import { CabinModule } from 'src/cabin/cabin.module';
import { DiscordModule } from 'src/discord/discord.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { SubscriptionNotifierService } from './subscriptionNotifier.service';

@Module({
  imports: [
    ActivityModule,
    CabinModule,
    ConfigModule,
    DiscordModule,
    SubscriptionModule,
  ],
  providers: [SubscriptionNotifierService],
  exports: [SubscriptionNotifierService],
})
export class SubscriptionNotifierModule {}
