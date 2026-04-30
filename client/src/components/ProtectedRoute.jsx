import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProtectedRoute({ children }) {
  const { isPending, isAuthenticated } = useAuth()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-10 w-40 bg-slate-200 dark:bg-white/10" />
          <Skeleton className="h-36 w-full bg-slate-200 dark:bg-white/10" />
          <Skeleton className="h-36 w-full bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return children
}
