import { useInvokeContracts } from '@gen/ipc-api-react-hooks'
import { AppInfoUI } from './AppInfoUI'

/**
 * AppInfo demo using React hooks
 * @returns Hooks-based AppInfo component
 */
export function AppInfoHooks() {
  const { data, loading, error, invoke } = useInvokeContracts('GetAppInfo')

  const handleGetInfo = async () => {
    await invoke()
  }

  return <AppInfoUI info={data} loading={loading} error={error} onGetInfo={handleGetInfo} />
}
