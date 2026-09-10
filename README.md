# wcl-discord-bot

A Discord bot that posts an announcement in a channel whenever one of your
tracked players uploads a new Warcraft Logs report.

Warcraft Logs doesn't offer a push webhook for "report created," so this bot
polls the WCL v2 GraphQL API on an interval (5 minutes by default) and
announces any reports it hasn't seen before, per tracked uploader.

## 1. Create a Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Under **Bot**, click **Reset Token** / **Copy** to get your bot token. Keep it secret.
3. Under **Bot**, enable the **Message Content Intent** toggle (a privileged intent). The bot needs this to detect the "aram" gif trigger (see below) — without it, Discord will reject the bot's login.
4. Under **OAuth2 → URL Generator**, check scope `bot`, and under bot permissions check `Send Messages` and `View Channel`. Open the generated URL and invite the bot to your server.
5. In Discord, enable Developer Mode (User Settings → Advanced), then right-click the channel you want announcements in and **Copy Channel ID**.

## 2. Create a Warcraft Logs API client

1. Log into Warcraft Logs, go to <https://www.warcraftlogs.com/api/clients/>.
2. Create a new client (any name/redirect URL, this bot only uses the
   client-credentials flow so the redirect URL doesn't matter).
3. Copy the **Client ID** and **Client Secret**.

## 3. Configure the bot

```bash
cp .env.example .env
```

Fill in `.env`:

```
DISCORD_BOT_TOKEN=...
DISCORD_CHANNEL_ID=...
DISCORD_OG_CHANNEL_ID=...
ARAM_ROLE_ID=...
WCL_CLIENT_ID=...
WCL_CLIENT_SECRET=...
POLL_INTERVAL_MINUTES=5
```

`DISCORD_OG_CHANNEL_ID` is the channel the bot watches for the "aram" gif
trigger (see [Notes](#notes)) — copy its ID the same way as
`DISCORD_CHANNEL_ID` above. `ARAM_ROLE_ID` is optional — set it to the ARAM
role's ID (right-click the role in Server Settings → Roles with Developer
Mode on, **Copy Role ID**) so pinging that role also triggers the gif.

## 4. Pick who to track

Warcraft Logs doesn't let you look up a player's numeric user ID from just
their username — you need one report they've already uploaded. For each
player you want to track:

```bash
npm install
npm run resolve-uploader -- <report-code>
```

(The report code is the part after `/reports/` in a WCL report URL, e.g. for
`https://www.warcraftlogs.com/reports/AbCdEfGhJ23K` it's `AbCdEfGhJ23K` — any
report they've uploaded works, even an old one.)

This prints their numeric user ID. Add each one to `config/uploaders.json`:

```json
[
  { "id": 123456, "label": "Thrall" },
  { "id": 789012, "label": "Jaina" }
]
```

`label` is just the display name used in the Discord message.

## 5. Run it

First, confirm the Discord side is wired up correctly:

```bash
npm run test-message
```

This logs in, sends a one-off test message to `DISCORD_CHANNEL_ID`, then exits.
If it fails, double-check `DISCORD_BOT_TOKEN`/`DISCORD_CHANNEL_ID` and that the
bot was actually invited to the server with `View Channel`/`Send Messages`
permission on that channel.

Next, confirm the Warcraft Logs side works too, using any real report code
(the part after `/reports/` in a WCL report URL — an old report is fine):

```bash
npm run test-announcement -- <report-code>
```

This fetches that report from the WCL API and posts the exact same
announcement message the poller would send for a real new upload, so it
exercises the WCL credentials, the GraphQL query, and the Discord posting
path all at once.

Then start the bot for real:

```bash
npm start
```

The first poll after adding a new uploader won't announce their existing
report history — it just starts tracking from that point forward. After
that, any new report they upload shows up in the Discord channel within one
polling interval.

## 6. Keep it running

A plain `npm start` only lasts as long as the terminal stays open. On an
Ubuntu server, use the included systemd unit — see
[`deploy/og-bot.service`](deploy/og-bot.service) for setup steps (copy the
repo to the server, adjust the paths/user in the unit file, then
`systemctl enable --now` it). systemd gives you auto-restart on crash,
start-on-boot, and logs via `journalctl -u og-bot -f` with no extra tooling
needed.

## Notes

- State (which report codes have already been announced) is stored in
  `data/seen-reports.json`. Delete it if you ever want to reset.
- **Easter egg**: in the channel at `DISCORD_OG_CHANNEL_ID`, a message that's
  just "aram" (case-insensitive), "aram?", "@aram", or a direct ping of the
  role at `ARAM_ROLE_ID` gets a gif reply. It does *not* fire for "aram"
  used mid-sentence (e.g. "want to aram?" won't trigger it — the message has
  to be just the trigger). See [`src/aramResponder.js`](src/aramResponder.js).
  Purely for fun — has no effect on WCL polling.
