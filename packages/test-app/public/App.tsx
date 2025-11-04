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
    <div className="info">
      <h2>Ping Counter</h2>
      <p>Received Ping events from main process: {counter}</p>
    </div>
  )
}

function AboutReceiver() {
  const [showAbout, setShowAbout] = useState(false)
  useEffect(() => {
    if (!window.api) return
    window.api.onAbout(() => {
      setShowAbout(true)
    })
  }, [])

  return (
    <>
      {showAbout && (
        <div className="info">
          <h2>About</h2>
          <p>This is a test application for the electron-ipc library.</p>
          <button onClick={() => setShowAbout(false)}>Close</button>
        </div>
      )}
    </>
  )
}

function Status() {
  return (
    <div className="info">
      <h2>Status</h2>
      <p>
        This is the test environment for the <code>electron-ipc</code> library.
      </p>
      <p>The library will generate type-safe IPC communication code that can be tested here.</p>
    </div>
  )
}

function QuitProgram() {
  const onClick = () => {
    window.api.sendQuit()
  }
  return <button onClick={onClick}>Quit Application</button>
}

function AddNumbersDemo() {
  const [result, setResult] = useState<number | null>(null)

  const onCalculate = async () => {
    const res = await window.api.invokeAddNumbers({ a: Math.random(), b: Math.random() })
    setResult(res)
  }
  return (
    <div className="info">
      <h2>Add Numbers Demo by invoke main process</h2>
      <button onClick={onCalculate}>Calculate Random Sum</button>
      {result !== null && <p>Result: {result}</p>}
    </div>
  )
}

/**
 * Main React App component
 */
export function App() {
  return (
    <div className="container">
      <QuitProgram />
      <h1>🚀 Electron IPC Test Application</h1>
      <Status />
      <AboutReceiver />
      <PingReceiver />
      <AddNumbersDemo />
    </div>
  )
}
