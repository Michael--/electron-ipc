import DefaultTheme from 'vitepress/theme'
import GeneratorPipeline from '../components/GeneratorPipeline.vue'
import TraceSequence from '../components/TraceSequence.vue'
import IpcFlowDiagram from '../components/IpcFlowDiagram.vue'
import WindowRegistryDiagram from '../components/WindowRegistryDiagram.vue'
import InspectorArchitecture from '../components/InspectorArchitecture.vue'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('GeneratorPipeline', GeneratorPipeline)
    app.component('TraceSequence', TraceSequence)
    app.component('IpcFlowDiagram', IpcFlowDiagram)
    app.component('WindowRegistryDiagram', WindowRegistryDiagram)
    app.component('InspectorArchitecture', InspectorArchitecture)
  },
}
