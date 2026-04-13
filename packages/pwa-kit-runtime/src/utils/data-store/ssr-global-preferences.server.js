/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {CUSTOM_GLOBAL_PREFERENCES_DATA_STORE_KEY} from './constants'
import {getMrtDataStoreFromContext} from './context'
import {getPlainObjectForDataStoreKey} from './data-store-utils'

/**
 * @returns {Record<string, unknown>}
 */
export function getCustomGlobalPreferencesFromContext() {
    return getMrtDataStoreFromContext().customGlobalPreferences
}

/**
 * Data Store key for custom global preferences (fixed; not site-scoped).
 * @returns {string}
 */
export function buildCustomGlobalPreferencesDataStoreKey() {
    return CUSTOM_GLOBAL_PREFERENCES_DATA_STORE_KEY
}

/**
 * Load custom global preferences from the MRT Data Store for SSR.
 * Returns `{}` when the store is unavailable, the key is missing, or the value is not a plain object.
 *
 * @returns {Promise<Record<string, unknown>>}
 */
export async function resolveCustomGlobalPreferencesForRequest() {
    return getPlainObjectForDataStoreKey({
        dataStoreKey: CUSTOM_GLOBAL_PREFERENCES_DATA_STORE_KEY,
        logNamespace: 'custom-global-preferences',
        serviceErrorMessage: 'Custom global preferences Data Store request failed'
    })
}

/**
 * Returns custom global preferences for the current SSR request.
 * Only populated inside `runWithMrtDataStoreContext` (during React SSR).
 *
 * @returns {Record<string, unknown>}
 */
export function getCustomGlobalPreferences() {
    return getCustomGlobalPreferencesFromContext()
}
