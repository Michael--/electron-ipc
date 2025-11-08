import { useEffect, useState } from 'react'

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
  const [result, setResult] = useState<number | null>(null)

  const handleAdd = async () => {
    if (!window.api) return
    const sum = await window.api.invokeAddNumbers({ a: 5, b: 3 })
    setResult(sum)
  }

  return (
    <div className="demo-card invoke">
      <h3 className="demo-title">➕ Add Numbers</h3>
      <p className="demo-description">Invoke with request payload, returns response</p>
      <div className="demo-controls">
        <button onClick={handleAdd}>Add 5 + 3</button>
      </div>
      {result !== null && <div className="demo-result">Result: {result}</div>}
    </div>
  )
}

function StreamDataDemo() {
  const [messages, setMessages] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <div className="demo-result stream-output">
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
  const [uploadedChunks, setUploadedChunks] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleStartUpload = async () => {
    if (!window.api) return

    setUploadedChunks(0)
    setError(null)
    setIsUploading(true)

    try {
      const writer = window.api.uploadUploadFile()

      // Upload 10 chunks over 10 seconds
      for (let i = 1; i <= 10; i++) {
        const text = `File chunk ${i}/10 - ${new Date().toLocaleTimeString()}`
        const encoder = new TextEncoder()
        const chunk = encoder.encode(text)
        await writer.write(chunk)
        setUploadedChunks(i)

        // Wait 1 second before next chunk
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      await writer.close()
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
      <div className="demo-result">
        {uploadedChunks > 0 && (
          <div className="stream-output">
            Uploaded {uploadedChunks}/10 chunks
            {isUploading && ' (in progress...)'}
            {!isUploading && uploadedChunks === 10 && ' ✓ Complete'}
          </div>
        )}
      </div>
    </div>
  )
}

function StreamDownloadDemo() {
  const [logs, setLogs] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartDownload = () => {
    if (!window.api) return

    setLogs([])
    setError(null)
    setIsDownloading(true)

    window.api.downloadDownloadLogs(
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
        <button onClick={handleStartDownload} disabled={isDownloading}>
          {isDownloading ? 'Downloading...' : 'Start Download'}
        </button>
      </div>
      {error && <div className="demo-error">Error: {error}</div>}
      <div className="demo-result stream-output">
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
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">📤 Event (Renderer → Main)</h2>
        <div className="demo-grid">
          <QuitProgram />
          <LogMessageDemo />
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
