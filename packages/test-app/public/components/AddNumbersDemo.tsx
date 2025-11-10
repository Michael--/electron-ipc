import { useState } from 'react'

/**
 * AddNumbersDemo component - demonstrates invoke with request/response
 */
export function AddNumbersDemo() {
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
