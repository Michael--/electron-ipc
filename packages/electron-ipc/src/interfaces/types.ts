/**
 * Helper types for creating a type-safe IPC (Inter-Process Communication) API for Electron applications.
 *
 * This module provides foundational types and utilities for IPC contracts:
 * - `Serializable`: Defines types safe for IPC serialization
 * - `EnforceStructure`: Ensures contract structure compliance
 * - Utility types: Extract request/response types from contracts
 *
 * These types are used internally by the contract modules and are typically not used directly.
 * Instead, use the specific contract types from the respective modules.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Defines types that can be safely serialized across IPC boundaries.
 * Only JSON-compatible types are allowed: primitives, arrays, and plain objects.
 * Excludes: Date, Map, Set, Function, Class instances, undefined in arrays/objects.
 * Includes: Buffer and Uint8Array for binary data in Electron IPC.
 *
 * @example
 * ```typescript
 * // Valid serializable types
 * const valid: Serializable = {
 *   string: "hello",
 *   number: 42,
 *   boolean: true,
 *   null: null,
 *   buffer: Buffer.from("data"),
 *   array: [1, 2, 3],
 *   object: { key: "value" }
 * };
 *
 * // Invalid: would cause type error
 * // const invalid: Serializable = new Date(); // Error
 * ```
 *
 * @type {Serializable}
 */
export type Serializable =
  | string
  | number
  | boolean
  | null
  | Buffer
  | Uint8Array
  | { [key: string]: Serializable }
  | Serializable[]

/**
 * Validates that an object type only contains serializable values.
 * Ensures all properties in the object are compatible with IPC serialization.
 * Optional properties can be omitted, but when present must be serializable (not undefined).
 * Use null instead of undefined for optional values that need to be transmitted.
 *
 * @example
 * ```typescript
 * // Define a type-safe serializable object
 * type UserData = SerializableObject<{
 *   id: number;
 *   name: string;
 *   tags: string[];
 *   role: string | null; // Use null for optional values
 *   metadata: { [key: string]: string };
 * }>;
 *
 * // TypeScript will enforce serializable values
 * const user: UserData = {
 *   id: 1,
 *   name: "Alice",
 *   tags: ["admin", "user"],
 *   role: null, // null is serializable, undefined is not
 *   metadata: { role: "admin" }
 * };
 *
 * // Invalid: would cause type error
 * // type Invalid = SerializableObject<{
 * //   createdAt: Date; // Error: Date is not Serializable
 * // }>;
 * ```
 *
 * @type {SerializableObject}
 * @typeparam T - The object type to validate. Must extend Record<string, unknown>.
 */
export type SerializableObject<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Serializable ? T[K] : never
}

/**
 * Enforces a structure match between a given type `T` and a specified `Structure`.
 * It ensures that `T` extends `Structure` and has exactly the same set of keys.
 *
 * @type {EnforceStructure}
 * @typeparam T - The target type to validate.
 * @typeparam Structure - The structure to enforce on `T`.
 * @returns `T` if it matches `Structure`, otherwise never.
 */
export type EnforceStructure<T, Structure> = T extends Structure
  ? Exclude<keyof Structure, keyof T> extends never
    ? T
    : never
  : never

/**
 * Utility type for extracting the request type from a specified IInvokeContract.
 *
 * @type {RequestType}
 * @typeparam T - The target contract type.
 * @typeparam K - The key of the contract to extract the request type from.
 * @returns The request type of the specified contract.
 */
export type RequestType<T extends GenericInvokeContract<T>, K extends keyof T> =
  T[K] extends IInvokeContract<infer Req, any> ? Req : never

/**
 * Utility type for extracting the response type from a specified IInvokeContract.
 *
 * @type {ResponseType}
 * @typeparam T - The target contract type.
 * @typeparam K - The key of the contract to extract the response type from.
 * @returns The response type of the specified contract.
 */
export type ResponseType<T extends GenericInvokeContract<T>, K extends keyof T> =
  T[K] extends IInvokeContract<any, infer Res> ? Res : never

/**
 * Utility type for extracting the request type from a specified IStreamInvokeContract.
 *
 * @type {StreamRequestType}
 * @typeparam T - The target stream contract type.
 * @typeparam K - The key of the contract to extract the request type from.
 * @returns The request type of the specified stream contract.
 */
export type StreamRequestType<T extends GenericStreamInvokeContract<T>, K extends keyof T> =
  T[K] extends IStreamInvokeContract<infer Req, any> ? Req : never

/**
 * Utility type for extracting the data type from a specified IStreamInvokeContract.
 *
 * @type {StreamDataType}
 * @typeparam T - The target stream contract type.
 * @typeparam K - The key of the contract to extract the data type from.
 * @returns The data type of the specified stream contract.
 */
export type StreamDataType<T extends GenericStreamInvokeContract<T>, K extends keyof T> =
  T[K] extends IStreamInvokeContract<any, infer Data> ? Data : never

