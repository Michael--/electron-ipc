export type Elements = {
  body: HTMLElement
  main: HTMLElement
  statusBadge: HTMLElement
  statusText: HTMLElement
  traceToggleBtn: HTMLButtonElement
  pauseBtn: HTMLButtonElement
  clearBtn: HTMLButtonElement
  exportBtn: HTMLButtonElement
  payloadModeSelect: HTMLSelectElement
  searchInput: HTMLInputElement
  kindFilter: HTMLSelectElement
  statusFilter: HTMLSelectElement
  traceRowFilter: HTMLSelectElement
  autoScrollBtn: HTMLButtonElement
  eventCount: HTMLElement
  droppedCount: HTMLElement
  gapCount: HTMLElement
  eventsPerSec: HTMLElement
  emptyState: HTMLElement
  eventsTable: HTMLTableElement
  eventsBody: HTMLTableSectionElement
  detailPanel: HTMLElement
  detailContent: HTMLElement
  closeDetailBtn: HTMLButtonElement
  pinDetailBtn: HTMLButtonElement
  serverBufferInput: HTMLInputElement
  applyServerBufferBtn: HTMLButtonElement
  uiBufferInput: HTMLInputElement
  applyUiBufferBtn: HTMLButtonElement
  showStatsBtn: HTMLButtonElement
  statsPanel: HTMLElement
  statsContent: HTMLElement
  closeStatsBtn: HTMLButtonElement
}

export const elements = {} as Elements

export function getBodyNode(): HTMLElement | null {
  if (document.body) {
    return document.body
  }

  if (document.documentElement) {
    for (let i = 0; i < document.documentElement.childNodes.length; i++) {
      const node = document.documentElement.childNodes[i]
      if (node.nodeName === 'BODY') {
        return node as HTMLElement
      }
    }
  }

  return null
}

export function initElements(bodyNode: HTMLElement): Elements {
  elements.body = bodyNode
  elements.main = bodyNode.querySelector('main') as HTMLElement
  elements.statusBadge = bodyNode.querySelector('#statusBadge') as HTMLElement
  elements.statusText = bodyNode.querySelector('#statusText') as HTMLElement
  elements.traceToggleBtn = bodyNode.querySelector('#traceToggleBtn') as HTMLButtonElement
  elements.pauseBtn = bodyNode.querySelector('#pauseBtn') as HTMLButtonElement
  elements.clearBtn = bodyNode.querySelector('#clearBtn') as HTMLButtonElement
  elements.exportBtn = bodyNode.querySelector('#exportBtn') as HTMLButtonElement
  elements.payloadModeSelect = bodyNode.querySelector('#payloadModeSelect') as HTMLSelectElement
  elements.searchInput = bodyNode.querySelector('#searchInput') as HTMLInputElement
  elements.kindFilter = bodyNode.querySelector('#kindFilter') as HTMLSelectElement
  elements.statusFilter = bodyNode.querySelector('#statusFilter') as HTMLSelectElement
  elements.traceRowFilter = bodyNode.querySelector('#traceRowFilter') as HTMLSelectElement
  elements.autoScrollBtn = bodyNode.querySelector('#autoScrollBtn') as HTMLButtonElement
  elements.eventCount = bodyNode.querySelector('#eventCount') as HTMLElement
  elements.droppedCount = bodyNode.querySelector('#droppedCount') as HTMLElement
  elements.gapCount = bodyNode.querySelector('#gapCount') as HTMLElement
  elements.eventsPerSec = bodyNode.querySelector('#eventsPerSec') as HTMLElement
  elements.emptyState = bodyNode.querySelector('#emptyState') as HTMLElement
  elements.eventsTable = bodyNode.querySelector('#eventsTable') as HTMLTableElement
  elements.eventsBody = bodyNode.querySelector('#eventsBody') as HTMLTableSectionElement
  elements.detailPanel = bodyNode.querySelector('#detailPanel') as HTMLElement
  elements.detailContent = bodyNode.querySelector('#detailContent') as HTMLElement
  elements.closeDetailBtn = bodyNode.querySelector('#closeDetailBtn') as HTMLButtonElement
  elements.pinDetailBtn = bodyNode.querySelector('#pinDetailBtn') as HTMLButtonElement
  elements.serverBufferInput = bodyNode.querySelector('#serverBufferInput') as HTMLInputElement
  elements.applyServerBufferBtn = bodyNode.querySelector(
    '#applyServerBufferBtn'
  ) as HTMLButtonElement
  elements.uiBufferInput = bodyNode.querySelector('#uiBufferInput') as HTMLInputElement
  elements.applyUiBufferBtn = bodyNode.querySelector('#applyUiBufferBtn') as HTMLButtonElement
  elements.showStatsBtn = bodyNode.querySelector('#showStatsBtn') as HTMLButtonElement
  elements.statsPanel = bodyNode.querySelector('#statsPanel') as HTMLElement
  elements.statsContent = bodyNode.querySelector('#statsContent') as HTMLElement
  elements.closeStatsBtn = bodyNode.querySelector('#closeStatsBtn') as HTMLButtonElement

  return elements
}
