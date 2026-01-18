import { useState } from 'react'
import { AddNumbersUI } from './AddNumbersUI'

/**
 * AddNumbers demo using native window.api
 * @returns Native AddNumbers component
 */
export function AddNumbersNative() {
  const [data, setData] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const valueA = Math.floor(Math.random() * 10 + 1)
  const valueB = Math.floor(Math.random() * 10 + 1)

  const handleAdd = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.invokeAddNumbers({ a: valueA, b: valueB })
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AddNumbersUI
      result={data}
      loading={loading}
      error={error}
      valueA={valueA}
      valueB={valueB}
      onAdd={handleAdd}
    />
  )
}
