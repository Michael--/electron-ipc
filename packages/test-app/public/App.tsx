import { useEffect, useRef, useState } from 'react'

function PingReceiver() {
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    if (!window.api) return
    window.api.onPing((payload) => {
      setCounter(payload)
    })
  }, [])

  return (
    <div className="demo-card broadcast">
      <h3 className="demo-title">📡 Ping Counter</h3>
      <p className="demo-description">Broadcast from main process with numeric payload</p>
      <div className="demo-result">Received: {counter} pings</div>
    </div>
  )
}

function AboutReceiver() {
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    if (!window.api) return
    window.api.onAbout(() => {
      setTriggered(true)
    })
  }, [])

  return (
    <div className="demo-card broadcast">
      <h3 className="demo-title">ℹ️ About Dialog</h3>
      <p className="demo-description">Broadcast from main process without payload</p>
      <div className="demo-result">
        {triggered ? 'About dialog triggered!' : 'Waiting for trigger...'}
      </div>
      {triggered && (
        <div className="demo-controls">
          <button onClick={() => setTriggered(false)}>Reset</button>
        </div>
      )}
    </div>
  )
}

function AddNumbersDemo() {
  const [result, setResult] = useState<string | null>(null)

  const valueA = Math.floor(Math.random() * 10 + 1)
  const valueB = Math.floor(Math.random() * 10 + 1)

  const handleAdd = async () => {
    if (!window.api) return
    const sum = await window.api.invokeAddNumbers({ a: valueA, b: valueB })
    setResult(`${valueA}+${valueB} = ${sum}`)
  }

  return (
    <div className="demo-card invoke">
      <h3 className="demo-title">➕ Add Numbers</h3>
      <p className="demo-description">Invoke with request payload, returns response</p>
      <div className="demo-controls">
        <button onClick={handleAdd}>{`Add ${valueA} + ${valueB}`}</button>
      </div>
      {result !== null && <div className="demo-result">Result: {result}</div>}
    </div>
  )
}

function StreamDataDemo() {
  const [messages, setMessages] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [messages])

  const handleStartStream = () => {
    if (!window.api) return

    setMessages([])
    setError(null)
    setIsStreaming(true)

    window.api.invokeStreamGetLargeData(
      { id: 'demo-stream' },
      {
        onData: (chunk) => {
          setMessages((prev) => [...prev, chunk])
        },
        onEnd: () => {
          setIsStreaming(false)
        },
        onError: (err) => {
          setError(err.message)
          setIsStreaming(false)
        },
      }
    )
  }

  return (
    <div className="demo-card stream">
      <h3 className="demo-title">🌊 Stream Data</h3>
      <p className="demo-description">Request triggers a 10-second data stream from main process</p>
      <div className="demo-controls">
        <button onClick={handleStartStream} disabled={isStreaming}>
          {isStreaming ? 'Streaming...' : 'Start Stream'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      <div className="demo-result stream-output" ref={outputRef}>
        {messages.length === 0 && !isStreaming && <em>No messages yet</em>}
        {messages.map((msg, idx) => (
          <div key={idx} className="stream-message">
            {msg}
          </div>
        ))}
      </div>
    </div>
  )
}

function AppInfoDemo() {
  const [appInfo, setAppInfo] = useState<{ name: string; version: string } | null>(null)

  const onGetInfo = async () => {
    const info = await window.api.invokeGetAppInfo()
    setAppInfo(info)
  }

  return (
    <div className="demo-card invoke">
      <h3 className="demo-title">📱 Get App Info</h3>
      <p className="demo-description">Invoke without request parameters</p>
      <div className="demo-controls">
        <button onClick={onGetInfo}>Get Info</button>
      </div>
      {appInfo && (
        <div className="demo-result">
          {appInfo.name} v{appInfo.version}
        </div>
      )}
    </div>
  )
}

