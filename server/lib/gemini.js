const { GoogleGenerativeAI } = require("@google/generative-ai")

const MODEL_NAME = "gemini-2.5-flash"
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

function getModel() {
  if (!API_KEY) {
    throw new Error("Missing Gemini API key")
  }

  const client = new GoogleGenerativeAI(API_KEY)
  return client.getGenerativeModel({ model: MODEL_NAME })
}

function extractJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty Gemini response")
  }

  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch (parseError) {
    const startArray = trimmed.indexOf("[")
    const startObject = trimmed.indexOf("{")

    let start = -1
    let end = -1

    if (startArray !== -1 && (startObject === -1 || startArray < startObject)) {
      start = startArray
      end = trimmed.lastIndexOf("]")
    } else if (startObject !== -1) {
      start = startObject
      end = trimmed.lastIndexOf("}")
    }

    if (start === -1 || end === -1 || end < start) {
      throw parseError
    }

    return JSON.parse(trimmed.slice(start, end + 1))
  }
}

function fallbackQuestions() {
  return [
    {
      id: 1,
      question:
        "Tell me about a recent project you worked on and the biggest challenge you solved.",
      category: "general",
      followUp:
        "What trade-offs did you consider, and what would you do differently now?",
    },
    {
      id: 2,
      question:
        "How do you approach debugging when a production issue has an unclear root cause?",
      category: "technical",
      followUp:
        "Walk through the exact steps you would take in your first 30 minutes.",
    },
    {
      id: 3,
      question:
        "Describe a time you disagreed with a teammate on a technical decision.",
      category: "behavioral",
      followUp:
        "How did you resolve the disagreement and what was the outcome?",
    },
  ]
}

async function generateInterviewQuestions({ role, type, difficulty, duration }) {
  const questionCount = Math.min(Math.max(Math.floor(duration / 3), 3), 8)

  const prompt = `You are an expert technical interviewer at a top tech company.
Generate ${questionCount} interview questions for a ${difficulty} level ${role} position.
Interview type: ${type}.
Return ONLY a valid JSON array with no markdown, no explanation:
[{ "id": 1, "question": "...", "category": "behavioral|technical|general", "followUp": "..." }]`

  try {
    const model = getModel()
    const result = await model.generateContent(prompt)
    const text = result?.response?.text()
    const parsed = extractJson(text)

    if (!Array.isArray(parsed)) {
      throw new Error("Gemini question response is not an array")
    }

    return parsed
  } catch (error) {
    return fallbackQuestions()
  }
}

async function generateFeedback({ role, type, difficulty, transcript }) {
  const prompt = `You are an expert interview coach. Analyze this interview for a ${role} position.
Transcript: ${JSON.stringify(transcript)}
Return ONLY valid JSON with no markdown:
{
  "overallScore": <0-100>,
  "summary": "<2-3 sentence assessment>",
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "questionFeedback": [
    { "question": "...", "score": <0-10>, "feedback": "...", "idealAnswer": "..." }
  ],
  "hiringRecommendation": "strong_yes | yes | maybe | no",
  "communicationScore": <0-100>,
  "technicalScore": <0-100>,
  "confidenceScore": <0-100>
}`

  const model = getModel()
  const result = await model.generateContent(prompt)
  const text = result?.response?.text()

  return extractJson(text)
}

async function transcribeAudio(base64Audio, mimeType) {
  const prompt = "Transcribe the following audio accurately. Return ONLY the spoken text, without any markdown, quotes, or extra explanation. If there is no speech or it is unintelligible, return an empty string."
  
  const audioPart = {
    inlineData: {
      data: base64Audio,
      mimeType: mimeType || "audio/webm",
    },
  }

  try {
    const model = getModel()
    const result = await model.generateContent([prompt, audioPart])
    return result?.response?.text()?.trim() || ""
  } catch (error) {
    console.error("Transcription error:", error)
    throw new Error("Failed to transcribe audio")
  }
}

module.exports = {
  generateInterviewQuestions,
  generateFeedback,
  transcribeAudio,
}
