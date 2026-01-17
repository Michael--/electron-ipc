// Example renderer usage (TypeScript)

async function runExamples() {
  const result = await window.api.invokeAddNumbers({ a: 1, b: 2 })
  console.log('AddNumbers result:', result)

  window.api.sendLogMessage({ level: 'info', message: 'Hello from renderer' })

  const stopDownload = window.api.downloadDownloadLogs(
    { sinceMs: Date.now() },
    (log) => console.log('Log:', log),
    () => console.log('Download complete'),
    (err) => console.error(err)
  )

  // Stop early if needed
  // stopDownload()
}

runExamples()