function LogMessageDemo() {
  const onLog = (level: 'info' | 'warn' | 'error') => {
    window.api.sendLogMessage({ level, message: `Test ${level} message from renderer` })
  }

  return (
    <div className="demo-card event">
      <h3 className="demo-title">📝 Log Message</h3>
      <p className="demo-description">Event with structured payload</p>
      <div className="demo-controls">
        <button onClick={() => onLog('info')}>Info</button>
        <button onClick={() => onLog('warn')}>Warn</button>
        <button onClick={() => onLog('error')}>Error</button>
      </div>
      <div className="demo-result" style={{ fontSize: '0.8em' }}>
        Check console for logged messages
      </div>
    </div>
  )
}

function QuitProgram() {
  const onClick = () => {
    window.api.sendQuit()
  }

  return (
    <div className="demo-card event">
      <h3 className="demo-title">🚪 Quit Application</h3>
      <p className="demo-description">Event without payload</p>
      <div className="demo-controls">
        <button className="primary" onClick={onClick}>
          Quit
        </button>
      </div>
    </div>
  )
}

function StreamUploadDemo() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessages, setUploadMessages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [uploadMessages])

  const handleStartUpload = async () => {
    if (!window.api) return

    setUploadMessages([])
    setError(null)
    setIsUploading(true)

    try {
      const fileName = 'demo-file.txt'
      const writer = window.api.uploadUploadFile({ fileName })

      // Upload 10 chunks over 10 seconds
      for (let i = 1; i <= 10; i++) {
        const text = `File chunk ${i}/10 - ${new Date().toLocaleTimeString()}`
        const encoder = new TextEncoder()
        const chunk = encoder.encode(text)
        await writer.write(chunk)
        setUploadMessages((prev) => [...prev, `✓ Uploaded chunk ${i}/10 to ${fileName}`])

        // Wait 1 second before next chunk
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      await writer.close()
      setUploadMessages((prev) => [...prev, `✅ Upload complete: ${fileName}`])
      setIsUploading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload error')
      setIsUploading(false)
    }
  }

  return (
    <div className="demo-card stream">
      <h3 className="demo-title">📤 Stream Upload</h3>
      <p className="demo-description">Upload file chunks from renderer to main process</p>
      <div className="demo-controls">
        <button onClick={handleStartUpload} disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Start Upload'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      <div className="demo-result stream-output" ref={outputRef}>
        {uploadMessages.length === 0 && !isUploading && <em>No uploads yet</em>}
        {uploadMessages.map((msg, idx) => (
          <div key={idx} className="stream-message">
            {msg}
          </div>
        ))}
      </div>
    </div>
  )
}

