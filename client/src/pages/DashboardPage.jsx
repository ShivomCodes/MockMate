import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { authClient } from "@/lib/authClient"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function getInitials(name) {
  if (!name || typeof name !== "string") {
    return "U"
  }

  const parts = name.trim().split(/\s+/).slice(0, 2)
  const initials = parts.map((part) => part[0]?.toUpperCase()).join("")

  return initials || "U"
}

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
    return "border-green-400/30 bg-green-500/20 text-green-200"
  }

  if (status === "in_progress") {
    return "border-yellow-400/30 bg-yellow-500/20 text-yellow-200"
  }

  return "border-slate-500/30 bg-slate-500/20 text-slate-200"
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
        "border-violet-400/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20",
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
      "border-yellow-400/40 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20",
    variant: "outline",
  }
}

export default function DashboardPage() {
  const [interviews, setInterviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
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

  async function handleSignOut() {
    try {
      setIsSigningOut(true)
      const result = await authClient.signOut()

      if (result?.error) {
        throw result.error
      }

      navigate("/auth", { replace: true })
    } catch {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: "Please try again.",
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-white/10 bg-slate-950 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-sm font-bold text-violet-300">
            MM
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">
              MockMate AI
            </p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          <button
            type="button"
            className="flex w-full items-center rounded-lg border border-violet-500/40 bg-violet-500/20 px-3 py-2 text-left text-sm font-medium text-violet-200"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Profile
          </button>
        </nav>

        <div className="mt-auto space-y-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.image || ""} alt={displayName} />
              <AvatarFallback className="bg-violet-500/20 text-violet-200">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <p className="truncate text-sm font-medium text-slate-200">
              {displayName}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            variant="outline"
            className="w-full border-white/20 bg-transparent text-slate-100 hover:bg-white/10"
          >
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen p-8">
        <header className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              Welcome back, {displayName}
            </h1>
            <p className="mt-1 text-slate-300">Ready for your next interview?</p>
          </div>
          <Button
            type="button"
            onClick={() => navigate("/setup")}
            className="bg-violet-500 text-white hover:bg-violet-600"
          >
            Start New Interview →
          </Button>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">
                {stats.totalInterviews}
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Average score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">
                {stats.averageScore === null ? "—" : `${stats.averageScore}%`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Best score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">
                {stats.bestScore === null ? "—" : `${Math.round(stats.bestScore)}%`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Completed this week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">
                {stats.completedThisWeek}
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-xl text-white">Your interviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full bg-white/10" />
                  <Skeleton className="h-16 w-full bg-white/10" />
                  <Skeleton className="h-16 w-full bg-white/10" />
                  <Skeleton className="h-16 w-full bg-white/10" />
                </>
              ) : loadError ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-6 py-8 text-center text-red-200">
                  {loadError}
                </div>
              ) : interviews.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/20 bg-slate-900/40 px-6 py-10 text-center text-slate-300">
                  No interviews yet. Start your first one!
                </div>
              ) : (
                interviews.map((interview) => {
                  const action = actionForInterview(interview)

                  return (
                    <div
                      key={interview.id}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-slate-900/30 p-4 md:grid-cols-[1.2fr,0.9fr,0.9fr,0.9fr,0.8fr,1fr,auto] md:items-center"
                    >
                      <div>
                        <Badge className="bg-violet-500/20 text-violet-200">
                          {interview.role || "Unknown role"}
                        </Badge>
                      </div>

                      <div className="text-sm text-slate-200">
                        {interview.type || "—"}
                      </div>

                      <div className="text-sm text-slate-200">
                        {interview.difficulty || "—"}
                      </div>

                      <div>
                        <Badge className={statusBadgeClass(interview.status)}>
                          {statusLabel(interview.status)}
                        </Badge>
                      </div>

                      <div className="text-sm font-medium text-slate-100">
                        {scoreDisplay(interview.overallScore)}
                      </div>

                      <div className="text-sm text-slate-300">
                        {formatDate(interview.createdAt)}
                      </div>

                      <Button
                        type="button"
                        variant={action.variant}
                        className={action.className}
                        onClick={() => navigate(action.path)}
                      >
                        {action.label}
                      </Button>
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
      </main>
    </div>
  )
}
