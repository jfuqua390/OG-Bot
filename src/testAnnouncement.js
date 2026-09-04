// CLI helper: given a report code, fetches it from Warcraft Logs and posts
// the exact announcement message the poller would send, to the configured
// Discord channel. Use this to sanity-check the WCL API credentials and the
// Discord posting path together, without waiting for a real new upload.
//
// Usage: npm run test-announcement -- <report-code>
// A report code is the part after /reports/ in a WCL report URL, e.g. for
// https://www.warcraftlogs.com/reports/AbCdEfGhJ23K it's "AbCdEfGhJ23K" —
// any existing report works, even an old one.

import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { fetchReportByCode } from './wclClient.js';
import { formatAnnouncement } from './poller.js';

const code = process.argv[2];

if (!code) {
  console.error('Usage: npm run test-announcement -- <report-code>');
  process.exit(1);
}

let report;
try {
  report = await fetchReportByCode(config.wcl, code);
} catch (err) {
  console.error(`[wcl] ${err.message}`);
  process.exit(1);
}

const label = report.owner?.name ?? 'Unknown uploader';
const message = formatAnnouncement(label, report);

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

    await channel.send(message);
    console.log(`[discord] Announcement sent to #${channel.name ?? channel.id}.`);
    console.log(`  Title: ${report.title}`);
    console.log(`  Uploader: ${label}`);
    if (report.zone?.name) console.log(`  Zone: ${report.zone.name}`);
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
