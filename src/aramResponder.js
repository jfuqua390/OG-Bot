// Fun, unrelated to WCL polling: watches the configured "OG" channel for the
// phrase "chewy sucks" and replies with a gif. Purely cosmetic — errors here
// are logged and swallowed so they can never take down the poller.

const TRIGGER_PHRASE = 'ARAM';
const GIF_URL =
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdjZra3FoYXpmNjIweGh2d25pcGo4ejEyZG1lZHE0azBrOXNqZDZtbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cCalRsU3yKZoQILEEI/giphy.gif';

// Registers a messageCreate listener on the given discord.js client. Requires
// the client to have been constructed with the GuildMessages and
// MessageContent intents, or message.content will always be empty.
export function registerARAMResponder(client, ogChannelId) {
  if (!ogChannelId) return;

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channelId !== ogChannelId) return;
    if (!message.content.toLowerCase().includes(TRIGGER_PHRASE)) return;

    try {
      await message.channel.send(GIF_URL);
    } catch (err) {
      console.error('[chewyResponder] Failed to send gif:', err.message);
    }
  });
}
