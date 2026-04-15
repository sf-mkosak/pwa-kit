/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import createLogger from '../logger-factory'
import {DataStore, DataStoreNotFoundError, DataStoreServiceError} from '../ssr-server/data-store'
import {tryFetchPlainObjectFromLocalMrtDataStore} from './local-dev-provider-loader'

// Implementation in `logging-utils.js` (logger + constants; no `DataStore`) so client bundles stay small.
// Client preference modules import `./logging-utils` directly; server code may import from here.
export {warnIfMrtDataStoreBootstrapMissing} from './logging-utils'

/**
 * Parse PWAKIT_MRT_DATA_STORE_ENABLED when set; invalid values are ignored (fall through to config).
 * @param {string | undefined} raw
 * @returns {boolean | null} true/false when explicit, null when unset or invalid
 */
function parseMrtDataStoreEnabledFromEnv(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return null
    }
    const v = String(raw).trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(v)) {
        return true
    }
    if (['0', 'false', 'no', 'off'].includes(v)) {
        return false
    }
    return null
}

/**
 * Whether this app should **resolve and serialize** MRT Data Store custom preferences during SSR
 * (`getCustomSitePreferences` / `getCustomGlobalPreferences` on the server, then `__MRT_DATA_STORE__`
 * in `#mobify-data` when enabled).
 *
 * This is **not** the same as **`DataStore.isDataStoreAvailable()`** in **`utils/ssr-server/data-store`**:
 * the Lambda may still have a Data Store client while this flag is off (no `__MRT_DATA_STORE__` bootstrap).
 *
 * **`getPlainObjectForDataStoreKey`** (when this feature is on) chooses the data source by environment:
 * if **`hasMrtEnvironment()`** (`AWS_REGION`, `MOBIFY_PROPERTY_ID`, `DEPLOY_TARGET`), it uses **`DataStore`**
 * from **`@salesforce/mrt-utilities`**; otherwise it may use the in-memory local provider from
 * **`@salesforce/pwa-kit-dev`** when **`isMrtDataStoreLocalProviderAllowed()`** allows it.
 * On the MRT branch only, **`isDataStoreAvailable() === false`** yields **`{}`** (same as no DAL data).
 *
 * **Opt-in:** off unless `config.app.mrtDataStore.enabled === true` or
 * `PWAKIT_MRT_DATA_STORE_ENABLED` is a recognized truthy/falsey string (`true`, `1`, `yes`, `on` / `false`, `0`, …).
 *
 * Env takes precedence when set to a recognized value so ops can force on/off without a rebuild
 * (when env is injected at runtime).
 *
 * @param {{ app?: { mrtDataStore?: { enabled?: boolean } } }} [config] - Result of `getConfig()`.
 * @returns {boolean}
 */
export function isMrtDataStoreEnabled(config) {
    const fromEnv = parseMrtDataStoreEnabledFromEnv(process.env.PWAKIT_MRT_DATA_STORE_ENABLED)
    if (fromEnv !== null) {
        return fromEnv
    }
    return config?.app?.mrtDataStore?.enabled === true
}

/**
 * Whether the standard Managed Runtime / Lambda **trio** of env vars is present so the real MRT Data Store
 * client should be used (same idea as storefront-next `hasMrtEnvironment`).
 *
 * @returns {boolean}
 */
export function hasMrtEnvironment() {
    return Boolean(
        process.env.AWS_REGION && process.env.MOBIFY_PROPERTY_ID && process.env.DEPLOY_TARGET
    )
}

const logger = createLogger({packageName: 'pwa-kit-runtime'})

/**
 * Load a plain JSON object for SSR by Data Store key.
 * Use for entries that should surface as `Record<string, unknown>` in apps
 * (custom site/global preferences and similar keys).
 *
 * **Resolution:** if **`hasMrtEnvironment()`**, uses **`DataStore.getDataStore()`** from **`@salesforce/mrt-utilities`**
 * (when **`isDataStoreAvailable()`** is false on that branch, returns **`{}`**). Otherwise uses the local
 * in-memory provider from **`@salesforce/pwa-kit-dev`** when allowed — see **`local-dev-provider-loader.js`**.
 *
 * @param {{
 *   dataStoreKey: string | null,
 *   logNamespace: string,
 *   serviceErrorMessage: string
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getPlainObjectForDataStoreKey({
    dataStoreKey,
    logNamespace,
    serviceErrorMessage
}) {
    if (!dataStoreKey) {
        return {}
    }

    if (hasMrtEnvironment()) {
        const store = DataStore.getDataStore()
        if (!store.isDataStoreAvailable()) {
            return {}
        }

        try {
            const {value} = await store.getEntry(dataStoreKey)
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value
            }
            return {}
        } catch (error) {
            if (error instanceof DataStoreNotFoundError) {
                return {}
            }
            if (error instanceof DataStoreServiceError) {
                logger.error(serviceErrorMessage, {
                    namespace: logNamespace,
                    key: dataStoreKey,
                    error
                })
                return {}
            }
            throw error
        }
    }

    const fromLocal = await tryFetchPlainObjectFromLocalMrtDataStore(dataStoreKey, logNamespace)
    if (fromLocal !== null) {
        return fromLocal
    }
    return {}
}
