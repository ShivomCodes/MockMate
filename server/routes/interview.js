const express = require("express")
const prisma = require("../lib/prisma")
const requireAuth = require("../middleware/requireAuth")
const {
  generateFeedback,
  generateInterviewQuestions,
  transcribeAudio,
} = require("../lib/gemini")

const router = express.Router()

router.use(requireAuth)

router.post("/api/interviews/transcribe", async (req, res) => {
  try {
    const { audio, mimeType } = req.body
    if (!audio) {
      return res.status(400).json({ error: "No audio data provided" })
    }
    const text = await transcribeAudio(audio, mimeType)
    res.json({ text })
  } catch (error) {
    console.error("Transcription error:", error)
    res.status(500).json({ error: "Failed to transcribe audio" })
  }
})

router.post("/api/interviews", async (req, res) => {
  const { role, type, difficulty, duration } = req.body

  const interview = await prisma.interview.create({
    data: {
      userId: req.user.id,
      role,
      type,
      difficulty,
      duration,
      status: "pending",
    },
  })

  res.status(201).json(interview)
})

router.get("/api/interviews", async (req, res) => {
  const interviews = await prisma.interview.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      role: true,
      type: true,
      difficulty: true,
      status: true,
      overallScore: true,
      createdAt: true,
      completedAt: true,
    },
  })

  res.json(interviews)
})

router.get("/api/interviews/:id", async (req, res) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  })

  if (!interview) {
    return res.status(404).json({ error: "Interview not found" })
  }

  res.json(interview)
})

router.patch("/api/interviews/:id/start", async (req, res) => {
  const existingInterview = await prisma.interview.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
    select: { id: true },
  })

  if (!existingInterview) {
    return res.status(404).json({ error: "Interview not found" })
  }

  const interview = await prisma.interview.update({
    where: { id: req.params.id },
    data: { status: "in_progress" },
  })

  res.json(interview)
})

router.patch("/api/interviews/:id/complete", async (req, res) => {
  const existingInterview = await prisma.interview.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  })

  if (!existingInterview) {
    return res.status(404).json({ error: "Interview not found" })
  }

  const { transcript } = req.body

  const completedInterview = await prisma.interview.update({
    where: { id: req.params.id },
    data: {
      transcript,
      status: "completed",
      completedAt: new Date(),
    },
  })

  try {
    const feedbackResult = await generateFeedback(completedInterview)

    const updatedInterview = await prisma.interview.update({
      where: { id: req.params.id },
      data: {
        feedback: feedbackResult,
        overallScore: feedbackResult?.overallScore ?? null,
      },
    })

    res.json(updatedInterview)
  } catch (error) {
    console.error("Error generating feedback:", error)
    res.status(500).json({ error: "Failed to generate interview feedback from AI." })
  }
})

router.get("/api/interviews/:id/questions", async (req, res) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  })

  if (!interview) {
    return res.status(404).json({ error: "Interview not found" })
  }

  const questions = await generateInterviewQuestions({
    role: interview.role,
    type: interview.type,
    difficulty: interview.difficulty,
    duration: interview.duration,
  })

  res.json(questions)
})

module.exports = router
