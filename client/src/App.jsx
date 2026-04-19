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

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onError: (e) => console.error('ElevenLabs error:', e),
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

  async function handleMicClick() {
    if (recording) return
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
    clearInterval(analysisIntervalRef.current)
    scribe.disconnect()
    setRecording(false)
    transcriptRef.current = ''
  }

  const config = analysis ? riskConfig[analysis.riskLevel] : null
  const borderColor = config ? config.color : 'transparent'
  const showTranscript = fullTranscript.trim() !== ''

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
            style={{ cursor: recording ? 'default' : 'pointer' }}
          />
        </div>
      </div>

      <div className="mic-controls">
        <p className="tap-label">{recording ? 'Recording...' : 'Tap to start'}</p>
        {recording && (
          <button className="stop-btn" onClick={handleStop}>Stop & Analyze</button>
        )}
      </div>

      {showTranscript && (
        <div className="card">
          <h2>Live Transcript</h2>
          <p>
            {analysis
              ? highlightTranscript(sessionCommittedText, analysis.flaggedWords)
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
              <span className="percentage-number" style={{ color: config.color }}>{analysis.percentage}%</span>
              <span className="percentage-label">likelihood of scam</span>
            </div>
          </div>

          <div className="card">
            <h2>Reasoning</h2>
            <p>{analysis.summary}</p>
          </div>
        </>
      )}
    </div>
  )
}

export default App
