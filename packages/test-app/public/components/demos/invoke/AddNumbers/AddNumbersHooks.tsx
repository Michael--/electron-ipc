import { useInvokeContracts } from '@gen/ipc-api-react-hooks'
import { AddNumbersUI } from './AddNumbersUI'

/**
 * AddNumbers demo using React hooks
 * @returns Hooks-based AddNumbers component
 */
export function AddNumbersHooks() {
  const { data, loading, error, invoke } = useInvokeContracts('AddNumbers')

  const valueA = Math.floor(Math.random() * 10 + 1)
  const valueB = Math.floor(Math.random() * 10 + 1)

  const handleAdd = async () => {
    await invoke({ a: valueA, b: valueB })
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
