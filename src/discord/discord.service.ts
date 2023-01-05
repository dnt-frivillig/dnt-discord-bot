import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  DMChannel,
  EmbedBuilder,
  GatewayIntentBits,
  Message,
  Partials,
  TextChannel,
} from 'discord.js';
import { SlashCommandService } from 'src/slashCommand/slashCommand.service';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;

  private readonly botId = this.configService.getOrThrow('DISCORD_BOT_USER_ID');
  private readonly discordToken =
    this.configService.getOrThrow('DISCORD_TOKEN');
  private readonly guildId = this.configService.getOrThrow('DISCORD_SERVER_ID');
  private readonly testingChannelId = this.configService.getOrThrow(
    'DISCORD_BOT_TESTING_CHANNEL_ID',
  );
  private readonly environment = this.configService.get('NODE_ENV');

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SlashCommandService))
    private readonly slashCommandService: SlashCommandService,
  ) {}

  async onModuleInit() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });

    this.client.on('ready', () => {
      console.log('discord ready');
    });

    this.client.on(
      'interactionCreate',
      this.slashCommandService.onInteractionCreate,
    );

    this.client.on('messageCreate', this.onMessageCreate);

    await this.client.login(this.discordToken);
    await this.getChannels();
  }

  onMessageCreate = (msg: Message) => {
    this.processMessage(msg).catch((error) => {
      console.error('failed to process message', error);
    });
  };

  async processMessage(msg: Message) {
    if (msg.author.bot) return;

    const REPLY = 19;
    if (msg.type === REPLY) {
      const referencedMessage = await msg.fetchReference();
      if (referencedMessage.author.id === this.botId) return;
    }

    const isFromTestChannel = msg.channelId === this.testingChannelId;
    const isProduction = this.environment === 'production';

    if (
      msg.channel instanceof TextChannel &&
      (isFromTestChannel || isProduction)
    ) {
      await this.handleTextChannelMessage(msg);
    }

    if (msg.channel instanceof DMChannel) {
      await this.handleDm(msg);
    }
  }

  async handleTextChannelMessage(msg: Message<boolean>) {
    const botWasMentioned = msg.mentions.has(this.botId);

    if (botWasMentioned) {
      await msg.reply('Aye! :)');
    }
  }

  async handleDm(msg: Message<boolean>) {
    await msg.author.send(`Good to hear from you, ${msg.author.username}.`);
  }

  async sendMessage(
    channelId: string,
    messageContent: string,
    embed: EmbedBuilder,
  ) {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      console.log('channel not found');
      return false;
    }

    await channel.send({ content: messageContent, embeds: [embed] });
  }

  async sendMessageWithoutEmbed(channelId: string, messageContent: string) {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      console.log('channel not found');
      return false;
    }

    return await channel.send({ content: messageContent });
  }

  async sendDmWithEmbeds(
    userId: string,
    messageContent: string,
    embeds: EmbedBuilder[],
  ) {
    await this.client.users.send(userId, {
      content: messageContent,
      embeds: embeds,
    });
  }

  async sendDm(userId: string, messageContent: string) {
    await this.client.users.send(userId, messageContent);
  }

  async getChannels() {
    const guild = await this.client.guilds.fetch(this.guildId);
    const channels = await guild.channels.fetch();
    console.log(
      Array.from(channels.entries()).map(([id, channel]) => {
        return { name: channel?.name, id };
      }),
    );
  }

  async createThreadFromMessage(message: Message, name: string) {
    return await message.startThread({
      name: name,
      autoArchiveDuration: 60,
    });
  }
}
