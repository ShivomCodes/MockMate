import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import {
  CheckCircle2,
  Code2,
  MessageSquare,
  Mic,
  Shuffle,
  TriangleAlert,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const interviewTypes = [
  {
    value: "behavioral",
    title: "Behavioral",
    description: "Focus on communication, teamwork, and decision making.",
    icon: MessageSquare,
  },
  {
    value: "technical",
    title: "Technical",
    description: "Dive into engineering depth, architecture, and problem solving.",
    icon: Code2,
  },
  {
    value: "mixed",
    title: "Mixed",
    description: "Balanced blend of technical and behavioral questions.",
    icon: Shuffle,
  },
]

const difficulties = [
  {
    value: "easy",
    title: "Easy",
    description: "Warm-up questions with straightforward scenarios.",
    className:
      "border-green-500/40 bg-green-500/10 text-green-100 hover:border-green-400/60",
    activeClassName: "ring-2 ring-green-400/70 border-green-400 bg-green-500/20",
  },
  {
    value: "medium",
    title: "Medium",
    description: "Realistic mid-level challenges and tradeoffs.",
    className:
      "border-yellow-500/40 bg-yellow-500/10 text-yellow-100 hover:border-yellow-400/60",
    activeClassName:
      "ring-2 ring-yellow-400/70 border-yellow-400 bg-yellow-500/20",
  },
  {
    value: "hard",
    title: "Hard",
    description: "Complex, high-pressure and deep technical prompts.",
    className:
      "border-red-500/40 bg-red-500/10 text-red-100 hover:border-red-400/60",
    activeClassName: "ring-2 ring-red-400/70 border-red-400 bg-red-500/20",
  },
]

function stepLabel(step) {
  return `Step ${step} of 3`
}

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cameraGranted, setCameraGranted] = useState(false)
  const [micGranted, setMicGranted] = useState(false)
  const [mediaError, setMediaError] = useState("")
  const mediaStreamRef = useRef(null)
  const videoRef = useRef(null)
  const navigate = useNavigate()
  const { toast } = useToast()

  const form = useForm({
    defaultValues: {
      role: "",
      type: "mixed",
      difficulty: "medium",
      duration: 15,
    },
  })

  const role = form.watch("role")
  const selectedType = form.watch("type")
  const selectedDifficulty = form.watch("difficulty")
  const duration = form.watch("duration")
  const estimatedQuestions = Math.floor(Number(duration) / 3)

  useEffect(() => {
    document.title = "MockMate AI — Setup Interview"
  }, [])

  useEffect(() => {
    if (step !== 3) {
      return
    }

    let cancelled = false
    const videoElement = videoRef.current

    async function startMediaCheck() {
      setMediaError("")
      setCameraGranted(false)
      setMicGranted(false)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        mediaStreamRef.current = stream
        setCameraGranted(stream.getVideoTracks().length > 0)
        setMicGranted(stream.getAudioTracks().length > 0)

        if (videoElement) {
          videoElement.srcObject = stream
        }
      } catch {
        setMediaError(
          "Camera or microphone access was denied. Allow permissions in your browser settings, then return to this step."
        )
      }
    }

    startMediaCheck()

    return () => {
      cancelled = true
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      if (videoElement) {
        videoElement.srcObject = null
      }
    }
  }, [step])

  async function createInterview(values) {
    try {
      setIsSubmitting(true)
      const response = await api.post("/api/interviews", {
        role: values.role,
        type: values.type,
        difficulty: values.difficulty,
        duration: values.duration,
      })

      const id = response?.data?.id
      if (!id) {
        throw new Error("Missing interview id")
      }

      navigate(`/interview/${id}`)
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Please check your setup and try again."

      toast({
        variant: "destructive",
        title: "Could not start interview",
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function validateAndNext() {
    if (step === 1) {
      if (!role || !role.trim()) {
        form.setError("role", { message: "Please enter a job role." })
        return
      }
      form.clearErrors("role")
      setStep(2)
      return
    }

    if (step === 2) {
      setStep(3)
      return
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Interview setup</h1>
            <p className="mt-1 text-slate-300">Configure your next mock interview.</p>
          </div>
          <div className="rounded-full border border-violet-500/40 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200">
            {stepLabel(step)}
          </div>
        </div>

        <form
          onSubmit={form.handleSubmit(createInterview)}
          className="space-y-6"
        >
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-xl text-white">
                {step === 1
                  ? "Step 1 — Role & Type"
                  : step === 2
                    ? "Step 2 — Difficulty & Duration"
                    : "Step 3 — Camera & Mic Check"}
              </CardTitle>
              <CardDescription className="text-slate-300">
                {step === 1
                  ? "Define the position and interview style."
                  : step === 2
                    ? "Choose challenge level and interview length."
                    : "Verify your camera and microphone before you begin."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 1 ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200">
                      Job Role
                    </label>
                    <Input
                      placeholder='e.g. "Frontend Engineer"'
                      className="border-white/15 bg-slate-900/40 text-white placeholder:text-slate-400 focus-visible:ring-violet-500"
                      {...form.register("role")}
                    />
                    {form.formState.errors.role ? (
                      <p className="text-sm text-red-300">
                        {form.formState.errors.role.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-200">Interview Type</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {interviewTypes.map((typeOption) => {
                        const Icon = typeOption.icon
                        const isSelected = selectedType === typeOption.value

                        return (
                          <button
                            type="button"
                            key={typeOption.value}
                            onClick={() => form.setValue("type", typeOption.value)}
                            className={`rounded-xl border p-4 text-left transition ${
                              isSelected
                                ? "border-violet-400 bg-violet-500/15"
                                : "border-white/10 bg-slate-900/30 hover:border-violet-500/40"
                            }`}
                          >
                            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/80 text-violet-300">
                              <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-white">
                              {typeOption.title}
                            </h3>
                            <p className="mt-1 text-sm text-slate-300">
                              {typeOption.description}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-200">Difficulty</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {difficulties.map((difficultyOption) => {
                        const isSelected = selectedDifficulty === difficultyOption.value

                        return (
                          <button
                            key={difficultyOption.value}
                            type="button"
                            onClick={() =>
                              form.setValue("difficulty", difficultyOption.value)
                            }
                            className={`rounded-xl border p-4 text-left transition ${
                              difficultyOption.className
                            } ${isSelected ? difficultyOption.activeClassName : ""}`}
                          >
                            <h3 className="font-semibold">{difficultyOption.title}</h3>
                            <p className="mt-1 text-sm">{difficultyOption.description}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-200">Duration</p>
                      <p className="text-sm font-semibold text-violet-300">
                        {duration} minutes
                      </p>
                    </div>
                    <Slider
                      min={5}
                      max={30}
                      step={5}
                      value={[duration]}
                      onValueChange={(value) => {
                        form.setValue("duration", value[0])
                      }}
                    />
                    <p className="text-sm text-slate-300">
                      ~{estimatedQuestions} questions
                    </p>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/40">
                    {mediaError ? (
                      <div className="flex items-start gap-3 p-5 text-sm text-red-200">
                        <TriangleAlert className="mt-0.5 h-5 w-5 text-red-300" />
                        <p>{mediaError}</p>
                      </div>
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-[280px] w-full scale-x-[-1] object-cover"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/30 px-4 py-3">
                      <Video className="h-5 w-5 text-slate-300" />
                      <p className="text-sm text-slate-200">Camera access</p>
                      <span className="ml-auto">
                        {cameraGranted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/30 px-4 py-3">
                      <Mic className="h-5 w-5 text-slate-300" />
                      <p className="text-sm text-slate-200">Microphone access</p>
                      <span className="ml-auto">
                        {micGranted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1 || isSubmitting}
              className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10"
            >
              Back
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                onClick={validateAndNext}
                className="bg-violet-500 text-white hover:bg-violet-600"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-violet-500 text-white hover:bg-violet-600"
              >
                {isSubmitting ? "Starting..." : "Start Interview"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
