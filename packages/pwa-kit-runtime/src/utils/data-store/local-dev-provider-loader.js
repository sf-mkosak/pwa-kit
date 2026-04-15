/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Dev-only in-memory Data Store (`@salesforce/pwa-kit-dev`). **`getPlainObjectForDataStoreKey`** calls
 * **`tryFetchPlainObjectFromLocalMrtDataStore`** when **`hasMrtEnvironment()`** is false (incomplete MRT env)
 * and **`isMrtDataStoreLocalProviderAllowed()`** allows the local provider.
 */

import createLogger from '../logger-factory'

const logger = createLogger({packageName: 'pwa-kit-runtime'})

/** Workspace / linked installs use `dist/`; published `pwa-kit-dev` tarball root matches `dist/` contents. */
const LOCAL_PROVIDER_SPECIFIERS = [
    '@salesforce/pwa-kit-dev/dist/utils/mrt-data-store-local-provider.js',
    '@salesforce/pwa-kit-dev/utils/mrt-data-store-local-provider.js'
]

/** @type {Promise<{ getEntry: (key: string) => Promise<{ value?: unknown } | null> }> | null} */
let cachedLocalProviderPromise = null

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
 * Not used when the real Data Store is available.
 *
 * Allowed when:
 * - `PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL=true`, or
 * - `CI=true` (e.g. automated tests), or
 * - `NODE_ENV` is not `production`.
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
 * Reset cached local provider (for tests).
 */
export function resetLocalMrtDataStoreProviderCacheForTests() {
    cachedLocalProviderPromise = null
}

/**
 * Load plain object from the dev-only local provider, or `null` if unavailable / skipped.
 *
 * @param {string} dataStoreKey
 * @param {string} logNamespace
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function tryFetchPlainObjectFromLocalMrtDataStore(dataStoreKey, logNamespace) {
    if (!isMrtDataStoreLocalProviderAllowed()) {
        return null
    }

    try {
        if (!cachedLocalProviderPromise) {
            cachedLocalProviderPromise = (async () => {
                const mod = await importLocalMrtDataStoreProviderModule()
                if (typeof mod.createLocalMrtDataStoreProvider !== 'function') {
                    throw new Error('createLocalMrtDataStoreProvider export missing')
                }
                return mod.createLocalMrtDataStoreProvider()
            })()
        }
        const provider = await cachedLocalProviderPromise
        const entry = await provider.getEntry(dataStoreKey)
        const value = entry?.value
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value
        }
        return {}
    } catch (error) {
        cachedLocalProviderPromise = null
        logger.warn('Local MRT Data Store provider could not be loaded or used.', {
            namespace: logNamespace,
            key: dataStoreKey,
            message:
                'Add @salesforce/pwa-kit-dev (devDependency), run its build, or set MRT env vars for the real Data Store.',
            error
        })
        return null
    }
}
