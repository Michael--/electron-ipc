<script setup lang="ts">
import { ref } from 'vue'

type Component = 'renderer' | 'server' | 'buffer' | 'ui'

const activeComponent = ref<Component | null>(null)

const setActive = (comp: Component) => {
  activeComponent.value = activeComponent.value === comp ? null : comp
}

const compClass = (comp: Component) => ({
  active: activeComponent.value === comp,
  muted: activeComponent.value !== null && activeComponent.value !== comp,
})

const components = [
  {
    id: 'renderer' as Component,
    title: 'Renderer Process',
    detail: 'Emits trace events via IPC',
  },
  {
    id: 'server' as Component,
    title: 'Inspector Server',
    detail: 'Collects & routes traces (main)',
  },
  {
    id: 'buffer' as Component,
    title: 'Ring Buffer',
    detail: 'Stores trace history (5000 events)',
  },
  {
    id: 'ui' as Component,
    title: 'Inspector UI',
    detail: 'Displays traces in real-time',
  },
]
</script>

<template>
  <div class="diagram-card">
    <div class="diagram-header">
      <div class="diagram-title">Inspector Architecture</div>
      <div class="diagram-subtitle">Click a component to highlight its role.</div>
    </div>
    <div class="diagram-body">
      <svg
        class="inspector-diagram"
        viewBox="0 0 800 340"
        role="img"
        aria-label="Inspector architecture diagram"
      >
        <defs>
          <marker
            id="arch-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path class="arrow-head" d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>

        <!-- Main Process Container -->
        <g class="process-container">
          <rect x="220" y="20" width="360" height="300" rx="12" stroke-dasharray="5 5" />
          <text x="240" y="44">Main Process</text>
        </g>

        <!-- Renderer Process -->
        <g :class="['component-box', 'renderer', compClass('renderer')]">
          <rect x="40" y="140" width="140" height="80" rx="10" />
          <text x="110" y="166" text-anchor="middle">Renderer</text>
          <text x="110" y="184" class="comp-detail" text-anchor="middle">App Window</text>
          <text x="110" y="202" class="comp-detail" text-anchor="middle">Generated API</text>
        </g>

        <!-- Inspector Server -->
        <g :class="['component-box', 'server', compClass('server')]">
          <rect x="240" y="70" width="140" height="80" rx="10" />
          <text x="310" y="96" text-anchor="middle">Inspector</text>
          <text x="310" y="114" text-anchor="middle">Server</text>
          <text x="310" y="132" class="comp-detail" text-anchor="middle">Event Router</text>
        </g>

        <!-- Ring Buffer -->
        <g :class="['component-box', 'buffer', compClass('buffer')]">
          <rect x="240" y="190" width="140" height="80" rx="10" />
          <text x="310" y="216" text-anchor="middle">Ring Buffer</text>
          <text x="310" y="234" class="comp-detail" text-anchor="middle">5000 events</text>
          <text x="310" y="252" class="comp-detail" text-anchor="middle">FIFO</text>
        </g>

        <!-- Inspector UI -->
        <g :class="['component-box', 'ui', compClass('ui')]">
          <rect x="440" y="140" width="140" height="80" rx="10" />
          <text x="510" y="166" text-anchor="middle">Inspector UI</text>
          <text x="510" y="184" class="comp-detail" text-anchor="middle">Dedicated Window</text>
          <text x="510" y="202" class="comp-detail" text-anchor="middle">Live Viewer</text>
        </g>

        <!-- Data Flows -->
        <g :class="['data-flow', 'renderer-to-server', compClass('renderer')]">
          <line x1="180" y1="170" x2="240" y2="130" marker-end="url(#arch-arrow)" />
          <text x="210" y="145" text-anchor="middle" class="flow-label">INSPECTOR:TRACE</text>
        </g>

        <g :class="['data-flow', 'server-to-buffer', compClass('server'), compClass('buffer')]">
          <line x1="310" y1="150" x2="310" y2="190" marker-end="url(#arch-arrow)" />
          <text x="330" y="175" class="flow-label">store</text>
        </g>

        <g :class="['data-flow', 'server-to-ui', compClass('server'), compClass('ui')]">
          <line x1="380" y1="110" x2="440" y2="160" marker-end="url(#arch-arrow)" />
          <text x="410" y="125" text-anchor="middle" class="flow-label">broadcast</text>
        </g>

        <g :class="['data-flow', 'buffer-to-ui', compClass('buffer'), compClass('ui')]">
          <line x1="380" y1="230" x2="440" y2="200" marker-end="url(#arch-arrow)" />
          <text x="410" y="220" text-anchor="middle" class="flow-label">export</text>
        </g>

        <!-- Additional Labels -->
        <g class="info-label">
          <text x="110" y="250" text-anchor="middle" class="info-text">window.api</text>
          <text x="110" y="265" text-anchor="middle" class="info-text">.invokeAddNumbers()</text>
        </g>

        <g class="info-label">
          <text x="310" y="300" text-anchor="middle" class="info-text">Batching: 50 events</text>
        </g>

        <g class="info-label">
          <text x="510" y="250" text-anchor="middle" class="info-text">Real-time updates</text>
          <text x="510" y="265" text-anchor="middle" class="info-text">Filters & Search</text>
        </g>
      </svg>

      <div class="diagram-steps">
        <button
          v-for="comp in components"
          :key="comp.id"
          type="button"
          class="step-btn"
          :class="{ active: activeComponent === comp.id }"
          @click="setActive(comp.id)"
        >
          <span class="step-title">{{ comp.title }}</span>
          <span class="step-detail">{{ comp.detail }}</span>
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

.inspector-diagram {
  width: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 8px;
}

.arrow-head {
  fill: currentColor;
}

.process-container rect {
  fill: none;
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.process-container text {
  fill: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 500;
}

.component-box rect {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 1.2;
  transition:
    stroke 0.3s ease,
    fill 0.3s ease;
}

.component-box text {
  fill: var(--vp-c-text-1);
  font-size: 12px;
  font-weight: 600;
}

.comp-detail {
  fill: var(--vp-c-text-2);
  font-size: 10px;
  font-weight: 400;
}

.component-box.active rect {
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  fill: var(--vp-c-brand-soft);
}

.component-box.muted {
  opacity: 0.35;
}

.data-flow {
  color: var(--vp-c-text-2);
  opacity: 0.4;
  transition: opacity 0.3s ease;
}

.data-flow line {
  stroke: currentColor;
  stroke-width: 1.6;
}

.data-flow.active {
  color: var(--vp-c-brand-1);
  opacity: 1;
}

.flow-label {
  fill: currentColor;
  font-size: 10px;
  font-weight: 500;
}

.info-label text {
  fill: var(--vp-c-text-3);
  font-size: 9px;
}

.diagram-steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
    grid-template-columns: 1fr;
  }
}
</style>
