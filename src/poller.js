import { EmbedBuilder } from 'discord.js';
import { config, loadUploaders } from './config.js';
import { fetchRecentReportsForUser, reportUrl } from './wclClient.js';
import { SeenStore } from './seenStore.js';

// Warcraft Logs doesn't grant avatar access to app (client-credentials) tokens
// — only to tokens authorized by that specific user — so we can't show their
// real profile picture. Use the WCL logo as consistent card branding instead.
const WCL_ICON_URL = 'https://assets.rpglogs.com/img/warcraft/favicon.png';
const WCL_EMBED_COLOR = 0xe1a83a; // Warcraft Logs' orange/gold brand color

function formatDuration(startTime, endTime) {
  if (typeof startTime !== 'number' || typeof endTime !== 'number') return null;
  const totalSeconds = Math.round((endTime - startTime) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;
}

// Builds a Discord message payload (a rich embed "card") for a new report.
export function formatAnnouncement(uploaderLabel, report) {
  const embed = new EmbedBuilder()
    .setColor(WCL_EMBED_COLOR)
    .setAuthor({ name: `New report from ${uploaderLabel}`, iconURL: WCL_ICON_URL })
    .setTitle(report.title)
    .setURL(reportUrl(report.code))
    .setThumbnail(WCL_ICON_URL)
    .setFooter({ text: 'Warcraft Logs', iconURL: WCL_ICON_URL });

  if (report.zone?.name) {
    embed.addFields({ name: 'Zone', value: report.zone.name, inline: true });
  }
  if (Array.isArray(report.fights)) {
    embed.addFields({ name: 'Pulls', value: String(report.fights.length), inline: true });
  }
  const duration = formatDuration(report.startTime, report.endTime);
  if (duration) {
    embed.addFields({ name: 'Duration', value: duration, inline: true });
  }
  if (typeof report.startTime === 'number') {
    embed.setTimestamp(report.startTime);
  }

  return { content: `New Warcraft Logs report from **${uploaderLabel}**`, embeds: [embed] };
}

// Checks every configured uploader for new reports and calls `announce`
// (an async function taking a message string) for each new one found.
export async function pollOnce(announce) {
  const uploaders = loadUploaders();
  const store = new SeenStore();

  for (const uploader of uploaders) {
    let reports;
    try {
      reports = await fetchRecentReportsForUser(config.wcl, uploader.id, 5);
    } catch (err) {
      console.error(`[poller] Failed to fetch reports for ${uploader.label}:`, err.message);
      continue;
    }

    const isFirstRunForUser = !store.hasUserBeenSeenBefore(uploader.id);

    // Newest first; announce oldest-of-the-new-batch first so channel order
    // reads chronologically.
    const newReports = reports.filter((r) => !store.isSeen(uploader.id, r.code)).reverse();

    for (const report of newReports) {
      if (isFirstRunForUser) {
        // Don't spam the channel with a player's entire upload history the
        // first time the bot ever sees them — just start tracking from now on.
        store.markSeen(uploader.id, report.code);
        continue;
      }
      try {
        await announce(formatAnnouncement(uploader.label, report));
        store.markSeen(uploader.id, report.code);
      } catch (err) {
        console.error(`[poller] Failed to announce report ${report.code}:`, err.message);
        // Leave it unmarked so we retry next tick.
      }
    }
  }

  store.persist();
}

export function startPolling(announce) {
  console.log(`[poller] Polling every ${config.pollIntervalMs / 60000} minute(s).`);
  pollOnce(announce).catch((err) => console.error('[poller] Initial poll failed:', err));
  return setInterval(() => {
    pollOnce(announce).catch((err) => console.error('[poller] Poll failed:', err));
  }, config.pollIntervalMs);
}
