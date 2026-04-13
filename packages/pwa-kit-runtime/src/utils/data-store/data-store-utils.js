/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import createLogger from '../logger-factory'
import {DataStore, DataStoreNotFoundError, DataStoreServiceError} from '../ssr-server/data-store'

const logger = createLogger({packageName: 'pwa-kit-runtime'})

/**
 * Load a plain JSON object from the MRT Data Store for SSR by key.
 * Use for entries that should surface as `Record<string, unknown>` in apps
 * (custom site/global preferences and similar keys).
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
