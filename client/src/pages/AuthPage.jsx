import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { authClient } from "@/lib/authClient"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

const signInSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

function getErrorMessage(error, fallback) {
  if (typeof error === "string" && error.trim()) {
    return error
  }

  if (error && typeof error === "object") {
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message
    }

    if (typeof error.statusText === "string" && error.statusText.trim()) {
      return error.statusText
    }
  }

  return fallback
}

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("signin")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const signInForm = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const signUpForm = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  const isSignInTab = activeTab === "signin"

  async function onSubmitSignIn(values) {
    try {
      setIsSubmitting(true)
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })

      if (result?.error) {
        throw result.error
      }

      navigate("/dashboard", { replace: true })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: getErrorMessage(
          error,
          "We could not sign you in. Please check your credentials and try again."
        ),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onSubmitSignUp(values) {
    try {
      setIsSubmitting(true)
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      })

      if (result?.error) {
        throw result.error
      }

      navigate("/dashboard", { replace: true })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: getErrorMessage(
          error,
          "We could not create your account. Please try again."
        ),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-2 lg:items-center lg:px-10">
        <section className="space-y-6 lg:pr-12">
          <p className="inline-flex rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-violet-300">
            MockMate AI
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white lg:text-5xl">
            MockMate AI
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-slate-300">
            Practice interviews with AI. Get brutally honest feedback.
          </p>
        </section>

        <section className="w-full">
          <Card className="w-full border-white/10 bg-white/5 shadow-2xl backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-slate-900/50 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("signin")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    isSignInTab
                      ? "bg-violet-500 text-white"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("signup")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    !isSignInTab
                      ? "bg-violet-500 text-white"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {isSignInTab ? (
                <form
                  className="space-y-4"
                  onSubmit={signInForm.handleSubmit(onSubmitSignIn)}
                >
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-slate-200">
                      Email
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="border-white/15 bg-slate-900/40 text-white placeholder:text-slate-400 focus-visible:ring-violet-500"
                      {...signInForm.register("email")}
                    />
                    {signInForm.formState.errors.email ? (
                      <p className="text-sm text-red-300">
                        {signInForm.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-slate-200">
                      Password
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="border-white/15 bg-slate-900/40 text-white placeholder:text-slate-400 focus-visible:ring-violet-500"
                      {...signInForm.register("password")}
                    />
                    {signInForm.formState.errors.password ? (
                      <p className="text-sm text-red-300">
                        {signInForm.formState.errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-violet-500 text-white hover:bg-violet-600"
                  >
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={signUpForm.handleSubmit(onSubmitSignUp)}
                >
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-slate-200">
                      Name
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Jane Doe"
                      className="border-white/15 bg-slate-900/40 text-white placeholder:text-slate-400 focus-visible:ring-violet-500"
                      {...signUpForm.register("name")}
                    />
                    {signUpForm.formState.errors.name ? (
                      <p className="text-sm text-red-300">
                        {signUpForm.formState.errors.name.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-slate-200">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="border-white/15 bg-slate-900/40 text-white placeholder:text-slate-400 focus-visible:ring-violet-500"
                      {...signUpForm.register("email")}
                    />
                    {signUpForm.formState.errors.email ? (
                      <p className="text-sm text-red-300">
                        {signUpForm.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-200">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="border-white/15 bg-slate-900/40 text-white placeholder:text-slate-400 focus-visible:ring-violet-500"
                      {...signUpForm.register("password")}
                    />
                    {signUpForm.formState.errors.password ? (
                      <p className="text-sm text-red-300">
                        {signUpForm.formState.errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-violet-500 text-white hover:bg-violet-600"
                  >
                    {isSubmitting ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
