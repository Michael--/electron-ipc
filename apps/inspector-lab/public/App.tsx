import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const TRACE_KINDS = [
  'invoke',
  'event',
  'broadcast',
  'streamInvoke',
  'streamUpload',
  'streamDownload',
] as const
const TRACE_STATUSES = ['ok', 'error', 'timeout', 'cancelled'] as const

type TraceKind = (typeof TRACE_KINDS)[number]
type TraceStatus = (typeof TRACE_STATUSES)[number]
type ActivityTone = 'info' | 'success' | 'warning' | 'error'

type ActivityItem = {
  id: string
  ts: number
  title: string
  detail?: string
  tone: ActivityTone
}

type UploadWriter = ReturnType<typeof window.labStreamApi.uploadChunks>

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString()

const buildPayload = (size: number) => {
  if (!size || size <= 0) return ''
  return 'x'.repeat(size)
}

export function App() {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [invokeCount, setInvokeCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [pulseCount, setPulseCount] = useState(0)
  const [lastPulse, setLastPulse] = useState<string | null>(null)

  const [addA, setAddA] = useState(4)
  const [addB, setAddB] = useState(8)
  const [addResult, setAddResult] = useState<number | null>(null)

  const [slowDelay, setSlowDelay] = useState(1200)
  const [slowPayloadSize, setSlowPayloadSize] = useState(120)
  const [slowResult, setSlowResult] = useState<{ waitedMs: number; payloadSize: number } | null>(
    null
  )

  const [logLevel, setLogLevel] = useState<'info' | 'warn' | 'error'>('info')
  const [logMessage, setLogMessage] = useState('Inspector lab log entry')

  const [broadcastCount, setBroadcastCount] = useState(4)
  const [broadcastDelay, setBroadcastDelay] = useState(200)
  const [broadcastPayloadSize, setBroadcastPayloadSize] = useState(64)

  const [traceKind, setTraceKind] = useState<TraceKind>('invoke')
  const [traceStatus, setTraceStatus] = useState<TraceStatus>('timeout')
  const [traceChannel, setTraceChannel] = useState('lab.synthetic')
  const [traceDuration, setTraceDuration] = useState(1800)

  const [ticksCount, setTicksCount] = useState(6)
  const [ticksDelay, setTicksDelay] = useState(160)
  const [ticksPayloadSize, setTicksPayloadSize] = useState(40)
  const [ticksFailAt, setTicksFailAt] = useState(0)
  const [ticksReceived, setTicksReceived] = useState(0)
  const [ticksActive, setTicksActive] = useState(false)
  const [ticksError, setTicksError] = useState<string | null>(null)
  const ticksStopRef = useRef<(() => void) | null>(null)

  const [downloadCount, setDownloadCount] = useState(5)
  const [downloadDelay, setDownloadDelay] = useState(180)
  const [downloadPayloadSize, setDownloadPayloadSize] = useState(48)
  const [downloadReceived, setDownloadReceived] = useState(0)
  const [downloadActive, setDownloadActive] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const downloadStopRef = useRef<(() => void) | null>(null)

  const [uploadLabel, setUploadLabel] = useState('alpha')
  const [uploadPayloadSize, setUploadPayloadSize] = useState(80)
  const [uploadSent, setUploadSent] = useState(0)
  const [uploadActive, setUploadActive] = useState(false)
  const uploadWriterRef = useRef<UploadWriter | null>(null)
  const uploadSeqRef = useRef(0)

  const [scenarioRunning, setScenarioRunning] = useState(false)

  const pushActivity = useCallback(
    (title: string, detail: string | undefined, tone: ActivityTone) => {
      setActivity((items) => {
        const entry: ActivityItem = {
          id: createId(),
          ts: Date.now(),
          title,
          detail,
          tone,
        }
        return [entry, ...items].slice(0, 24)
      })
    },
    []
  )

  useEffect(() => {
    const unsubscribe = window.labApi.onPulse((payload) => {
      setPulseCount((count) => count + 1)
      setLastPulse(`Pulse ${payload.id}`)
      pushActivity(
        'Broadcast received',
        payload.note ? `payload ${payload.note.length} bytes` : `id ${payload.id}`,
        'success'
      )
    })

    return () => {
      unsubscribe?.()
      ticksStopRef.current?.()
      downloadStopRef.current?.()
      if (uploadWriterRef.current) {
        void uploadWriterRef.current.abort()
        uploadWriterRef.current = null
      }
    }
  }, [pushActivity])

  const activeStreams = useMemo(
    () => [ticksActive, downloadActive, uploadActive].filter(Boolean).length,
    [downloadActive, ticksActive, uploadActive]
  )

  const logTone = logLevel === 'error' ? 'error' : logLevel === 'warn' ? 'warning' : 'info'

  const handleAddNumbers = async () => {
    setAddResult(null)
    setInvokeCount((count) => count + 1)
    try {
      const result = await window.labApi.invokeAddNumbers({ a: addA, b: addB })
      setAddResult(result.sum)
      pushActivity('Invoke AddNumbers', `sum ${result.sum}`, 'success')
    } catch (err) {
      setErrorCount((count) => count + 1)
      pushActivity('AddNumbers failed', (err as Error).message, 'error')
    }
  }

  const handleSlow = async () => {
    setSlowResult(null)
    setInvokeCount((count) => count + 1)
    try {
      const result = await window.labApi.invokeSlow({
        delayMs: slowDelay,
        payloadSize: slowPayloadSize || undefined,
      })
      const payloadSize = result.payload ? result.payload.length : 0
      setSlowResult({ waitedMs: result.waitedMs, payloadSize })
      pushActivity('Invoke Slow', `waited ${result.waitedMs}ms`, 'success')
    } catch (err) {
      setErrorCount((count) => count + 1)
      pushActivity('Slow failed', (err as Error).message, 'error')
    }
  }

  const handleFail = async () => {
    setInvokeCount((count) => count + 1)
    try {
      await window.labApi.invokeFail({ message: 'Inspector lab failure' })
    } catch (err) {
      setErrorCount((count) => count + 1)
      pushActivity('Invoke Fail', (err as Error).message, 'error')
    }
  }

  const handleLog = () => {
    window.labApi.sendLog({ level: logLevel, message: logMessage })
    pushActivity('Event Log', logMessage, logTone)
  }

  const handleBroadcast = async () => {
    setInvokeCount((count) => count + 1)
    try {
      await window.labApi.invokeTriggerBroadcast({
        count: broadcastCount,
        delayMs: broadcastDelay || undefined,
        payloadSize: broadcastPayloadSize || undefined,
      })
      pushActivity('Broadcast Pulse', `sent ${broadcastCount}`, 'success')
    } catch (err) {
      setErrorCount((count) => count + 1)
      pushActivity('Broadcast failed', (err as Error).message, 'error')
    }
  }

  const handleEmitTrace = async () => {
    setInvokeCount((count) => count + 1)
    try {
      await window.labApi.invokeEmitTraceStatus({
        kind: traceKind,
        status: traceStatus,
        channel: traceChannel,
        durationMs: traceDuration || undefined,
      })
      pushActivity(
        'Trace emitted',
        `${traceKind} ${traceStatus} ${traceDuration ? `${traceDuration}ms` : ''}`.trim(),
        traceStatus === 'error' ? 'error' : traceStatus === 'timeout' ? 'warning' : 'info'
      )
    } catch (err) {
      setErrorCount((count) => count + 1)
      pushActivity('Trace emit failed', (err as Error).message, 'error')
    }
  }

  const handleStartTicks = () => {
    ticksStopRef.current?.()
    let received = 0
    setTicksActive(true)
    setTicksReceived(0)
    setTicksError(null)
    const failAt = ticksFailAt > 0 ? ticksFailAt : undefined
    ticksStopRef.current = window.labStreamApi.invokeStreamTicks(
      {
        count: ticksCount,
        delayMs: ticksDelay,
        payloadSize: ticksPayloadSize || undefined,
        failAt,
      },
      {
        onData: () => {
          received += 1
          setTicksReceived(received)
        },
        onEnd: () => {
          setTicksActive(false)
          ticksStopRef.current = null
          pushActivity('Ticks complete', `${received} chunks`, 'success')
        },
        onError: (err) => {
          setTicksError(err.message)
          setTicksActive(false)
          ticksStopRef.current = null
          setErrorCount((count) => count + 1)
          pushActivity('Ticks error', err.message, 'error')
        },
      }
    )
    pushActivity('Stream invoke started', `${ticksCount} ticks`, 'info')
  }

  const handleStopTicks = () => {
    if (!ticksStopRef.current) return
    ticksStopRef.current()
    ticksStopRef.current = null
    setTicksActive(false)
    pushActivity('Ticks cancelled', 'cancel requested', 'warning')
  }

  const handleStartDownload = () => {
    downloadStopRef.current?.()
    let received = 0
    setDownloadActive(true)
    setDownloadReceived(0)
    setDownloadError(null)
    downloadStopRef.current = window.labStreamApi.downloadSnapshots(
      {
        count: downloadCount,
        delayMs: downloadDelay,
        payloadSize: downloadPayloadSize || undefined,
      },
      () => {
        received += 1
        setDownloadReceived(received)
      },
      () => {
        setDownloadActive(false)
        downloadStopRef.current = null
        pushActivity('Snapshots complete', `${received} frames`, 'success')
      },
      (err) => {
        setDownloadError(String(err))
        setDownloadActive(false)
        downloadStopRef.current = null
        setErrorCount((count) => count + 1)
        pushActivity('Snapshots error', String(err), 'error')
      }
    )
    pushActivity('Stream download started', `${downloadCount} frames`, 'info')
  }

  const handleStopDownload = () => {
    if (!downloadStopRef.current) return
    downloadStopRef.current()
    downloadStopRef.current = null
    setDownloadActive(false)
    pushActivity('Snapshots cancelled', 'cancel requested', 'warning')
  }

  const handleStartUpload = () => {
    if (uploadWriterRef.current) return
    uploadSeqRef.current = 0
    const writer = window.labStreamApi.uploadChunks({ label: uploadLabel })
    uploadWriterRef.current = writer
    setUploadActive(true)
    setUploadSent(0)
    pushActivity('Upload started', uploadLabel, 'info')
  }

  const handleSendUpload = async () => {
    if (!uploadWriterRef.current) return
    const nextSeq = uploadSeqRef.current + 1
    uploadSeqRef.current = nextSeq
    await uploadWriterRef.current.write({ seq: nextSeq, payload: buildPayload(uploadPayloadSize) })
    setUploadSent(nextSeq)
    pushActivity('Upload chunk', `seq ${nextSeq}`, 'success')
  }

  const handleCompleteUpload = async () => {
    if (!uploadWriterRef.current) return
    await uploadWriterRef.current.close()
    uploadWriterRef.current = null
    setUploadActive(false)
    pushActivity('Upload complete', `chunks ${uploadSeqRef.current}`, 'success')
  }

  const handleAbortUpload = async () => {
    if (!uploadWriterRef.current) return
    await uploadWriterRef.current.abort('user cancel')
    uploadWriterRef.current = null
    setUploadActive(false)
    pushActivity('Upload aborted', 'cancel requested', 'warning')
  }

  const handleScenario = async () => {
    if (scenarioRunning) return
    setScenarioRunning(true)
    pushActivity('Scenario started', 'mixed traffic', 'info')
    try {
      await handleAddNumbers()
      await handleSlow()
      await handleFail()
      handleLog()
      await handleBroadcast()
      await handleEmitTrace()
    } finally {
      setScenarioRunning(false)
      pushActivity('Scenario finished', 'ready for next run', 'success')
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Inspector Lab</p>
          <h1>IPC Dashboard</h1>
          <p className="hero-copy">
            A focused control room to generate invokes, events, broadcasts, and stream traffic for
            the IPC inspector.
          </p>
          <div className="hero-actions">
            <button className="btn primary" onClick={handleScenario} disabled={scenarioRunning}>
              {scenarioRunning ? 'Scenario running...' : 'Run mixed scenario'}
            </button>
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-label">Invokes</p>
            <p className="stat-value">{invokeCount}</p>
            <p className="stat-meta">Total requests</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Errors</p>
            <p className="stat-value">{errorCount}</p>
            <p className="stat-meta">Failures observed</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Pulses</p>
            <p className="stat-value">{pulseCount}</p>
            <p className="stat-meta">{lastPulse ?? 'No pulses yet'}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Streams</p>
            <p className="stat-value">{activeStreams}</p>
            <p className="stat-meta">Active flows</p>
          </div>
        </div>
      </header>

      <main className="layout">
        <div className="panel-stack">
          <section className="panel">
            <div className="panel-header">
              <h2>Quick actions</h2>
              <p>Trigger common invoke, event, and broadcast patterns.</p>
            </div>

            <div className="panel-block">
              <h3>Invoke AddNumbers</h3>
              <div className="field-grid">
                <label>
                  A
                  <input
                    type="number"
                    value={addA}
                    onChange={(event) => setAddA(Number(event.target.value))}
                  />
                </label>
                <label>
                  B
                  <input
                    type="number"
                    value={addB}
                    onChange={(event) => setAddB(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="row">
                <button className="btn primary" onClick={handleAddNumbers}>
                  Add numbers
                </button>
                <span className="badge">
                  {addResult === null ? 'no result' : `sum ${addResult}`}
                </span>
              </div>
            </div>

            <div className="panel-block">
              <h3>Invoke Slow</h3>
              <div className="field-grid">
                <label>
                  Delay (ms)
                  <input
                    type="number"
                    value={slowDelay}
                    onChange={(event) => setSlowDelay(Number(event.target.value))}
                  />
                </label>
                <label>
                  Payload size
                  <input
                    type="number"
                    value={slowPayloadSize}
                    onChange={(event) => setSlowPayloadSize(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="row">
                <button className="btn secondary" onClick={handleSlow}>
                  Run slow invoke
                </button>
                <span className="badge">
                  {slowResult
                    ? `waited ${slowResult.waitedMs}ms, ${slowResult.payloadSize} bytes`
                    : 'idle'}
                </span>
              </div>
            </div>

            <div className="panel-block">
              <h3>Invoke Fail</h3>
              <div className="row">
                <button className="btn danger" onClick={handleFail}>
                  Trigger error
                </button>
                <span className="badge tone-error">throws on purpose</span>
              </div>
            </div>

            <div className="panel-block">
              <h3>Event Log</h3>
              <div className="field-grid">
                <label>
                  Level
                  <select
                    value={logLevel}
                    onChange={(event) => setLogLevel(event.target.value as typeof logLevel)}
                  >
                    <option value="info">info</option>
                    <option value="warn">warn</option>
                    <option value="error">error</option>
                  </select>
                </label>
                <label>
                  Message
                  <input
                    value={logMessage}
                    onChange={(event) => setLogMessage(event.target.value)}
                  />
                </label>
              </div>
              <div className="row">
                <button className="btn ghost" onClick={handleLog}>
                  Send event
                </button>
                <span className={`badge tone-${logTone}`}>renderer to main</span>
              </div>
            </div>

            <div className="panel-block">
              <h3>Broadcast Pulse</h3>
              <div className="field-grid">
                <label>
                  Count
                  <input
                    type="number"
                    value={broadcastCount}
                    onChange={(event) => setBroadcastCount(Number(event.target.value))}
                  />
                </label>
                <label>
                  Delay (ms)
                  <input
                    type="number"
                    value={broadcastDelay}
                    onChange={(event) => setBroadcastDelay(Number(event.target.value))}
                  />
                </label>
                <label>
                  Payload size
                  <input
                    type="number"
                    value={broadcastPayloadSize}
                    onChange={(event) => setBroadcastPayloadSize(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="row">
                <button className="btn accent" onClick={handleBroadcast}>
                  Trigger broadcast
                </button>
                <span className="badge">{lastPulse ?? 'waiting for pulses'}</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Trace simulator</h2>
              <p>Emit synthetic statuses for timeout and cancellation coverage.</p>
            </div>

            <div className="panel-block">
              <div className="field-grid">
                <label>
                  Kind
                  <select
                    value={traceKind}
                    onChange={(event) => setTraceKind(event.target.value as TraceKind)}
                  >
                    {TRACE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={traceStatus}
                    onChange={(event) => setTraceStatus(event.target.value as TraceStatus)}
                  >
                    {TRACE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Channel
                  <input
                    value={traceChannel}
                    onChange={(event) => setTraceChannel(event.target.value)}
                  />
                </label>
                <label>
                  Duration (ms)
                  <input
                    type="number"
                    value={traceDuration}
                    onChange={(event) => setTraceDuration(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="row">
                <button className="btn primary" onClick={handleEmitTrace}>
                  Emit trace status
                </button>
                <span
                  className={`badge tone-${traceStatus === 'error' ? 'error' : traceStatus === 'timeout' ? 'warning' : 'info'}`}
                >
                  {traceStatus}
                </span>
              </div>
            </div>

            <div className="panel-block note">
              <p>
                Tip: combine this with the Inspector metrics view to validate timeout and cancelled
                aggregation.
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Streams lab</h2>
              <p>Exercise invoke, upload, and download streams with live counters.</p>
            </div>

            <div className="panel-block">
              <h3>Stream Invoke - Ticks</h3>
              <div className="field-grid">
                <label>
                  Count
                  <input
                    type="number"
                    value={ticksCount}
                    onChange={(event) => setTicksCount(Number(event.target.value))}
                  />
                </label>
                <label>
                  Delay (ms)
                  <input
                    type="number"
                    value={ticksDelay}
                    onChange={(event) => setTicksDelay(Number(event.target.value))}
                  />
                </label>
                <label>
                  Payload size
                  <input
                    type="number"
                    value={ticksPayloadSize}
                    onChange={(event) => setTicksPayloadSize(Number(event.target.value))}
                  />
                </label>
                <label>
                  Fail at
                  <input
                    type="number"
                    value={ticksFailAt}
                    onChange={(event) => setTicksFailAt(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="row">
                <button className="btn secondary" onClick={handleStartTicks} disabled={ticksActive}>
                  Start ticks
                </button>
                <button className="btn ghost" onClick={handleStopTicks} disabled={!ticksActive}>
                  Cancel stream
                </button>
                <span className="badge">
                  {ticksError ? `error: ${ticksError}` : `${ticksReceived} chunks`}
                </span>
              </div>
            </div>

            <div className="panel-block">
              <h3>Stream Download - Snapshots</h3>
              <div className="field-grid">
                <label>
                  Count
                  <input
                    type="number"
                    value={downloadCount}
                    onChange={(event) => setDownloadCount(Number(event.target.value))}
                  />
                </label>
                <label>
                  Delay (ms)
                  <input
                    type="number"
                    value={downloadDelay}
                    onChange={(event) => setDownloadDelay(Number(event.target.value))}
                  />
                </label>
                <label>
                  Payload size
                  <input
                    type="number"
                    value={downloadPayloadSize}
                    onChange={(event) => setDownloadPayloadSize(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="row">
                <button
                  className="btn secondary"
                  onClick={handleStartDownload}
                  disabled={downloadActive}
                >
                  Start download
                </button>
                <button
                  className="btn ghost"
                  onClick={handleStopDownload}
                  disabled={!downloadActive}
                >
                  Cancel download
                </button>
                <span className="badge">
                  {downloadError ? `error: ${downloadError}` : `${downloadReceived} frames`}
                </span>
              </div>
            </div>

            <div className="panel-block">
              <h3>Stream Upload - Chunks</h3>
              <div className="field-grid">
                <label>
                  Label
                  <input
                    value={uploadLabel}
                    onChange={(event) => setUploadLabel(event.target.value)}
                  />
                </label>
                <label>
                  Payload size
                  <input
                    type="number"
                    value={uploadPayloadSize}
                    onChange={(event) => setUploadPayloadSize(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="row">
                <button
                  className="btn secondary"
                  onClick={handleStartUpload}
                  disabled={uploadActive}
                >
                  Start upload
                </button>
                <button className="btn ghost" onClick={handleSendUpload} disabled={!uploadActive}>
                  Send chunk
                </button>
                <button
                  className="btn primary"
                  onClick={handleCompleteUpload}
                  disabled={!uploadActive}
                >
                  Complete
                </button>
                <button className="btn danger" onClick={handleAbortUpload} disabled={!uploadActive}>
                  Abort
                </button>
                <span className="badge">{uploadSent} chunks sent</span>
              </div>
            </div>
          </section>
        </div>
        <aside className="panel activity">
          <div className="panel-header activity-header">
            <div className="panel-header-copy">
              <h2>Activity stream</h2>
              <p>Recent actions captured from this dashboard.</p>
            </div>
            <button className="btn ghost small" onClick={() => setActivity([])}>
              Clear activity
            </button>
          </div>
          <ul className="activity-list">
            {activity.length === 0 ? (
              <li className="activity-empty">No activity yet. Trigger a scenario to start.</li>
            ) : (
              activity.map((item) => (
                <li key={item.id} className={`activity-item tone-${item.tone}`}>
                  <div>
                    <p className="activity-title">{item.title}</p>
                    {item.detail ? <p className="activity-detail">{item.detail}</p> : null}
                  </div>
                  <span className="activity-time">{formatTime(item.ts)}</span>
                </li>
              ))
            )}
          </ul>
        </aside>
      </main>
    </div>
  )
}
