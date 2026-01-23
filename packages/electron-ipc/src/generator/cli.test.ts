import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { main } from './cli'
import { processYamlConfig } from './yaml-processor'

const { watchMock, watchFileMock, unwatchFileMock } = vi.hoisted(() => ({
  watchMock: vi.fn(),
  watchFileMock: vi.fn(),
  unwatchFileMock: vi.fn(),
}))

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    watch: watchMock,
    watchFile: watchFileMock,
    unwatchFile: unwatchFileMock,
  }
})

vi.mock('./yaml-processor', () => ({
  processYamlConfig: vi.fn(),
}))

describe('generator cli', () => {
  const originalArgv = process.argv

  beforeEach(() => {
    process.argv = [...originalArgv]
    vi.clearAllMocks()
    watchMock.mockReset()
    watchFileMock.mockReset()
    unwatchFileMock.mockReset()
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.restoreAllMocks()
  })

  it('runs the generator in write mode by default', () => {
    process.argv = ['node', 'cli', '--config=ipc-config.yaml']
    vi.mocked(processYamlConfig).mockReturnValue({ matched: true, watchFiles: [] })

    main()

    expect(processYamlConfig).toHaveBeenCalledWith('ipc-config.yaml', {
      mode: 'write',
      cwd: process.cwd(),
    })
  })

  it('exits with code 1 when check mode finds mismatches', () => {
    process.argv = ['node', 'cli', '--config=ipc-config.yaml', '--check']
    vi.mocked(processYamlConfig).mockReturnValue({ matched: false, watchFiles: [] })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit:1')
    }) as unknown as typeof process.exit)

    expect(() => main()).toThrow('exit:1')
    expect(exitSpy).toHaveBeenCalledWith(1)
    errorSpy.mockRestore()
  })

  it('errors when watch and check are combined', () => {
    process.argv = ['node', 'cli', '--config=ipc-config.yaml', '--watch', '--check']
    vi.mocked(processYamlConfig).mockReturnValue({ matched: true, watchFiles: [] })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit:1')
    }) as unknown as typeof process.exit)

    expect(() => main()).toThrow('exit:1')
    expect(processYamlConfig).not.toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(1)
    errorSpy.mockRestore()
  })

  it('prints usage when config is missing', () => {
    process.argv = ['node', 'cli']

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit:1')
    }) as unknown as typeof process.exit)

    expect(() => main()).toThrow('exit:1')
    expect(logSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith('Error: --config argument is required.')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('prints usage when config path is empty', () => {
    process.argv = ['node', 'cli', '--config=']

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit:1')
    }) as unknown as typeof process.exit)

    expect(() => main()).toThrow('exit:1')
    expect(logSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith('Error: --config path cannot be empty.')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('runs in watch mode and registers file watchers', () => {
    const configPath = path.join('configs', 'ipc-config.yaml')
    process.argv = ['node', 'cli', `--config=${configPath}`, '--watch']

    vi.mocked(processYamlConfig).mockReturnValue({
      matched: true,
      watchFiles: [path.join(process.cwd(), 'src', 'contracts.ts')],
    })

    watchMock.mockImplementation(() => ({ close: vi.fn() }))

    main()

    const resolvedConfigPath = path.resolve(process.cwd(), configPath)
    const watchedPaths = watchMock.mock.calls.map((call) => call[0])
    expect(watchedPaths).toContain(resolvedConfigPath)
    expect(watchedPaths).toContain(path.join(process.cwd(), 'src', 'contracts.ts'))
  })

  it('falls back to watchFile when fs.watch is unavailable', () => {
    const configPath = path.join('configs', 'ipc-config.yaml')
    process.argv = ['node', 'cli', `--config=${configPath}`, '--watch']

    vi.mocked(processYamlConfig).mockReturnValue({
      matched: true,
      watchFiles: [path.join(process.cwd(), 'src', 'contracts.ts')],
    })

    watchMock.mockImplementation(() => {
      throw new Error('watch unsupported')
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    main()

    expect(watchFileMock).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
  })

  it('reports errors from configuration processing', () => {
    process.argv = ['node', 'cli', '--config=ipc-config.yaml']
    vi.mocked(processYamlConfig).mockImplementation(() => {
      throw new Error('boom')
    })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit:1')
    }) as unknown as typeof process.exit)

    expect(() => main()).toThrow('exit:1')
    expect(errorSpy).toHaveBeenCalledWith('Error processing configuration: boom')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
