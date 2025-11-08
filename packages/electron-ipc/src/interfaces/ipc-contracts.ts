/**
 * Helper types for creating a type-safe IPC (Inter-Process Communication) API for Electron applications.
 *
 * Overview:
 * 1) Define your API in three parts, each representing a mandatory contract:
 *    - Invoke: Bidirectional IPC contracts for request-response communication between the renderer and main processes.
 *    - Event: Unidirectional IPC contracts for events sent from the renderer to the main process without expecting direct responses.
 *    - Send: Unidirectional IPC contracts for data or events sent from the main process to the renderer.
 *
 * 2) To make the API accessible in the Renderer process, execute the generator script:
 *    - Note: The renderer script is basic and may require adjustments to your specific paths.
 *    - Ensure the generated API definitions are made available in your preload script (e.g., `window.api = api`).
 *
 * 3) Integrate individual API implementations into your main process:
 *    - For Invoke and Event, implement classes derived from a specialized abstract base class to guarantee inclusion of any defined API method.
 *    - For Send, use a typed command to ensure the correct calling signature.
 *
 * Define the API example:
 * 1) API Definitions
 *    export type IPCInvokeContracts = GenericInvokeContract<{ HelloEcho: IInvokeContract<string, string> }>;
 *    export type IPCEventContracts = GenericRendererEventContract<{ Message: IRendererEventContract<string> }>;
 *    export type IBroadcastContracts = GenericBroadcastContract<{ Status: IBroadcastContract<string> }>;
 *
 * 2) Execute the adjusted script
 *    - Adjustments include the source path of the API definition, the destination path of the generated API, and the names of your API contracts.
 *
 * 3) Implementations in the main process
 *    - After the renderer window is created, implement and register. Type control aids in implementing all API definitions:
 *      class RegisterHandler extends AbstractRegisterHandler { handlers: IPCHandlerType<IPCInvokeContracts> = { HelloEcho: async (_event, v) => `Echo:${JSON.stringify(v)}` }; }
 *      class RegisterEvent extends AbstractRegisterEvent { events: IPCEventType<IPCEventContracts> = { Message: (_event, v) => { console.log(`received: ${v}`); } }; }
 *      RegisterHandler.register();
 *      RegisterEvent.register();
 *
 *    - Utilize the send contract as needed:
 *      create a broadcast function for your contract:
 *      export const broadcast = createBroadcast<IBroadcastContracts>()
 *      broadcast("Status", mainWindow, "Ready");
 *
 * 4) Access from the renderer process, assuming the API is published at `window.api`:
 *    - For Invoke: `console.log(await window.api.invokeHelloEcho("Hello"));`
 *    - For Event: `window.api.sendMessage("Yo");`
 *    - For Send: `window.api.onStatus(v => console.log(v));`
 */

// Re-export all types and functions from the modular files
export * from './broadcast-contracts'
export * from './event-contracts'
export * from './invoke-contracts'
export * from './stream-contracts'
export * from './types'
