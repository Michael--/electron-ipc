<script setup lang="ts">
import { ref } from 'vue'

type BroadcastMode = 'all' | 'role' | 'exclude'

const activeMode = ref<BroadcastMode | null>(null)

const setActive = (mode: BroadcastMode) => {
  activeMode.value = activeMode.value === mode ? null : mode
}

const modeClass = (mode: BroadcastMode) => ({
  active: activeMode.value === mode,
  muted: activeMode.value !== null && activeMode.value !== mode,
})

const modes = [
  {
    id: 'all' as BroadcastMode,
    title: 'Broadcast to All',
    detail: 'Send to every registered window',
  },
  {
    id: 'role' as BroadcastMode,
    title: 'Role-Based',
    detail: 'Target specific window roles',
  },
  {
    id: 'exclude' as BroadcastMode,
    title: 'Exclude Roles',
    detail: 'Send to all except certain roles',
  },
]
</script>

<template>
  <div class="diagram-card">
    <div class="diagram-header">
      <div class="diagram-title">Window Registry & Broadcast Patterns</div>
      <div class="diagram-subtitle">Click a pattern to highlight broadcast flows.</div>
    </div>
    <div class="diagram-body">
      <svg
        class="registry-diagram"
        viewBox="0 0 800 360"
        role="img"
        aria-label="Window registry and broadcast patterns diagram"
      >
        <defs>
          <marker
            id="broadcast-arrow"
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

        <!-- Central Registry -->
        <g class="registry-box">
          <rect x="320" y="140" width="160" height="80" rx="12" />
          <text x="400" y="168" text-anchor="middle">Window Registry</text>
          <text x="400" y="186" class="registry-detail" text-anchor="middle">Central tracker</text>
          <text x="400" y="204" class="registry-detail" text-anchor="middle">Role-based</text>
        </g>

        <!-- Windows -->
        <g class="window-box main-window">
          <rect x="60" y="40" width="120" height="60" rx="10" />
          <text x="120" y="66" text-anchor="middle">Main Window</text>
          <text x="120" y="84" class="window-role" text-anchor="middle">role: main</text>
        </g>

        <g class="window-box secondary-window">
          <rect x="60" y="140" width="120" height="60" rx="10" />
          <text x="120" y="166" text-anchor="middle">Secondary</text>
          <text x="120" y="184" class="window-role" text-anchor="middle">role: secondary</text>
        </g>

        <g class="window-box secondary-window">
          <rect x="60" y="240" width="120" height="60" rx="10" />
          <text x="120" y="266" text-anchor="middle">Secondary</text>
          <text x="120" y="284" class="window-role" text-anchor="middle">role: secondary</text>
        </g>

        <g class="window-box inspector-window">
          <rect x="620" y="140" width="120" height="60" rx="10" />
          <text x="680" y="166" text-anchor="middle">Inspector</text>
          <text x="680" y="184" class="window-role" text-anchor="middle">role: inspector</text>
        </g>

        <!-- Registration arrows (always visible) -->
        <g class="registration-flow">
          <line x1="180" y1="70" x2="320" y2="150" stroke-dasharray="3 3" />
          <line x1="180" y1="170" x2="320" y2="170" stroke-dasharray="3 3" />
          <line x1="180" y1="270" x2="320" y2="200" stroke-dasharray="3 3" />
          <line x1="620" y1="170" x2="480" y2="170" stroke-dasharray="3 3" />
          <text x="240" y="105" class="reg-label">register</text>
          <text x="240" y="165" class="reg-label">register</text>
          <text x="240" y="225" class="reg-label">register</text>
          <text x="560" y="165" class="reg-label">register</text>
        </g>

        <!-- Broadcast to All -->
        <g :class="['broadcast-flow', 'broadcast-all', modeClass('all')]">
          <path d="M 400 140 L 400 70 L 180 70" fill="none" marker-end="url(#broadcast-arrow)" />
          <path d="M 400 140 L 240 140 L 180 170" fill="none" marker-end="url(#broadcast-arrow)" />
          <path d="M 400 220 L 400 270 L 180 270" fill="none" marker-end="url(#broadcast-arrow)" />
          <path d="M 480 170 L 620 170" fill="none" marker-end="url(#broadcast-arrow)" />
          <text x="400" y="32" text-anchor="middle" class="broadcast-label">broadcastToAll()</text>
        </g>

        <!-- Role-Based Broadcast -->
        <g :class="['broadcast-flow', 'broadcast-role', modeClass('role')]">
          <path d="M 400 140 L 280 140 L 180 170" fill="none" marker-end="url(#broadcast-arrow)" />
          <path d="M 400 220 L 400 270 L 180 270" fill="none" marker-end="url(#broadcast-arrow)" />
          <text x="280" y="125" text-anchor="middle" class="broadcast-label">
            broadcastToRole('secondary')
          </text>
        </g>

        <!-- Exclude Broadcast -->
        <g :class="['broadcast-flow', 'broadcast-exclude', modeClass('exclude')]">
          <path d="M 400 140 L 400 70 L 180 70" fill="none" marker-end="url(#broadcast-arrow)" />
          <path d="M 400 140 L 240 140 L 180 170" fill="none" marker-end="url(#broadcast-arrow)" />
          <path d="M 400 220 L 400 270 L 180 270" fill="none" marker-end="url(#broadcast-arrow)" />
          <text x="400" y="328" text-anchor="middle" class="broadcast-label">
            excludeRoles: ['inspector']
          </text>
        </g>
      </svg>

      <div class="diagram-steps">
        <button
          v-for="mode in modes"
          :key="mode.id"
          type="button"
          class="step-btn"
          :class="{ active: activeMode === mode.id }"
          @click="setActive(mode.id)"
        >
          <span class="step-title">{{ mode.title }}</span>
          <span class="step-detail">{{ mode.detail }}</span>
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

.registry-diagram {
  width: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 8px;
}

.arrow-head {
  fill: currentColor;
}

.registry-box rect {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.5;
}

.registry-box text {
  fill: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 600;
}

.registry-detail {
  fill: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 400;
}

.window-box rect {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 1.2;
}

.window-box text {
  fill: var(--vp-c-text-1);
  font-size: 12px;
  font-weight: 600;
}

.window-role {
  fill: var(--vp-c-text-2);
  font-size: 10px;
  font-weight: 400;
  font-family: monospace;
}

.registration-flow line {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.reg-label {
  fill: var(--vp-c-text-3);
  font-size: 9px;
}

.broadcast-flow {
  color: var(--vp-c-text-2);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.broadcast-flow path {
  stroke: currentColor;
  stroke-width: 2;
}

.broadcast-flow.active {
  color: var(--vp-c-brand-1);
  opacity: 1;
}

.broadcast-label {
  fill: currentColor;
  font-size: 11px;
  font-weight: 600;
}

.diagram-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
