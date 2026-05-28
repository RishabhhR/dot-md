'use client'

import { useState, useRef, useCallback } from 'react'

const MAX_DURATION_SEC = 120

export function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const doTranscribe = useCallback(async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true)
    try {
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
      const formData = new FormData()
      formData.append('audio', blob, `recording.${ext}`)
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Transcription failed')
      setTranscript(data.transcript || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setTranscript('')
      setElapsed(0)
      elapsedRef.current = 0
      chunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t =>
          MediaRecorder.isTypeSupported(t),
        ) || ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        doTranscribe(blob, recorder.mimeType)
      }

      recorder.start(500)
      setIsRecording(true)

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setElapsed(elapsedRef.current)
        if (elapsedRef.current >= MAX_DURATION_SEC) {
          recorder.stop()
          stopTimer()
          setIsRecording(false)
        }
      }, 1000)
    } catch {
      setError('Could not access microphone. Please allow microphone access and try again.')
    }
  }, [doTranscribe, stopTimer])

  const stopRecording = useCallback(() => {
    stopTimer()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    setIsRecording(false)
  }, [stopTimer])

  const resetRecorder = useCallback(() => {
    stopRecording()
    setTranscript('')
    setElapsed(0)
    setError(null)
  }, [stopRecording])

  return { isRecording, isTranscribing, transcript, elapsed, startRecording, stopRecording, resetRecorder, error }
}
