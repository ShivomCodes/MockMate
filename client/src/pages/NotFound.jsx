import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <p className="mb-2 text-sm font-medium uppercase tracking-wider text-violet-600 dark:text-violet-300">
        404
      </p>
      <h1 className="mb-3 text-4xl font-semibold text-slate-900 dark:text-white">Page not found</h1>
      <p className="mb-8 max-w-md text-slate-500 dark:text-slate-300">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button
        onClick={() => navigate("/")}
        className="bg-violet-500 text-white hover:bg-violet-600"
      >
        Go Home
      </Button>
    </div>
  )
}
