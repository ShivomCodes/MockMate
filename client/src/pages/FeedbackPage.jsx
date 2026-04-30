import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { CheckCircle2, TriangleAlert } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Spinner from "@/components/ui/Spinner"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

function scoreColor(score) {
  if (score < 40) {
    return "text-red-300"
  }
  if (score <= 70) {
    return "text-yellow-300"
  }
  return "text-green-300"
}

function scoreRing(score) {
  if (score < 40) {
    return "from-red-500/70 to-red-300/70"
  }
  if (score <= 70) {
    return "from-yellow-500/70 to-yellow-300/70"
  }
  return "from-green-500/70 to-green-300/70"
}

function recommendationClass(value) {
  if (value === "strong_yes") {
    return "border-green-400/30 bg-green-500/20 text-green-200"
  }
  if (value === "yes") {
    return "border-teal-400/30 bg-teal-500/20 text-teal-200"
  }
  if (value === "maybe") {
    return "border-yellow-400/30 bg-yellow-500/20 text-yellow-200"
  }
  return "border-red-400/30 bg-red-500/20 text-red-200"
}

function recommendationLabel(value) {
  if (!value) {
    return "unknown"
  }
  return value.replace("_", " ")
}

function outOfTenBadge(score) {
  if (score >= 8) {
    return "border-green-400/30 bg-green-500/20 text-green-200"
  }
  if (score >= 5) {
    return "border-yellow-400/30 bg-yellow-500/20 text-yellow-200"
  }
  return "border-red-400/30 bg-red-500/20 text-red-200"
}

