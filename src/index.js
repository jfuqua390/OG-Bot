import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { startPolling } from './poller.js';
import {registerARAMResponder} from './aramResponder.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

registerARAMResponder(client, config.discord.ogChannelId);

client.once('ready', async () => {
  console.log(`[discord] Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(config.discord.channelId);
  if (!channel || !channel.isTextBased()) {
    throw new Error(
      `Channel ${config.discord.channelId} was not found or is not a text channel.`
    );
  }

  const announce = async (message) => {
    await channel.send(message);
  };

  startPolling(announce);
});

client.login(config.discord.token);

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  client.destroy();
  process.exit(0);
});
