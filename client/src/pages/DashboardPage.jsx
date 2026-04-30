import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import AppLayout from "@/components/AppLayout"

function formatDate(value) {
  if (!value) {
    return "—"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "—"
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function scoreDisplay(value) {
  const score = Number(value)
  if (!Number.isFinite(score)) {
    return "—"
  }

  return Math.round(score).toString()
}

function statusBadgeClass(status) {
  if (status === "completed") {
    return "border-green-400/30 bg-green-500/20 text-green-700 dark:text-green-200"
  }

  if (status === "in_progress") {
    return "border-yellow-400/30 bg-yellow-500/20 text-yellow-700 dark:text-yellow-200"
  }

  return "border-slate-400/30 bg-slate-500/20 text-slate-600 dark:text-slate-200"
}

function statusLabel(status) {
  if (status === "in_progress") {
    return "In Progress"
  }

  if (status === "completed") {
    return "Completed"
  }

  return "Pending"
}

function actionForInterview(interview) {
  if (interview.status === "completed") {
    return {
      label: "View Feedback",
      path: `/feedback/${interview.id}`,
      className:
        "border-violet-400/40 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-200",
      variant: "outline",
    }
  }

  if (interview.status === "pending") {
    return {
      label: "Start",
      path: `/interview/${interview.id}`,
      className: "bg-violet-500 text-white hover:bg-violet-600",
      variant: "default",
    }
  }

  return {
    label: "Resume",
    path: `/interview/${interview.id}`,
    className:
      "border-yellow-400/40 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-100",
    variant: "outline",
  }
}

export default function DashboardPage() {
  const [interviews, setInterviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = "MockMate AI — Dashboard"
  }, [])

  useEffect(() => {
    let active = true

    async function fetchInterviews() {
      try {
        const response = await api.get("/api/interviews")

        if (!active) {
          return
        }

        setLoadError("")
        setInterviews(Array.isArray(response.data) ? response.data : [])
      } catch (error) {
        if (!active) {
          return
        }

        const message =
          error?.response?.data?.error ||
          error?.message ||
          "Please refresh the page or try again in a few moments."

        setLoadError(message)
        toast({
          variant: "destructive",
          title: "Could not load interviews",
          description: message,
        })
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    fetchInterviews()

    return () => {
      active = false
    }
  }, [toast])

  const stats = useMemo(() => {
    const completed = interviews.filter((item) => item.status === "completed")
    const completedScores = completed
      .map((item) => Number(item.overallScore))
      .filter((score) => Number.isFinite(score))
    const totalScore = completedScores.reduce((sum, score) => sum + score, 0)

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)

    const completedThisWeek = completed.filter((item) => {
      if (!item.completedAt) {
        return false
      }

      const completedAt = new Date(item.completedAt)
      if (Number.isNaN(completedAt.getTime())) {
        return false
      }

      return completedAt >= weekStart
    }).length

    return {
      totalInterviews: interviews.length,
      averageScore:
        completedScores.length > 0
          ? Math.round(totalScore / completedScores.length)
          : null,
      bestScore:
        completedScores.length > 0 ? Math.max(...completedScores) : null,
      completedThisWeek,
    }
  }, [interviews])

  const displayName = user?.name || user?.email || "User"

  return (
    <AppLayout>
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300 sm:text-base">Ready for your next interview?</p>
        </div>
        <Button
          type="button"
          onClick={() => navigate("/setup")}
          className="w-full bg-violet-500 text-white hover:bg-violet-600 sm:w-auto"
        >
          Start New Interview →
        </Button>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 xl:grid-cols-4">
        <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <CardHeader className="p-4 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-300 sm:text-sm">
              Total interviews
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
              {stats.totalInterviews}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <CardHeader className="p-4 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-300 sm:text-sm">
              Average score
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
              {stats.averageScore === null ? "—" : `${stats.averageScore}%`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <CardHeader className="p-4 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-300 sm:text-sm">
              Best score
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
              {stats.bestScore === null ? "—" : `${Math.round(stats.bestScore)}%`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <CardHeader className="p-4 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-300 sm:text-sm">
              Completed this week
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
              {stats.completedThisWeek}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-white sm:text-xl">Your interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full bg-slate-100 dark:bg-white/10" />
                <Skeleton className="h-16 w-full bg-slate-100 dark:bg-white/10" />
                <Skeleton className="h-16 w-full bg-slate-100 dark:bg-white/10" />
                <Skeleton className="h-16 w-full bg-slate-100 dark:bg-white/10" />
              </>
            ) : loadError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                {loadError}
              </div>
            ) : interviews.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500 dark:border-white/20 dark:bg-slate-900/40 dark:text-slate-300">
                No interviews yet. Start your first one!
              </div>
            ) : (
              interviews.map((interview) => {
                const action = actionForInterview(interview)

                return (
                  <div
                    key={interview.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Left: Role + meta */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-violet-500/20 text-violet-700 dark:text-violet-200">
                        {interview.role || "Unknown role"}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                        {interview.type || "—"}
                      </span>
                      <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                        {interview.difficulty || "—"}
                      </span>
                    </div>

                    {/* Right: Status + score + date + action */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Badge className={statusBadgeClass(interview.status)}>
                        {statusLabel(interview.status)}
                      </Badge>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-100">
                        {scoreDisplay(interview.overallScore)}
                      </span>
                      <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline sm:text-sm">
                        {formatDate(interview.createdAt)}
                      </span>
                      <Button
                        type="button"
                        variant={action.variant}
                        className={`ml-auto text-xs sm:ml-0 sm:text-sm ${action.className}`}
                        onClick={() => navigate(action.path)}
                      >
                        {action.label}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>
      {!isLoading && !loadError && interviews.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          Create an interview from Setup to get started.
        </p>
      ) : null}
    </AppLayout>
  )
}
