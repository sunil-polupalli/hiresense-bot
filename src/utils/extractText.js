const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * Extracts plain text from a file buffer based on its mime type / extension.
 * Supports: PDF, DOCX, and plain text.
 */
async function extractTextFromBuffer(buffer, fileName = "") {
  const lower = fileName.toLowerCase();

  try {
    if (lower.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      return cleanText(data.text);
    }

    if (lower.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      return cleanText(result.value);
    }

    if (lower.endsWith(".doc")) {
      throw new Error(
        "Legacy .doc files are not supported. Please upload as .docx or .pdf."
      );
    }

    // Fallback: treat as plain text
    return cleanText(buffer.toString("utf-8"));
  } catch (err) {
    throw new Error(`Failed to extract text from ${fileName}: ${err.message}`);
  }
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

module.exports = { extractTextFromBuffer };
