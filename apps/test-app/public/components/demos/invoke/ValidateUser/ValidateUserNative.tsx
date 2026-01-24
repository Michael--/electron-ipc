import { useState } from 'react'
import { ValidateUserUI } from './ValidateUserUI'

/**
 * ValidateUser demo using native window.api with error deserialization
 */
export function ValidateUserNative() {
  const [result, setResult] = useState<{ valid: true; data: { name: string; age: number } } | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [name, setName] = useState('Jo')
  const [age, setAge] = useState('0')

  const handleValidate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const ageNum = parseInt(age, 10)
      const validationResult = await window.api.invokeValidateUser({ name, age: ageNum })
      setResult(validationResult)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ValidateUserUI
      result={result}
      loading={loading}
      error={error}
      name={name}
      age={age}
      onNameChange={setName}
      onAgeChange={setAge}
      onValidate={handleValidate}
    />
  )
}
