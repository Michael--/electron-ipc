# Notes - Version 2.0.0

- see RELEASE_NOTES_v2.0.0.md

## 🗺️ Roadmap (post 2.0.0)

### Wichtig (in Reihenfolge)

1. ✅ **Generator-Outputs sauber trennen (Main vs. Preload) + Doku/Schema fixen**  
   Ziel: `mainBroadcastOutput` offiziell unterstützen (Schema + YAML + Generator), damit Main-Code keinen `ipcRenderer`-Import erhält. Doku anpassen, damit sie die echte API widerspiegelt.  
   Tests: Generator-Snapshots für Main/Preload-Ausgabe; Integrationstest im `test-app`, dass `mainBroadcast` im Main importiert und genutzt werden kann.

2. ✅ **Robuster Contract-Resolver (re-exports, split files, path aliases)**  
   Ziel: Weg von string-basiertem Parsing hin zu ts-morph/TS-Program mit `tsconfig`, damit Contracts aus Re-Exports und verteilten Dateien zuverlässig erkannt werden.  
   Tests: Fixture-Suite mit Re-Exports, Mapped Types, generics; erwartete API-Snapshots.

3. ✅ **Streaming-API ergonomisch + Leaks vermeiden**  
   Ziel: Renderer-API mit klaren Cleanup-Mechanismen (unsubscribe/abort), optional `AsyncIterable`/`ReadableStream`-Wrapper auf Basis der IPC-Callbacks. Doku + Examples angleichen.  
   Tests: Stream-Tests für Cleanup, Error-Propagation, mehrere parallele Streams; vorhandene Tests erweitern.

4. ✅ **ESM/Preload-Kompatibilität für expose-Funktion**  
   Ziel: `createExposeApi` ohne `require('electron')` für ESM-Preloads und Bundler (electron-vite) nutzbar machen.  
   Tests: TypeScript-Compile-Tests für ESM/TSNodeNext, optional bundler smoke test.

5. ❌ **Serializable-Story konsolidieren (Docs + API)**  
   Ziel: Doku und Typen angleichen (z. B. `Date` nicht verwenden oder Serializer-Option anbieten). Optional: Hook für Custom Serializer (SuperJSON o. ä.).  
   Tests: Typ-Tests/`dts`-Assertions für Serializable-Grenzen, plus optional Runtime-Guards.

6. ❌ **Generator-Workflow im Alltag (watch/check/ci)**  
   Ziel: `--watch` (inkrementell) und `--check` (nur Validierung) für CI/Pre-Commit.  
   Tests: CLI-Tests für Argumente, Watch-Mode-Smoketest.

7. ❌ **Integration-Examples & Templates**  
   Ziel: Offizielle Beispiele für electron-vite + electron-forge, plus `init`/template (Contracts, YAML, Preload, Window typings).  
   Tests: E2E-Smoke-Checks der Examples (Build + Start).

### Optional (nice-to-have, nachrangig)

1. ❌ **Vite-Plugin für Generator**  
   Ziel: Auto-Generation im Dev-Server + on-save.  
   Tests: Plugin-Smoketest mit minimalem Vite-Projekt.

2. ❌ **Runtime-Validation (Zod/Valibot optional)**  
   Ziel: Optionales Validieren von Requests/Responses zur Fehlerdiagnose.  
   Tests: Contract-Validation Unit-Tests + Generator-Optionen.

3. ❌ **Typed Main-Handler Stubs generieren**  
   Ziel: Generator erstellt Handler-Stubs für Main (Invoke/Event/Stream) als Startpunkt.  
   Tests: Snapshot-Tests für Stubs + Typprüfung im `test-app`.
