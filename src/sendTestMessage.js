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

    await channel.send('✅ Test message from Fooks bot — if you can see this, the bot is configured correctly.');
    console.log(`[discord] Test message sent to #${channel.name ?? channel.id}.`);
  } catch (err) {
    if (err.code === 50001) {
      console.error(
        `Missing Access: the bot can't see channel ${config.discord.channelId}. ` +
          `Either it hasn't been invited to that server yet (use the OAuth2 URL ` +
          `Generator in the Developer Portal with scope "bot" and permissions ` +
          `"View Channel" + "Send Messages"), or that channel's permission ` +
          `overwrites are hiding it from the bot's role.`
      );
    } else if (err.code === 10003) {
      console.error(
        `Unknown Channel: ${config.discord.channelId} doesn't exist (or isn't ` +
          `visible to this bot). Double-check DISCORD_CHANNEL_ID.`
      );
    } else if (err.code === 50013) {
      console.error(
        `Missing Permissions: the bot can see channel ${config.discord.channelId} ` +
          `but isn't allowed to send messages there. Check its permission ` +
          `overwrites for "Send Messages".`
      );
    } else {
      console.error(err.message);
    }
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(config.discord.token);
