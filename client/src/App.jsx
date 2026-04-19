import { useState, useRef, useEffect } from 'react'
import { useScribe } from '@elevenlabs/react'
import './App.css'

const TOKEN_URL = '/scribe-token'
const ANALYZE_INTERVAL_MS = 5000

const riskConfig = {
  low: { label: 'Low', position: '12.5%', color: '#22c55e', tooltip: 'No significant signs of deception detected' },
  medium: { label: 'Medium', position: '37.5%', color: '#eab308', tooltip: 'Some suspicious patterns identified' },
  high: { label: 'High', position: '62.5%', color: '#f97316', tooltip: 'Strong indicators of a scam call' },
  critical: { label: 'Critical', position: '87.5%', color: '#ef4444', tooltip: 'Highly likely to be a fraudulent call' },
}

async function fetchToken() {
  const res = await fetch(TOKEN_URL, { cache: 'no-store' })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Token fetch failed (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const token = typeof data?.token === 'string' ? data.token : ''
  if (!token) {
    throw new Error('Token payload is invalid.')
  }

  return token
}

async function analyzeTranscript(transcript) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Analyze request failed (${res.status}): ${errorText}`)
  }

  return res.json()
}

function getSeverity(score) {
  if (score >= 85) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

function normalizeScore(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, Math.round(numeric)))
}

function computeLikelihood(rawScore, previousScore, hasReachedThreshold) {
  const current = normalizeScore(rawScore)

  if (hasReachedThreshold || current >= 50) {
    return Math.max(current, 50)
  }

  if (previousScore == null) {
    return current
  }

  return Math.round((previousScore + current) / 2)
}

function highlightTranscript(text, flaggedWords) {
  if (!flaggedWords || flaggedWords.length === 0) return text

  const escaped = flaggedWords
    .filter((w) => typeof w === 'string' && w.trim().length > 0)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (escaped.length === 0) return text

  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    flaggedWords.some((w) => w.toLowerCase() === part.toLowerCase())
      ? <mark key={i} className="highlight">{part}</mark>
      : part,
  )
}

function App() {
  const [recording, setRecording] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [likelihood, setLikelihood] = useState(0)
  const [error, setError] = useState('')

  const analysisIntervalRef = useRef(null)
  const transcriptRef = useRef('')
  const sessionStartIndexRef = useRef(0)
  const hasReachedThresholdRef = useRef(false)
  const likelihoodRef = useRef(null)
  const isAnalyzingRef = useRef(false)
  const isConnectingRef = useRef(false)
  const scribeRef = useRef(null)

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
    onAuthError: (data) => setError(data?.error || 'Authentication failed.'),
    onQuotaExceededError: (data) => setError(data?.error || 'Quota exceeded.'),
    onRateLimitedError: (data) => setError(data?.error || 'Rate limited.'),
    onDisconnect: () => {
      setRecording(false)
      isConnectingRef.current = false
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current)
        analysisIntervalRef.current = null
      }
    },
  })

  const sessionCommittedText = scribe.committedTranscripts
    .slice(sessionStartIndexRef.current)
    .map((t) => t.text)
    .join(' ')
  const sessionPartialText = recording ? scribe.partialTranscript : ''
  const fullTranscript = sessionCommittedText + (sessionPartialText ? ` ${sessionPartialText}` : '')

  useEffect(() => {
    transcriptRef.current = fullTranscript
  }, [fullTranscript])

  useEffect(() => {
    scribeRef.current = scribe
  }, [scribe])

  useEffect(() => {
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current)
      }
      scribeRef.current?.disconnect()
    }
  }, [])

  async function handleMicClick() {
    if (recording || isConnectingRef.current) return
    isConnectingRef.current = true

    setRecording(true)
    setError('')
    setAnalysis(null)
    setLikelihood(0)
    transcriptRef.current = ''
    sessionStartIndexRef.current = scribe.committedTranscripts.length
    hasReachedThresholdRef.current = false
    likelihoodRef.current = null

    try {
      const token = await fetchToken()
      await scribe.connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      })
      isConnectingRef.current = false

      analysisIntervalRef.current = setInterval(async () => {
        if (isAnalyzingRef.current) return

        const latestTranscript = transcriptRef.current.trim()
        if (!latestTranscript) return

        isAnalyzingRef.current = true
        try {
          const result = await analyzeTranscript(latestTranscript)
          const adjusted = computeLikelihood(
            result?.scam_likelihood_score,
            likelihoodRef.current,
            hasReachedThresholdRef.current,
          )

          if (adjusted >= 50) {
            hasReachedThresholdRef.current = true
          }

          likelihoodRef.current = adjusted
          setLikelihood(adjusted)
          setAnalysis(result)
        } catch (analysisError) {
          console.error('Analyze error:', analysisError)
        } finally {
          isAnalyzingRef.current = false
        }
      }, ANALYZE_INTERVAL_MS)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setRecording(false)
      isConnectingRef.current = false
    }
  }

  function handleStop() {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current)
      analysisIntervalRef.current = null
    }

    scribe.disconnect()
    setRecording(false)
    transcriptRef.current = ''
    isConnectingRef.current = false
  }

  const severity = getSeverity(likelihood)
  const config = analysis ? riskConfig[severity] : null
  const borderColor = config ? config.color : 'transparent'
  const showTranscript = fullTranscript.trim() !== ''

  const indicatorPhrases = Array.isArray(analysis?.critical_indicators)
    ? analysis.critical_indicators
    : []

  return (
    <div className="app" style={{ borderTop: `4px solid ${borderColor}`, transition: 'border-color 1s ease' }}>
      <div className="mic-card">
        <div className={`mic-wrapper ${recording ? 'recording' : ''}`}>
          <div className="ring" />
          <div className="ring delay1" />
          <div className="ring delay2" />
          <img
            src="/microphone.png"
            alt="Microphone"
            onClick={handleMicClick}
            style={{ cursor: scribe.isConnected ? 'default' : 'pointer' }}
          />
        </div>
      </div>

      <div className="mic-controls">
        <p className="tap-label">{recording ? 'Recording...' : 'Tap to start'}</p>
        {recording && (
          <button className="stop-btn" onClick={handleStop}>Stop & Analyze</button>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>

      {showTranscript && (
        <div className="card">
          <h2>Live Transcript</h2>
          <p>
            {analysis
              ? highlightTranscript(sessionCommittedText, indicatorPhrases)
              : sessionCommittedText}
            {sessionPartialText && (
              <span className="partial"> {sessionPartialText}</span>
            )}
          </p>
        </div>
      )}

      {analysis && config && (
        <>
          <div className="risk-meter-card">
            <h2>Risk Level</h2>
            <div className="risk-meter">
              <div className="risk-bar">
                {Object.entries(riskConfig).map(([key, val]) => (
                  <div key={key} className={`segment ${key}`}>
                    <span className="tooltip">{val.tooltip}</span>
                    {val.label}
                  </div>
                ))}
              </div>
              <div className="pointer" style={{ left: config.position }} />
            </div>
            <div className="scam-percentage">
              <span className="percentage-number" style={{ color: config.color }}>{likelihood}%</span>
              <span className="percentage-label">likelihood of scam</span>
            </div>
          </div>

          <div className="card">
            <h2>Potential Indicator Phrases</h2>
            <p>{indicatorPhrases.length > 0 ? indicatorPhrases.join(', ') : 'No critical indicators found yet.'}</p>
          </div>

          <div className="card">
            <h2>Reasoning</h2>
            <p>{analysis.reasoning_summary ?? 'No reasoning summary returned.'}</p>
          </div>
        </>
      )}
    </div>
  )
}

export default App
