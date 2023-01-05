import { Injectable, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import { ConfigService } from '@nestjs/config';
import { DiscordService } from 'src/discord/discord.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { Subscriber } from 'prisma/prisma.types';
import { activities, cabins, subscriptions } from '@prisma/client';
import { ActivityService } from 'src/activity/activity.service';
import { CabinService } from 'src/cabin/cabin.service';
import { EmbedBuilder } from 'discord.js';

type MessageThread = {
  topic: string | null;
  mainMessage: string;
  embeds: EmbedBuilder[];
};

@Injectable()
export class SubscriptionNotifierService {
  private readonly logger = new Logger(SubscriptionNotifierService.name);
  private task: cron.ScheduledTask;

  constructor(
    private readonly activityService: ActivityService,
    private readonly cabinService: CabinService,
    private readonly configService: ConfigService,
    private readonly discordService: DiscordService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    if (this.configService.get('NODE_ENV') === 'production') {
      this.task = cron.schedule('0 16 * * *', this.on4pm);
      this.logger.log('setup 4pm subscription notifier');
    }
  }

  on4pm = () => {
    this.logger.log('on4pm');
    this.notifySubscribers()
      .catch((error) => {
        this.logger.error(
          'Sending subscription notifications failed with error.',
          error,
        );
      })
      .then(() =>
        this.logger.log('Subscription notifications sent successfully.'),
      );
  };

  private async notifySubscribers() {
    const subscribers = await this.subscriptionService.getSubscribers();

    subscribers?.forEach(async (subscriber) => {
      const subscriptions = await this.subscriptionService.getSubscriptions(
        subscriber.subscriberId,
      );
      if (subscriptions.length === 0) {
        return;
      }

      const checkedAt = new Date();
      const subscriptionsWithNews = await this.findNewsForSubscriptions(
        subscriptions,
      );
      if (subscriptionsWithNews.length === 0) {
        return;
      }

      const messages = this.createNotificationMessages(subscriptionsWithNews);
      if (subscriber.subscriberType === 'channel') {
        await this.sendNotificationsInThreads(subscriber, messages);
      }
      if (subscriber.subscriberType === 'user') {
        await this.sendNotificationsAsDm(subscriber, messages);
      }

      await this.subscriptionService.updateNotifiedAt(subscriptions, checkedAt);
    });
  }

  private async findNewsForSubscriptions(subscriptions: subscriptions[]) {
    const subscriptionsWithNews = [];

    for (const subscription of subscriptions) {
      if (subscription.type === 'cabins') {
        const news = await this.getNewCabins(subscription);
        if (news.length > 0) {
          subscriptionsWithNews.push({
            subscription: subscription,
            news: news,
          });
        }
      }

      if (subscription.type === 'activities') {
        const news = await this.getNewActivities(subscription);
        if (news.length > 0) {
          subscriptionsWithNews.push({
            subscription: subscription,
            news: news,
          });
        }
      }
    }

    return subscriptionsWithNews;
  }

  private async getNewCabins(subscription: subscriptions) {
    return this.cabinService.getNewCabins(subscription.notifiedAt);
  }

  private async getNewActivities(
    subscription: subscriptions,
  ): Promise<activities[]> {
    if (subscription.topic !== null) {
      return await this.activityService.getNewActivities(
        subscription.topic,
        subscription.notifiedAt,
      );
    }
    return [];
  }

  private createNotificationMessages(
    subscriptionsWithNews: {
      subscription: subscriptions;
      news: cabins[] | activities[];
    }[],
  ): MessageThread[] {
    const subscriberType = subscriptionsWithNews[0].subscription.subscriberType;
    const today = new Date().toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const messages = subscriptionsWithNews.map((sub) => {
      if (sub.subscription.type === 'activities') {
        const topic = `${sub.subscription.topic} (${today})`;
        const mainMessage = `:point_right: ${sub.news.length} new activities that mention "${sub.subscription.topic}".\n`;
        const embeds = sub.news.map((news) => {
          const activity = news as activities;
          const date = activity.startsAt
            ? activity.startsAt?.toLocaleDateString('no-NO', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            : '';
          return new EmbedBuilder()
            .setTitle(activity.title)
            .setURL(activity.url)
            .setDescription(date);
        });
        return { topic: topic, mainMessage: mainMessage, embeds: embeds };
      }
      if (sub.subscription.type === 'cabins') {
        const mainMessage = `:house_with_garden: ${sub.news.length} new cabins:`;
        const embeds = sub.news.map((news) => {
          const cabin = news as cabins;
          return new EmbedBuilder()
            .setTitle(cabin.name)
            .setURL(`http://ut.no/hytte/${cabin.utId}`);
        });
        return {
          topic: `New cabins (${today})`,
          mainMessage: mainMessage,
          embeds: embeds,
        };
      }
      return { topic: '', mainMessage: '', embeds: [] };
    });

    if (subscriberType === 'user') {
      messages.unshift({
        topic: '',
        mainMessage: `Hei! I found some new activities related to your subscriptions! :smiley_cat:\n`,
        embeds: [],
      });
    }
    if (subscriberType === 'channel') {
      messages.unshift({
        topic: '',
        mainMessage: `Hei, I found some new activities related to this channel's subscriptions! :smiley_cat:\n`,
        embeds: [],
      });
    }

    return messages;
  }

  private async sendNotificationsAsDm(
    subscriber: Subscriber,
    messages: MessageThread[],
  ) {
    for (const message of messages) {
      await this.discordService.sendDm(
        subscriber.subscriberId,
        message.mainMessage,
      );

      for (const embed of message.embeds) {
        await this.discordService.sendDmWithEmbeds(
          subscriber.subscriberId,
          '',
          [embed],
        );
      }
    }
  }

  private async sendNotificationsInThreads(
    subscriber: Subscriber,
    messages: MessageThread[],
  ) {
    for (const notificationMessage of messages) {
      const message = await this.discordService.sendMessageWithoutEmbed(
        subscriber.subscriberId,
        notificationMessage.mainMessage,
      );

      if (message && notificationMessage.embeds.length > 0) {
        const threadName = notificationMessage.topic
          ? notificationMessage.topic
          : 'New cabins';
        const thread = await this.discordService.createThreadFromMessage(
          message,
          threadName,
        );

        for (const embed of notificationMessage.embeds) {
          await thread.send({ embeds: [embed] });
        }
      }
    }
  }
}
