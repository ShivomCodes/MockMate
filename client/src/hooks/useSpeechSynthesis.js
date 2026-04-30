import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Custom hook that wraps the Web Speech API (SpeechSynthesis)
 * for text-to-speech playback of interview questions.
 *
 * Returns controls to speak, stop, replay, mute/unmute,
 * plus state for isSpeaking, isMuted, and isSupported.
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const lastTextRef = useRef("")
  const utteranceRef = useRef(null)

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window

  /**
   * Pick the best available English voice.
   * Priority: Google US English > Microsoft English > any en- voice > default.
   */
  const pickVoice = useCallback(() => {
    if (!isSupported) {
      return null
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) {
      return null
    }

    // Prefer Google US English (Chrome ships high-quality Google voices)
    const googleUs = voices.find(
      (v) =>
        v.name.includes("Google US English") ||
        v.name.includes("Google UK English")
    )
    if (googleUs) {
      return googleUs
    }

    // Next: Microsoft voices (Edge/Windows have good ones)
    const microsoft = voices.find(
      (v) => v.name.includes("Microsoft") && v.lang.startsWith("en")
    )
    if (microsoft) {
      return microsoft
    }

    // Any English voice
    const english = voices.find((v) => v.lang.startsWith("en"))
    if (english) {
      return english
    }

    // Default fallback
    return null
  }, [isSupported])

  // Stop any ongoing speech
  const stop = useCallback(() => {
    if (!isSupported) {
      return
    }

    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    utteranceRef.current = null
  }, [isSupported])

  // Speak the given text
  const speak = useCallback(
    (text) => {
      if (!isSupported || !text || !text.trim() || isMuted) {
        return
      }

      // Cancel any ongoing speech first
      window.speechSynthesis.cancel()

      lastTextRef.current = text

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const voice = pickVoice()
      if (voice) {
        utterance.voice = voice
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        utteranceRef.current = null
      }

      utterance.onerror = () => {
        setIsSpeaking(false)
        utteranceRef.current = null
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [isSupported, isMuted, pickVoice]
  )

  // Replay the last spoken text
  const replay = useCallback(() => {
    if (lastTextRef.current) {
      speak(lastTextRef.current)
    }
  }, [speak])

  // Toggle mute on/off
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev
      // If muting, stop any ongoing speech
      if (nextMuted && isSupported) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
        utteranceRef.current = null
      }
      return nextMuted
    })
  }, [isSupported])

  // Ensure voices are loaded (Chrome loads them asynchronously)
  useEffect(() => {
    if (!isSupported) {
      return
    }

    // Trigger voice loading
    window.speechSynthesis.getVoices()

    function onVoicesChanged() {
      // Voices are now available — no state update needed,
      // pickVoice() will find them on next speak() call.
    }

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged)

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        onVoicesChanged
      )
      // Cleanup: stop any speech when hook unmounts
      window.speechSynthesis.cancel()
    }
  }, [isSupported])

  return {
    speak,
    stop,
    replay,
    isSpeaking,
    isMuted,
    toggleMute,
    isSupported,
  }
}
