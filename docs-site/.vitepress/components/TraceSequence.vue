<script setup lang="ts">
import { ref } from 'vue'

type Step = {
  id: number
  title: string
  detail: string
}

const steps: Step[] = [
  { id: 1, title: 'Invoke request', detail: 'Renderer -> Main: invoke(channel, payload)' },
  { id: 2, title: 'Trace start', detail: 'Renderer -> Inspector: INSPECTOR:TRACE start' },
  { id: 3, title: 'Broadcast start', detail: 'Inspector -> UI: event batch' },
  { id: 4, title: 'Invoke response', detail: 'Main -> Renderer: response payload' },
  { id: 5, title: 'Trace end', detail: 'Renderer -> Inspector: INSPECTOR:TRACE end' },
  { id: 6, title: 'Broadcast end', detail: 'Inspector -> UI: event batch' },
]

const activeStep = ref<number | null>(null)

const setActive = (id: number) => {
  activeStep.value = activeStep.value === id ? null : id
}

const stepClass = (id: number) => ({
  active: activeStep.value === id,
  muted: activeStep.value !== null && activeStep.value !== id,
})
</script>

<template>
  <div class="diagram-card">
    <div class="diagram-header">
      <div class="diagram-title">Tracing Sequence (Invoke)</div>
      <div class="diagram-subtitle">Click a step to highlight the signal flow.</div>
    </div>
    <div class="diagram-body">
      <svg
        class="trace-diagram"
        viewBox="0 0 760 260"
        role="img"
        aria-label="Tracing sequence diagram"
      >
        <defs>
          <marker
            id="trace-arrow"
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

        <g class="lifelines">
          <text x="80" y="24">Renderer</text>
          <text x="260" y="24">Main</text>
          <text x="460" y="24">Inspector Server</text>
          <text x="660" y="24">Inspector UI</text>

          <line x1="80" y1="36" x2="80" y2="230" />
          <line x1="260" y1="36" x2="260" y2="230" />
          <line x1="460" y1="36" x2="460" y2="230" />
          <line x1="660" y1="36" x2="660" y2="230" />
        </g>

        <g :class="['seq-step', stepClass(1)]">
          <line x1="80" y1="70" x2="260" y2="70" marker-end="url(#trace-arrow)" />
          <text x="170" y="62">invoke(channel, payload)</text>
        </g>

        <g :class="['seq-step', stepClass(2)]">
          <line x1="80" y1="100" x2="460" y2="100" marker-end="url(#trace-arrow)" />
          <text x="210" y="92">INSPECTOR:TRACE start</text>
        </g>

        <g :class="['seq-step', stepClass(3)]">
          <line x1="460" y1="130" x2="660" y2="130" marker-end="url(#trace-arrow)" />
          <text x="520" y="122">broadcast start</text>
        </g>

        <g :class="['seq-step', stepClass(4)]">
          <line x1="260" y1="160" x2="80" y2="160" marker-end="url(#trace-arrow)" />
          <text x="145" y="152">response payload</text>
        </g>

        <g :class="['seq-step', stepClass(5)]">
          <line x1="80" y1="190" x2="460" y2="190" marker-end="url(#trace-arrow)" />
          <text x="210" y="182">INSPECTOR:TRACE end</text>
        </g>

        <g :class="['seq-step', stepClass(6)]">
          <line x1="460" y1="220" x2="660" y2="220" marker-end="url(#trace-arrow)" />
          <text x="520" y="212">broadcast end</text>
        </g>
      </svg>

      <ol class="diagram-steps">
        <li v-for="step in steps" :key="step.id">
          <button
            type="button"
            class="step-btn"
            :class="{ active: activeStep === step.id }"
            @click="setActive(step.id)"
          >
            <span class="step-title">{{ step.id }} – {{ step.title }}</span>
            <span class="step-detail">{{ step.detail }}</span>
          </button>
        </li>
      </ol>
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

.trace-diagram {
  width: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 8px;
}

.lifelines text {
  fill: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
}

.lifelines line {
  stroke: var(--vp-c-divider);
  stroke-dasharray: 4 4;
}

.arrow-head {
  fill: currentColor;
}

.seq-step {
  color: var(--vp-c-text-2);
}

.seq-step line {
  stroke: currentColor;
  stroke-width: 1.4;
}

.seq-step text {
  fill: currentColor;
  font-size: 11px;
}

.seq-step.active {
  color: var(--vp-c-brand-1);
}

.seq-step.active text {
  fill: var(--vp-c-text-1);
  font-weight: 600;
}

.seq-step.muted {
  opacity: 0.25;
}

.diagram-steps {
  list-style: none;
  padding: 0;
  margin: 0;
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

.step-num {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
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
