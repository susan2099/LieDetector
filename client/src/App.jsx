import { useState, useRef, useEffect } from 'react'
import { useScribe } from '@elevenlabs/react'
import './App.css'

// teammate fills in — sends transcript to backend, returns Gemini analysis
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

const riskConfig = {
  low:      { label: 'Low',      position: '12.5%', color: '#22c55e', tooltip: 'No significant signs of deception detected' },
  medium:   { label: 'Medium',   position: '37.5%', color: '#eab308', tooltip: 'Some suspicious patterns identified' },
  high:     { label: 'High',     position: '62.5%', color: '#f97316', tooltip: 'Strong indicators of a scam call' },
  critical: { label: 'Critical', position: '87.5%', color: '#ef4444', tooltip: 'Highly likely to be a fraudulent call' },
}

function highlightTranscript(text, flaggedWords) {
  if (!flaggedWords || flaggedWords.length === 0) return text
  const regex = new RegExp(`(${flaggedWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    flaggedWords.some(w => w.toLowerCase() === part.toLowerCase())
      ? <mark key={i} className="highlight">{part}</mark>
      : part
  )
}

function App() {
  const [recording, setRecording] = useState(false)
  const [analysis, setAnalysis] = useState(null)

  const analysisIntervalRef = useRef(null)
  const transcriptRef = useRef('')
  const sessionStartIndexRef = useRef(0)
  const recordingRef = useRef(false)
  const stoppingRef = useRef(false)

  function stopAnalysisPolling() {
    clearInterval(analysisIntervalRef.current)
    analysisIntervalRef.current = null
  }

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onError: (e) => {
      const message = String(e?.message ?? e ?? '')

      // Ignore expected transient SDK errors during/after intentional disconnect.
      if (message.includes('WebSocket is not connected') || stoppingRef.current) {
        return
      }

      console.error('ElevenLabs error:', e)
      stopAnalysisPolling()
      recordingRef.current = false
      setRecording(false)
    },
  })

  const sessionCommittedText = scribe.committedTranscripts
    .slice(sessionStartIndexRef.current)
    .map(t => t.text)
    .join(' ')
  const sessionPartialText = recording ? scribe.partialTranscript : ''
  const fullTranscript = sessionCommittedText + (sessionPartialText ? ' ' + sessionPartialText : '')

  // keep a ref of latest live transcript (committed + partial) for interval access
  useEffect(() => {
    transcriptRef.current = fullTranscript
  }, [fullTranscript])

  useEffect(() => {
    recordingRef.current = recording
  }, [recording])

  useEffect(() => {
    return () => {
      stopAnalysisPolling()
    }
  }, [])

  async function handleMicClick() {
    if (recording) {
      handleStop()
      return
    }
    stoppingRef.current = false
    setRecording(true)
    setAnalysis(null)
    transcriptRef.current = ''
    sessionStartIndexRef.current = scribe.committedTranscripts.length

    // connect to ElevenLabs
    try {
      const res = await fetch('/scribe-token')
      const data = await res.json()
      const token = data.token ?? data
      await scribe.connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      })
    } catch (e) {
      console.error('Failed to connect to ElevenLabs:', e)
      setRecording(false)
      return
    }

    // poll Gemini every 5 seconds with latest transcript
    analysisIntervalRef.current = setInterval(async () => {
      if (!recordingRef.current) return
      const latestTranscript = transcriptRef.current.trim()
      if (!latestTranscript) return

      const payload = { transcript: latestTranscript }
      console.log('[Gemini payload]', JSON.stringify(payload, null, 2))

      try {
        const result = await analyzeTranscript(latestTranscript)
        if (result) setAnalysis(result)
      } catch (e) {
        console.error('Analyze error:', e)
      }
    }, 5000)
  }

  function handleStop() {
    stoppingRef.current = true
    stopAnalysisPolling()
    scribe.disconnect()
    setRecording(false)
    recordingRef.current = false
    transcriptRef.current = ''
    setTimeout(() => {
      stoppingRef.current = false
    }, 300)
  }

  const config = analysis ? riskConfig[analysis.riskLevel] : null
  const borderColor = config ? config.color : 'transparent'
  const showTranscript = fullTranscript.trim() !== ''

  return (
    <div className="app" style={{ borderTop: `4px solid ${borderColor}`, transition: 'border-color 1s ease' }}>
      <header className="hero">
        <div className="hero-brand">
          <img
            className="hero-logo"
            src="/grandma-icon.svg"
            alt="BeSafeGrandma logo"
          />
          <h1>BeSafeGrandma</h1>
        </div>
        <p className="hero-tagline">Keeping your loved ones safe from phone scams, one call at a time.</p>
      </header>

      <section className="mic-section">
        <div className="mic-card">
          <div className={`mic-wrapper ${recording ? 'recording' : ''}`}>
            <div className="ring" />
            <div className="ring delay1" />
            <div className="ring delay2" />
            <img
              src="/microphone.png"
              alt="Microphone"
              onClick={handleMicClick}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>
        <div className="mic-controls">
          <div className={`status-chip ${recording ? 'live' : ''}`}>
            <span className="status-dot" />
            <span>{recording ? 'Live listening' : 'Ready to analyze'}</span>
          </div>
          <p className="mic-subtitle">{recording ? 'Listening for scam signals' : 'Tap to analyze the call'}</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="risk-meter-card panel-card">
          <div className="card-head">
            <h2>Scam Risk</h2>
            {analysis && config && (
              <span className={`card-pill ${analysis.riskLevel}`}>{config.label}</span>
            )}
          </div>
          {analysis && config ? (
            <>
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
                <span className="percentage-number" style={{ color: config.color }}>{analysis.percentage}%</span>
                <span className="percentage-label">{config.label} risk</span>
              </div>
            </>
          ) : (
            <div className="pending-analysis">Risk score will appear while recording.</div>
          )}
        </div>

        <div className="card transcript-card panel-card">
          <div className="card-head">
            <h2>Live Transcript</h2>
            <span className={`card-pill ${recording ? 'live' : ''}`}>
              {recording ? 'Live' : 'Idle'}
            </span>
          </div>
          <p>
            {showTranscript
              ? (
                <>
                  {analysis
                    ? highlightTranscript(sessionCommittedText, analysis.flaggedWords)
                    : sessionCommittedText}
                  {sessionPartialText && (
                    <span className="partial"> {sessionPartialText}</span>
                  )}
                </>
              )
              : 'Waiting for transcript...'}
          </p>
        </div>
      </section>

      {analysis && (
        <section className="bottom-panel">
          <div className="card reasoning-card">
            <div className="card-head">
              <h2>Why It&apos;s A Scam</h2>
              <span className="card-pill neutral">AI summary</span>
            </div>
            <p>{analysis.summary}</p>
          </div>
        </section>
      )}

      <footer className="app-footer" role="contentinfo">
        <p>Built for citrushack &apos;26</p>
        <p>Made with care for the people who raised us</p>
      </footer>
    </div>
  )
}

export default App
