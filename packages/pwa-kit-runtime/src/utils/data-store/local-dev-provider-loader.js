/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Loads the dev-only in-memory Data Store from **`@salesforce/pwa-kit-dev`**.
 * **`getDataStore`** in **`data-store-provider.js`** calls this once when resolving
 * the non-MRT path (result is cached on the provider promise, not here).
 */

/** Workspace / linked installs use `dist/`; published `pwa-kit-dev` tarball root matches `dist/` contents. */
const LOCAL_PROVIDER_SPECIFIERS = [
    '@salesforce/pwa-kit-dev/dist/utils/mrt-data-store-local-provider.js',
    '@salesforce/pwa-kit-dev/utils/mrt-data-store-local-provider.js'
]

/**
 * @returns {Promise<{ createLocalMrtDataStoreProvider?: (...args: unknown[]) => unknown }>}
 */
async function importLocalMrtDataStoreProviderModule() {
    let lastError
    for (const specifier of LOCAL_PROVIDER_SPECIFIERS) {
        try {
            return await import(specifier)
        } catch (error) {
            lastError = error
        }
    }
    throw lastError ?? new Error('Local MRT Data Store provider module not found')
}

/**
 * Whether the in-memory local MRT Data Store provider may be used (no DynamoDB).
 *
 * Allowed when:
 * - `PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL=true`, or
 * - `CI=true` (e.g. automated tests), or
 * - `NODE_ENV` is not `production`.
 *
 * @returns {boolean}
 */
export function isMrtDataStoreLocalProviderAllowed() {
    if (process.env.PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL === 'true') {
        return true
    }
    if (process.env.CI === 'true') {
        return true
    }
    return process.env.NODE_ENV !== 'production'
}

/**
 * Instantiate the local MRT Data Store provider (dynamic import of **`@salesforce/pwa-kit-dev`**).
 * Caller must ensure **`isMrtDataStoreLocalProviderAllowed()`** is true if this should succeed in production.
 *
 * @returns {Promise<{ getEntry: (key: string) => Promise<{ value?: unknown } | null> }>}
 */
export async function loadLocalMrtDataStoreProvider() {
    const mod = await importLocalMrtDataStoreProviderModule()
    if (typeof mod.createLocalMrtDataStoreProvider !== 'function') {
        throw new Error('createLocalMrtDataStoreProvider export missing')
    }
    return mod.createLocalMrtDataStoreProvider()
}
