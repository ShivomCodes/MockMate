import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { authClient } from "@/lib/authClient"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [interviews, setInterviews] = useState([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const [name, setName] = useState("")
  const [isSavingName, setIsSavingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    document.title = "MockMate AI — Profile"
  }, [])

  useEffect(() => {
    if (user?.name) {
      setName(user.name)
    }
  }, [user?.name])

  useEffect(() => {
    let active = true

    async function fetchInterviews() {
      try {
        const response = await api.get("/api/interviews")
        if (active) {
          setInterviews(Array.isArray(response.data) ? response.data : [])
        }
      } catch {
        // Stats are non-critical; silently fail
      } finally {
        if (active) {
          setIsLoadingStats(false)
        }
      }
    }

    fetchInterviews()

    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    const completed = interviews.filter((i) => i.status === "completed")
    const scores = completed
      .map((i) => Number(i.overallScore))
      .filter((s) => Number.isFinite(s))
    const total = scores.reduce((sum, s) => sum + s, 0)

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)

    const thisWeek = completed.filter((i) => {
      if (!i.completedAt) return false
      const d = new Date(i.completedAt)
      return !Number.isNaN(d.getTime()) && d >= weekStart
    }).length

    const monthStart = new Date()
    monthStart.setDate(1)

    const thisMonth = completed.filter((i) => {
      if (!i.completedAt) return false
      const d = new Date(i.completedAt)
      return !Number.isNaN(d.getTime()) && d >= monthStart
    }).length

    return {
      totalInterviews: interviews.length,
      completedInterviews: completed.length,
      averageScore: scores.length > 0 ? Math.round(total / scores.length) : null,
      bestScore: scores.length > 0 ? Math.round(Math.max(...scores)) : null,
      thisWeek,
      thisMonth,
    }
  }, [interviews])

  const displayName = user?.name || user?.email || "User"

  async function handleUpdateName(event) {
    event.preventDefault()

    const trimmed = name.trim()
    if (!trimmed) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter a display name.",
      })
      return
    }

    try {
      setIsSavingName(true)
      await authClient.updateUser({ name: trimmed })
      toast({
        title: "Profile updated",
        description: "Your name has been saved.",
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not update your name. Please try again.",
      })
    } finally {
      setIsSavingName(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()

    if (!currentPassword || !newPassword) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all password fields.",
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "New password must be at least 8 characters.",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
      })
      return
    }

    try {
      setIsChangingPassword(true)
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast({
        variant: "destructive",
        title: "Password change failed",
        description: "Incorrect current password or server error. Please try again.",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

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
            onClick={() => navigate("/dashboard")}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Dashboard
          </button>
          <button
            type="button"
            className="flex w-full items-center rounded-lg border border-violet-500/40 bg-violet-500/20 px-3 py-2 text-left text-sm font-medium text-violet-200"
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
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-white">Profile</h1>
          <p className="mt-1 text-slate-300">
            Manage your account and review your performance.
          </p>
        </header>

        {/* Profile Card */}
        <div className="mb-8 flex items-center gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.image || ""} alt={displayName} />
            <AvatarFallback className="bg-violet-500/20 text-2xl font-bold text-violet-200">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold text-white">{displayName}</h2>
            <p className="text-sm text-slate-400">{user?.email || ""}</p>
            <p className="mt-1 text-xs text-slate-500">
              Member since {formatDate(user?.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoadingStats ? (
            <>
              <Skeleton className="h-28 w-full bg-white/10" />
              <Skeleton className="h-28 w-full bg-white/10" />
              <Skeleton className="h-28 w-full bg-white/10" />
            </>
          ) : (
            <>
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
                  <p className="mt-1 text-xs text-slate-400">
                    {stats.completedInterviews} completed
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
                  <p className="mt-1 text-xs text-slate-400">
                    Best: {stats.bestScore === null ? "—" : `${stats.bestScore}%`}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Recent activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-white">
                    {stats.thisWeek}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    completed this week · {stats.thisMonth} this month
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </section>

        {/* Settings */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Update Name */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-lg text-white">Display name</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name" className="text-slate-300">
                    Name
                  </Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    className="border-white/10 bg-slate-900/50 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Email</Label>
                  <Input
                    value={user?.email || ""}
                    readOnly
                    disabled
                    className="border-white/10 bg-slate-900/30 text-slate-400"
                  />
                  <p className="text-xs text-slate-500">
                    Email cannot be changed.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={isSavingName}
                  className="bg-violet-500 text-white hover:bg-violet-600"
                >
                  {isSavingName ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-lg text-white">Change password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-slate-300">
                    Current password
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="••••••••"
                    className="border-white/10 bg-slate-900/50 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-slate-300">
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="••••••••"
                    className="border-white/10 bg-slate-900/50 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-slate-300">
                    Confirm new password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    className="border-white/10 bg-slate-900/50 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-violet-500 text-white hover:bg-violet-600"
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <div className="mt-8">
          <Separator className="bg-white/10" />
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <h3 className="text-lg font-semibold text-red-200">Danger zone</h3>
            <p className="mt-1 text-sm text-slate-400">
              Sign out of your account on this device.
            </p>
            <Button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="outline"
              className="mt-4 border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
            >
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
