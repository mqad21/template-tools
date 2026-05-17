/**
 * engineStorage.ts
 * Manages local storage of Fasih Form engine files (JS & CSS) using IndexedDB via idb-keyval.
 * This allows the app to load the engine from the browser cache instead of a CDN.
 */

import { get, set, del, keys } from 'idb-keyval'

export interface EngineFiles {
  version: string
  js: string      // Full JS content as a string
  css: string     // Full CSS content as a string
  downloadedAt: string
}

const STORE_PREFIX = 'fasih_engine_v_'

function storeKey(version: string): string {
  return `${STORE_PREFIX}${version}`
}

/**
 * Save engine files (JS & CSS strings) to IndexedDB.
 */
export async function saveEngine(version: string, js: string, css: string): Promise<void> {
  const payload: EngineFiles = {
    version,
    js,
    css,
    downloadedAt: new Date().toISOString(),
  }
  await set(storeKey(version), payload)
}

/**
 * Retrieve stored engine files for a specific version.
 * Returns null if the version is not stored.
 */
export async function getEngine(version: string): Promise<EngineFiles | null> {
  const data = await get<EngineFiles>(storeKey(version))
  return data ?? null
}

/**
 * Delete a stored engine version from IndexedDB.
 */
export async function deleteEngine(version: string): Promise<void> {
  await del(storeKey(version))
}

/**
 * Check if a version is already stored locally.
 */
export async function isEngineStored(version: string): Promise<boolean> {
  const data = await get<EngineFiles>(storeKey(version))
  return data !== undefined
}

/**
 * Get all stored engine versions.
 */
export async function getStoredVersions(): Promise<string[]> {
  const allKeys = await keys<string>()
  return allKeys
    .filter((k) => typeof k === 'string' && k.startsWith(STORE_PREFIX))
    .map((k) => (k as string).replace(STORE_PREFIX, ''))
}

/**
 * Create temporary Blob URLs from stored engine files.
 * Remember to call URL.revokeObjectURL() when no longer needed.
 */
export function createBlobUrls(engine: EngineFiles): { jsUrl: string; cssUrl: string } {
  const jsBlob = new Blob([engine.js], { type: 'application/javascript' })
  const cssBlob = new Blob([engine.css], { type: 'text/css' })
  return {
    jsUrl: URL.createObjectURL(jsBlob),
    cssUrl: URL.createObjectURL(cssBlob),
  }
}
