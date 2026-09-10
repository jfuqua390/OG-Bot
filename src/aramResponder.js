// Fun, unrelated to WCL polling: watches the configured "OG" channel for a
// message that is exactly "aram" (case-insensitive, surrounding whitespace
// ignored) and replies with a gif. Purely cosmetic — errors here are logged
// and swallowed so they can never take down the poller.

const TRIGGER_PHRASE = 'aram';
const GIF_URL =
  'https://klipy.com/gifs/aram-time-2';

// Registers a messageCreate listener on the given discord.js client. Requires
// the client to have been constructed with the GuildMessages and
// MessageContent intents, or message.content will always be empty.
export function registerARAMResponder(client, ogChannelId) {
  if (!ogChannelId) return;

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channelId !== ogChannelId) return;
    if (message.content.trim().toLowerCase() !== TRIGGER_PHRASE) return;

    try {
      await message.channel.send(GIF_URL);
    } catch (err) {
      console.error('[aramResponder] Failed to send gif:', err.message);
    }
  });
}
