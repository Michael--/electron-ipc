import { AboutReceiver } from './components/AboutReceiver'
import { AddNumbersDemo } from './components/AddNumbersDemo'
import { AppInfoDemo } from './components/AppInfoDemo'
import { LogMessageDemo } from './components/LogMessageDemo'
import { PingReceiver } from './components/PingReceiver'
import { QuitProgram } from './components/QuitProgram'
import { StreamDataDemo } from './components/StreamDataDemo'
import { StreamDownloadDemo } from './components/StreamDownloadDemo'
import { StreamUploadDemo } from './components/StreamUploadDemo'
import { VideoStreamDemo } from './components/VideoStreamDemo'

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
