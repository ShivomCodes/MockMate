import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { CheckCircle2, Mic, Square, VideoOff, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import Spinner from "@/components/ui/Spinner"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis"

function getQuestionText(item) {
  if (!item) {
    return ""
  }

  if (typeof item === "string") {
    return item
  }

  return typeof item.question === "string" ? item.question : ""
}

function getFollowUpText(item) {
  if (!item || typeof item === "string") {
    return ""
  }

  return typeof item.followUp === "string" ? item.followUp : ""
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

export default function InterviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    speak: ttsSpeak,
    stop: ttsStop,
    replay: ttsReplay,
    isSpeaking: ttsIsSpeaking,
    isMuted: ttsIsMuted,
    toggleMute: ttsToggleMute,
    isSupported: ttsSupported,
  } = useSpeechSynthesis()

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState("loading")
  const [transcript, setTranscript] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [timeLeft, setTimeLeft] = useState(0)
  const [typedPrompt, setTypedPrompt] = useState("")
  const [typedPromptKey, setTypedPromptKey] = useState("")
  const [answerTarget, setAnswerTarget] = useState("question")
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)
  const [webcamError, setWebcamError] = useState("")
  const [loadError, setLoadError] = useState("")
  const [isSpeechError, setIsSpeechError] = useState(false)

  const transcriptRef = useRef([])
  const audioChunksRef = useRef([])
  const mediaRecorderRef = useRef(null)
  const finalSpeechRef = useRef("")
  const pendingEntryRef = useRef(null)
  const thinkingTimeoutRef = useRef(null)
  const webcamStreamRef = useRef(null)
  const videoRef = useRef(null)
  const isCompletingRef = useRef(false)

  const supported = typeof window !== "undefined" && "MediaRecorder" in window

  const currentQuestion = questions[currentIndex] || null
  const currentQuestionText = useMemo(
    () => getQuestionText(currentQuestion),
    [currentQuestion]
  )
  const currentFollowUpText = useMemo(
    () => getFollowUpText(currentQuestion),
    [currentQuestion]
  )
  const activePromptText =
    answerTarget === "followup" ? currentFollowUpText : currentQuestionText
  const isPromptPhase = phase === "question" || phase === "followup"
  const promptKey = `${phase}-${currentIndex}-${answerTarget}-${activePromptText}`
  const typewriterFinished =
    isPromptPhase &&
    (activePromptText.trim() === "" ||
      (typedPromptKey === promptKey &&
        typedPrompt.trim() === activePromptText.trim()))

  const totalQuestions = questions.length
  const questionNumber = totalQuestions > 0 ? Math.min(currentIndex + 1, totalQuestions) : 0
  const progressValue =
    totalQuestions > 0
      ? phase === "done"
        ? 100
        : Math.round((questionNumber / totalQuestions) * 100)
      : 0

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // Already stopped
      }
    }
  }, [])

  const stopWebcam = useCallback(() => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop())
      webcamStreamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const finishInterview = useCallback(
    async (finalTranscript) => {
      if (isCompletingRef.current) {
        return
      }

      isCompletingRef.current = true
      setPhase("done")
      stopRecording()
      stopWebcam()
      ttsStop()

      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current)
        thinkingTimeoutRef.current = null
      }

      try {
        await api.patch(`/api/interviews/${id}/complete`, {
          transcript: finalTranscript,
        })
        navigate(`/feedback/${id}`, { replace: true })
      } catch (error) {
        const message =
          error?.response?.data?.error ||
          error?.message ||
          "Please try again from your dashboard."

        toast({
          variant: "destructive",
          title: "Could not complete interview",
          description: message,
        })
        navigate("/dashboard", { replace: true })
      }
    },
    [id, navigate, stopRecording, stopWebcam, toast]
  )

  const queueThinkingTransition = useCallback((callback) => {
    if (thinkingTimeoutRef.current) {
      clearTimeout(thinkingTimeoutRef.current)
    }

    setPhase("thinking")
    thinkingTimeoutRef.current = setTimeout(() => {
      callback()
    }, 900)
  }, [])

  const startListening = useCallback(async () => {
    finalSpeechRef.current = ""
    setCurrentAnswer("Recording your answer... (Speak now)")
    setPhase("listening")
    setIsSpeechError(false)

    if (!supported) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType })
        audioChunksRef.current = []

        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const base64Data = reader.result.split(",")[1]
          setCurrentAnswer("Transcribing audio...")
          setPhase("transcribing")
          
          try {
            const response = await api.post("/api/interviews/transcribe", {
              audio: base64Data,
              mimeType: audioBlob.type,
            })
            const text = response.data.text || ""
            finalSpeechRef.current = text
            setCurrentAnswer(text)
            
            if (!text.trim()) {
               toast({
                 variant: "destructive",
                 title: "No speech detected",
                 description: "We couldn't hear anything. Please type your answer.",
               })
            }
            
            setPhase(answerTarget)
          } catch {
            toast({
              variant: "destructive",
              title: "Transcription failed",
              description: "We couldn't transcribe that. Please type your answer.",
            })
            setPhase(answerTarget)
            setIsSpeechError(true)
            setCurrentAnswer("")
          }
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
    } catch {
      toast({
        variant: "destructive",
        title: "Microphone unavailable",
        description: "Please check your microphone permissions or type your answer.",
      })
      setPhase(answerTarget)
      setIsSpeechError(true)
      setCurrentAnswer("")
    }
  }, [answerTarget, supported, toast])

  const handleAnswerSubmission = useCallback(
    (rawAnswer) => {
      const answer = rawAnswer.trim()
      if (!answer) {
        toast({
          variant: "destructive",
          title: "Answer required",
          description: "Please provide an answer before continuing.",
        })
        return
      }

      const questionText = currentQuestionText
      const followUpText = currentFollowUpText

      setCurrentAnswer("")
      finalSpeechRef.current = ""

      if (answerTarget === "question" && followUpText) {
        pendingEntryRef.current = {
          question: questionText,
          answer,
          followUp: followUpText,
          followUpAnswer: "",
        }

        queueThinkingTransition(() => {
          setAnswerTarget("followup")
          setPhase("followup")
        })
        return
      }

      let entry
      if (answerTarget === "followup") {
        const pending = pendingEntryRef.current || {
          question: questionText,
          answer: "",
          followUp: followUpText,
          followUpAnswer: "",
        }
        entry = { ...pending, followUpAnswer: answer }
        pendingEntryRef.current = null
      } else {
        entry = {
          question: questionText,
          answer,
          followUp: followUpText || "",
          followUpAnswer: "",
        }
      }

      const updatedTranscript = [...transcriptRef.current, entry]
      transcriptRef.current = updatedTranscript
      setTranscript(updatedTranscript)

      queueThinkingTransition(() => {
        const hasNextQuestion = currentIndex + 1 < questions.length
        if (hasNextQuestion) {
          setCurrentIndex((previous) => previous + 1)
          setAnswerTarget("question")
          setPhase("question")
          return
        }

        finishInterview(updatedTranscript)
      })
    },
    [
      answerTarget,
      currentFollowUpText,
      currentIndex,
      currentQuestionText,
      finishInterview,
      queueThinkingTransition,
      questions.length,
      toast,
    ]
  )

  const finishRecording = useCallback(() => {
    if (supported) {
      stopRecording()
    }
  }, [supported, stopRecording])

  useEffect(() => {
    let isCancelled = false
    document.title = "MockMate AI — Interview in Progress"

    async function initializeInterview() {
      try {
        setPhase("loading")

        const startResponse = await api.patch(`/api/interviews/${id}/start`, {})
        if (isCancelled) {
          return
        }

        const durationMinutes = Number(startResponse?.data?.duration)
        setTimeLeft(
          Number.isFinite(durationMinutes) && durationMinutes > 0
            ? durationMinutes * 60
            : 15 * 60
        )

        const questionsResponse = await api.get(`/api/interviews/${id}/questions`)
        if (isCancelled) {
          return
        }

        const fetchedQuestions = Array.isArray(questionsResponse.data)
          ? questionsResponse.data
          : []
        setQuestions(fetchedQuestions)
        setCurrentIndex(0)
        setAnswerTarget("question")
        setLoadError("")
        setPhase("ready")
      } catch (error) {
        const message =
          error?.response?.data?.error ||
          error?.message ||
          "Please return to the dashboard and try again."

        setLoadError(message)
        toast({
          variant: "destructive",
          title: "Could not load interview",
          description: message,
        })
      }
    }

    async function initializeWebcamPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        webcamStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        setWebcamError("Webcam preview unavailable. Check browser permissions.")
      }
    }

    initializeInterview()
    initializeWebcamPreview()

    return () => {
      isCancelled = true
      stopRecording()
      stopWebcam()
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current)
        thinkingTimeoutRef.current = null
      }
    }
  }, [id, navigate, stopRecording, stopWebcam, toast])

  useEffect(() => {
    if (!isPromptPhase) {
      return
    }

    const sourceText = activePromptText
    const words = sourceText.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      return
    }

    // Auto-speak the question when it appears
    ttsSpeak(sourceText)

    let wordIndex = 0
    const intervalId = setInterval(() => {
      wordIndex += 1
      setTypedPromptKey(promptKey)
      setTypedPrompt(words.slice(0, wordIndex).join(" "))

      if (wordIndex >= words.length) {
        clearInterval(intervalId)
      }
    }, 60)

    return () => {
      clearInterval(intervalId)
      ttsStop()
    }
  }, [activePromptText, isPromptPhase, promptKey, ttsSpeak, ttsStop])

  useEffect(() => {
    if (phase === "loading" || phase === "done") {
      return
    }

    const timerId = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timerId)
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => {
      clearInterval(timerId)
    }
  }, [phase])

  useEffect(() => {
    if (timeLeft === 0 && phase !== "loading" && phase !== "done") {
      finishInterview(transcriptRef.current)
    }
  }, [finishInterview, phase, timeLeft])

  function beginInterview() {
    if (questions.length === 0) {
      finishInterview(transcriptRef.current)
      return
    }

    setAnswerTarget("question")
    setCurrentAnswer("")
    finalSpeechRef.current = ""
    setPhase("question")
  }

  const currentPromptDisplay = isPromptPhase
    ? typedPromptKey === promptKey
      ? typedPrompt
      : ""
    : activePromptText

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <p className="max-w-lg text-center text-red-500 dark:text-red-300">{loadError}</p>
        <Button
          onClick={() => navigate("/dashboard")}
          className="bg-violet-500 text-white hover:bg-violet-600"
        >
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:p-6 md:p-8">
      <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">Live Interview</h1>
          <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 sm:w-auto"
              >
                End Interview Early
              </Button>
            </DialogTrigger>
            <DialogContent className="border-white/20 bg-slate-900 text-slate-100">
              <DialogHeader>
                <DialogTitle>End interview now?</DialogTitle>
                <DialogDescription className="text-slate-300">
                  This will stop the current session and finalize your feedback with
                  responses collected so far.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEndDialogOpen(false)}
                  className="border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setIsEndDialogOpen(false)
                    finishInterview(transcriptRef.current)
                  }}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm End
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="h-full border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <CardHeader>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative h-14 w-14 sm:h-20 sm:w-20">
                    <div className="absolute inset-0 rounded-2xl bg-violet-500/25 animate-ping" />
                    <div className="absolute inset-2 rounded-xl bg-violet-500/35 animate-pulse" />
                    <div className="absolute inset-4 rounded-md bg-violet-300/90 sm:inset-5" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-900 dark:text-white">AI Interviewer</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-300">
                      Stay concise and think aloud through your decisions.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="min-h-[140px] rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/40 sm:min-h-[180px] sm:p-5">
                  {phase === "ready" ? (
                    <p className="text-lg text-slate-600 dark:text-slate-200">
                      Click Begin Interview to start
                    </p>
                  ) : null}

                  {phase === "loading" ? (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                      <Spinner className="h-5 w-5 border-slate-500 border-t-violet-400" />
                      Preparing your interview...
                    </div>
                  ) : null}

                  {(phase === "question" ||
                    phase === "listening" ||
                    phase === "thinking" ||
                    phase === "transcribing" ||
                    phase === "followup") && (
                    <div className="space-y-3">
                      {answerTarget === "followup" || phase === "followup" ? (
                        <p className="inline-flex rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-200">
                          Follow-up
                        </p>
                      ) : null}
                      <p className="text-lg leading-relaxed text-slate-900 dark:text-white">
                        {currentPromptDisplay}
                      </p>

                      {/* TTS controls: Replay + Mute */}
                      {ttsSupported ? (
                        <div className="flex items-center gap-2 pt-1">
                          {!ttsIsMuted ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={ttsReplay}
                              disabled={ttsIsSpeaking}
                              className="border-violet-400/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                            >
                              <Volume2 className="mr-1 h-3.5 w-3.5" />
                              {ttsIsSpeaking ? "Speaking..." : "Replay"}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={ttsToggleMute}
                            className="border-white/20 bg-transparent text-slate-300 hover:bg-white/10"
                          >
                            {ttsIsMuted ? (
                              <>
                                <VolumeX className="mr-1 h-3.5 w-3.5" />
                                Unmute
                              </>
                            ) : (
                              <>
                                <Volume2 className="mr-1 h-3.5 w-3.5" />
                                Mute
                              </>
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {phase === "done" ? (
                    <p className="text-lg text-slate-700 dark:text-slate-100">
                      Interview complete! Generating your feedback...
                    </p>
                  ) : null}
                </div>

                {phase === "ready" ? (
                  <Button
                    onClick={beginInterview}
                    className="bg-violet-500 text-white hover:bg-violet-600"
                  >
                    Begin Interview
                  </Button>
                ) : null}

                {(phase === "question" || phase === "followup") &&
                typewriterFinished ? (
                  <div className="space-y-3">
                    {currentAnswer ? (
                      <>
                        <Textarea
                          value={currentAnswer}
                          onChange={(event) => setCurrentAnswer(event.target.value)}
                          placeholder="Edit your answer if needed..."
                          className="min-h-[140px] border-slate-300 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAnswerSubmission(currentAnswer)}
                            className="bg-violet-500 text-white hover:bg-violet-600"
                          >
                            Submit Answer
                          </Button>
                          {supported && !isSpeechError ? (
                            <Button
                              variant="outline"
                              onClick={startListening}
                              className="border-violet-400/40 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-200"
                            >
                              <Mic className="mr-1 h-4 w-4" />
                              Re-record
                            </Button>
                          ) : null}
                        </div>
                      </>
                    ) : supported && !isSpeechError ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={startListening}
                          className="bg-violet-500 text-white hover:bg-violet-600"
                        >
                          <Mic className="mr-1 h-4 w-4" />
                          Start Answering
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsSpeechError(true)}
                          className="border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-200"
                        >
                          Type Instead
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-yellow-600 dark:text-yellow-200">
                          Type your answer below.
                        </p>
                        <Textarea
                          value={currentAnswer}
                          onChange={(event) => setCurrentAnswer(event.target.value)}
                          placeholder="Type your answer..."
                          className="min-h-[140px] border-slate-300 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAnswerSubmission(currentAnswer)}
                            className="bg-violet-500 text-white hover:bg-violet-600"
                          >
                            Submit Answer
                          </Button>
                          {supported ? (
                            <Button
                              variant="outline"
                              onClick={() => setIsSpeechError(false)}
                              className="border-violet-400/40 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-200"
                            >
                              <Mic className="mr-1 h-4 w-4" />
                              Use Voice
                            </Button>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}

                {phase === "listening" && supported && !isSpeechError ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={finishRecording}
                        className="bg-red-600 text-white hover:bg-red-700 animate-pulse"
                      >
                        <Square className="mr-1 h-4 w-4" />
                        Done Answering
                      </Button>
                      <p className="text-sm text-red-500 dark:text-red-300">Recording...</p>
                    </div>
                  </div>
                ) : null}

                {phase === "transcribing" ? (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                    <Spinner className="h-5 w-5 border-slate-500 border-t-violet-400" />
                    Transcribing your voice...
                  </div>
                ) : null}

                {phase === "thinking" ? (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                    <Spinner className="h-5 w-5 border-slate-500 border-t-violet-400" />
                    AI is thinking...
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <CardHeader className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900/50">
                  {webcamError ? (
                    <div className="flex h-28 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-300 sm:h-36">
                      <VideoOff className="h-4 w-4" />
                      {webcamError}
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-28 w-full object-cover sm:h-36"
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Time Left
                  </p>
                  <p className="text-3xl font-semibold text-slate-900 dark:text-white">
                    {formatTime(timeLeft)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Question {questionNumber} of {totalQuestions}
                  </p>
                  <Progress value={progressValue} className="bg-slate-200 dark:bg-slate-800" />
                  <p className="text-xs text-slate-400">
                    Responses saved: {transcript.length}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[200px] space-y-2 overflow-y-auto pr-1 sm:max-h-[340px]">
                  {questions.map((item, index) => {
                    const isCurrent = phase !== "done" && index === currentIndex
                    const isCompleted =
                      index < currentIndex || (phase === "done" && index <= currentIndex)

                    return (
                      <div
                        key={item.id || `${index}-${getQuestionText(item)}`}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                          isCurrent
                            ? "border-violet-400/50 bg-violet-500/15 text-violet-700 dark:text-violet-100"
                            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200"
                        }`}
                      >
                        <span className="w-5 text-center text-xs font-semibold">
                          {index + 1}
                        </span>
                        <p className="flex-1 truncate">{getQuestionText(item)}</p>
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
