/**
 * Main React App component
 */
export function App() {
  return (
    <div className="container">
      <h1>🚀 Electron IPC Test Application</h1>

      <div className="info">
        <h2>Status</h2>
        <p>
          This is the test environment for the <code>electron-ipc</code> library.
        </p>
        <p>The library will generate type-safe IPC communication code that can be tested here.</p>
      </div>

      <div className="info">
        <h2>Next Steps</h2>
        <ul>
          <li>Add your IPC channel definitions</li>
          <li>Generate the IPC code using electron-ipc</li>
          <li>Test the communication in this app</li>
        </ul>
      </div>
    </div>
  )
}
