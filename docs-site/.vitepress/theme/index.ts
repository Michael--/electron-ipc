import DefaultTheme from 'vitepress/theme'
import GeneratorPipeline from '../components/GeneratorPipeline.vue'
import TraceSequence from '../components/TraceSequence.vue'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('GeneratorPipeline', GeneratorPipeline)
    app.component('TraceSequence', TraceSequence)
  },
}
