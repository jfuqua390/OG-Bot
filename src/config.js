import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (check your .env file)`);
  }
  return value;
}

export const config = {
  rootDir,
  discord: {
    token: requireEnv('DISCORD_BOT_TOKEN'),
    channelId: requireEnv('DISCORD_CHANNEL_ID'),
    ogChannelId: requireEnv('DISCORD_OG_CHANNEL_ID'),
    aramRoleId: process.env.ARAM_ROLE_ID || null,
  },
  wcl: {
    clientId: requireEnv('WCL_CLIENT_ID'),
    clientSecret: requireEnv('WCL_CLIENT_SECRET'),
  },
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MINUTES || 5) * 60 * 1000,
  seenReportsPath: path.join(rootDir, 'data', 'seen-reports.json'),
  uploadersPath: path.join(rootDir, 'config', 'uploaders.json'),
};

export function loadUploaders() {
  const raw = readFileSync(config.uploadersPath, 'utf-8');
  const uploaders = JSON.parse(raw);

  const valid = uploaders.filter((u) => Number.isInteger(u.id) && u.id > 0);
  if (valid.length === 0) {
    throw new Error(
      `No valid uploaders configured in ${config.uploadersPath}. ` +
        `Run "npm run resolve-uploader -- <report-code>" to find a player's numeric WCL user ID, ` +
        `then add it there.`
    );
  }
  return valid;
}
