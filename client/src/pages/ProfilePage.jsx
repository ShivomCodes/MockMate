import { useEffect, useMemo, useState } from "react"
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
import AppLayout from "@/components/AppLayout"

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

  const [interviews, setInterviews] = useState([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const [name, setName] = useState("")
  const [isSavingName, setIsSavingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

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

  return (
    <AppLayout>
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300 sm:text-base">
          Manage your account and review your performance.
        </p>
      </header>

      {/* Profile Card */}
      <div className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-white/5 sm:mb-8 sm:flex-row sm:gap-6 sm:p-6 sm:text-left">
        <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
          <AvatarImage src={user?.image || ""} alt={displayName} />
          <AvatarFallback className="bg-violet-500/15 text-xl font-bold text-violet-600 dark:bg-violet-500/20 dark:text-violet-200 sm:text-2xl">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">{displayName}</h2>
          <p className="text-sm text-slate-400">{user?.email || ""}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Member since {formatDate(user?.createdAt)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <section className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {isLoadingStats ? (
          <>
            <Skeleton className="h-28 w-full bg-slate-100 dark:bg-white/10" />
            <Skeleton className="h-28 w-full bg-slate-100 dark:bg-white/10" />
            <Skeleton className="h-28 w-full bg-slate-100 dark:bg-white/10" />
          </>
        ) : (
          <>
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
                <p className="mt-1 text-xs text-slate-400">
                  {stats.completedInterviews} completed
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
                <p className="mt-1 text-xs text-slate-400">
                  Best: {stats.bestScore === null ? "—" : `${stats.bestScore}%`}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <CardHeader className="p-4 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-300 sm:text-sm">
                  Recent activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
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
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Update Name */}
        <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-white">Display name</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="text-slate-600 dark:text-slate-300">
                  Name
                </Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-300">Email</Label>
                <Input
                  value={user?.email || ""}
                  readOnly
                  disabled
                  className="border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-slate-900/30"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Email cannot be changed.
                </p>
              </div>
              <Button
                type="submit"
                disabled={isSavingName}
                className="w-full bg-violet-500 text-white hover:bg-violet-600 sm:w-auto"
              >
                {isSavingName ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-white">Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-slate-600 dark:text-slate-300">
                  Current password
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="••••••••"
                  className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-600 dark:text-slate-300">
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="••••••••"
                  className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-600 dark:text-slate-300">
                  Confirm new password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <Button
                type="submit"
                disabled={isChangingPassword}
                className="w-full bg-violet-500 text-white hover:bg-violet-600 sm:w-auto"
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <div className="mt-6 sm:mt-8">
        <Separator className="bg-slate-200 dark:bg-white/10" />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/5 sm:p-6">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-200">Danger zone</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign out of your account on this device.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
