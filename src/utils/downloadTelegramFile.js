const fetch = require("node-fetch");

/**
 * Downloads a Telegram file (by file_id) into a Buffer.
 * @param {import('telegraf').Telegraf} bot
 * @param {string} fileId
 * @returns {Promise<{buffer: Buffer, fileName: string}>}
 */
async function downloadTelegramFile(bot, fileId, suggestedName = "") {
  const file = await bot.telegram.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file from Telegram: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = suggestedName || file.file_path.split("/").pop();

  return { buffer, fileName };
}

module.exports = { downloadTelegramFile };
