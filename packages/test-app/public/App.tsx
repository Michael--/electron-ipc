import { useState } from 'react'
import { AboutDemo } from './components/demos/broadcast/About'
import { PingDemo } from './components/demos/broadcast/Ping'
import { LogMessageDemo } from './components/demos/event/LogMessage'
import { QuitDemo } from './components/demos/event/Quit'
import { AddNumbersDemo } from './components/demos/invoke/AddNumbers'
import { AppInfoDemo } from './components/demos/invoke/AppInfo'
import { StreamDownloadDemo } from './components/demos/stream/StreamDownload/DownloadLogs'
import { VideoStreamDemo } from './components/demos/stream/StreamDownload/StreamVideo'
import { StreamDataDemo } from './components/demos/stream/StreamInvoke/GetLargeData'
import { StreamUploadDemo } from './components/demos/stream/StreamUpload/UploadFile'
import { Toggle } from './components/shared/Toggle'

/**
 * Main React App component
 */
export function App() {
  const [variant, setVariant] = useState<'native' | 'hooks'>('hooks')

  return (
    <div className="container">
      <header className="header">
        <h1>🚀 Electron IPC Test</h1>
        <p className="subtitle">
          Type-safe IPC communication examples for the <code>electron-ipc</code> library
        </p>
        <Toggle value={variant} onChange={setVariant} />
      </header>

      <section className="section">
        <h2 className="section-title">📡 Broadcast (Main → Renderer)</h2>
        <div className="demo-grid">
          <PingDemo variant={variant} />
          <AboutDemo variant={variant} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">🔄 Invoke (Renderer ↔ Main)</h2>
        <div className="demo-grid">
          <AddNumbersDemo variant={variant} />
          <AppInfoDemo variant={variant} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">📤 Event (Renderer → Main)</h2>
        <div className="demo-grid">
          <QuitDemo variant={variant} />
          <LogMessageDemo variant={variant} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">🌊 Stream Invoke (Renderer ↔ Main Stream)</h2>
        <div className="demo-grid">
          <StreamDataDemo variant={variant} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">📤 Stream Upload (Renderer → Main Stream)</h2>
        <div className="demo-grid">
          <StreamUploadDemo variant={variant} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">📥 Stream Download (Main → Renderer Stream)</h2>
        <div className="demo-grid">
          <StreamDownloadDemo variant={variant} />
          <VideoStreamDemo variant={variant} />
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