/**
 * Utility type for extracting the request type from a specified IPCEventContract.
 * This type facilitates the extraction of the request type that's sent from the renderer to the main process,
 * allowing for type-safe handling of IPC events.
 *
 * @type {EventType}
 * @typeparam T - The target event contract type.
 * @typeparam K - The key of the contract to extract the request type from.
 * @returns The request type of the specified contract.
 */
export type EventType<T extends GenericRendererEventContract<T>, K extends keyof T> =
  T[K] extends IRendererEventContract<infer Req> ? Req : never

/**
 * Utility type for extracting the payload type from a specified IBroadcastContract.
 * This type facilitates the extraction of the payload type that's sent from the main process to the renderer,
 * allowing for type-safe handling of IPC broadcasts.
 *
 * @type {PayloadType}
 * @typeparam T - The target broadcast contract type.
 * @typeparam K - The key of the contract to extract the payload type from.
 * @returns The payload type of the specified contract.
 */
export type PayloadType<T extends GenericBroadcastContract<T>, K extends keyof T> =
  T[K] extends IBroadcastContract<infer Req> ? Req : never

/**
 * Utility type for extracting the request type from a specified IStreamUploadContract.
 *
 * @type {UploadRequestType}
 * @typeparam T - The target upload contract type.
 * @typeparam K - The key of the contract.
 * @returns The request type of the specified contract.
 */
export type UploadRequestType<T extends GenericStreamUploadContract<T>, K extends keyof T> =
  T[K] extends IStreamUploadContract<infer Request, any> ? Request : never

/**
 * Utility type for extracting the data type from a specified IStreamUploadContract.
 *
 * @type {UploadDataType}
 * @typeparam T - The target upload contract type.
 * @typeparam K - The key of the contract.
 * @returns The data type of the specified contract.
 */
export type UploadDataType<T extends GenericStreamUploadContract<T>, K extends keyof T> =
  T[K] extends IStreamUploadContract<any, infer Data> ? Data : never

/**
 * Utility type for extracting the request type from a specified IStreamDownloadContract.
 *
 * @type {DownloadRequestType}
 * @typeparam T - The target download contract type.
 * @typeparam K - The key of the contract.
 * @returns The request type of the specified contract.
 */
export type DownloadRequestType<T extends GenericStreamDownloadContract<T>, K extends keyof T> =
  T[K] extends IStreamDownloadContract<infer Request, any> ? Request : never

/**
 * Utility type for extracting the data type from a specified IStreamDownloadContract.
 *
 * @type {DownloadDataType}
 * @typeparam T - The target download contract type.
 * @typeparam K - The key of the contract.
 * @returns The data type of the specified contract.
 */
export type DownloadDataType<T extends GenericStreamDownloadContract<T>, K extends keyof T> =
  T[K] extends IStreamDownloadContract<any, infer Data> ? Data : never

// Forward declarations for types used in utility types
interface IInvokeContract<
  TRequest extends Serializable | void,
  TResponse extends Serializable | void,
> {
  request: TRequest
  response: TResponse
}

export type GenericInvokeContract<T> = {
  [P in keyof T]: T[P] extends IInvokeContract<infer Req, infer Res>
    ? EnforceStructure<T[P], IInvokeContract<Req, Res>>
    : never
}

interface IStreamInvokeContract<TRequest extends Serializable | void, TData extends Serializable> {
  request: TRequest
  stream: TData
}

export type GenericStreamInvokeContract<T> = {
  [P in keyof T]: T[P] extends IStreamInvokeContract<infer Req, infer Data>
    ? EnforceStructure<T[P], IStreamInvokeContract<Req, Data>>
    : never
}

interface IRendererEventContract<TRequest extends Serializable | void> {
  request: TRequest
}

export type GenericRendererEventContract<T> = {
  [P in keyof T]: T[P] extends IRendererEventContract<infer Req>
    ? EnforceStructure<T[P], IRendererEventContract<Req>>
    : never
}

interface IBroadcastContract<TRequest extends Serializable | void> {
  payload: TRequest
}

export type GenericBroadcastContract<T> = {
  [P in keyof T]: T[P] extends IBroadcastContract<infer Req>
    ? EnforceStructure<T[P], IBroadcastContract<Req>>
    : never
}

interface IStreamUploadContract<TRequest extends Serializable, TData extends Serializable> {
  request: TRequest
  data: TData
}

export type GenericStreamUploadContract<T> = {
  [P in keyof T]: T[P] extends IStreamUploadContract<infer Request, infer Data>
    ? EnforceStructure<T[P], IStreamUploadContract<Request, Data>>
    : never
}

interface IStreamDownloadContract<TRequest extends Serializable, TData extends Serializable> {
  request: TRequest
  data: TData
}

export type GenericStreamDownloadContract<T> = {
  [P in keyof T]: T[P] extends IStreamDownloadContract<infer Request, infer Data>
    ? EnforceStructure<T[P], IStreamDownloadContract<Request, Data>>
    : never
}
