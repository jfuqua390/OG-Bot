// CLI helper: logs into Discord, sends a test message to the configured
// channel, then exits. Use this to confirm DISCORD_BOT_TOKEN and
// DISCORD_CHANNEL_ID are set up correctly and the bot has permission to
// post before waiting on the poller.
//
// Usage: npm run test-message

import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  try {
    console.log(`[discord] Logged in as ${client.user.tag}`);

    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error(
        `Channel ${config.discord.channelId} was not found or is not a text channel.`
      );
    }

    await channel.send('✅ Test message from wcl-discord-bot — if you can see this, the bot is configured correctly.');
    console.log(`[discord] Test message sent to #${channel.name ?? channel.id}.`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(config.discord.token);
