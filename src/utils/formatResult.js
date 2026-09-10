const TELEGRAM_MAX_LENGTH = 4096;

function scoreEmoji(score) {
  if (score >= 80) return "🟢";
  if (score >= 60) return "🟡";
  return "🔴";
}

/**
 * Formats the analysis result into one or more Telegram-Markdown-safe strings.
 * Returns an array so the caller can send multiple messages if needed.
 */
function formatAnalysis(result) {
  const {
    ats_score,
    role_title,
    summary,
    matching_skills,
    missing_skills,
    improvement_suggestions,
    courses_to_learn,
  } = result;

  const lines = [];

  lines.push(`*HireSense AI — Resume Analysis*`);
  lines.push(`_Role: ${escapeMd(role_title)}_`);
  lines.push("");
  lines.push(`${scoreEmoji(ats_score)} *ATS Score: ${ats_score}/100*`);
  lines.push("");
  lines.push(`*Summary*`);
  lines.push(escapeMd(summary));
  lines.push("");

  lines.push(`✅ *Matching Skills* (${matching_skills.length})`);
  lines.push(bulletList(matching_skills) || "_None found_");
  lines.push("");

  lines.push(`⚠️ *Missing Skills* (${missing_skills.length})`);
  lines.push(bulletList(missing_skills) || "_None — great match!_");
  lines.push("");

  lines.push(`💡 *Suggested Improvements*`);
  lines.push(bulletList(improvement_suggestions) || "_No major changes needed_");
  lines.push("");

  lines.push(`📚 *Courses to Close the Gap*`);
  if (courses_to_learn.length === 0) {
    lines.push("_No specific courses needed_");
  } else {
    for (const c of courses_to_learn) {
      const platform = c.platform ? ` (${escapeMd(c.platform)})` : "";
      lines.push(`• *${escapeMd(c.skill)}*: ${escapeMd(c.course)}${platform}`);
    }
  }

  const fullText = lines.join("\n");
  return splitMessage(fullText);
}

function bulletList(items) {
  return items.map((item) => `• ${escapeMd(item)}`).join("\n");
}

// Escape Telegram MarkdownV1-sensitive characters minimally (we use legacy
// Markdown parse mode here for simplicity — see bot.js parse_mode setting).
function escapeMd(text) {
  return String(text).replace(/([_*`\[])/g, "\\$1");
}

function splitMessage(text) {
  if (text.length <= TELEGRAM_MAX_LENGTH) return [text];

  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= TELEGRAM_MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n\n", TELEGRAM_MAX_LENGTH);
    if (splitAt <= 0) splitAt = TELEGRAM_MAX_LENGTH;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trim();
  }
  return chunks;
}

module.exports = { formatAnalysis };
