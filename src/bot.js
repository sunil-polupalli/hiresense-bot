const { Telegraf } = require("telegraf");
const {
  STATES,
  getSession,
  resetSession,
  setState,
  setJD,
  setResume,
} = require("./services/sessionManager");
const { downloadTelegramFile } = require("./utils/downloadTelegramFile");
const { extractTextFromBuffer } = require("./utils/extractText");
const { analyzeJdAndResume } = require("./services/analyzeService");
const { formatAnalysis } = require("./utils/formatResult");

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function createBot(token) {
  const bot = new Telegraf(token);

  bot.start((ctx) => {
    resetSession(ctx.chat.id);
    ctx.reply(
      "👋 Welcome to *HireSense AI*!\n\n" +
        "I analyze how well your resume matches a job description — ATS score, " +
        "matching & missing skills, improvement tips, and courses to close the gap.\n\n" +
        "Send /analyze to get started.",
      { parse_mode: "Markdown" }
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      "*How to use HireSense AI*\n\n" +
        "1. Send /analyze\n" +
        "2. Paste the Job Description (text) or upload it as a .pdf/.docx\n" +
        "3. Upload your Resume (.pdf or .docx)\n" +
        "4. Get your full ATS analysis\n\n" +
        "Send /cancel anytime to start over.",
      { parse_mode: "Markdown" }
    );
  });

  bot.command("cancel", (ctx) => {
    resetSession(ctx.chat.id);
    ctx.reply("Cancelled. Send /analyze to start a new analysis.");
  });

  bot.command("analyze", (ctx) => {
    resetSession(ctx.chat.id);
    setState(ctx.chat.id, STATES.AWAITING_JD);
    ctx.reply(
      "📋 Please send the *Job Description* — as text, or upload a .pdf/.docx file.",
      { parse_mode: "Markdown" }
    );
  });

  // Handle plain text messages (used for pasting JD, or fallback commands)
  bot.on("text", async (ctx) => {
    const chatId = ctx.chat.id;
    const session = getSession(chatId);
    const text = ctx.message.text.trim();

    if (text.startsWith("/")) return; // let command handlers deal with it

    if (session.state === STATES.AWAITING_JD) {
      if (text.length < 30) {
        return ctx.reply(
          "That looks too short for a job description. Please paste the full JD text, or upload it as a file."
        );
      }
      setJD(chatId, text);
      setState(chatId, STATES.AWAITING_RESUME);
      return ctx.reply(
        "✅ Got the JD.\n\n📄 Now upload your *Resume* (.pdf or .docx).",
        { parse_mode: "Markdown" }
      );
    }

    if (session.state === STATES.AWAITING_RESUME) {
      return ctx.reply(
        "Please upload your resume as a *file* (.pdf or .docx) rather than pasting text — this keeps formatting intact for analysis.",
        { parse_mode: "Markdown" }
      );
    }

    return ctx.reply("Send /analyze to start a new JD + Resume analysis.");
  });

  // Handle document uploads (PDF/DOCX) for JD or Resume
  bot.on("document", async (ctx) => {
    const chatId = ctx.chat.id;
    const session = getSession(chatId);
    const doc = ctx.message.document;

    if (session.state !== STATES.AWAITING_JD && session.state !== STATES.AWAITING_RESUME) {
      return ctx.reply("Send /analyze first to start an analysis.");
    }

    if (doc.file_size && doc.file_size > MAX_FILE_SIZE_BYTES) {
      return ctx.reply("That file is too large. Please upload a file under 5MB.");
    }

    const fileName = doc.file_name || "";
    if (!/\.(pdf|docx|txt)$/i.test(fileName)) {
      return ctx.reply("Please upload a .pdf, .docx, or .txt file.");
    }

    const label = session.state === STATES.AWAITING_JD ? "Job Description" : "Resume";

    try {
      await ctx.reply(`⏳ Processing your ${label}...`);
      const { buffer } = await downloadTelegramFile(bot, doc.file_id, fileName);
      const text = await extractTextFromBuffer(buffer, fileName);

      if (!text || text.length < 30) {
        return ctx.reply(
          `Couldn't extract enough readable text from that ${label}. It may be a scanned/image-based file. Try a different file.`
        );
      }

      if (session.state === STATES.AWAITING_JD) {
        setJD(chatId, text);
        setState(chatId, STATES.AWAITING_RESUME);
        return ctx.reply(
          "✅ Got the JD.\n\n📄 Now upload your *Resume* (.pdf or .docx).",
          { parse_mode: "Markdown" }
        );
      } else {
        setResume(chatId, text);
        return runAnalysis(ctx, chatId);
      }
    } catch (err) {
      console.error(`Error processing ${label}:`, err);
      return ctx.reply(
        `❌ Failed to process that ${label}: ${err.message}\n\nTry uploading again, or use a different file.`
      );
    }
  });

  return bot;
}

async function runAnalysis(ctx, chatId) {
  const session = getSession(chatId);
  await ctx.reply("🔍 Analyzing JD vs Resume — this takes a few seconds...");

  try {
    const result = await analyzeJdAndResume(session.jdText, session.resumeText);
    const messages = formatAnalysis(result);

    for (const msg of messages) {
      await ctx.reply(msg, { parse_mode: "Markdown" });
    }

    await ctx.reply(
      "Want to run another analysis? Send /analyze to start over."
    );
  } catch (err) {
    console.error("Analysis error:", err);
    await ctx.reply(
      "❌ Something went wrong during analysis. Please try /analyze again."
    );
  } finally {
    resetSession(chatId);
  }
}

module.exports = { createBot };
