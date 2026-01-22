/**
 * Shared SVG defs for diagram components
 * Provides common arrow markers and gradients
 */
export const sharedDefs = `
<defs>
  <!-- Standard arrow marker -->
  <marker
    id="arrow"
    viewBox="0 0 10 10"
    refX="9"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto-start-reverse"
  >
    <path class="arrow-head" d="M 0 0 L 10 5 L 0 10 z" />
  </marker>

  <!-- Backward arrow marker -->
  <marker
    id="arrow-back"
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
`

/**
 * Shared CSS styles for diagrams
 * Use in <style scoped> sections
 */
export const diagramBaseStyles = `
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

.arrow-head {
  fill: currentColor;
}
`

/**
 * Process box styles (Main, Renderer, Preload)
 */
export const processBoxStyles = `
.process-box rect {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 1.2;
  transition: stroke 0.3s ease, fill 0.3s ease;
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

.process-box.active rect {
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  fill: var(--vp-c-brand-soft);
}

.process-box.muted {
  opacity: 0.35;
}
`

/**
 * Interactive step button styles
 */
export const stepButtonStyles = `
.diagram-steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
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
  transition: border-color 0.2s ease, background 0.2s ease;
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
    grid-template-columns: 1fr !important;
  }
}
`

/**
 * Color scheme for different process types
 */
export const processColors = {
  main: {
    fill: 'var(--vp-c-bg-soft)',
    stroke: 'var(--vp-c-divider)',
    activeFill: 'var(--vp-c-brand-soft)',
    activeStroke: 'var(--vp-c-brand-1)',
  },
  renderer: {
    fill: 'var(--vp-c-bg-soft)',
    stroke: 'var(--vp-c-divider)',
    activeFill: 'var(--vp-c-brand-soft)',
    activeStroke: 'var(--vp-c-brand-1)',
  },
  preload: {
    fill: 'var(--vp-c-bg)',
    stroke: 'var(--vp-c-divider)',
    activeFill: 'var(--vp-c-bg-soft)',
    activeStroke: 'var(--vp-c-brand-1)',
  },
} as const

/**
 * Arrow type configurations
 */
export const arrowTypes = {
  invoke: { color: 'var(--vp-c-brand-1)', strokeWidth: 1.6 },
  event: { color: 'var(--vp-c-text-2)', strokeWidth: 1.4 },
  broadcast: { color: 'var(--vp-c-brand-2)', strokeWidth: 1.6 },
  stream: { color: 'var(--vp-c-green-1)', strokeWidth: 2 },
} as const

/**
 * Helper to create step class object for Vue
 */
export function createStepClass(activeStep: number | string | null, stepId: number | string) {
  return {
    active: activeStep === stepId,
    muted: activeStep !== null && activeStep !== stepId,
  }
}

/**
 * SVG diagram wrapper with consistent styling
 */
export function createSvgWrapper(viewBox: string, label: string) {
  return `
  <svg
    class="diagram-svg"
    viewBox="${viewBox}"
    role="img"
    aria-label="${label}"
  >
  `
}

/**
 * Shared CSS for SVG diagrams
 */
export const svgDiagramStyles = `
.diagram-svg {
  width: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 8px;
}
`
