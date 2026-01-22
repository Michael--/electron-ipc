<script setup lang="ts">
import { ref } from 'vue'

type FlowType = 'invoke' | 'event' | 'broadcast' | 'stream'

const activeFlow = ref<FlowType | null>(null)

const setActive = (flow: FlowType) => {
  activeFlow.value = activeFlow.value === flow ? null : flow
}

const flowClass = (flow: FlowType) => ({
  active: activeFlow.value === flow,
  muted: activeFlow.value !== null && activeFlow.value !== flow,
})

const flows = [
  {
    id: 'invoke' as FlowType,
    title: 'Invoke',
    detail: 'Request/Response (Renderer ↔ Main)',
  },
  {
    id: 'event' as FlowType,
    title: 'Event',
    detail: 'Fire-and-forget (Renderer → Main)',
  },
  {
    id: 'broadcast' as FlowType,
    title: 'Broadcast',
    detail: 'One-way messaging (Main → Renderer)',
  },
  {
    id: 'stream' as FlowType,
    title: 'Stream',
    detail: 'Large data/Real-time (Bidirectional)',
  },
]
</script>

<template>
  <div class="diagram-card">
    <div class="diagram-header">
      <div class="diagram-title">IPC Communication Flow</div>
      <div class="diagram-subtitle">Click a type to see the communication pattern.</div>
    </div>
    <div class="diagram-body">
      <svg
        class="flow-diagram"
        viewBox="0 0 800 320"
        role="img"
        aria-label="IPC communication flow diagram"
      >
        <defs>
          <marker
            id="invoke-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path class="arrow-head" d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <marker
            id="invoke-arrow-back"
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path class="arrow-head" d="M 10 0 L 0 5 L 10 10 z" />
          </marker>
        </defs>

        <!-- Process Boxes -->
        <g class="process-box">
          <rect x="40" y="30" width="140" height="260" rx="12" />
          <text x="110" y="56" text-anchor="middle">Renderer</text>
          <text x="110" y="74" class="process-detail" text-anchor="middle">React UI</text>
        </g>

        <g class="process-box">
          <rect x="230" y="80" width="140" height="160" rx="12" />
          <text x="300" y="106" text-anchor="middle">Preload</text>
          <text x="300" y="124" class="process-detail" text-anchor="middle">Context Bridge</text>
        </g>

        <g class="process-box">
          <rect x="420" y="30" width="140" height="260" rx="12" />
          <text x="490" y="56" text-anchor="middle">Main</text>
          <text x="490" y="74" class="process-detail" text-anchor="middle">Node.js</text>
        </g>

        <g class="process-box">
          <rect x="610" y="80" width="140" height="160" rx="12" />
          <text x="680" y="106" text-anchor="middle">Generated</text>
          <text x="680" y="124" class="process-detail" text-anchor="middle">Type-safe API</text>
        </g>

        <!-- Invoke Flow -->
        <g :class="['ipc-flow', 'invoke-flow', flowClass('invoke')]">
          <line x1="180" y1="110" x2="230" y2="110" marker-end="url(#invoke-arrow)" />
          <text x="205" y="102" text-anchor="middle">invoke</text>

          <line x1="370" y1="110" x2="420" y2="110" marker-end="url(#invoke-arrow)" />

          <line x1="420" y1="130" x2="370" y2="130" marker-start="url(#invoke-arrow-back)" />
          <text x="395" y="122" text-anchor="middle">response</text>

          <line x1="230" y1="130" x2="180" y2="130" marker-start="url(#invoke-arrow-back)" />
        </g>

        <!-- Event Flow -->
        <g :class="['ipc-flow', 'event-flow', flowClass('event')]">
          <line x1="180" y1="160" x2="230" y2="160" marker-end="url(#invoke-arrow)" />
          <text x="205" y="152" text-anchor="middle">send</text>

          <line x1="370" y1="160" x2="420" y2="160" marker-end="url(#invoke-arrow)" />
          <text x="395" y="152" text-anchor="middle">event</text>
        </g>

        <!-- Broadcast Flow -->
        <g :class="['ipc-flow', 'broadcast-flow', flowClass('broadcast')]">
          <line x1="420" y1="190" x2="370" y2="190" marker-start="url(#invoke-arrow-back)" />
          <text x="395" y="182" text-anchor="middle">broadcast</text>

          <line x1="230" y1="190" x2="180" y2="190" marker-start="url(#invoke-arrow-back)" />
          <text x="205" y="182" text-anchor="middle">on</text>
        </g>

        <!-- Stream Flow -->
        <g :class="['ipc-flow', 'stream-flow', flowClass('stream')]">
          <line x1="180" y1="220" x2="420" y2="220" marker-end="url(#invoke-arrow)" />
          <text x="300" y="212" text-anchor="middle">stream</text>

          <line x1="420" y1="240" x2="180" y2="240" marker-start="url(#invoke-arrow-back)" />
          <text x="300" y="232" text-anchor="middle">chunks</text>
        </g>

        <!-- Generator Connection -->
        <g class="generator-link">
          <line
            x1="560"
            y1="150"
            x2="610"
            y2="150"
            stroke-dasharray="4 4"
            marker-end="url(#invoke-arrow)"
          />
          <text x="585" y="142" text-anchor="middle">generates</text>
        </g>
      </svg>

      <div class="diagram-steps">
        <button
          v-for="flow in flows"
          :key="flow.id"
          type="button"
          class="step-btn"
          :class="{ active: activeFlow === flow.id }"
          @click="setActive(flow.id)"
        >
          <span class="step-title">{{ flow.title }}</span>
          <span class="step-detail">{{ flow.detail }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diagram-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  padding: 16px;
  margin: 16px 0;
}

.diagram-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.diagram-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--vp-c-text-1);
}

.diagram-subtitle {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.diagram-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  align-items: start;
}

.flow-diagram {
  width: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 8px;
}

.arrow-head {
  fill: currentColor;
}

.process-box rect {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 1.2;
}

.process-box text {
  fill: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 600;
}

.process-box .process-detail {
  fill: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 400;
}

.ipc-flow {
  color: var(--vp-c-text-2);
  opacity: 0.4;
  transition: opacity 0.3s ease;
}

.ipc-flow line {
  stroke: currentColor;
  stroke-width: 1.6;
}

.ipc-flow text {
  fill: currentColor;
  font-size: 11px;
  font-weight: 500;
}

.ipc-flow.active {
  color: var(--vp-c-brand-1);
  opacity: 1;
}

.ipc-flow.active text {
  fill: var(--vp-c-text-1);
  font-weight: 600;
}

.ipc-flow.muted {
  opacity: 0.15;
}

.generator-link line {
  stroke: var(--vp-c-divider);
  stroke-width: 1.2;
}

.generator-link text {
  fill: var(--vp-c-text-2);
  font-size: 10px;
}

.diagram-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.step-btn {
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 8px;
  padding: 8px 10px;
  text-align: left;
  display: grid;
  gap: 2px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.step-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.step-btn.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.step-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.step-detail {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

@media (max-width: 720px) {
  .diagram-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
