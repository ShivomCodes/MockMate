import { Navigate, Route, Routes } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import ProtectedRoute from "@/components/ProtectedRoute"
import AuthPage from "@/pages/AuthPage"
import DashboardPage from "@/pages/DashboardPage"
import SetupPage from "@/pages/SetupPage"
import InterviewPage from "@/pages/InterviewPage"
import FeedbackPage from "@/pages/FeedbackPage"
import ProfilePage from "@/pages/ProfilePage"
import NotFound from "@/pages/NotFound"

function AuthRoute() {
  const { isPending, isAuthenticated } = useAuth()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        Loading...
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <AuthPage />
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={<AuthRoute />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <SetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview/:id"
          element={
            <ProtectedRoute>
              <InterviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback/:id"
          element={
            <ProtectedRoute>
              <FeedbackPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
