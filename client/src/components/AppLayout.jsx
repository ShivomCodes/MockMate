import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { authClient } from "@/lib/authClient"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { BrainCircuit, Menu, Moon, Sun, X } from "lucide-react"

function getInitials(name) {
  if (!name || typeof name !== "string") {
    return "U"
  }

  const parts = name.trim().split(/\s+/).slice(0, 2)
  const initials = parts.map((part) => part[0]?.toUpperCase()).join("")

  return initials || "U"
}

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Profile", path: "/profile" },
]

export default function AppLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

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

  function handleNavClick(path) {
    navigate(path)
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/95 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
            MockMate AI
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4.5 w-4.5" />
            ) : (
              <Moon className="h-4.5 w-4.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm dark:bg-black/60 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      ) : null}

      {/* Mobile slide-out menu */}
      <div
        className={`fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-slate-200 bg-white px-5 pb-6 pt-[68px] transition-transform duration-300 dark:border-white/10 dark:bg-slate-950 lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="mt-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  isActive
                    ? "border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto space-y-4 border-t border-slate-200 pt-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.image || ""} alt={displayName} />
              <AvatarFallback className="bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {displayName}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            variant="outline"
            className="w-full border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 dark:border-white/10 dark:bg-slate-950 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
              MockMate AI
            </p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  isActive
                    ? "border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto space-y-4 border-t border-slate-200 pt-4 dark:border-white/10">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Dark Mode
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.image || ""} alt={displayName} />
              <AvatarFallback className="bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {displayName}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            variant="outline"
            className="w-full border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen pt-[60px] lg:ml-64 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
