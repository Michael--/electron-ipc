# Diagram Components

Interactive SVG diagrams for the electron-ipc documentation.

## Available Components

### IpcFlowDiagram.vue

Shows the complete IPC communication flow with all four contract types.

**Usage:**

```vue
<IpcFlowDiagram />
```

**Location:** [overview.md](../../guide/overview.md)

### WindowRegistryDiagram.vue

Visualizes the window registry structure and broadcast patterns.

**Usage:**

```vue
<WindowRegistryDiagram />
```

**Location:** [window-manager.md](../../guide/window-manager.md)

### InspectorArchitecture.vue

Shows the Inspector component architecture and event flow.

**Usage:**

```vue
<InspectorArchitecture />
```

**Location:** [inspector.md](../../guide/inspector.md)

### GeneratorPipeline.vue

Interactive pipeline showing the code generation stages.

**Usage:**

```vue
<GeneratorPipeline />
```

**Location:** [architecture.md](../../guide/architecture.md)

### TraceSequence.vue

Sequence diagram showing the tracing lifecycle.

**Usage:**

```vue
<TraceSequence />
```

**Location:** [architecture.md](../../guide/architecture.md)

## Shared Resources

### diagram-shared.ts

Common utilities and styles for creating consistent diagrams:

- **SVG Definitions:** Arrow markers, gradients
- **Base Styles:** Card, header, body layouts
- **Process Box Styles:** Main, Renderer, Preload boxes
- **Button Styles:** Interactive step buttons
- **Color Scheme:** Consistent process colors
- **Arrow Types:** Invoke, event, broadcast, stream
- **Helper Functions:** Step class creation, SVG wrappers

**Example Usage:**

```typescript
import { createStepClass, processColors } from './diagram-shared'

const stepClass = createStepClass(activeStep.value, stepId)
```

## Design Guidelines

### Colors

- **Process Boxes:** `var(--vp-c-bg-soft)` with `var(--vp-c-divider)` border
- **Active State:** `var(--vp-c-brand-1)` border, `var(--vp-c-brand-soft)` fill
- **Text Primary:** `var(--vp-c-text-1)`
- **Text Secondary:** `var(--vp-c-text-2)`
- **Text Tertiary:** `var(--vp-c-text-3)`

### Typography

- **Title:** 13px, font-weight: 600
- **Detail:** 11px, font-weight: 400
- **Labels:** 10-12px
- **Font Family:** Inherits from VitePress theme

### Interactivity

All diagrams support:

- **Click to Highlight:** Click steps/components to focus
- **Active State:** Highlighted with brand color
- **Muted State:** Other elements fade (opacity: 0.25-0.35)
- **Hover Effects:** Border color change on buttons

### Responsive

- **Desktop:** Multi-column step grid (2-4 columns)
- **Mobile (< 720px):** Single column layout

### Accessibility

- `role="img"` on SVG elements
- `aria-label` with descriptive text
- Keyboard-accessible buttons
- Clear visual focus indicators

## Creating New Diagrams

1. **Create Vue Component:** Use existing components as templates
2. **Import Shared Styles:** Reuse `diagram-shared.ts` utilities
3. **Follow Conventions:**
   - Use `.diagram-card` wrapper
   - Include `.diagram-header` with title/subtitle
   - Add interactive `.diagram-steps` buttons
   - Use consistent SVG viewBox and padding
4. **Add to Documentation:** Insert `<YourComponent />` in markdown

### Template

```vue
<script setup lang="ts">
import { ref } from 'vue'

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
      <div class="diagram-title">Your Diagram Title</div>
      <div class="diagram-subtitle">Click to interact.</div>
    </div>
    <div class="diagram-body">
      <svg class="diagram-svg" viewBox="0 0 800 300">
        <!-- Your SVG content -->
      </svg>

      <div class="diagram-steps">
        <!-- Your interactive buttons -->
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Import or copy shared styles */
</style>
```

## VitePress Integration

Components are automatically registered by VitePress from `.vitepress/components/`.

**No import needed in markdown:**

```md
# My Page

<MyDiagram />
```

## Testing

1. Run docs site: `pnpm run dev` (in docs-site folder)
2. Navigate to relevant page
3. Test interactions:
   - Click all steps/components
   - Verify highlighting works
   - Test on mobile viewport
   - Check dark mode compatibility

## Maintenance

- **Keep consistent:** Follow existing patterns
- **DRY principle:** Use shared utilities
- **Document changes:** Update this README
- **Test thoroughly:** All viewports and themes
