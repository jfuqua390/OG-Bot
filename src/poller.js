import { config, loadUploaders } from './config.js';
import { fetchRecentReportsForUser, reportUrl } from './wclClient.js';
import { SeenStore } from './seenStore.js';

function formatAnnouncement(uploaderLabel, report) {
  const zone = report.zone?.name ? ` in **${report.zone.name}**` : '';
  return (
    `📜 New Warcraft Logs report from **${uploaderLabel}**${zone}\n` +
    `**${report.title}** — ${reportUrl(report.code)}`
  );
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