function StreamDownloadDemo() {
  const [logs, setLogs] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logLevel, setLogLevel] = useState<'info' | 'warn' | 'error'>('info')
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [logs])

  const handleStartDownload = () => {
    if (!window.api) return

    setLogs([])
    setError(null)
    setIsDownloading(true)

    window.api.downloadDownloadLogs(
      { level: logLevel },
      (logEntry: string) => {
        setLogs((prev) => [...prev, logEntry])
      },
      () => {
        setIsDownloading(false)
      },
      (err: Error) => {
        setError(err.message)
        setIsDownloading(false)
      }
    )
  }

  return (
    <div className="demo-card stream">
      <h3 className="demo-title">📥 Stream Download</h3>
      <p className="demo-description">Download log stream from main to renderer process</p>
      <div className="demo-controls">
        <select
          value={logLevel}
          onChange={(e) => setLogLevel(e.target.value as 'info' | 'warn' | 'error')}
          disabled={isDownloading}
        >
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <button onClick={handleStartDownload} disabled={isDownloading}>
          {isDownloading ? 'Downloading...' : 'Start Download'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      <div className="demo-result stream-output" ref={outputRef}>
        {logs.length === 0 && !isDownloading && <em>No logs yet</em>}
        {logs.map((log, idx) => (
          <div key={idx} className="stream-message">
            {log}
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoStreamDemo() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<string>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  )
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleStartStream = () => {
    if (!window.api) return

    // eslint-disable-next-line no-console
    console.log(`[VideoStreamDemo] Starting stream for: ${selectedVideo}`)

    // Cleanup previous video URL
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }

    setError(null)
    setProgress('Initializing...')
    setIsStreaming(true)

    const chunks: Uint8Array[] = []
    let totalBytes = 0

    // eslint-disable-next-line no-console
    console.log('[VideoStreamDemo] Starting download...')

    window.api.downloadStreamVideo(
      { url: selectedVideo },
      (chunk: Uint8Array) => {
        // eslint-disable-next-line no-console
        console.log('[VideoStreamDemo] Received chunk:', chunk.length, 'bytes')
        chunks.push(chunk)
        totalBytes += chunk.length
        setProgress(`Downloading ${(totalBytes / 1024 / 1024).toFixed(2)} MB...`)
      },
      () => {
        // Stream complete - create blob and play
        // eslint-disable-next-line no-console
        console.log('[VideoStreamDemo] Stream complete, creating video blob...')

        try {
          // @ts-expect-error - Uint8Array is BlobPart compatible at runtime
          const blob = new Blob(chunks, { type: 'video/mp4' })
          const url = URL.createObjectURL(blob)

          // eslint-disable-next-line no-console
          console.log('[VideoStreamDemo] Video blob created, size:', blob.size, 'bytes')

          setVideoUrl(url)
          setProgress(`Complete: ${(totalBytes / 1024 / 1024).toFixed(2)} MB - Ready to play!`)
          setIsStreaming(false)

          // Auto-play when ready
          if (videoRef.current) {
            videoRef.current.src = url
            videoRef.current.load()
          }
        } catch (err) {
          console.error('[VideoStreamDemo] Error creating blob:', err)
          setError(err instanceof Error ? err.message : 'Failed to create video')
          setIsStreaming(false)
        }
      },
      (err: Error) => {
        console.error('[VideoStreamDemo] Error:', err)
        setError(err.message)
        setIsStreaming(false)
      }
    )
  }

  return (
    <div className="demo-card stream">
      <h3 className="demo-title">🎬 Video Stream</h3>
      <p className="demo-description">Stream video from main process with live playback</p>
      <div className="demo-controls">
        <select
          value={selectedVideo}
          onChange={(e) => setSelectedVideo(e.target.value)}
          disabled={isStreaming}
        >
          <option value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
            Big Buck Bunny (158MB)
          </option>
          <option value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4">
            Elephants Dream (76MB)
          </option>
          <option value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4">
            For Bigger Blazes (6MB)
          </option>
        </select>
        <button onClick={handleStartStream} disabled={isStreaming}>
          {isStreaming ? 'Downloading...' : 'Stream Video'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      {progress && <div className="demo-result">{progress}</div>}
      <video
        ref={videoRef}
        controls
        key="video-stream"
        style={{ width: '100%', marginTop: '10px', borderRadius: '4px', backgroundColor: '#000' }}
      />
    </div>
  )
}

/**
 * Main React App component
 */
export function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>🚀 Electron IPC Test</h1>
        <p className="subtitle">
          Type-safe IPC communication examples for the <code>electron-ipc</code> library
        </p>
      </header>

      <section className="section">
        <h2 className="section-title">📡 Broadcast (Main → Renderer)</h2>
        <div className="demo-grid">
          <PingReceiver />
          <AboutReceiver />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">🔄 Invoke (Renderer ↔ Main)</h2>
        <div className="demo-grid">
          <AddNumbersDemo />
          <AppInfoDemo />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">📤 Event (Renderer → Main)</h2>
        <div className="demo-grid">
          <QuitProgram />
          <LogMessageDemo />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">🌊 Stream Invoke (Renderer ↔ Main Stream)</h2>
        <div className="demo-grid">
          <StreamDataDemo />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">📤 Stream Upload (Renderer → Main Stream)</h2>
        <div className="demo-grid">
          <StreamUploadDemo />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">📥 Stream Download (Main → Renderer Stream)</h2>
        <div className="demo-grid">
          <StreamDownloadDemo />
          <VideoStreamDemo />
        </div>
      </section>

      <footer className="footer">
        <p>
          Built with <code>electron-ipc</code> • All communication is type-safe and validated at
          compile time
        </p>
      </footer>
    </div>
  )
}
