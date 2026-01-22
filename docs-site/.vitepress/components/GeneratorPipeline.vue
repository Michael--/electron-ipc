<script setup lang="ts">
import { ref } from 'vue'

type Step = {
  id: number
  title: string
  detail: string
}

const steps: Step[] = [
  { id: 1, title: 'Contracts', detail: 'Typed contract definitions' },
  { id: 2, title: 'AST Parse', detail: 'ts-morph extracts signatures' },
  { id: 3, title: 'Generated Preload API', detail: 'Renderer-safe wrappers' },
  { id: 4, title: 'Generated Main Handlers', detail: 'Type-safe handlers' },
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
      <div class="diagram-title">Generator Pipeline</div>
      <div class="diagram-subtitle">Click a step to focus on each stage.</div>
    </div>
    <div class="diagram-body">
      <svg
        class="pipeline-diagram"
        viewBox="0 0 760 220"
        role="img"
        aria-label="Generator pipeline diagram"
      >
        <defs>
          <marker
            id="pipeline-arrow"
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

        <g class="pipeline-label">
          <text x="520" y="24">Outputs</text>
        </g>

        <g :class="['flow-step', stepClass(1)]">
          <rect x="40" y="80" width="160" height="60" rx="10" />
          <text x="120" y="108" text-anchor="middle">Contracts</text>
          <text x="120" y="126" text-anchor="middle">TypeScript</text>
        </g>

        <g :class="['flow-step', stepClass(2)]">
          <rect x="240" y="70" width="170" height="80" rx="12" />
          <text x="325" y="102" text-anchor="middle">Generator</text>
          <text x="325" y="122" text-anchor="middle">ts-morph AST</text>
        </g>

        <g :class="['flow-step', stepClass(3)]">
          <rect x="470" y="40" width="170" height="60" rx="10" />
          <text x="555" y="68" text-anchor="middle">Preload API</text>
          <text x="555" y="86" text-anchor="middle">Renderer Wrappers</text>
        </g>

        <g :class="['flow-step', stepClass(4)]">
          <rect x="470" y="120" width="170" height="60" rx="10" />
          <text x="555" y="148" text-anchor="middle">Main Handlers</text>
          <text x="555" y="166" text-anchor="middle">Type Safe</text>
        </g>

        <g class="flow-arrow">
          <line x1="200" y1="110" x2="240" y2="110" marker-end="url(#pipeline-arrow)" />
          <line x1="410" y1="92" x2="470" y2="70" marker-end="url(#pipeline-arrow)" />
          <line x1="410" y1="128" x2="470" y2="150" marker-end="url(#pipeline-arrow)" />
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
            <span class="step-title">{{ step.id }} - {{ step.title }}</span>
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

.pipeline-diagram {
  width: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 8px;
}

.pipeline-label text {
  fill: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
}

.arrow-head {
  fill: currentColor;
}

.flow-arrow {
  color: var(--vp-c-text-2);
}

.flow-arrow line {
  stroke: currentColor;
  stroke-width: 1.4;
}

.flow-step rect {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-divider);
  stroke-width: 1.2;
}

.flow-step text {
  fill: var(--vp-c-text-1);
  font-size: 12px;
  font-weight: 600;
}

.flow-step.active rect {
  stroke: var(--vp-c-brand-1);
  fill: var(--vp-c-bg-soft);
}

.flow-step.muted {
  opacity: 0.35;
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
