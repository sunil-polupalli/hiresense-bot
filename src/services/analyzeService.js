const OpenAI = require("openai");
const { z } = require("zod");

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const AnalysisSchema = z.object({
  ats_score: z.number().min(0).max(100),
  role_title: z.string(),
  summary: z.string(),
  matching_skills: z.array(z.string()),
  missing_skills: z.array(z.string()),
  improvement_suggestions: z.array(z.string()),
  courses_to_learn: z.array(
    z.object({
      skill: z.string(),
      course: z.string(),
      platform: z.string().optional(),
    })
  ),
});

const SYSTEM_PROMPT = `
You are HireSense AI, an expert ATS resume analyzer and career coach.

Analyze the Job Description and Resume.

Return ONLY valid JSON.

Required JSON format:

{
  "ats_score": 0,
  "role_title": "",
  "summary": "",
  "matching_skills": [],
  "missing_skills": [],
  "improvement_suggestions": [],
  "courses_to_learn": [
    {
      "skill": "",
      "course": "",
      "platform": ""
    }
  ]
}

ATS scoring:

Skills and keyword match: 40%
Relevant experience: 20%
Job role alignment: 15%
Projects: 10%
Education/certifications: 10%
Resume quality: 5%

Rules:

- Be honest.
- Do not inflate the ATS score.
- Matching skills must actually appear in or be clearly supported by the resume.
- Missing skills should be important skills from the JD that are not supported by the resume.
- Identify partial/related skills as matching when appropriate.
- Give practical resume improvement suggestions.
- Recommend courses only for important missing skills.
- Recommend well-known learning resources.
- Maximum 10 matching skills.
- Maximum 10 missing skills.
- Maximum 6 improvements.
- Maximum 5 courses.
`;

async function analyzeJdAndResume(jdText, resumeText) {

  const userMessage = `
JOB DESCRIPTION:

${jdText.slice(0, 12000)}


RESUME:

${resumeText.slice(0, 12000)}


Analyze the resume against the job description.
Return only the JSON object.
`;

  const response = await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0.2,
    max_tokens: 2500,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const rawText = response.choices[0].message.content.trim();

  const jsonText = stripCodeFences(rawText);

  let parsed;

  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error("Invalid AI response:", rawText);

    throw new Error(
      "AI returned an invalid response. Please try again."
    );
  }

  const result = AnalysisSchema.safeParse(parsed);

  if (!result.success) {
    console.error(result.error);

    throw new Error(
      "AI response format was invalid. Please try again."
    );
  }

  return result.data;
}

function stripCodeFences(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

module.exports = {
  analyzeJdAndResume,
};