import type { BrowserWindow } from 'electron'

/**
 * Metadata for a registered window
 */
export interface WindowMetadata {
  /** Window ID from Electron */
  id: number
  /** Window role (main, secondary, inspector, or custom) */
  role: 'main' | 'secondary' | 'inspector' | string
  /** BrowserWindow instance */
  window: BrowserWindow
  /** Timestamp when window was registered */
  createdAt: number
  /** Timestamp when window was last focused */
  lastFocusedAt?: number
}

/**
 * Central registry for all BrowserWindows in the application.
 * Provides role-based organization, lifecycle tracking, and cleanup.
 */
export class WindowRegistry {
  private windows = new Map<number, WindowMetadata>()
  private mainWindowId: number | null = null

  /**
   * Registers a new window with the registry
   * @param window - BrowserWindow to register
   * @param role - Window role (default: 'secondary')
   */
  register(window: BrowserWindow, role: string = 'secondary'): void {
    const metadata: WindowMetadata = {
      id: window.id,
      role,
      window,
      createdAt: Date.now(),
    }

    this.windows.set(window.id, metadata)

    if (role === 'main' && this.mainWindowId === null) {
      this.mainWindowId = window.id
    }

    // Auto-cleanup on window close
    window.on('closed', () => {
      this.unregister(window.id)
    })

    // Track focus
    window.on('focus', () => {
      const meta = this.windows.get(window.id)
      if (meta) meta.lastFocusedAt = Date.now()
    })
  }

  /**
   * Unregisters a window from the registry
   * @param windowId - ID of the window to unregister
   */
  unregister(windowId: number): void {
    if (this.mainWindowId === windowId) {
      this.mainWindowId = null
    }
    this.windows.delete(windowId)
  }

  /**
   * Gets all registered windows (excluding destroyed ones)
   * @returns Array of window metadata
   */
  getAll(): WindowMetadata[] {
    return Array.from(this.windows.values()).filter((meta) => !meta.window.isDestroyed())
  }

  /**
   * Gets windows by role
   * @param role - Window role to filter by
   * @returns Array of window metadata matching the role
   */
  getByRole(role: string): WindowMetadata[] {
    return this.getAll().filter((meta) => meta.role === role)
  }

  /**
   * Gets window by ID
   * @param id - Window ID
   * @returns Window metadata or undefined if not found
   */
  getById(id: number): WindowMetadata | undefined {
    const meta = this.windows.get(id)
    return meta && !meta.window.isDestroyed() ? meta : undefined
  }

  /**
   * Gets window by window ID (alias for getById)
   * @param windowId - Window ID
   * @returns Window metadata or undefined if not found
   */
  getByWindowId(windowId: number): WindowMetadata | undefined {
    return this.getById(windowId)
  }

  /**
   * Gets main window
   * @returns Main window metadata or undefined if no main window exists
   */
  getMain(): WindowMetadata | undefined {
    if (this.mainWindowId === null) {
      // Fallback: first registered window
      const all = this.getAll()
      return all.length > 0 ? all[0] : undefined
    }
    return this.getById(this.mainWindowId)
  }

  /**
   * Gets count of active windows
   * @param excludeInspector - Whether to exclude inspector windows from count (default: true)
   * @returns Number of active windows
   */
  count(excludeInspector = true): number {
    let all = this.getAll()
    if (excludeInspector) {
      all = all.filter((meta) => meta.role !== 'inspector')
    }
    return all.length
  }
}

// Singleton instance
let registryInstance: WindowRegistry | null = null

/**
 * Gets or creates the global window registry
 * @returns WindowRegistry singleton instance
 */
export function getWindowRegistry(): WindowRegistry {
  if (!registryInstance) {
    registryInstance = new WindowRegistry()
  }
  return registryInstance
}

/**
 * Resets the registry (for testing)
 */
export function resetWindowRegistry(): void {
  registryInstance = null
}
