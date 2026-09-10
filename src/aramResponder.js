// Fun, unrelated to WCL polling: watches the configured "OG" channel for a
// message that is just "aram" (case-insensitive, surrounding whitespace
// ignored) and replies with a gif. Also fires for "aram?", "@aram" (a
// literal leading "@", not an actual Discord mention), and a real ping of
// the ARAM role (optionally with a trailing "?"). One trailing "?" or one
// leading "@" is stripped before comparing the text form. Purely cosmetic —
// errors here are logged and swallowed so they can never take down the
// poller.

const TRIGGER_PHRASE = 'aram';
const GIF_URL =
  'https://klipy.com/gifs/aram-time-2';

function isTrigger(content, roleId) {
  const trimmed = content.trim().replace(/\?+$/, '').trim();

  if (roleId && trimmed === `<@&${roleId}>`) return true;

  const normalized = trimmed.replace(/^@/, '').toLowerCase();
  return normalized === TRIGGER_PHRASE;
}

// Registers a messageCreate listener on the given discord.js client. Requires
// the client to have been constructed with the GuildMessages and
// MessageContent intents, or message.content will always be empty.
// `aramRoleId`, if given, also triggers on a direct ping of that role.
export function registerARAMResponder(client, ogChannelId, aramRoleId) {
  if (!ogChannelId) return;

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channelId !== ogChannelId) return;
    if (!isTrigger(message.content, aramRoleId)) return;

    try {
      await message.channel.send(GIF_URL);
    } catch (err) {
      console.error('[aramResponder] Failed to send gif:', err.message);
    }
  });
}