function formatDate(value) {
  if (!value) {
    return "—"
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function sectionStyle(index) {
  return {
    animation: "fadeSlideIn 420ms ease-out forwards",
    animationDelay: `${(index + 1) * 0.1}s`,
    opacity: 0,
  }
}

export default function FeedbackPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [interview, setInterview] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [displayScore, setDisplayScore] = useState(0)
  const [downloadInProgress, setDownloadInProgress] = useState(false)
  const [loadError, setLoadError] = useState("")

  const feedback = interview?.feedback || {}
  const overallScore = Number(feedback?.overallScore || interview?.overallScore || 0)
  const strengths = Array.isArray(feedback?.strengths) ? feedback.strengths : []
  const improvements = Array.isArray(feedback?.improvements)
    ? feedback.improvements
    : []
  const questionFeedback = Array.isArray(feedback?.questionFeedback)
    ? feedback.questionFeedback
    : []

  useEffect(() => {
    let active = true
    let intervalId
    document.title = "MockMate AI — Your Results"

    async function fetchInterview() {
      try {
        const response = await api.get(`/api/interviews/${id}`)

        if (!active) {
          return
        }

        const data = response.data
        setInterview(data)

        if (data?.status === "completed") {
          if (intervalId) {
            clearInterval(intervalId)
          }
          setIsLoading(false)
          setLoadError("")
        } else {
          setIsLoading(true)
        }
      } catch (error) {
        if (!active) {
          return
        }

        const message =
          error?.response?.data?.error ||
          error?.message ||
          "Please try again from the dashboard."

        setLoadError(message)
        toast({
          variant: "destructive",
          title: "Could not load feedback",
          description: message,
        })
      }
    }

    fetchInterview()
    intervalId = setInterval(fetchInterview, 3000)

    return () => {
      active = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [id, toast])

  useEffect(() => {
    if (isLoading) {
      setDisplayScore(0)
      return
    }

    const target = Math.max(0, Math.min(100, Math.round(overallScore)))
    setDisplayScore(0)
    if (target === 0) {
      return
    }

    const totalFrames = 36
    const increment = Math.max(1, Math.ceil(target / totalFrames))
    const intervalId = setInterval(() => {
      setDisplayScore((previous) => {
        const next = Math.min(target, previous + increment)
        if (next >= target) {
          clearInterval(intervalId)
        }
        return next
      })
    }, 25)

    return () => {
      clearInterval(intervalId)
    }
  }, [isLoading, overallScore])

  const scoreGradient = useMemo(() => scoreRing(overallScore), [overallScore])
  const scoreTextColor = useMemo(() => scoreColor(overallScore), [overallScore])

  function downloadReport() {
    if (!interview) {
      return
    }

    setDownloadInProgress(true)
    try {
      const lines = [
        `MockMate AI Interview Report`,
        ``,
        `Role: ${interview.role || "N/A"}`,
        `Type: ${interview.type || "N/A"}`,
        `Difficulty: ${interview.difficulty || "N/A"}`,
        `Completed: ${formatDate(interview.completedAt)}`,
        `Overall Score: ${feedback?.overallScore ?? interview?.overallScore ?? "N/A"}`,
        `Recommendation: ${recommendationLabel(feedback?.hiringRecommendation)}`,
        ``,
        `Summary:`,
        `${feedback?.summary || "No summary available."}`,
        ``,
        `Strengths:`,
        ...(strengths.length > 0 ? strengths.map((item) => `- ${item}`) : ["- N/A"]),
        ``,
        `Improvements:`,
        ...(improvements.length > 0
          ? improvements.map((item) => `- ${item}`)
          : ["- N/A"]),
        ``,
        `Question Breakdown:`,
      ]

      questionFeedback.forEach((item, index) => {
        lines.push(
          ``,
          `${index + 1}. ${item?.question || "Question"}`,
          `Score: ${item?.score ?? "N/A"}/10`,
          `Feedback: ${item?.feedback || "N/A"}`,
          `Ideal Answer: ${item?.idealAnswer || "N/A"}`
        )
      })

      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "report.txt"
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadInProgress(false)
    }
  }

  if (loadError && !interview) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-slate-100">
        <p className="max-w-lg text-center text-red-300">{loadError}</p>
        <Button
          onClick={() => navigate("/dashboard")}
          className="bg-violet-500 text-white hover:bg-violet-600"
        >
          Back to Dashboard
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-slate-100">
        <Spinner className="h-10 w-10 border-slate-500 border-t-violet-400" />
        <p className="text-lg font-medium">Analyzing your performance...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-8 md:px-10">
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
        <section style={sectionStyle(0)}>
          <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[220px,1fr]">
                <div className="flex items-center justify-center">
                  <div
                    className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br sm:h-40 sm:w-40 ${scoreGradient}`}
                  >
                    <div className="absolute inset-[8px] rounded-full bg-white/95 dark:bg-slate-950/95 sm:inset-[10px]" />
                    <p className={`relative text-3xl font-bold sm:text-4xl ${scoreTextColor}`}>
                      {displayScore}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-violet-500/20 text-violet-200">
                      {interview?.role || "Unknown role"}
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-200">
                      {interview?.type || "Unknown type"}
                    </Badge>
                    <Badge className="bg-slate-500/20 text-slate-200">
                      {interview?.difficulty || "Unknown difficulty"}
                    </Badge>
                    <Badge className={recommendationClass(feedback?.hiringRecommendation)}>
                      {recommendationLabel(feedback?.hiringRecommendation)}
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    Completed on {formatDate(interview?.completedAt)}
                  </p>

                  <blockquote className="rounded-lg border-l-4 border-violet-400 bg-violet-500/10 px-4 py-3 text-slate-700 dark:text-slate-100">
                    {feedback?.summary || "No summary available yet."}
                  </blockquote>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section style={sectionStyle(1)}>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900 dark:text-white">
                  Communication Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {feedback?.communicationScore ?? 0}
                </p>
                <Progress value={feedback?.communicationScore ?? 0} />
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900 dark:text-white">
                  Technical Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {feedback?.technicalScore ?? 0}
                </p>
                <Progress value={feedback?.technicalScore ?? 0} />
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900 dark:text-white">
                  Confidence Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {feedback?.confidenceScore ?? 0}
                </p>
                <Progress value={feedback?.confidenceScore ?? 0} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section style={sectionStyle(2)}>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900 dark:text-white">Strengths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {strengths.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-300">No strengths listed.</p>
                ) : (
                  strengths.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                      <p className="text-sm text-slate-700 dark:text-slate-100">{item}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900 dark:text-white">Improvements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {improvements.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-300">No improvements listed.</p>
                ) : (
                  improvements.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-500" />
                      <p className="text-sm text-slate-700 dark:text-slate-100">{item}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section style={sectionStyle(3)}>
          <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900 dark:text-white">
                Per-question breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionFeedback.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-300">No question-level feedback yet.</p>
              ) : (
                questionFeedback.map((item, index) => (
                  <div
                    key={`${item?.question}-${index}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/40"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {item?.question || "Question"}
                      </p>
                      <Badge className={outOfTenBadge(Number(item?.score || 0))}>
                        {Number(item?.score || 0)}/10
                      </Badge>
                    </div>
                    <p className="mb-2 text-sm text-slate-600 dark:text-slate-200">
                      {item?.feedback || "No feedback provided."}
                    </p>
                    <Accordion type="single" collapsible>
                      <AccordionItem value={`ideal-${index}`}>
                        <AccordionTrigger className="text-slate-700 dark:text-slate-200">
                          View ideal answer
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-500 dark:text-slate-300">
                          {item?.idealAnswer || "No ideal answer provided."}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section style={sectionStyle(4)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              onClick={() => navigate("/setup")}
              className="w-full bg-violet-500 text-white hover:bg-violet-600 sm:w-auto"
            >
              Start New Interview
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10 sm:w-auto"
            >
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={downloadReport}
              disabled={downloadInProgress}
              className="w-full border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10 sm:w-auto"
            >
              {downloadInProgress ? "Preparing..." : "Download Report"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
